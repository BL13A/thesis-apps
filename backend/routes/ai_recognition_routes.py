"""Flask route handlers for AI tile recognition (register via server-flask)."""

from __future__ import annotations

import base64
from pathlib import Path

from flask import g, jsonify, request, send_file

from auth_middleware import authenticate, require_permission
from backend.controllers.ai_recognition_controller import (
    get_ai_model_status,
    recognize_tile_with_inventory,
)
from backend.services.ai_recognition_service import ModelNotReadyError
from repositories import find_user_by_id
from backend.config.ai_paths import RECOGNITION_LOGS_DIR
from utils import public_recognition_image_uri
from warehouse_repository import get_recommendations_for_tile, insert_recognition_log, list_tiles


def _stored_recognition_image_uri(recognition: dict) -> str | None:
    path = recognition.get('annotated_image_path')
    if path:
        filename = Path(str(path)).name
        return f'/api/ai/recognition-images/{filename}'
    return public_recognition_image_uri(recognition.get('annotated_image'))


def _build_recommendations(matched_tile: dict | None) -> list[dict]:
    if not matched_tile:
        return []

    recommendations = get_recommendations_for_tile(matched_tile['id'])
    stock_status = matched_tile.get('stockStatus')
    if stock_status in ('Low Stock', 'Out of Stock'):
        return [
            tile for tile in recommendations if tile.get('stockStatus') == 'In Stock'
        ][:6]
    return recommendations[:4]


def register_ai_recognition_routes(blueprint) -> None:
    @blueprint.get('/status')
    @authenticate
    def ai_status():
        status = get_ai_model_status()
        return jsonify({'success': True, **status})

    @blueprint.get('/model')
    @authenticate
    @require_permission('recognize_tiles')
    def ai_model_info():
        return jsonify({'success': True, 'model': get_ai_model_status()})

    @blueprint.get('/recognition-images/<path:filename>')
    def get_recognition_image(filename: str):
        safe_name = Path(filename).name
        if not safe_name or safe_name != filename:
            return jsonify({'success': False, 'error': 'Invalid image name.'}), 400

        file_path = RECOGNITION_LOGS_DIR / safe_name
        if not file_path.is_file():
            return jsonify({'success': False, 'error': 'Image not found.'}), 404

        return send_file(file_path, mimetype='image/jpeg')

    @blueprint.post('/recognize')
    @authenticate
    @require_permission('recognize_tiles')
    def recognize_tile():
        image_base64 = ''

        if request.content_type and 'multipart/form-data' in request.content_type:
            upload = request.files.get('image')
            if upload:
                image_base64 = base64.b64encode(upload.read()).decode('utf-8')
        else:
            body = request.get_json(silent=True) or {}
            image_base64 = (body.get('imageBase64') or '').strip()

        if not image_base64:
            return jsonify({'success': False, 'error': 'image is required.'}), 400

        if image_base64.startswith('data:'):
            image_base64 = image_base64.split(',', 1)[-1]

        tiles = list_tiles()
        if not tiles:
            return jsonify({'success': False, 'error': 'No tile products in inventory catalog.'}), 404

        save_log = request.args.get('saveLog', 'true').lower() not in ('false', '0', 'no')

        try:
            recognition = recognize_tile_with_inventory(
                image_base64,
                tiles,
                save_capture=save_log,
            )
        except ModelNotReadyError as error:
            return jsonify({
                'success': False,
                'error': str(error),
                'model': get_ai_model_status(),
            }), 503
        except Exception as error:
            return jsonify({'success': False, 'error': f'AI recognition failed: {error}'}), 502

        matched_tile = recognition.get('matchedTile')
        user = find_user_by_id(g.auth['userId'])
        alternatives = _build_recommendations(matched_tile)

        log = None
        if save_log:
            log = insert_recognition_log({
                'imageUri': _stored_recognition_image_uri(recognition),
                'recognizedName': recognition['recognizedName'],
                'tileType': recognition['tileType'],
                'confidenceScore': recognition['confidenceScore'],
                'matchedTileId': matched_tile['id'] if matched_tile else None,
                'userId': g.auth['userId'],
                'userName': user['name'] if user else g.auth.get('email', 'Unknown'),
            })
            recognition['logId'] = log['id']

        recognition['recommendations'] = alternatives

        detection = {
            'detected_class': recognition['detectedClass'],
            'tile_name': recognition['tile_name'],
            'tile_type': recognition['tile_type'],
            'confidence': recognition['confidence'],
            'annotated_image': recognition['annotated_image'],
            'inventory_id': recognition['inventory_id'],
            'inventory_matched': recognition['inventoryMatched'],
            'stock_quantity': recognition['stock_quantity'],
            'warehouse_location': recognition['warehouse_location'],
            'reorder_level': recognition['reorder_level'],
            'low_stock': recognition['lowStock'],
            'stock_status': recognition['stockStatus'],
            'boxes': recognition.get('boxes', []),
            'image_size': recognition.get('imageSize'),
            'recommendations': alternatives,
        }

        return jsonify({
            'success': True,
            'detection': detection,
            'recognition': recognition,
            'alternatives': alternatives,
            'log': log,
        })
