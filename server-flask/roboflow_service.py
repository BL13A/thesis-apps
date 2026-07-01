"""Roboflow Workflow (YOLOv8) tile defect analysis via HTTP API."""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request

from business_rules import AI_CONFIDENCE_THRESHOLD
from config import (
    ROBOFLOW_API_KEY,
    ROBOFLOW_API_URL,
    ROBOFLOW_DEFECT_CLASSES,
    ROBOFLOW_WORKFLOW_ID,
    ROBOFLOW_WORKSPACE,
)
from size_validation import validate_tile_size_from_base64

DEFECT_LABEL_MAP = {
    'hole': 'Hole',
    'line': 'Line',
    'edge-chipping': 'Edge Chipping',
    'edge_chipping': 'Edge Chipping',
}


def is_roboflow_configured() -> bool:
    return bool(ROBOFLOW_API_KEY and ROBOFLOW_WORKSPACE and ROBOFLOW_WORKFLOW_ID)


def _normalize_class(name: str) -> str:
    return name.strip().lower().replace('_', '-')


def _prediction_confidence(prediction: dict) -> float:
    for key in ('confidence', 'score', 'probability'):
        if key in prediction and prediction[key] is not None:
            value = float(prediction[key])
            return value if value <= 1 else value / 100
    return 0.0


def _prediction_class(prediction: dict) -> str:
    for key in ('class', 'class_name', 'label', 'name'):
        if prediction.get(key):
            return str(prediction[key])
    return 'Unknown'


def _normalize_box(left: float, top: float, width: float, height: float) -> dict:
    return {
        'left': max(0.0, min(1.0, left)),
        'top': max(0.0, min(1.0, top)),
        'width': max(0.0, min(1.0, width)),
        'height': max(0.0, min(1.0, height)),
    }


def _bbox_from_prediction(prediction: dict, image_width: int, image_height: int) -> dict | None:
    if all(key in prediction for key in ('x', 'y', 'width', 'height')):
        center_x = float(prediction['x'])
        center_y = float(prediction['y'])
        box_width = float(prediction['width'])
        box_height = float(prediction['height'])

        if box_width > 1.5 or box_height > 1.5 or center_x > 1.5 or center_y > 1.5:
            left = (center_x - box_width / 2) / image_width
            top = (center_y - box_height / 2) / image_height
            width = box_width / image_width
            height = box_height / image_height
        else:
            left = center_x - box_width / 2
            top = center_y - box_height / 2
            width = box_width
            height = box_height

        return _normalize_box(left, top, width, height)

    if all(key in prediction for key in ('x_min', 'y_min', 'x_max', 'y_max')):
        x_min = float(prediction['x_min'])
        y_min = float(prediction['y_min'])
        x_max = float(prediction['x_max'])
        y_max = float(prediction['y_max'])

        if x_max > 1.5 or y_max > 1.5:
            left = x_min / image_width
            top = y_min / image_height
            width = (x_max - x_min) / image_width
            height = (y_max - y_min) / image_height
        else:
            left = x_min
            top = y_min
            width = x_max - x_min
            height = y_max - y_min

        return _normalize_box(left, top, width, height)

    points = prediction.get('points') or prediction.get('segmentation')
    if isinstance(points, list) and points:
        xs: list[float] = []
        ys: list[float] = []
        for point in points:
            if isinstance(point, dict):
                xs.append(float(point.get('x', 0)))
                ys.append(float(point.get('y', 0)))
            elif isinstance(point, (list, tuple)) and len(point) >= 2:
                xs.append(float(point[0]))
                ys.append(float(point[1]))

        if xs and ys:
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            if x_max > 1.5 or y_max > 1.5:
                left = x_min / image_width
                top = y_min / image_height
                width = (x_max - x_min) / image_width
                height = (y_max - y_min) / image_height
            else:
                left = x_min
                top = y_min
                width = x_max - x_min
                height = y_max - y_min
            return _normalize_box(left, top, width, height)

    return None


def _format_defect_label(raw_class: str) -> str:
    normalized = _normalize_class(raw_class)
    return DEFECT_LABEL_MAP.get(normalized, normalized.replace('-', ' ').title())


def _workflow_image_size(workflow_result: dict) -> tuple[int, int] | None:
    outputs = workflow_result.get('outputs')
    if not isinstance(outputs, list):
        return None

    for block in outputs:
        if not isinstance(block, dict):
            continue
        pred_block = block.get('predictions')
        if not isinstance(pred_block, dict):
            continue
        image_meta = pred_block.get('image')
        if isinstance(image_meta, dict) and image_meta.get('width') and image_meta.get('height'):
            return int(image_meta['width']), int(image_meta['height'])
    return None


def _prediction_from_item(item: dict, image_width: int, image_height: int) -> dict | None:
    class_name = _prediction_class(item)
    confidence = _prediction_confidence(item)
    if class_name == 'Unknown' or confidence <= 0:
        return None

    return {
        'class': class_name,
        'label': _format_defect_label(class_name),
        'confidence': confidence,
        'bbox': _bbox_from_prediction(item, image_width, image_height),
    }


def extract_predictions(workflow_result, image_width: int, image_height: int) -> list[dict]:
    predictions: list[dict] = []

    if isinstance(workflow_result, dict):
        outputs = workflow_result.get('outputs')
        if isinstance(outputs, list):
            for block in outputs:
                if not isinstance(block, dict):
                    continue
                pred_block = block.get('predictions')
                if not isinstance(pred_block, dict):
                    continue
                nested = pred_block.get('predictions')
                if isinstance(nested, list):
                    for item in nested:
                        if isinstance(item, dict):
                            parsed = _prediction_from_item(item, image_width, image_height)
                            if parsed:
                                predictions.append(parsed)

    def walk(node) -> None:
        if isinstance(node, dict):
            class_name = _prediction_class(node) if any(k in node for k in ('class', 'class_name', 'label')) else None
            confidence = _prediction_confidence(node) if class_name else 0.0
            bbox = _bbox_from_prediction(node, image_width, image_height)

            if class_name and class_name != 'Unknown' and confidence > 0:
                predictions.append({
                    'class': class_name,
                    'label': _format_defect_label(class_name),
                    'confidence': confidence,
                    'bbox': bbox,
                })

            nested = node.get('predictions')
            if isinstance(nested, list):
                for item in nested:
                    if isinstance(item, dict):
                        item_class = _prediction_class(item)
                        item_confidence = _prediction_confidence(item)
                        if item_class != 'Unknown' and item_confidence > 0:
                            predictions.append({
                                'class': item_class,
                                'label': _format_defect_label(item_class),
                                'confidence': item_confidence,
                                'bbox': _bbox_from_prediction(item, image_width, image_height),
                            })

            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    if not predictions:
        walk(workflow_result)

    deduped: dict[str, dict] = {}
    for item in predictions:
        key = _normalize_class(item['class'])
        if key not in deduped or item['confidence'] > deduped[key]['confidence']:
            deduped[key] = item

    return sorted(deduped.values(), key=lambda item: item['confidence'], reverse=True)


def build_inspection_result(predictions: list[dict], size_analysis: dict) -> dict:
    size_validation = size_analysis.get('sizeValidation', 'Valid')

    if size_validation == 'Invalid':
        confidence_score = max(
            AI_CONFIDENCE_THRESHOLD,
            float(predictions[0]['confidence']) if predictions else AI_CONFIDENCE_THRESHOLD,
        )
        return {
            'result': 'Rejected',
            'defectType': 'Dimensional Deviation',
            'confidenceScore': round(confidence_score, 4),
            'sizeValidation': 'Invalid',
            'inventoryStatus': 'Rejected',
        }

    if not predictions:
        return {
            'result': 'Passed',
            'defectType': 'None',
            'confidenceScore': 0.95,
            'sizeValidation': size_validation,
            'inventoryStatus': 'Available',
        }

    best = predictions[0]
    confidence = float(best['confidence'])
    defect_type = best['label']

    if confidence < AI_CONFIDENCE_THRESHOLD:
        result = 'Manual'
        inventory_status = 'Pending'
    else:
        result = 'Rejected'
        inventory_status = 'Rejected'

    return {
        'result': result,
        'defectType': defect_type,
        'confidenceScore': round(confidence, 4),
        'sizeValidation': size_validation,
        'inventoryStatus': inventory_status,
    }


def _call_roboflow_workflow(image_base64: str) -> dict:
    url = (
        f'{ROBOFLOW_API_URL.rstrip("/")}/infer/workflows/'
        f'{ROBOFLOW_WORKSPACE}/{ROBOFLOW_WORKFLOW_ID}'
    )
    payload = {
        'api_key': ROBOFLOW_API_KEY,
        'inputs': {
            'image': {'type': 'base64', 'value': image_base64},
            'classes': ROBOFLOW_DEFECT_CLASSES,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TileVision-Mobile/1.0 (YOLOv8-Roboflow)',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        body = error.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Roboflow HTTP {error.code}: {body[:500]}') from error
    except urllib.error.URLError as error:
        raise RuntimeError(f'Roboflow connection failed: {error}') from error


def _image_dimensions_from_base64(image_base64: str) -> tuple[int, int]:
    import cv2
    import numpy as np

    image_bytes = base64.b64decode(image_base64)
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        return 1, 1
    height, width = image.shape[:2]
    return width, height


def analyze_tile_image(
    image_base64: str,
    expected_dimension: str | None = None,
    mime_type: str = 'image/jpeg',
) -> dict:
    del mime_type

    if not is_roboflow_configured():
        raise RuntimeError(
            'Roboflow is not configured. Set ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE, '
            'and ROBOFLOW_WORKFLOW_ID in .env'
        )

    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',', 1)[-1]

    image_width, image_height = _image_dimensions_from_base64(image_base64)
    size_analysis = (
        validate_tile_size_from_base64(image_base64, expected_dimension)
        if expected_dimension
        else {
            'sizeValidation': 'Valid',
            'tolerancePercent': 5,
            'tileOutline': None,
            'imageWidth': image_width,
            'imageHeight': image_height,
            'note': 'Expected dimension not provided.',
        }
    )

    if size_analysis.get('imageWidth'):
        image_width = int(size_analysis['imageWidth'])
    if size_analysis.get('imageHeight'):
        image_height = int(size_analysis['imageHeight'])

    workflow_result = _call_roboflow_workflow(image_base64)
    workflow_size = _workflow_image_size(workflow_result)
    if workflow_size:
        image_width, image_height = workflow_size

    predictions = extract_predictions(workflow_result, image_width, image_height)
    inspection_result = build_inspection_result(predictions, size_analysis)

    overlay_defects = []
    for item in predictions:
        bbox = item.get('bbox')
        if not bbox:
            continue
        overlay_defects.append({
            **bbox,
            'class': item['class'],
            'label': item['label'],
            'confidence': item['confidence'],
        })

    return {
        'inspectionResult': inspection_result,
        'predictions': [
            {'class': item['class'], 'confidence': item['confidence'], 'label': item['label']}
            for item in predictions
        ],
        'sizeAnalysis': size_analysis,
        'overlay': {
            'imageWidth': image_width,
            'imageHeight': image_height,
            'defects': overlay_defects,
            'tileOutline': size_analysis.get('tileOutline'),
        },
        'provider': 'roboflow-yolov8+opencv',
        'workflowId': ROBOFLOW_WORKFLOW_ID,
    }
