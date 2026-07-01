# TileVision Tile Dataset (YOLOv8 Detection)

Train YOLOv8 to detect **Ceramic Tile** (phase 1) for inventory matching.

## Dataset location

```
tile_dataset/labeled/ceramic_tile/
├── 300x300/    ← your images (any subfolder OK)
├── 300x600/
└── 600x600/
```

Image sizes are resized automatically during training and inference (`imgsz=640`).

## Quick start

```bash
npm run ai:bootstrap
# add photos under labeled/ceramic_tile/
npm run ai:prepare
npm run ai:train
npm run api:dev
```

## Annotations

**Not required for phase 1.** `ai:prepare` auto-generates full-frame YOLO labels when `.txt` files are missing.

Optional manual label per image:

```
tile_dataset/labeled/ceramic_tile/labels/<image_name>.txt
```

YOLO format (normalized `class_id x_center y_center width height`):

```
0 0.5 0.5 0.92 0.92
```

## Do NOT use defect labels

No `intact`, `cracked`, `broken`, or `damaged` folders.

## Generated layout (after prepare)

```
tile_dataset/
├── images/train/
├── images/val/
├── labels/train/
└── labels/val/
```
