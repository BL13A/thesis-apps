"""Central path configuration for TileVision AI training and inference."""

from __future__ import annotations

import os
from pathlib import Path

# TileVision-Mobile project root (parent of backend/)
PROJECT_ROOT = Path(__file__).resolve().parents[2]

TILE_DATASET_DIR = Path(os.getenv('TILE_DATASET_DIR', PROJECT_ROOT / 'tile_dataset')).resolve()
MODELS_DIR = Path(os.getenv('MODELS_DIR', PROJECT_ROOT / 'models')).resolve()
TRAINING_DIR = Path(os.getenv('TRAINING_DIR', PROJECT_ROOT / 'training')).resolve()
RECOGNITION_LOGS_DIR = Path(
    os.getenv('RECOGNITION_LOGS_DIR', PROJECT_ROOT / 'recognition_logs'),
).resolve()

YOLO_MODEL_FILENAME = os.getenv('YOLO_MODEL_FILE', 'tilevision_yolov8.pt')
YOLO_MODEL_PATH = MODELS_DIR / YOLO_MODEL_FILENAME
YOLO_BASE_WEIGHTS = os.getenv('YOLO_BASE_WEIGHTS', 'yolov8n.pt')
YOLO_IMAGE_SIZE = int(os.getenv('YOLO_IMAGE_SIZE', '640'))
DATASET_YAML_PATH = TRAINING_DIR / 'dataset.yaml'

# Dataset layout
TILE_DATASET_RAW_DIR = TILE_DATASET_DIR / 'raw'
TILE_DATASET_LABELED_DIR = TILE_DATASET_DIR / 'labeled'
TILE_DATASET_IMAGES_DIR = TILE_DATASET_DIR / 'images'
TILE_DATASET_LABELS_DIR = TILE_DATASET_DIR / 'labels'
# Legacy classification folders (deprecated)
TILE_DATASET_TRAIN_DIR = TILE_DATASET_DIR / 'train'
TILE_DATASET_VAL_DIR = TILE_DATASET_DIR / 'val'


def ensure_ai_directories() -> None:
    for path in (
        TILE_DATASET_DIR,
        TILE_DATASET_RAW_DIR,
        TILE_DATASET_LABELED_DIR,
        TILE_DATASET_IMAGES_DIR,
        TILE_DATASET_LABELS_DIR,
        TILE_DATASET_TRAIN_DIR,
        TILE_DATASET_VAL_DIR,
        MODELS_DIR,
        TRAINING_DIR,
        RECOGNITION_LOGS_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)


def get_ai_paths_summary() -> dict:
    return {
        'projectRoot': str(PROJECT_ROOT),
        'tileDatasetDir': str(TILE_DATASET_DIR),
        'modelsDir': str(MODELS_DIR),
        'trainingDir': str(TRAINING_DIR),
        'recognitionLogsDir': str(RECOGNITION_LOGS_DIR),
        'modelPath': str(YOLO_MODEL_PATH),
        'datasetYaml': str(DATASET_YAML_PATH),
        'modelExists': YOLO_MODEL_PATH.is_file(),
    }
