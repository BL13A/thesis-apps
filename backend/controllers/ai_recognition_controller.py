"""Recognition controller — YOLO tile-category classification + inventory matching."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

from backend.config.tile_classes import (
    format_detected_class_label,
    format_tile_type_detection_label,
    humanize_class_label,
    inventory_match_keys,
    is_defect_class_label,
    map_label_to_tile_type,
    model_has_defect_classes,
    normalize_label,
    sanitize_display_label,
    slugify_tile_name,
)
from backend.services.ai_recognition_service import (
    ModelNotReadyError,
    annotate_detection_boxes,
    build_tile_prediction,
    get_model_status,
    run_yolo_inference,
    _encode_image_jpeg_base64,
    save_annotated_image,
)

HIGH_CONFIDENCE_THRESHOLD = 0.85
SERVER_FLASK_DIR = Path(__file__).resolve().parents[2] / 'server-flask'
if str(SERVER_FLASK_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_FLASK_DIR))


def _score_label_against_tile(label: str, tile: dict) -> int:
    normalized_label = normalize_label(label)
    keys = inventory_match_keys(tile)
    if normalized_label in keys:
        return 100

    score = 0
    mapped_type = map_label_to_tile_type(label)
    if mapped_type and normalize_label(tile.get('tileType') or '') == normalize_label(mapped_type):
        score += 60

    label_tokens = [token for token in re.split(r'[_\-\s]+', label.lower()) if len(token) > 2]
    haystack = ' '.join(
        [
            tile.get('name', ''),
            tile.get('tileType', ''),
            tile.get('color', ''),
            tile.get('material', ''),
            tile.get('sku', ''),
        ]
    ).lower()

    for token in label_tokens:
        if token in haystack:
            score += 10
        if normalize_label(token) in keys:
            score += 25

    name_slug = slugify_tile_name(tile.get('name') or '')
    if name_slug and normalize_label(name_slug) == normalized_label:
        score += 80

    if mapped_type and normalize_label(mapped_type) in normalize_label(tile.get('tileType') or ''):
        score += 20

    return score


def _match_tile_for_label(label: str, tiles: list[dict]) -> dict | None:
    if not label or is_defect_class_label(label):
        return None

    active_tiles = [tile for tile in tiles if tile.get('status') == 'Active']
    mapped_type = map_label_to_tile_type(label)

    if mapped_type:
        type_matches = [
            tile for tile in active_tiles
            if normalize_label(tile.get('tileType') or '') == normalize_label(mapped_type)
        ]
        if type_matches:
            return sorted(
                type_matches,
                key=lambda tile: (int(tile.get('stockQuantity') or 0), tile.get('name') or ''),
                reverse=True,
            )[0]

    best_tile = None
    best_score = 0
    for tile in active_tiles:
        score = _score_label_against_tile(label, tile)
        if score > best_score:
            best_score = score
            best_tile = tile

    return best_tile if best_score >= 10 else None


def _resolve_inventory_match(
    inference,
    tiles: list[dict],
) -> tuple[dict | None, str, float]:
    candidates: list[tuple[str, float]] = [(inference.category, inference.confidence)]
    for item in inference.top_predictions:
        candidates.append((item['category'], float(item['confidence'])))

    seen: set[str] = set()
    for label, confidence in candidates:
        key = normalize_label(label)
        if not key or key in seen or is_defect_class_label(label):
            continue
        seen.add(key)

        matched = _match_tile_for_label(label, tiles)
        if matched:
            return matched, label, confidence

    for label, confidence in candidates:
        if not is_defect_class_label(label):
            return None, label, confidence

    return None, inference.category, inference.confidence


def get_ai_model_status() -> dict:
    status = get_model_status()
    status['task'] = 'tile-detection'
    class_names = status.get('classNames') or []
    if model_has_defect_classes(class_names):
        status['modelNeedsRetrain'] = True
        status['message'] = (
            'Model uses invalid defect-detection classes. '
            'Run: npm run ai:prepare && npm run ai:train, then restart the API.'
        )
    return status


def recognize_tile_with_inventory(
    image_base64: str,
    tiles: list[dict],
    *,
    save_capture: bool = True,
) -> dict[str, Any]:
    if not tiles:
        raise ValueError('No tile products in inventory catalog.')

    try:
        inference = run_yolo_inference(image_base64)
    except ModelNotReadyError as error:
        raise error

    matched_tile, resolved_label, resolved_confidence = _resolve_inventory_match(inference, tiles)
    if is_defect_class_label(resolved_label):
        resolved_label = inference.category
    model_needs_retrain = is_defect_class_label(inference.category)
    detected_class = sanitize_display_label(resolved_label)

    if matched_tile:
        recognized_name = matched_tile['name']
        tile_type = matched_tile['tileType']
    else:
        recognized_name = detected_class
        tile_type = map_label_to_tile_type(resolved_label) or humanize_class_label(resolved_label)

    stock_status = matched_tile.get('stockStatus') if matched_tile else 'Unknown'
    image_height, image_width = inference.image_bgr.shape[:2]

    annotation_label = f'{detected_class} {resolved_confidence:.0%}'
    prediction = build_tile_prediction(
        inference,
        annotation_label,
        confidence=resolved_confidence,
        save_capture=save_capture,
    )

    return {
        'recognizedName': recognized_name,
        'detectedClass': detected_class,
        'predictedCategory': detected_class,
        'tileType': tile_type,
        'confidenceScore': round(resolved_confidence, 4),
        'matchedTile': matched_tile,
        'availableStock': matched_tile['stockQuantity'] if matched_tile else 0,
        'stockStatus': stock_status,
        'warehouseLocation': matched_tile.get('warehouseLocation', '') if matched_tile else '',
        'reorderLevel': matched_tile.get('lowStockThreshold', 0) if matched_tile else 0,
        'lowStock': stock_status in ('Low Stock', 'Out of Stock'),
        'productImage': matched_tile.get('imageUri') if matched_tile else None,
        'provider': 'yolov8-tile-products',
        'modelPath': prediction.model_path,
        'topPredictions': prediction.top_predictions,
        'inventoryMatched': matched_tile is not None,
        'modelNeedsRetrain': model_needs_retrain,
        'annotatedImage': f'data:image/jpeg;base64,{prediction.annotated_image_base64}',
        'annotatedImageBase64': prediction.annotated_image_base64,
        'boxes': prediction.boxes,
        'imageSize': {'width': int(image_width), 'height': int(image_height)},
        'tile_name': detected_class,
        'product_name': recognized_name,
        'tile_type': tile_type,
        'confidence': round(resolved_confidence, 4),
        'annotated_image': f'data:image/jpeg;base64,{prediction.annotated_image_base64}',
        'inventory_id': matched_tile['id'] if matched_tile else '',
        'stock_quantity': matched_tile['stockQuantity'] if matched_tile else 0,
        'warehouse_location': matched_tile.get('warehouseLocation', '') if matched_tile else '',
        'reorder_level': matched_tile.get('lowStockThreshold', 0) if matched_tile else 0,
        'annotated_image_path': prediction.annotated_image_path,
    }


def _format_size_category(size_text: str | None) -> str:
    if not size_text:
        return '—'
    cleaned = str(size_text).strip()
    if 'mm' in cleaned.lower():
        return cleaned
    numbers = re.findall(r'[\d.]+', cleaned)
    if len(numbers) >= 2:
        return f'{numbers[0]}x{numbers[1]}mm'
    if len(numbers) == 1:
        return f'{numbers[0]}x{numbers[0]}mm'
    return cleaned


def _infer_pattern(tile: dict | None) -> str:
    if not tile:
        return '—'
    series = (tile.get('series') or '').strip()
    if series:
        return series
    description = (tile.get('description') or '').strip()
    if description:
        return description.split('—')[0].split('-')[0].strip()[:48] or 'Standard'
    return 'Standard'


def _warehouse_status(
    confidence: float,
    dimension_status: str,
    *,
    inventory_matched: bool,
) -> str:
    if dimension_status == 'Invalid':
        return 'Inventory Block'
    if confidence >= HIGH_CONFIDENCE_THRESHOLD:
        return 'Available for Sale' if inventory_matched else 'Matched'
    return 'For Manual Review'


def _match_percentage(label: str, confidence: float, tile: dict) -> int:
    inventory_score = _score_label_against_tile(label, tile)
    blended = inventory_score * 0.55 + confidence * 100 * 0.45
    return max(1, min(99, int(round(blended))))


def _score_detection_candidate(
    confidence: float,
    *,
    size_valid: bool,
    inventory_matched: bool,
    visual_confidence: float = 0.0,
) -> float:
    score = confidence * 100.0
    if size_valid:
        score += 40.0
    if inventory_matched:
        score += 30.0
    if visual_confidence > 0:
        score += visual_confidence * 60.0
    return score


def _find_tile_by_sku(tiles: list[dict], sku: str | None) -> dict | None:
    if not sku:
        return None
    normalized = sku.strip().upper()
    return next(
        (tile for tile in tiles if str(tile.get('sku') or '').strip().upper() == normalized),
        None,
    )


def _apply_visual_catalog_match(
    inference_image,
    box: dict,
    *,
    tiles: list[dict],
    detected_size_key: str | None,
    raw_label: str,
    box_confidence: float,
    size_tiles: list[dict],
    box_matched: dict | None,
) -> tuple[str | None, str, float, dict | None, dict | None, str | None]:
    from tile_visual_match import (
        blend_detection_confidence,
        match_catalog_tile,
        should_override_yolo_label,
    )

    visual_match = match_catalog_tile(
        inference_image,
        box,
        size_key=detected_size_key,
    )
    size_analysis = None
    resolved_size_key = detected_size_key

    if not resolved_size_key and visual_match:
        resolved_size_key = visual_match.get('size_key')
        if resolved_size_key and float(visual_match.get('confidence') or 0) >= 0.58:
            from size_validation import validate_tile_region

            size_analysis = validate_tile_region(inference_image, box, resolved_size_key)

    if not visual_match:
        return resolved_size_key, raw_label, box_confidence, box_matched, size_analysis, None

    visual_confidence = float(visual_match.get('confidence') or 0.0)
    predicted_raw_label = raw_label
    if should_override_yolo_label(visual_match) or not map_label_to_tile_type(raw_label):
        predicted_raw_label = str(visual_match.get('category_folder') or raw_label)

    matched = box_matched
    if visual_match.get('sku'):
        sku_tile = _find_tile_by_sku(size_tiles or tiles, str(visual_match['sku']))
        if sku_tile:
            matched = sku_tile
        elif should_override_yolo_label(visual_match):
            matched = _find_tile_by_sku(tiles, str(visual_match['sku']))

    blended_confidence = blend_detection_confidence(box_confidence, visual_confidence)
    return (
        resolved_size_key,
        predicted_raw_label,
        blended_confidence,
        matched,
        size_analysis,
        visual_match,
    )


def _rank_inventory_tiles(
    label: str,
    confidence: float,
    tiles: list[dict],
    *,
    exclude_ids: set[str] | None = None,
    size_key: str | None = None,
    tile_type: str | None = None,
    limit: int = 6,
) -> list[tuple[int, dict]]:
    from size_validation import tile_matches_size_key

    exclude_ids = exclude_ids or set()
    ranked: list[tuple[int, dict]] = []
    normalized_tile_type = normalize_label(tile_type) if tile_type else None

    for tile in tiles:
        if tile.get('status') != 'Active' or tile.get('id') in exclude_ids:
            continue
        if size_key and not tile_matches_size_key(tile, size_key):
            continue
        if normalized_tile_type and normalize_label(tile.get('tileType') or '') != normalized_tile_type:
            continue
        percentage = _match_percentage(label, confidence, tile)
        if percentage < 15:
            continue
        ranked.append((percentage, tile))

    ranked.sort(
        key=lambda item: (item[0], int(item[1].get('stockQuantity') or 0)),
        reverse=True,
    )
    return ranked[:limit]


def _tile_to_recommendation(tile: dict, match_percentage: int) -> dict[str, Any]:
    image_uri = tile.get('productImage') or tile.get('imageUri')
    return {
        'sku_id': tile.get('sku') or tile.get('productCode') or tile.get('id'),
        'tile_id': tile.get('id'),
        'tile_name': tile.get('name'),
        'tile_type': tile.get('tileType'),
        'match_percentage': match_percentage,
        'image_url': image_uri,
        'material': tile.get('material'),
        'surface_finish': tile.get('finish'),
        'size_category': _format_size_category(tile.get('size')),
    }


def _inspect_message(detected_tiles: list[dict]) -> str:
    if not detected_tiles:
        return (
            'No supported tile detected. Only Ceramic, Decor, Glazed Polished Porcelain, '
            'and Porcelain tiles in 300x300 mm, 300x600 mm, or 600x600 mm are recognized.'
        )

    primary = detected_tiles[0]
    tile_type = primary.get('predicted_type', 'tile')

    if primary['status'] == 'Inventory Block':
        return f'{tile_type} detected, but dimension validation failed. Inventory match blocked.'

    if (
        primary['confidence'] >= HIGH_CONFIDENCE_THRESHOLD
        and primary['status'] in ('Available for Sale', 'Matched')
    ):
        return f'{tile_type} tile detected with a high-confidence inventory match.'

    if primary['status'] == 'For Manual Review':
        return f'{tile_type} tile detected and requires manual warehouse review.'

    return f'{tile_type} tile recognized. Review the inventory match below.'


def inspect_tile_with_inventory(
    image_base64: str,
    tiles: list[dict],
    *,
    save_capture: bool = True,
    base_url: str = '',
) -> dict[str, Any]:
    """Full warehouse inspect payload: YOLO detections + OpenCV dimensions + inventory matches."""
    from size_validation import resolve_standard_tile_size, tile_matches_size_key

    if not tiles:
        raise ValueError('No tile products in inventory catalog.')

    inference = run_yolo_inference(image_base64)
    matched_tile, resolved_label, resolved_confidence = _resolve_inventory_match(inference, tiles)
    if is_defect_class_label(resolved_label):
        resolved_label = inference.category

    detected_class = sanitize_display_label(resolved_label)
    annotation_label = f'{detected_class} {resolved_confidence:.0%}'
    prediction = build_tile_prediction(
        inference,
        annotation_label,
        confidence=resolved_confidence,
        save_capture=save_capture,
    )

    image_height, image_width = inference.image_bgr.shape[:2]
    detected_tiles: list[dict[str, Any]] = []
    accepted_boxes: list[dict[str, Any]] = []
    primary_matched_id: str | None = None
    primary_size_key: str | None = None
    primary_tile_type: str | None = None
    best_candidate: dict[str, Any] | None = None

    for box in prediction.boxes:
        raw_label = str(box.get('raw_label') or box.get('label') or inference.category)
        box_label = format_tile_type_detection_label(raw_label)
        box_confidence = float(box.get('confidence') or resolved_confidence)
        detected_size_key, size_analysis = resolve_standard_tile_size(
            inference.image_bgr,
            box,
            label=raw_label,
            tiles=tiles,
            match_tile_for_label=_match_tile_for_label,
        )

        size_tiles = [
            tile for tile in tiles
            if tile.get('status') == 'Active'
            and (not detected_size_key or tile_matches_size_key(tile, detected_size_key))
        ]
        box_matched = _match_tile_for_label(raw_label, size_tiles) if detected_size_key else None

        (
            detected_size_key,
            raw_label,
            box_confidence,
            box_matched,
            visual_size_analysis,
            visual_match,
        ) = _apply_visual_catalog_match(
            inference.image_bgr,
            box,
            tiles=tiles,
            detected_size_key=detected_size_key,
            raw_label=raw_label,
            box_confidence=box_confidence,
            size_tiles=size_tiles,
            box_matched=box_matched,
        )

        if visual_size_analysis is not None:
            size_analysis = visual_size_analysis

        if not detected_size_key:
            continue

        size_tiles = [
            tile for tile in tiles
            if tile.get('status') == 'Active' and tile_matches_size_key(tile, detected_size_key)
        ]
        if box_matched is None:
            box_matched = _match_tile_for_label(raw_label, size_tiles)

        box_label = format_tile_type_detection_label(raw_label)
        predicted_type = (
            box_matched['tileType'] if box_matched
            else str((visual_match or {}).get('tile_type') or '')
            or map_label_to_tile_type(raw_label)
            or box_label
        )
        dimension_status = size_analysis.get('sizeValidation', 'Valid')
        inventory_matched = box_matched is not None
        warehouse_status = _warehouse_status(
            box_confidence,
            dimension_status,
            inventory_matched=inventory_matched,
        )
        visual_confidence = float((visual_match or {}).get('confidence') or 0.0)
        candidate_score = _score_detection_candidate(
            box_confidence,
            size_valid=dimension_status == 'Valid',
            inventory_matched=inventory_matched,
            visual_confidence=visual_confidence,
        )

        candidate = {
            'score': candidate_score,
            'box': {
                **box,
                'raw_label': raw_label,
                'label': predicted_type,
                'confidence': round(box_confidence, 4),
            },
            'tile': {
                'tile_id': 'tile_0',
                'predicted_type': predicted_type,
                'confidence': round(box_confidence, 4),
                'color': box_matched.get('color', '—') if box_matched else '—',
                'pattern': _infer_pattern(box_matched),
                'surface_finish': box_matched.get('finish', '—') if box_matched else '—',
                'size_category': _format_size_category(detected_size_key),
                'width_mm': size_analysis.get('measuredWidthMm'),
                'height_mm': size_analysis.get('measuredHeightMm'),
                'dimension_status': dimension_status,
                'status': warehouse_status,
                'bounding_box_label': f'{predicted_type} {box_confidence:.0%}',
                'inventory_id': box_matched['id'] if box_matched else None,
                'sku_id': box_matched.get('sku') if box_matched else None,
            },
            'size_key': detected_size_key,
            'matched_id': box_matched['id'] if box_matched else None,
            'tile_type': predicted_type,
        }

        if best_candidate is None or candidate['score'] > best_candidate['score']:
            best_candidate = candidate

    if not best_candidate:
        from tile_visual_match import match_catalog_tile

        upload_match = match_catalog_tile(inference.image_bgr, None)
        if upload_match and float(upload_match.get('confidence') or 0) >= 0.58:
            upload_size_key = upload_match.get('size_key')
            upload_raw_label = str(upload_match.get('category_folder') or 'ceramic_tile')
            upload_confidence = float(upload_match['confidence'])
            upload_tiles = [
                tile for tile in tiles
                if tile.get('status') == 'Active'
                and (not upload_size_key or tile_matches_size_key(tile, upload_size_key))
            ]
            upload_matched = _find_tile_by_sku(tiles, upload_match.get('sku'))
            if upload_matched is None:
                upload_matched = _match_tile_for_label(upload_raw_label, upload_tiles)
            predicted_type = (
                upload_matched['tileType'] if upload_matched
                else str(upload_match.get('tile_type') or 'Ceramic')
            )
            height, width = inference.image_bgr.shape[:2]
            margin_x = int(width * 0.08)
            margin_y = int(height * 0.08)
            fallback_box = {
                'x1': float(margin_x),
                'y1': float(margin_y),
                'x2': float(width - margin_x),
                'y2': float(height - margin_y),
                'raw_label': upload_raw_label,
                'label': predicted_type,
                'confidence': round(upload_confidence, 4),
            }
            best_candidate = {
                'score': upload_confidence * 160.0,
                'box': fallback_box,
                'tile': {
                    'tile_id': 'tile_0',
                    'predicted_type': predicted_type,
                    'confidence': round(upload_confidence, 4),
                    'color': upload_matched.get('color', '—') if upload_matched else '—',
                    'pattern': _infer_pattern(upload_matched),
                    'surface_finish': upload_matched.get('finish', '—') if upload_matched else '—',
                    'size_category': _format_size_category(upload_size_key or '600x600'),
                    'width_mm': None,
                    'height_mm': None,
                    'dimension_status': 'Valid',
                    'status': _warehouse_status(
                        upload_confidence,
                        'Valid',
                        inventory_matched=upload_matched is not None,
                    ),
                    'bounding_box_label': f'{predicted_type} {upload_confidence:.0%}',
                    'inventory_id': upload_matched['id'] if upload_matched else None,
                    'sku_id': upload_matched.get('sku') if upload_matched else upload_match.get('sku'),
                },
                'size_key': upload_size_key,
                'matched_id': upload_matched['id'] if upload_matched else None,
                'tile_type': predicted_type,
            }

    if best_candidate:
        accepted_boxes = [best_candidate['box']]
        detected_tiles = [best_candidate['tile']]
        primary_size_key = best_candidate['size_key']
        primary_matched_id = best_candidate['matched_id']
        primary_tile_type = best_candidate['tile_type']

    if accepted_boxes:
        annotated_bgr = annotate_detection_boxes(inference.image_bgr, accepted_boxes)
        prediction.annotated_image_base64 = _encode_image_jpeg_base64(annotated_bgr)
        if save_capture:
            prediction.annotated_image_path = save_annotated_image(
                annotated_bgr,
                detected_class,
            )
        prediction.boxes = accepted_boxes

    primary_raw_label = str(
        accepted_boxes[0].get('raw_label') if accepted_boxes else inference.category,
    )
    primary_label = format_tile_type_detection_label(primary_raw_label)
    primary_confidence = float(detected_tiles[0]['confidence']) if detected_tiles else resolved_confidence
    if not primary_tile_type and detected_tiles:
        primary_tile_type = detected_tiles[0]['predicted_type']

    matched_tile = next(
        (tile for tile in tiles if tile.get('id') == primary_matched_id),
        None,
    )
    ranked_matches = _rank_inventory_tiles(
        primary_raw_label,
        primary_confidence,
        tiles,
        exclude_ids={primary_matched_id} if primary_matched_id else None,
        size_key=primary_size_key,
        tile_type=primary_tile_type,
    )

    if primary_matched_id and matched_tile:
        primary_pct = _match_percentage(primary_label, primary_confidence, matched_tile)
        recommended_entries = [(primary_pct, matched_tile), *ranked_matches]
    else:
        recommended_entries = ranked_matches

    seen_ids: set[str] = set()
    recommended_tiles: list[dict[str, Any]] = []
    for percentage, tile in recommended_entries:
        tile_id = tile.get('id')
        if not tile_id or tile_id in seen_ids:
            continue
        seen_ids.add(tile_id)
        recommended_tiles.append(_tile_to_recommendation(tile, percentage))

    top_recommendations = [
        {
            'rank': index + 1,
            'sku_id': item['sku_id'],
            'tile_id': item.get('tile_id'),
            'tile_name': item['tile_name'],
            'match_percentage': item['match_percentage'],
        }
        for index, item in enumerate(recommended_tiles[:3])
    ]

    annotated_path = prediction.annotated_image_path
    annotated_image_url = None
    image_url = None
    if annotated_path:
        filename = Path(str(annotated_path)).name
        annotated_image_url = f'{base_url}/api/ai/recognition-images/{filename}'
        image_url = annotated_image_url
    elif prediction.annotated_image_base64:
        annotated_image_url = f'data:image/jpeg;base64,{prediction.annotated_image_base64}'
        image_url = annotated_image_url

    return {
        'image_url': image_url,
        'annotated_image_url': annotated_image_url,
        'detected_tiles': detected_tiles,
        'recommended_tiles': recommended_tiles,
        'top_recommendations': top_recommendations,
        'message': _inspect_message(detected_tiles),
        'boxes': prediction.boxes,
        'image_size': {'width': int(image_width), 'height': int(image_height)},
        'provider': 'yolov8-tile-detection+opencv',
        'model_path': prediction.model_path,
        'annotated_image': annotated_image_url,
    }
