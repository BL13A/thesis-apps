"""Visual tile matching against catalog reference images (OpenCV histograms)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from product_image_catalog import build_product_image_catalog
from size_validation import normalize_size_key

VISUAL_MATCH_MIN_CONFIDENCE = 0.42
VISUAL_OVERRIDE_CONFIDENCE = 0.58
COMPARE_SIZE = (256, 256)


def _read_image_bgr(image_path: Path) -> np.ndarray | None:
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    return image if image is not None and image.size > 0 else None


def _crop_detection(image_bgr: np.ndarray, box: dict | None) -> np.ndarray:
    if not box:
        return image_bgr

    height, width = image_bgr.shape[:2]
    x1 = max(0, int(box.get('x1', 0)))
    y1 = max(0, int(box.get('y1', 0)))
    x2 = min(width, int(box.get('x2', width)))
    y2 = min(height, int(box.get('y2', height)))

    if x2 <= x1 or y2 <= y1:
        margin_x = int(width * 0.08)
        margin_y = int(height * 0.08)
        return image_bgr[margin_y:height - margin_y, margin_x:width - margin_x]

    return image_bgr[y1:y2, x1:x2]


def _prepare_compare_image(image_bgr: np.ndarray) -> np.ndarray:
    resized = cv2.resize(image_bgr, COMPARE_SIZE, interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(resized, (3, 3), 0)


def _histogram_signature(image_bgr: np.ndarray) -> np.ndarray:
    prepared = _prepare_compare_image(image_bgr)
    signatures: list[np.ndarray] = []

    bgr_hist = cv2.calcHist([prepared], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(bgr_hist, bgr_hist)
    signatures.append(bgr_hist.flatten())

    hsv = cv2.cvtColor(prepared, cv2.COLOR_BGR2HSV)
    hsv_hist = cv2.calcHist([hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256])
    cv2.normalize(hsv_hist, hsv_hist)
    signatures.append(hsv_hist.flatten())

    gray = cv2.cvtColor(prepared, cv2.COLOR_BGR2GRAY)
    texture = cv2.Laplacian(gray, cv2.CV_64F)
    texture_hist = cv2.calcHist([texture.astype(np.float32)], [0], None, [16], [-40, 40])
    cv2.normalize(texture_hist, texture_hist)
    signatures.append(texture_hist.flatten())

    return np.concatenate(signatures).astype(np.float32)


def _compare_signatures(left: np.ndarray, right: np.ndarray) -> float:
    if left.shape != right.shape:
        return -1.0
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denominator <= 0:
        return 0.0
    similarity = float(np.dot(left, right) / denominator)
    return max(0.0, min(1.0, similarity))


@lru_cache(maxsize=1)
def _catalog_reference_signatures() -> tuple[tuple[str, str, str, str, np.ndarray], ...]:
    references: list[tuple[str, str, str, str, np.ndarray]] = []
    catalog = build_product_image_catalog()

    for sku, entry in sorted(catalog.items()):
        image_path = Path(entry['absolutePath'])
        image_bgr = _read_image_bgr(image_path)
        if image_bgr is None:
            continue

        size_key = normalize_size_key(entry.get('size')) or ''
        references.append((
            sku,
            entry.get('tileType') or 'Ceramic',
            entry.get('category') or 'ceramic_tile',
            size_key,
            _histogram_signature(image_bgr),
        ))

    return tuple(references)


def clear_visual_match_cache() -> None:
    _catalog_reference_signatures.cache_clear()


def match_catalog_tile(
    image_bgr: np.ndarray,
    box: dict | None = None,
    *,
    size_key: str | None = None,
    tile_type: str | None = None,
) -> dict[str, Any] | None:
    """Return the closest catalog SKU / tile type for an uploaded or scanned tile crop."""
    references = _catalog_reference_signatures()
    if not references:
        return None

    crop = _crop_detection(image_bgr, box)
    if crop.size == 0:
        return None

    query_signature = _histogram_signature(crop)
    normalized_type = (tile_type or '').strip().lower().replace(' ', '')

    best_entry: dict[str, Any] | None = None
    best_score = -1.0
    category_scores: dict[str, float] = {}

    for sku, entry_tile_type, category_folder, entry_size_key, signature in references:
        if size_key and entry_size_key and entry_size_key != size_key:
            continue
        if normalized_type and entry_tile_type.lower().replace(' ', '') != normalized_type:
            continue

        score = _compare_signatures(query_signature, signature)
        category_scores[entry_tile_type] = max(category_scores.get(entry_tile_type, 0.0), score)

        if score > best_score:
            best_score = score
            best_entry = {
                'sku': sku,
                'tile_type': entry_tile_type,
                'category_folder': category_folder,
                'size_key': entry_size_key or size_key,
                'confidence': round(score, 4),
            }

    if not best_entry or best_score < VISUAL_MATCH_MIN_CONFIDENCE:
        if not category_scores:
            return None
        best_type = max(category_scores.items(), key=lambda item: item[1])
        if best_type[1] < VISUAL_MATCH_MIN_CONFIDENCE:
            return None
        folder_map = {
            'Ceramic': 'ceramic_tile',
            'Decor': 'decor',
            'Glazed Polished Porcelain': 'glazed_polished_porcelain',
            'Porcelain': 'porcelain_tile',
        }
        return {
            'sku': None,
            'tile_type': best_type[0],
            'category_folder': folder_map.get(best_type[0], 'ceramic_tile'),
            'size_key': size_key,
            'confidence': round(best_type[1], 4),
        }

    best_entry['confidence'] = round(best_score, 4)
    return best_entry


def should_override_yolo_label(visual_match: dict[str, Any] | None) -> bool:
    if not visual_match:
        return False
    return float(visual_match.get('confidence') or 0.0) >= VISUAL_OVERRIDE_CONFIDENCE


def blend_detection_confidence(yolo_confidence: float, visual_confidence: float) -> float:
    return round(max(yolo_confidence, visual_confidence * 0.85 + yolo_confidence * 0.15), 4)
