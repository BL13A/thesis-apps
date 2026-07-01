from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from warehouse_repository import find_delivery_by_id, insert_delivery, list_deliveries, update_delivery

deliveries_bp = Blueprint('deliveries', __name__, url_prefix='/api/deliveries')

VALID_STATUSES = {'Pending', 'Scheduled', 'Out for Delivery', 'Delivered', 'Cancelled'}


def _normalize_items(raw_items: list | None) -> list[dict]:
    items = []
    for item in raw_items or []:
        tile_id = str(item.get('tileId', '')).strip()
        quantity = int(item.get('quantity') or 0)
        if tile_id and quantity > 0:
            items.append({'tileId': tile_id, 'quantity': quantity})
    return items


@deliveries_bp.get('', strict_slashes=False)
@deliveries_bp.get('/', strict_slashes=False)
@authenticate
@require_permission('view_deliveries')
def get_deliveries():
    deliveries = list_deliveries()
    return jsonify({'success': True, 'deliveries': deliveries})


@deliveries_bp.post('', strict_slashes=False)
@deliveries_bp.post('/', strict_slashes=False)
@authenticate
@require_permission('manage_deliveries')
def create_delivery():
    body = request.get_json(silent=True) or {}
    required = ['customerName', 'contactNumber', 'address', 'deliveryDate']
    missing = [field for field in required if not str(body.get(field, '')).strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

    items = _normalize_items(body.get('items'))
    if not items:
        return jsonify({'success': False, 'error': 'At least one tile item is required.'}), 400

    status = str(body.get('status') or 'Pending').strip()
    if status not in VALID_STATUSES:
        return jsonify({'success': False, 'error': 'Invalid delivery status.'}), 400

    delivery = insert_delivery(
        {
            'customerName': str(body['customerName']).strip(),
            'contactNumber': str(body['contactNumber']).strip(),
            'address': str(body['address']).strip(),
            'deliveryDate': str(body['deliveryDate']).strip(),
            'status': status,
            'createdBy': g.auth['userId'],
        },
        items,
    )
    return jsonify({'success': True, 'delivery': delivery}), 201


@deliveries_bp.put('/<delivery_id>')
@authenticate
@require_permission('manage_deliveries')
def put_delivery(delivery_id: str):
    body = request.get_json(silent=True) or {}
    status = body.get('status')
    if status is not None and str(status).strip() not in VALID_STATUSES:
        return jsonify({'success': False, 'error': 'Invalid delivery status.'}), 400

    items = _normalize_items(body.get('items')) if 'items' in body else None
    if items is not None and not items:
        return jsonify({'success': False, 'error': 'At least one tile item is required.'}), 400

    delivery = update_delivery(delivery_id, body, items)
    if not delivery:
        return jsonify({'success': False, 'error': 'Delivery not found.'}), 404
    return jsonify({'success': True, 'delivery': delivery})
