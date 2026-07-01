from flask import Blueprint, jsonify, request, send_file

from auth_middleware import authenticate, require_permission
from product_image_catalog import resolve_product_image_file
from warehouse_repository import (
    find_tile_by_id,
    insert_tile,
    list_low_stock_tiles,
    list_stock_movements_for_tile,
    list_tiles,
    update_tile,
    delete_tile,
)

tiles_bp = Blueprint('tiles', __name__, url_prefix='/api')


@tiles_bp.get('/tiles/product-images/<path:filename>')
def get_tile_product_image(filename: str):
    """Public — React Native Image cannot send JWT headers; only catalog-indexed files are served."""
    file_path = resolve_product_image_file(filename)
    if not file_path:
        return jsonify({'success': False, 'error': 'Product image not found.'}), 404

    mimetype = 'image/jpeg'
    if file_path.suffix.lower() == '.png':
        mimetype = 'image/png'
    elif file_path.suffix.lower() == '.webp':
        mimetype = 'image/webp'

    return send_file(file_path, mimetype=mimetype)


@tiles_bp.get('/tiles')
@authenticate
@require_permission('view_inventory')
def get_tiles():
    filters = {
        'search': request.args.get('search'),
        'tileType': request.args.get('tileType'),
        'size': request.args.get('size'),
        'color': request.args.get('color'),
        'finish': request.args.get('finish'),
        'material': request.args.get('material'),
        'status': request.args.get('status'),
    }
    tiles = list_tiles(filters)
    return jsonify({'success': True, 'tiles': tiles})


@tiles_bp.get('/tiles/<tile_id>')
@authenticate
@require_permission('view_inventory')
def get_tile(tile_id: str):
    tile = find_tile_by_id(tile_id)
    if not tile:
        return jsonify({'success': False, 'error': 'Tile product not found.'}), 404
    movements = list_stock_movements_for_tile(tile_id)
    return jsonify({'success': True, 'tile': tile, 'stockHistory': movements})


@tiles_bp.post('/tiles')
@authenticate
@require_permission('manage_inventory')
def create_tile():
    body = request.get_json(silent=True) or {}
    required = ['name', 'tileType', 'size', 'color', 'finish', 'material']
    missing = [field for field in required if not str(body.get(field, '')).strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

    tile = insert_tile(body)
    return jsonify({'success': True, 'tile': tile}), 201


@tiles_bp.put('/tiles/<tile_id>')
@authenticate
@require_permission('manage_inventory')
def put_tile(tile_id: str):
    body = request.get_json(silent=True) or {}
    tile = update_tile(tile_id, body)
    if not tile:
        return jsonify({'success': False, 'error': 'Tile product not found.'}), 404
    return jsonify({'success': True, 'tile': tile})


@tiles_bp.delete('/tiles/<tile_id>')
@authenticate
@require_permission('manage_inventory')
def remove_tile(tile_id: str):
    deleted, error = delete_tile(tile_id)
    if not deleted:
        message = 'Tile product not found.' if not error else 'Cannot delete tile with existing stock movements or deliveries.'
        return jsonify({'success': False, 'error': message}), 404 if not error else 409
    return jsonify({'success': True})


@tiles_bp.get('/inventory/low-stock')
@authenticate
@require_permission('view_inventory')
def get_low_stock():
    tiles = list_low_stock_tiles()
    return jsonify({'success': True, 'tiles': tiles, 'count': len(tiles)})
