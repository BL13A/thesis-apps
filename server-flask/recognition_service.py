"""DEPRECATED: replaced by backend/services/ai_recognition_service.py (YOLOv8).

Kept for reference only — API uses YOLO classification via /api/ai/recognize.
"""

from __future__ import annotations

import base64

COLOR_KEYWORDS = {
    'white': (245, 245, 245),
    'cream': (255, 253, 208),
    'beige': (245, 245, 220),
    'gray': (128, 128, 128),
    'grey': (128, 128, 128),
    'black': (30, 30, 30),
    'brown': (139, 90, 43),
    'blue': (59, 130, 246),
    'green': (34, 197, 94),
    'red': (239, 68, 68),
    'marble': (230, 230, 230),
    'wood': (160, 110, 60),
}


def _color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def _parse_catalog_color(color_label: str) -> tuple[int, int, int] | None:
    normalized = color_label.strip().lower()
    for keyword, rgb in COLOR_KEYWORDS.items():
        if keyword in normalized:
            return rgb
    return None


def _dominant_rgb_from_image(image_base64: str) -> tuple[int, int, int] | None:
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    try:
        raw = base64.b64decode(image_base64)
        array = np.frombuffer(raw, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            return None
        resized = cv2.resize(image, (64, 64))
        pixels = resized.reshape(-1, 3)
        mean_bgr = pixels.mean(axis=0)
        b, g, r = mean_bgr
        return int(r), int(g), int(b)
    except Exception:
        return None


def _score_tile_match(tile: dict, dominant_rgb: tuple[int, int, int] | None) -> float:
    score = 0.0
    catalog_rgb = _parse_catalog_color(tile.get('color') or '')
    if dominant_rgb and catalog_rgb:
        distance = _color_distance(dominant_rgb, catalog_rgb)
        color_score = max(0.0, 1.0 - distance / 441.0)
        score += color_score * 0.55

    tile_type = (tile.get('tileType') or '').lower()
    name = (tile.get('name') or '').lower()
    finish = (tile.get('finish') or '').lower()

    if 'marble' in name or 'marble' in tile_type:
        score += 0.1
    if 'wood' in name or 'wood' in finish:
        score += 0.1
    if 'ceramic' in tile_type:
        score += 0.05
    if 'porcelain' in tile_type:
        score += 0.05

    if int(tile.get('stockQuantity') or 0) > 0:
        score += 0.1

    return min(score, 0.99)


def recognize_tile_from_image(image_base64: str, tiles: list[dict]) -> dict:
    if not tiles:
        return {
            'recognizedName': 'Unknown Tile',
            'tileType': 'Unknown',
            'confidenceScore': 0.0,
            'matchedTile': None,
        }

    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',', 1)[-1]

    dominant_rgb = _dominant_rgb_from_image(image_base64)
    ranked = sorted(
        (
            (_score_tile_match(tile, dominant_rgb), tile)
            for tile in tiles
            if tile.get('status') == 'Active'
        ),
        key=lambda item: item[0],
        reverse=True,
    )

    best_score, best_tile = ranked[0]
    confidence = round(max(0.35, best_score), 4) if dominant_rgb else round(max(0.25, best_score * 0.8), 4)

    return {
        'recognizedName': best_tile['name'],
        'tileType': best_tile['tileType'],
        'confidenceScore': confidence,
        'matchedTile': best_tile,
        'provider': 'opencv-color-match' if dominant_rgb else 'catalog-heuristic',
    }
