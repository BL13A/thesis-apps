import base64
import sys
from pathlib import Path

from flask import Blueprint, jsonify, request

# Allow imports from TileVision-Mobile/backend/
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from auth_middleware import authenticate, require_permission
from backend.routes.ai_recognition_routes import register_ai_recognition_routes
from roboflow_service import analyze_tile_image, is_roboflow_configured

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# YOLOv8 tile recognition: /status, /model, /recognize
register_ai_recognition_routes(ai_bp)


@ai_bp.get('/legacy-status')
@authenticate
def legacy_roboflow_status():
    return jsonify({
        'success': True,
        'configured': is_roboflow_configured(),
        'provider': 'roboflow-yolov8' if is_roboflow_configured() else None,
    })


@ai_bp.post('/analyze-tile')
@authenticate
@require_permission('recognize_tiles')
def analyze_tile():
    """Legacy defect-analysis endpoint (Roboflow). Tile identification uses POST /api/ai/recognize."""
    if not is_roboflow_configured():
        return jsonify({
            'success': False,
            'error': 'Roboflow AI is not configured on the server. Add ROBOFLOW_API_KEY to .env',
        }), 503

    image_base64 = ''
    mime_type = 'image/jpeg'
    expected_dimension = ''

    if request.content_type and 'multipart/form-data' in request.content_type:
        upload = request.files.get('image')
        if upload:
            image_base64 = base64.b64encode(upload.read()).decode('utf-8')
            mime_type = upload.mimetype or request.form.get('mimeType') or 'image/jpeg'
        expected_dimension = (request.form.get('expectedDimension') or '').strip()
    else:
        body = request.get_json(silent=True) or {}
        image_base64 = (body.get('imageBase64') or '').strip()
        mime_type = (body.get('mimeType') or 'image/jpeg').strip()
        expected_dimension = (body.get('expectedDimension') or '').strip()

    if not image_base64:
        return jsonify({'success': False, 'error': 'image is required.'}), 400

    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',', 1)[-1]

    try:
        analysis = analyze_tile_image(
            image_base64,
            expected_dimension=expected_dimension or None,
            mime_type=mime_type,
        )
    except Exception as error:
        print(f'[ROBOFLOW ERROR] {error}', flush=True)
        detail = str(error)
        if '403' in detail or '1010' in detail:
            user_message = 'Roboflow blocked the server request. Restart API after update.'
        elif '401' in detail:
            user_message = 'Invalid Roboflow API key. Check ROBOFLOW_API_KEY in .env'
        else:
            user_message = 'AI inspection failed. Check Roboflow API key and workflow settings.'
        return jsonify({
            'success': False,
            'error': user_message,
        }), 502

    return jsonify({
        'success': True,
        'inspectionResult': analysis['inspectionResult'],
        'predictions': analysis['predictions'],
        'sizeAnalysis': analysis['sizeAnalysis'],
        'overlay': analysis['overlay'],
        'provider': analysis['provider'],
        'workflowId': analysis['workflowId'],
    })
