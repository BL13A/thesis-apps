#!/usr/bin/env python3
"""Create tile_dataset/labeled/<category>/ folders for YOLOv8 training."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config.ai_paths import TILE_DATASET_LABELED_DIR, ensure_ai_directories  # noqa: E402
from backend.config.tile_classes import TILE_CATEGORY_CLASSES, is_defect_class_label  # noqa: E402

# Tile categories — phase 1 trains ceramic_tile only (see prepare_dataset.py)
INVENTORY_CATEGORIES = {
    'ceramic_tile': 'Ceramic',
    'decor': 'Decor',
    'glazed_polished_porcelain': 'Glazed Polished Porcelain',
    'porcelain_tile': 'Porcelain',
}


def main() -> int:
    ensure_ai_directories()
    TILE_DATASET_LABELED_DIR.mkdir(parents=True, exist_ok=True)

    print('YOLOv8 category folders:')
    for class_name, display in INVENTORY_CATEGORIES.items():
        if is_defect_class_label(class_name):
            print(f'  [SKIP] {class_name}')
            continue
        target = TILE_DATASET_LABELED_DIR / class_name
        target.mkdir(parents=True, exist_ok=True)
        readme = target / 'README.txt'
        if not readme.exists():
            readme.write_text(
                f'Add real photos of {display} for YOLOv8 detection training.\n'
                f'Folder class: {class_name}\n'
                f'Inventory tileType: {TILE_CATEGORY_CLASSES.get(class_name, "")}\n'
                f'Image sizes (300x300, 300x600, 600x600, etc.) are resized automatically at imgsz=640.\n'
                f'Optional manual labels: labels/<image_name>.txt (YOLO xywh normalized format)\n',
                encoding='utf-8',
            )
        print(f'  {class_name} -> {display}')

    print('\nPhase 1 active class: ceramic_tile')
    print('Next: add photos, then npm run ai:prepare && npm run ai:train')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
