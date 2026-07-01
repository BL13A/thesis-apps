"""POST /api/inspect — YOLOv8 detection + OpenCV dimension validation + inventory matching."""

from __future__ import annotations

import base64
import sys
from pathlib import Path

from flask import Blueprint, g, jsonify, request

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from auth_middleware import authenticate, require_permission
from backend.controllers.ai_recognition_controller import (
    get_ai_model_status,
    inspect_tile_with_inventory,
)
from backend.services.ai_recognition_service import ModelNotReadyError
from repositories import find_user_by_id
from warehouse_repository import insert_recognition_log, list_tiles

inspect_bp = Blueprint('inspect', __name__, url_prefix='/api')


def _image_base64_from_request() -> str:
    if request.content_type and 'multipart/form-data' in request.content_type:
        upload = request.files.get('image')
        if upload:
            return base64.b64encode(upload.read()).decode('utf-8')

    body = request.get_json(silent=True) or {}
    return (body.get('imageBase64') or '').strip()


def _request_base_url() -> str:
    return request.host_url.rstrip('/')


@inspect_bp.post('/inspect')
@authenticate
@require_permission('recognize_tiles')
def inspect_tile():
    image_base64 = _image_base64_from_request()
    if not image_base64:
        return jsonify({'success': False, 'error': 'image is required.'}), 400

    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',', 1)[-1]

    tiles = list_tiles()
    if not tiles:
        return jsonify({'success': False, 'error': 'No tile products in inventory catalog.'}), 404

    save_log = request.args.get('saveLog', 'true').lower() not in ('false', '0', 'no')

    try:
        payload = inspect_tile_with_inventory(
            image_base64,
            tiles,
            save_capture=save_log,
            base_url=_request_base_url(),
        )
    except ModelNotReadyError as error:
        return jsonify({
            'success': False,
            'error': str(error),
            'model': get_ai_model_status(),
        }), 503
    except Exception as error:
        return jsonify({'success': False, 'error': f'AI inspect failed: {error}'}), 502

    log = None
    if save_log:
        primary = payload['detected_tiles'][0] if payload['detected_tiles'] else None
        matched_tile_id = primary.get('inventory_id') if primary else None
        matched_tile = next(
            (tile for tile in tiles if tile.get('id') == matched_tile_id),
            None,
        )
        user = find_user_by_id(g.auth['userId'])
        log = insert_recognition_log({
            'imageUri': payload.get('annotated_image_url') or payload.get('image_url'),
            'recognizedName': (
                matched_tile['name'] if matched_tile
                else primary['predicted_type'] if primary
                else 'Ceramic Tile'
            ),
            'tileType': (
                matched_tile['tileType'] if matched_tile
                else primary['predicted_type'] if primary
                else 'Ceramic'
            ),
            'confidenceScore': primary['confidence'] if primary else 0,
            'matchedTileId': matched_tile_id,
            'userId': g.auth['userId'],
            'userName': user['name'] if user else g.auth.get('email', 'Unknown'),
        })

    return jsonify({
        'success': True,
        **payload,
        'log': log,
    })
