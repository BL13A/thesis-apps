"""YOLOv8 detection model loading and tile recognition inference."""

from __future__ import annotations

import base64
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.config.ai_paths import (
    RECOGNITION_LOGS_DIR,
    TRAINING_DIR,
    YOLO_IMAGE_SIZE,
    YOLO_MODEL_PATH,
    ensure_ai_directories,
)
from backend.config.tile_classes import (
    format_detected_class_label,
    format_tile_type_detection_label,
    is_defect_class_label,
    model_has_defect_classes,
    sanitize_display_label,
)

_model = None
_model_lock = threading.Lock()
_class_names: list[str] = []
_loaded_model_mtime: float | None = None


@dataclass
class YoloInference:
    category: str
    confidence: float
    class_id: int
    provider: str
    model_path: str
    top_predictions: list[dict[str, Any]]
    image_bgr: Any
    image_bytes: bytes
    raw_result: Any


@dataclass
class YoloPrediction:
    category: str
    confidence: float
    class_id: int
    provider: str
    model_path: str
    top_predictions: list[dict[str, Any]]
    annotated_image_base64: str
    annotated_image_path: str | None
    boxes: list[dict[str, Any]]


class ModelNotReadyError(RuntimeError):
    pass


def is_yolo_model_available() -> bool:
    return YOLO_MODEL_PATH.is_file()


def get_model_status() -> dict:
    ensure_ai_directories()
    status = {
        'configured': True,
        'provider': 'yolov8-tile-detection',
        'task': 'tile-detection',
        'modelPath': str(YOLO_MODEL_PATH),
        'modelLoaded': _model is not None,
        'modelExists': is_yolo_model_available(),
        'classCount': len(_class_names),
        'classNames': list(_class_names),
        'recognitionLogsDir': str(RECOGNITION_LOGS_DIR),
    }
    if not status['modelExists']:
        status['message'] = (
            'Trained model not found. Run training/prepare_dataset.py then training/train.py '
            f'to create {YOLO_MODEL_PATH.name}.'
        )
    return status


def _class_names_from_model(model) -> list[str]:
    names = getattr(model, 'names', None)
    if isinstance(names, dict):
        return [str(names[key]) for key in sorted(names.keys(), key=lambda k: int(k))]
    if isinstance(names, list):
        return [str(name) for name in names]
    return []


def _class_names_from_path(model_path: Path) -> list[str]:
    from ultralytics import YOLO

    model = YOLO(str(model_path))
    return _class_names_from_model(model)


def _validate_model_class_names(class_names: list[str], model_path: Path) -> None:
    if not class_names:
        return
    if model_has_defect_classes(class_names) or any(
        is_defect_class_label(name) for name in class_names
    ):
        raise ModelNotReadyError(
            f'Invalid defect-detection model at {model_path} (classes: {class_names}). '
            'Run: npm run ai:prepare && npm run ai:train, then restart the API.'
        )


def ensure_valid_production_model() -> dict:
    """Ensure models/tilevision_yolov8.pt is the Ceramic Tile detector, not legacy intact model."""
    detect_best = TRAINING_DIR / 'runs' / 'tilevision_detect' / 'weights' / 'best.pt'

    def _is_valid(path: Path) -> bool:
        if not path.is_file():
            return False
        try:
            names = _class_names_from_path(path)
        except Exception:
            return False
        return bool(names) and not any(is_defect_class_label(name) for name in names)

    if _is_valid(YOLO_MODEL_PATH):
        names = _class_names_from_path(YOLO_MODEL_PATH)
        return {
            'status': 'ok',
            'modelPath': str(YOLO_MODEL_PATH),
            'classNames': names,
        }

    unload_model()
    if _is_valid(detect_best):
        copied = copy_trained_weights(detect_best, YOLO_MODEL_PATH)
        names = _class_names_from_path(copied)
        return {
            'status': 'repaired',
            'modelPath': str(copied),
            'classNames': names,
            'message': 'Replaced legacy model with latest Ceramic Tile detector.',
        }

    raise ModelNotReadyError(
        'No valid Ceramic Tile YOLO model found. Run: npm run ai:prepare && npm run ai:train'
    )


def _load_ultralytics_model():
    global _model, _class_names, _loaded_model_mtime

    if not _model_needs_reload():
        return _model

    unload_model()

    if not is_yolo_model_available():
        raise ModelNotReadyError(
            f'YOLO model not found at {YOLO_MODEL_PATH}. Train the model first (see training/train.py).'
        )

    try:
        from ultralytics import YOLO
    except ImportError as error:
        raise ModelNotReadyError(
            'ultralytics is not installed. Run: pip install -r training/requirements.txt'
        ) from error

    with _model_lock:
        if _model is None:
            _model = YOLO(str(YOLO_MODEL_PATH))
            _class_names = _class_names_from_model(_model)
            _validate_model_class_names(_class_names, YOLO_MODEL_PATH)
            _loaded_model_mtime = _disk_model_mtime()

    return _model


def unload_model() -> None:
    global _model, _class_names, _loaded_model_mtime
    with _model_lock:
        _model = None
        _class_names = []
        _loaded_model_mtime = None


def _disk_model_mtime() -> float:
    if not YOLO_MODEL_PATH.is_file():
        return 0.0
    return YOLO_MODEL_PATH.stat().st_mtime


def _model_needs_reload() -> bool:
    if _model is None:
        return True
    if _class_names and any(is_defect_class_label(name) for name in _class_names):
        return True
    disk_mtime = _disk_model_mtime()
    if _loaded_model_mtime is None or disk_mtime != _loaded_model_mtime:
        return True
    return False


def _image_bytes_from_base64(image_base64: str) -> bytes:
    payload = image_base64.strip()
    if payload.startswith('data:'):
        payload = payload.split(',', 1)[-1]
    return base64.b64decode(payload)


def _decode_image_bgr(image_bytes: bytes):
    import cv2
    import numpy as np

    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('Unable to decode image bytes for inference.')
    return image


def _encode_image_jpeg_base64(image_bgr) -> str:
    import cv2

    success, buffer = cv2.imencode('.jpg', image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not success:
        raise RuntimeError('Failed to encode annotated image.')
    return base64.b64encode(buffer).decode('utf-8')


def _extract_boxes(result, image_bgr, category: str, confidence: float) -> list[dict[str, Any]]:
    boxes_attr = getattr(result, 'boxes', None)
    names = result.names if hasattr(result, 'names') else {}
    detections: list[dict[str, Any]] = []

    if boxes_attr is not None and len(boxes_attr) > 0:
        for box in boxes_attr:
            xyxy = [float(value) for value in box.xyxy[0].tolist()]
            cls_id = int(box.cls[0])
            raw_label = str(names.get(cls_id, names[cls_id] if isinstance(names, list) else f'class_{cls_id}'))
            detections.append({
                'x1': xyxy[0],
                'y1': xyxy[1],
                'x2': xyxy[2],
                'y2': xyxy[3],
                'confidence': round(float(box.conf[0]), 4),
                'raw_label': raw_label,
                'label': format_tile_type_detection_label(raw_label),
            })
        detections.sort(key=lambda item: float(item['confidence']), reverse=True)
        return detections[:1]

    height, width = image_bgr.shape[:2]
    margin_x = int(width * 0.08)
    margin_y = int(height * 0.08)
    return [{
        'x1': float(margin_x),
        'y1': float(margin_y),
        'x2': float(width - margin_x),
        'y2': float(height - margin_y),
        'confidence': round(confidence, 4),
        'label': category,
    }]


def _annotate_image(image_bgr, result, category: str, confidence: float):
    import cv2

    try:
        plotted = result.plot()
        if plotted is not None:
            return plotted
    except Exception:
        pass

    annotated = image_bgr.copy()
    height, width = annotated.shape[:2]
    margin_x = int(width * 0.08)
    margin_y = int(height * 0.08)
    cv2.rectangle(
        annotated,
        (margin_x, margin_y),
        (width - margin_x, height - margin_y),
        (34, 197, 94),
        3,
    )
    label = f'{category} {confidence:.0%}'
    font_scale = max(0.5, min(width, height) / 900)
    thickness = max(1, int(font_scale * 2))
    (text_width, text_height), baseline = cv2.getTextSize(
        label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness,
    )
    text_y = max(margin_y + text_height + 8, text_height + 8)
    cv2.rectangle(
        annotated,
        (margin_x, text_y - text_height - 8),
        (margin_x + text_width + 12, text_y + baseline),
        (34, 197, 94),
        -1,
    )
    cv2.putText(
        annotated,
        label,
        (margin_x + 6, text_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )
    return annotated


def save_annotated_image(image_bgr, category: str) -> str | None:
    try:
        ensure_ai_directories()
        safe_category = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in category)[:48]
        filename = f'annotated_{safe_category}_{abs(hash(image_bgr.tobytes()[:128])) % 10_000_000}.jpg'
        target = RECOGNITION_LOGS_DIR / filename
        import cv2

        cv2.imwrite(str(target), image_bgr)
        return str(target)
    except OSError:
        return None


def _save_inference_capture(image_bytes: bytes, category: str) -> str | None:
    """Persist a copy of the inference image for audit/training review."""
    try:
        ensure_ai_directories()
        safe_category = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in category)[:48]
        filename = f'{safe_category}_{abs(hash(image_bytes[:64])) % 10_000_000}.jpg'
        target = RECOGNITION_LOGS_DIR / filename
        target.write_bytes(image_bytes)
        return str(target)
    except OSError:
        return None


def _resolve_names(result, model) -> dict | list:
    names = result.names if hasattr(result, 'names') else getattr(model, 'names', {})
    return names if names else {}


def _label_from_names(names: dict | list, class_id: int) -> str:
    if isinstance(names, dict):
        return str(names.get(class_id, f'class_{class_id}'))
    if isinstance(names, list) and 0 <= class_id < len(names):
        return str(names[class_id])
    return f'class_{class_id}'


def _inference_from_detection(result, model, image_bgr, image_bytes) -> YoloInference:
    boxes_attr = result.boxes
    names = _resolve_names(result, model)
    best_index = int(boxes_attr.conf.argmax())
    class_id = int(boxes_attr.cls[best_index])
    confidence = float(boxes_attr.conf[best_index])
    category = _label_from_names(names, class_id)

    class_scores: dict[int, float] = {}
    for index in range(len(boxes_attr)):
        cls_id = int(boxes_attr.cls[index])
        score = float(boxes_attr.conf[index])
        class_scores[cls_id] = max(class_scores.get(cls_id, 0.0), score)

    top_predictions = [
        {
            'category': _label_from_names(names, cls_id),
            'confidence': round(score, 4),
            'classId': cls_id,
        }
        for cls_id, score in sorted(class_scores.items(), key=lambda item: item[1], reverse=True)
    ]

    return YoloInference(
        category=category,
        confidence=round(confidence, 4),
        class_id=class_id,
        provider='yolov8-tile-detection',
        model_path=str(YOLO_MODEL_PATH),
        top_predictions=top_predictions,
        image_bgr=image_bgr,
        image_bytes=image_bytes,
        raw_result=result,
    )


def _inference_from_classification(result, model, image_bgr, image_bytes) -> YoloInference:
    probs = result.probs
    names = _resolve_names(result, model)
    top1_index = int(probs.top1)
    top1_conf = float(probs.top1conf)
    category = _label_from_names(names, top1_index)

    top_predictions: list[dict[str, Any]] = []
    top5_indices = list(getattr(probs, 'top5', []))[:5]
    top5_confs = list(getattr(probs, 'top5conf', []))[:5]
    for index, conf in zip(top5_indices, top5_confs):
        top_predictions.append({
            'category': _label_from_names(names, int(index)),
            'confidence': round(float(conf), 4),
            'classId': int(index),
        })

    return YoloInference(
        category=category,
        confidence=round(top1_conf, 4),
        class_id=top1_index,
        provider='yolov8-tile-classification',
        model_path=str(YOLO_MODEL_PATH),
        top_predictions=top_predictions,
        image_bgr=image_bgr,
        image_bytes=image_bytes,
        raw_result=result,
    )


def _reject_defect_inference(inference: YoloInference) -> YoloInference:
    if is_defect_class_label(inference.category):
        raise ModelNotReadyError(
            f'Model returned invalid defect label "{inference.category}". '
            'Restart the API after running npm run ai:train.'
        )
    inference.top_predictions = [
        item for item in inference.top_predictions
        if not is_defect_class_label(str(item.get('category', '')))
    ]
    return inference


def run_yolo_inference(image_base64: str) -> YoloInference:
    if _model_needs_reload() or not is_yolo_model_available():
        ensure_valid_production_model()
    model = _load_ultralytics_model()
    image_bytes = _image_bytes_from_base64(image_base64)
    image_bgr = _decode_image_bgr(image_bytes)

    results = model.predict(source=image_bgr, verbose=False, imgsz=YOLO_IMAGE_SIZE)
    if not results:
        raise RuntimeError('YOLO inference returned no results.')

    result = results[0]
    boxes_attr = getattr(result, 'boxes', None)
    if boxes_attr is not None and len(boxes_attr) > 0:
        return _reject_defect_inference(
            _inference_from_detection(result, model, image_bgr, image_bytes),
        )

    probs = getattr(result, 'probs', None)
    if probs is not None:
        return _reject_defect_inference(
            _inference_from_classification(result, model, image_bgr, image_bytes),
        )

    raise RuntimeError('YOLO inference returned no detection boxes or classification scores.')


def annotate_detection_boxes(image_bgr, boxes: list[dict[str, Any]]):
    import cv2

    annotated = image_bgr.copy()
    height, width = annotated.shape[:2]
    for box in boxes:
        x1 = max(0, int(box.get('x1', 0)))
        y1 = max(0, int(box.get('y1', 0)))
        x2 = min(width, int(box.get('x2', width)))
        y2 = min(height, int(box.get('y2', height)))
        if x2 <= x1 or y2 <= y1:
            continue

        label = str(box.get('label') or 'Tile')
        confidence = float(box.get('confidence') or 0.0)
        caption = f'{label} {confidence:.0%}'
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (59, 130, 246), 3)

        font_scale = max(0.45, min(width, height) / 1000)
        thickness = max(1, int(font_scale * 2))
        (text_width, text_height), baseline = cv2.getTextSize(
            caption,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness,
        )
        text_y = max(y1 + text_height + 8, text_height + 8)
        cv2.rectangle(
            annotated,
            (x1, text_y - text_height - 8),
            (x1 + text_width + 12, text_y + baseline),
            (59, 130, 246),
            -1,
        )
        cv2.putText(
            annotated,
            caption,
            (x1 + 6, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA,
        )
    return annotated


def build_tile_prediction(
    inference: YoloInference,
    display_label: str,
    *,
    confidence: float | None = None,
    save_capture: bool = True,
) -> YoloPrediction:
    score = confidence if confidence is not None else inference.confidence
    safe_slug = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in display_label)[:48]

    if save_capture:
        _save_inference_capture(inference.image_bytes, safe_slug)

    boxes = _extract_boxes(inference.raw_result, inference.image_bgr, display_label, score)
    annotated_bgr = _annotate_image(inference.image_bgr, inference.raw_result, display_label, score)
    annotated_image_base64 = _encode_image_jpeg_base64(annotated_bgr)
    annotated_image_path = save_annotated_image(annotated_bgr, safe_slug) if save_capture else None

    return YoloPrediction(
        category=inference.category,
        confidence=round(score, 4),
        class_id=inference.class_id,
        provider=inference.provider,
        model_path=inference.model_path,
        top_predictions=inference.top_predictions,
        annotated_image_base64=annotated_image_base64,
        annotated_image_path=annotated_image_path,
        boxes=boxes,
    )


def predict_tile_category(image_base64: str, *, save_capture: bool = True) -> YoloPrediction:
    inference = run_yolo_inference(image_base64)
    return build_tile_prediction(inference, inference.category, save_capture=save_capture)


def predict_tile_category_from_bytes(image_bytes: bytes, *, save_capture: bool = True) -> YoloPrediction:
    encoded = base64.b64encode(image_bytes).decode('utf-8')
    return predict_tile_category(encoded, save_capture=save_capture)


def copy_trained_weights(source_path: str | Path, destination: Path | None = None) -> Path:
    """Copy best.pt from a training run into models/tilevision_yolov8.pt."""
    import shutil

    destination = destination or YOLO_MODEL_PATH
    ensure_ai_directories()
    shutil.copy2(source_path, destination)
    unload_model()
    return destination
