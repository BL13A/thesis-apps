"""OpenCV tile dimension validation against expected size (±5% tolerance)."""

from __future__ import annotations

import base64
import re

import cv2
import numpy as np

from business_rules import SIZE_TOLERANCE_PERCENT

STANDARD_TILE_SIZES = ('300x300', '300x600', '600x600')
SQUARE_TILE_SIZES = frozenset({'300x300', '600x600'})
ASPECT_SQUARE_MIN = 0.72
ASPECT_RECT_MIN = 0.32
ASPECT_RECT_MAX = 0.68
MIN_DETECTION_AREA_RATIO = 0.04


def parse_dimension_mm(text: str) -> tuple[float, float] | None:
    numbers = re.findall(r'[\d.]+', text or '')
    if len(numbers) >= 2:
        return float(numbers[0]), float(numbers[1])
    if len(numbers) == 1:
        value = float(numbers[0])
        return value, value
    return None


def _decode_image(image_bytes: bytes) -> np.ndarray | None:
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    return image


def _normalize_box(left: float, top: float, width: float, height: float) -> dict:
    return {
        'left': max(0.0, min(1.0, left)),
        'top': max(0.0, min(1.0, top)),
        'width': max(0.0, min(1.0, width)),
        'height': max(0.0, min(1.0, height)),
    }


def _rect_to_normalized_box(rect: tuple, image_width: int, image_height: int) -> dict:
    center, size, _angle = rect
    width_px, height_px = size
    left = (center[0] - width_px / 2) / image_width
    top = (center[1] - height_px / 2) / image_height
    return _normalize_box(left, top, width_px / image_width, height_px / image_height)


def measure_tile_outline(image: np.ndarray) -> dict | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    edges = cv2.Canny(blur, 40, 140)
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    image_area = image.shape[0] * image.shape[1]
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < image_area * 0.08:
        return None

    rect = cv2.minAreaRect(largest)
    width_px, height_px = rect[1]
    long_side = max(width_px, height_px)
    short_side = min(width_px, height_px)
    if long_side <= 0 or short_side <= 0:
        return None

    image_height, image_width = image.shape[:2]
    return {
        'widthPx': long_side,
        'heightPx': short_side,
        'tileOutline': _rect_to_normalized_box(rect, image_width, image_height),
        'imageWidth': image_width,
        'imageHeight': image_height,
    }


def validate_tile_size(image_bytes: bytes, expected_dimension: str) -> dict:
    expected = parse_dimension_mm(expected_dimension)
    default = {
        'sizeValidation': 'Valid',
        'expectedWidthMm': expected[0] if expected else None,
        'expectedHeightMm': expected[1] if expected else None,
        'measuredWidthMm': None,
        'measuredHeightMm': None,
        'widthDeviationPercent': None,
        'heightDeviationPercent': None,
        'tolerancePercent': SIZE_TOLERANCE_PERCENT,
        'tileOutline': None,
        'imageWidth': None,
        'imageHeight': None,
        'note': None,
    }

    if not expected:
        default['note'] = 'Expected dimension could not be parsed.'
        return default

    image = _decode_image(image_bytes)
    if image is None:
        default['note'] = 'Image could not be decoded for size validation.'
        return default

    measured = measure_tile_outline(image)
    if not measured:
        default['note'] = 'Tile outline not detected. Size validation skipped.'
        return default

    exp_width, exp_height = expected
    exp_long = max(exp_width, exp_height)
    exp_short = min(exp_width, exp_height)

    scale = exp_long / measured['widthPx']
    measured_width_mm = measured['widthPx'] * scale
    measured_height_mm = measured['heightPx'] * scale

    if exp_width >= exp_height:
        final_width_mm = measured_width_mm
        final_height_mm = measured_height_mm
    else:
        final_width_mm = measured_height_mm
        final_height_mm = measured_width_mm

    width_deviation = abs(final_width_mm - exp_width) / exp_width * 100
    height_deviation = abs(final_height_mm - exp_height) / exp_height * 100
    is_valid = (
        width_deviation <= SIZE_TOLERANCE_PERCENT
        and height_deviation <= SIZE_TOLERANCE_PERCENT
    )

    return {
        'sizeValidation': 'Valid' if is_valid else 'Invalid',
        'expectedWidthMm': round(exp_width, 1),
        'expectedHeightMm': round(exp_height, 1),
        'measuredWidthMm': round(final_width_mm, 1),
        'measuredHeightMm': round(final_height_mm, 1),
        'widthDeviationPercent': round(width_deviation, 2),
        'heightDeviationPercent': round(height_deviation, 2),
        'tolerancePercent': SIZE_TOLERANCE_PERCENT,
        'tileOutline': measured['tileOutline'],
        'imageWidth': measured['imageWidth'],
        'imageHeight': measured['imageHeight'],
        'note': None,
    }


def validate_tile_size_from_base64(image_base64: str, expected_dimension: str) -> dict:
    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',', 1)[-1]
    image_bytes = base64.b64decode(image_base64)
    return validate_tile_size(image_bytes, expected_dimension)


def validate_tile_region(
    image_bgr: np.ndarray,
    box: dict,
    expected_dimension: str,
) -> dict:
    """Validate tile dimensions on a YOLO bounding-box crop using OpenCV contours."""
    height, width = image_bgr.shape[:2]
    x1 = max(0, int(box.get('x1', 0)))
    y1 = max(0, int(box.get('y1', 0)))
    x2 = min(width, int(box.get('x2', width)))
    y2 = min(height, int(box.get('y2', height)))

    if x2 <= x1 or y2 <= y1:
        return {
            'sizeValidation': 'Invalid',
            'expectedWidthMm': None,
            'expectedHeightMm': None,
            'measuredWidthMm': None,
            'measuredHeightMm': None,
            'widthDeviationPercent': None,
            'heightDeviationPercent': None,
            'tolerancePercent': SIZE_TOLERANCE_PERCENT,
            'tileOutline': None,
            'imageWidth': width,
            'imageHeight': height,
            'note': 'Invalid detection bounding box.',
        }

    crop = image_bgr[y1:y2, x1:x2]
    success, buffer = cv2.imencode('.jpg', crop)
    if not success:
        return validate_tile_size(image_bgr.tobytes(), expected_dimension)

    return validate_tile_size(buffer.tobytes(), expected_dimension)


def normalize_size_key(text: str | None) -> str | None:
    """Normalize catalog size text to a supported key (300x300, 300x600, 600x600)."""
    parsed = parse_dimension_mm(text or '')
    if not parsed:
        return None
    width, height = int(parsed[0]), int(parsed[1])
    if width == height:
        key = f'{width}x{height}'
    else:
        short_side, long_side = sorted((width, height))
        key = f'{short_side}x{long_side}'
    return key if key in STANDARD_TILE_SIZES else None


def detection_box_aspect(box: dict) -> float:
    width = max(0.0, float(box.get('x2', 0)) - float(box.get('x1', 0)))
    height = max(0.0, float(box.get('y2', 0)) - float(box.get('y1', 0)))
    if width <= 0 or height <= 0:
        return 0.0
    return min(width, height) / max(width, height)


def detection_box_area_ratio(box: dict, image_width: int, image_height: int) -> float:
    if image_width <= 0 or image_height <= 0:
        return 0.0
    width = max(0.0, float(box.get('x2', 0)) - float(box.get('x1', 0)))
    height = max(0.0, float(box.get('y2', 0)) - float(box.get('y1', 0)))
    return (width * height) / float(image_width * image_height)


def aspect_matches_size_key(aspect: float, size_key: str) -> bool:
    if size_key in SQUARE_TILE_SIZES:
        return aspect >= ASPECT_SQUARE_MIN
    if size_key == '300x600':
        return ASPECT_RECT_MIN <= aspect <= ASPECT_RECT_MAX
    return False


def candidate_sizes_for_aspect(aspect: float) -> list[str]:
    candidates: list[str] = []
    if aspect >= ASPECT_SQUARE_MIN:
        candidates.extend(['300x300', '600x600'])
    if ASPECT_RECT_MIN <= aspect <= ASPECT_RECT_MAX:
        candidates.append('300x600')
    return candidates


def tile_matches_size_key(tile: dict, size_key: str) -> bool:
    return normalize_size_key(tile.get('size')) == size_key


def _invalid_size_analysis(note: str, *, image_width: int, image_height: int) -> dict:
    return {
        'sizeValidation': 'Invalid',
        'expectedWidthMm': None,
        'expectedHeightMm': None,
        'measuredWidthMm': None,
        'measuredHeightMm': None,
        'widthDeviationPercent': None,
        'heightDeviationPercent': None,
        'tolerancePercent': SIZE_TOLERANCE_PERCENT,
        'tileOutline': None,
        'imageWidth': image_width,
        'imageHeight': image_height,
        'note': note,
    }


def passes_standard_size_gate(
    box: dict,
    *,
    image_width: int,
    image_height: int,
) -> bool:
    aspect = detection_box_aspect(box)
    if aspect <= 0:
        return False
    if detection_box_area_ratio(box, image_width, image_height) < MIN_DETECTION_AREA_RATIO:
        return False
    return bool(candidate_sizes_for_aspect(aspect))


def resolve_standard_tile_size(
    image_bgr: np.ndarray,
    box: dict,
    *,
    label: str,
    tiles: list[dict],
    match_tile_for_label,
) -> tuple[str | None, dict]:
    """Pick the supported tile size (300x300 / 300x600 / 600x600) for a detection box."""
    image_height, image_width = image_bgr.shape[:2]
    aspect = detection_box_aspect(box)

    if not passes_standard_size_gate(box, image_width=image_width, image_height=image_height):
        return None, _invalid_size_analysis(
            'Tile size not recognized. Only 300x300 mm, 300x600 mm, and 600x600 mm are supported.',
            image_width=image_width,
            image_height=image_height,
        )

    candidates = candidate_sizes_for_aspect(aspect)
    best_size: str | None = None
    best_analysis: dict | None = None
    best_score = -1.0

    for size_key in candidates:
        if not aspect_matches_size_key(aspect, size_key):
            continue

        analysis = validate_tile_region(image_bgr, box, size_key)
        size_tiles = [
            tile for tile in tiles
            if tile.get('status') == 'Active' and tile_matches_size_key(tile, size_key)
        ]
        matched = match_tile_for_label(label, size_tiles)
        score = 0.0
        if analysis.get('sizeValidation') == 'Valid':
            score += 100.0
        else:
            width_dev = analysis.get('widthDeviationPercent')
            height_dev = analysis.get('heightDeviationPercent')
            if width_dev is not None and height_dev is not None:
                score += max(0.0, 100.0 - float(width_dev) - float(height_dev))
        if matched:
            score += 30.0

        if score > best_score:
            best_score = score
            best_size = size_key
            best_analysis = analysis

    if not best_size or not best_analysis or best_analysis.get('sizeValidation') != 'Valid':
        note = (
            best_analysis.get('note')
            if best_analysis
            else 'Detected dimensions do not match 300x300 mm, 300x600 mm, or 600x600 mm.'
        )
        return None, _invalid_size_analysis(
            note or 'Detected dimensions do not match 300x300 mm, 300x600 mm, or 600x600 mm.',
            image_width=image_width,
            image_height=image_height,
        )

    return best_size, best_analysis
