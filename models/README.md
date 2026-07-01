# TileVision Trained Models

After training, the exported classifier is saved here:

```
models/tilevision_yolov8.pt
```

This file is loaded by the Flask API for `/api/ai/recognize`.

Training command:

```bash
python training/train.py
```

The API returns `503` with setup instructions until this file exists.
