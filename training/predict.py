#!/usr/bin/env python3
"""Run standalone YOLOv8 tile classification inference on a local image."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.ai_recognition_service import (  # noqa: E402
    ModelNotReadyError,
    get_model_status,
    predict_tile_category_from_bytes,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='TileVision YOLOv8 inference test')
    parser.add_argument('image', help='Path to tile image')
    parser.add_argument('--json', action='store_true', help='Print JSON output')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    image_path = Path(args.image)
    if not image_path.is_file():
        print(f'[ERROR] Image not found: {image_path}')
        return 1

    status = get_model_status()
    if not status['modelExists']:
        print('[ERROR] Trained model not found. Run training/train.py first.')
        print(json.dumps(status, indent=2))
        return 1

    try:
        prediction = predict_tile_category_from_bytes(image_path.read_bytes(), save_capture=False)
    except ModelNotReadyError as error:
        print(f'[ERROR] {error}')
        return 1

    payload = {
        'category': prediction.category,
        'confidence': prediction.confidence,
        'classId': prediction.class_id,
        'provider': prediction.provider,
        'topPredictions': prediction.top_predictions,
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"Category:   {payload['category']}")
        print(f"Confidence: {payload['confidence']:.2%}")
        print('Top predictions:')
        for item in payload['topPredictions']:
            print(f"  - {item['category']}: {item['confidence']:.2%}")

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
