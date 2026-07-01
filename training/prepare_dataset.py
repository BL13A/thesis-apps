#!/usr/bin/env python3
"""
Prepare tile_dataset for YOLOv8 object detection training.

Trains Ceramic, Decor, Glazed Polished Porcelain, and Porcelain tile classes.

Workflow:
1. Place images in tile_dataset/labeled/<class_name>/  (subfolders like 300x300/ OK)
2. Optional: add manual YOLO labels at tile_dataset/labeled/<class_name>/labels/<image>.txt
   If missing, a full-frame bounding box is auto-generated (tile fills the frame).
3. Run: python training/prepare_dataset.py
4. Creates tile_dataset/images/{train,val}/ and tile_dataset/labels/{train,val}/
"""

from __future__ import annotations

import random
import shutil
import sys
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config.tile_classes import is_defect_class_label  # noqa: E402
from backend.config.ai_paths import (  # noqa: E402
    DATASET_YAML_PATH,
    TILE_DATASET_DIR,
    TILE_DATASET_IMAGES_DIR,
    TILE_DATASET_LABELS_DIR,
    TILE_DATASET_LABELED_DIR,
    ensure_ai_directories,
)

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
TRAIN_RATIO = 0.8
RANDOM_SEED = 42
LABEL_MARGIN = 0.04

ACTIVE_TRAINING_CLASSES = [
    'ceramic_tile',
    'decor',
    'glazed_polished_porcelain',
    'porcelain_tile',
]

CLASS_DISPLAY_NAMES = {
    'ceramic_tile': 'Ceramic',
    'decor': 'Decor',
    'glazed_polished_porcelain': 'Glazed Polished Porcelain',
    'porcelain_tile': 'Porcelain',
}


def _list_images(folder: Path) -> list[Path]:
    return sorted(
        path
        for path in folder.rglob('*')
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
        and path.parent.name != 'labels'
    )


def _manual_label_path(image_path: Path) -> Path | None:
    labels_dir = image_path.parent / 'labels'
    if not labels_dir.is_dir():
        labels_dir = image_path.parent.parent / 'labels'
    if not labels_dir.is_dir():
        return None

    candidate = labels_dir / f'{image_path.stem}.txt'
    return candidate if candidate.is_file() else None


def _auto_label_content(class_id: int) -> str:
    span = 1.0 - (2 * LABEL_MARGIN)
    return f'{class_id} 0.5 0.5 {span:.6f} {span:.6f}\n'


def _clear_detection_dirs() -> None:
    for root in (TILE_DATASET_IMAGES_DIR, TILE_DATASET_LABELS_DIR):
        if root.exists():
            shutil.rmtree(root)
    for split in ('train', 'val'):
        (TILE_DATASET_IMAGES_DIR / split).mkdir(parents=True, exist_ok=True)
        (TILE_DATASET_LABELS_DIR / split).mkdir(parents=True, exist_ok=True)


def _collect_class_dirs() -> list[Path]:
    if not TILE_DATASET_LABELED_DIR.is_dir():
        return []
    return sorted(path for path in TILE_DATASET_LABELED_DIR.iterdir() if path.is_dir())


def _write_dataset_yaml(class_names: list[str]) -> None:
    payload = {
        'path': str(TILE_DATASET_DIR.resolve()),
        'train': 'images/train',
        'val': 'images/val',
        'names': {
            index: CLASS_DISPLAY_NAMES.get(name, name.replace('_', ' ').title())
            for index, name in enumerate(class_names)
        },
    }
    DATASET_YAML_PATH.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def main() -> int:
    ensure_ai_directories()
    class_dirs = _collect_class_dirs()

    if not class_dirs:
        print('[ERROR] No labeled class folders found.')
        print(f'  Create: {TILE_DATASET_LABELED_DIR}/ceramic_tile/ and add images.')
        return 1

    _clear_detection_dirs()

    class_names: list[str] = []
    pending: list[tuple[Path, str, int]] = []
    manual_labels = 0
    auto_labels = 0

    for class_dir in class_dirs:
        class_name = class_dir.name

        if is_defect_class_label(class_name):
            print(f'[SKIP] Defect class folder: {class_name}')
            continue

        if ACTIVE_TRAINING_CLASSES and class_name not in ACTIVE_TRAINING_CLASSES:
            print(f'[SKIP] Not in active training set: {class_name}')
            continue

        images = _list_images(class_dir)
        if not images:
            print(f'[WARN] No images in: {class_dir}')
            continue

        class_id = len(class_names)
        class_names.append(class_name)
        for image_path in images:
            pending.append((image_path, class_name, class_id))

        print(f'  {class_name}: {len(images)} images')

    if not class_names:
        print('[ERROR] No training images found for active classes:', ACTIVE_TRAINING_CLASSES)
        return 1

    rng = random.Random(RANDOM_SEED)
    rng.shuffle(pending)

    split_index = max(1, int(len(pending) * TRAIN_RATIO))
    if len(pending) > 1 and split_index >= len(pending):
        split_index = len(pending) - 1

    train_items = pending[:split_index]
    val_items = pending[split_index:] or pending[-1:]

    def _copy_split(items: list[tuple[Path, str, int]], split: str) -> tuple[int, int]:
        nonlocal manual_labels, auto_labels
        count = 0
        for index, (image_path, class_name, class_id) in enumerate(items):
            stem = f'{class_name}_{index:04d}'
            ext = image_path.suffix.lower()
            image_target = TILE_DATASET_IMAGES_DIR / split / f'{stem}{ext}'
            label_target = TILE_DATASET_LABELS_DIR / split / f'{stem}.txt'

            shutil.copy2(image_path, image_target)

            manual = _manual_label_path(image_path)
            if manual:
                label_target.write_text(manual.read_text(encoding='utf-8').strip() + '\n', encoding='utf-8')
                manual_labels += 1
            else:
                label_target.write_text(_auto_label_content(class_id), encoding='utf-8')
                auto_labels += 1

            count += 1
        return count, len(items)

    train_count, _ = _copy_split(train_items, 'train')
    val_count, _ = _copy_split(val_items, 'val')

    _write_dataset_yaml(class_names)

    print('\nDataset prepared for YOLOv8 detection.')
    print(f'  Classes: {class_names}')
    print(f'  Train images: {train_count}')
    print(f'  Val images: {val_count}')
    print(f'  Manual labels: {manual_labels}')
    print(f'  Auto-generated labels: {auto_labels}')
    print(f'  Config: {DATASET_YAML_PATH}')
    if auto_labels:
        print(
            '\n  NOTE: Auto labels use a full-frame box (tile fills the photo). '
            'For tighter boxes, add YOLO .txt files under labeled/<class>/labels/<image>.txt'
        )
    print('\nNext: npm run ai:train')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
