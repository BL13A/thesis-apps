#!/usr/bin/env python3
"""Train TileVision YOLOv8 tile detection model."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config.ai_paths import (  # noqa: E402
    DATASET_YAML_PATH,
    TILE_DATASET_IMAGES_DIR,
    TRAINING_DIR,
    YOLO_BASE_WEIGHTS,
    YOLO_IMAGE_SIZE,
    YOLO_MODEL_PATH,
    ensure_ai_directories,
)
from backend.services.ai_recognition_service import copy_trained_weights, unload_model  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Train TileVision YOLOv8 tile detector')
    parser.add_argument('--data', default=str(DATASET_YAML_PATH), help='Path to dataset.yaml')
    parser.add_argument('--model', default=YOLO_BASE_WEIGHTS, help='Base YOLOv8 detection weights')
    parser.add_argument('--epochs', type=int, default=80)
    parser.add_argument('--imgsz', type=int, default=YOLO_IMAGE_SIZE)
    parser.add_argument('--batch', type=int, default=8)
    parser.add_argument('--project', default=str(TRAINING_DIR / 'runs'), help='Training run output directory')
    parser.add_argument('--name', default='tilevision_detect', help='Run name')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_ai_directories()

    data_yaml = Path(args.data)
    if not data_yaml.is_file():
        print('[ERROR] dataset.yaml not found. Run: python training/prepare_dataset.py')
        return 1

    if not (TILE_DATASET_IMAGES_DIR / 'train').is_dir():
        print('[ERROR] images/train not found. Run: python training/prepare_dataset.py')
        return 1

    try:
        from ultralytics import YOLO
    except ImportError:
        print('[ERROR] ultralytics not installed. Run: pip install -r training/requirements.txt')
        return 1

    print(f'Training YOLOv8 detection with data={args.data}')
    print(f'Base model={args.model}, imgsz={args.imgsz}')

    model = YOLO(args.model)
    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=args.project,
        name=args.name,
        exist_ok=True,
    )

    run_dir = Path(results.save_dir) if hasattr(results, 'save_dir') else Path(args.project) / args.name
    best_weights = run_dir / 'weights' / 'best.pt'
    if not best_weights.is_file():
        print(f'[ERROR] best.pt not found at {best_weights}')
        return 1

    copied = copy_trained_weights(best_weights, YOLO_MODEL_PATH)
    unload_model()
    print(f'\nTraining complete. Model exported to: {copied}')
    print('Restart the API server, then test with: python training/predict.py <image_path>')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
