"""Test Roboflow workflow with a local image file."""

import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from roboflow_service import analyze_tile_image, is_roboflow_configured

if __name__ == '__main__':
    if not is_roboflow_configured():
        print('Roboflow is not configured in .env')
        sys.exit(1)

    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not image_path or not image_path.exists():
        print('Usage: python server-flask/scripts/test_roboflow.py path/to/tile.jpg')
        sys.exit(1)

    encoded = base64.b64encode(image_path.read_bytes()).decode('utf-8')
    result = analyze_tile_image(encoded)
    print(json.dumps(result, indent=2))
