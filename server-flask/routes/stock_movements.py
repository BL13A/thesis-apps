from flask import Blueprint, jsonify, request

from auth_middleware import authenticate, require_permission
from repositories import find_user_by_id
from warehouse_repository import find_tile_by_id, insert_stock_movement, list_stock_movements_for_tile

stock_bp = Blueprint('stock_movements', __name__, url_prefix='/api/stock-movements')


@stock_bp.post('', strict_slashes=False)
@stock_bp.post('/', strict_slashes=False)
@authenticate
@require_permission('manage_stock')
def create_stock_movement():
    body = request.get_json(silent=True) or {}
    required = ['tileId', 'transactionType', 'quantity', 'reason', 'transactionDate']
    missing = [field for field in required if not str(body.get(field, '')).strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

    transaction_type = str(body['transactionType']).strip()
    if transaction_type not in ('In', 'Out'):
        return jsonify({'success': False, 'error': 'transactionType must be In or Out.'}), 400

    quantity = int(body['quantity'])
    if quantity <= 0:
        return jsonify({'success': False, 'error': 'quantity must be greater than 0.'}), 400

    tile = find_tile_by_id(body['tileId'])
    if not tile:
        return jsonify({'success': False, 'error': 'Tile product not found.'}), 404

    if transaction_type == 'Out' and tile['stockQuantity'] < quantity:
        return jsonify({'success': False, 'error': 'Insufficient stock for stock out transaction.'}), 400

    from flask import g

    handler = find_user_by_id(g.auth['userId'])
    movement = insert_stock_movement({
        'tileId': body['tileId'],
        'transactionType': transaction_type,
        'quantity': quantity,
        'reason': str(body['reason']).strip(),
        'transactionDate': str(body['transactionDate']).strip(),
        'handledBy': g.auth['userId'],
        'handledByName': handler['name'] if handler else g.auth.get('email', 'Unknown'),
    })
    return jsonify({'success': True, 'movement': movement, 'tile': find_tile_by_id(body['tileId'])}), 201


@stock_bp.get('/<tile_id>')
@authenticate
@require_permission('view_inventory')
def get_stock_movements(tile_id: str):
    tile = find_tile_by_id(tile_id)
    if not tile:
        return jsonify({'success': False, 'error': 'Tile product not found.'}), 404
    movements = list_stock_movements_for_tile(tile_id)
    return jsonify({'success': True, 'movements': movements})
