from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from procurement_repository import (
    insert_procurement_request,
    list_procurement_requests,
    update_procurement_request,
)
from repositories import find_user_by_id
from warehouse_repository import list_low_stock_tiles

procurement_bp = Blueprint('procurement', __name__, url_prefix='/api/procurement')


@procurement_bp.get('/requests', strict_slashes=False)
@authenticate
@require_permission('view_procurement')
def get_procurement_requests():
    return jsonify({'success': True, 'requests': list_procurement_requests()})


@procurement_bp.get('/low-stock-suggestions', strict_slashes=False)
@authenticate
@require_permission('view_procurement')
def get_low_stock_suggestions():
    tiles = list_low_stock_tiles()
    suggestions = [
        {
            'tileId': tile['id'],
            'tileName': tile['name'],
            'currentStock': tile['stockQuantity'],
            'reorderPoint': tile['lowStockThreshold'],
            'supplierName': tile.get('supplierName') or '',
            'urgency': 'Critical' if tile['stockQuantity'] <= 0 else 'High',
        }
        for tile in tiles
    ]
    return jsonify({'success': True, 'suggestions': suggestions})


@procurement_bp.post('/requests', strict_slashes=False)
@authenticate
@require_permission('manage_procurement')
def create_procurement_request():
    body = request.get_json(silent=True) or {}
    required = ['tileName', 'quantity']
    missing = [field for field in required if not str(body.get(field, '')).strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

    user = find_user_by_id(g.auth['userId'])
    request_record = insert_procurement_request({
        **body,
        'requestedBy': g.auth['userId'],
        'requestedByName': user['name'] if user else g.auth.get('email', 'Unknown'),
    })
    return jsonify({'success': True, 'request': request_record}), 201


@procurement_bp.put('/requests/<pr_id>')
@authenticate
@require_permission('manage_procurement')
def put_procurement_request(pr_id: str):
    body = request.get_json(silent=True) or {}
    try:
        request_record = update_procurement_request(pr_id, body)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    if not request_record:
        return jsonify({'success': False, 'error': 'Purchase request not found.'}), 404
    return jsonify({'success': True, 'request': request_record})
