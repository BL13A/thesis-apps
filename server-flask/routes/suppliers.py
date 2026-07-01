from flask import Blueprint, jsonify, request

from auth_middleware import authenticate, require_permission
from procurement_repository import (
    find_supplier_by_id,
    insert_supplier,
    list_suppliers,
    update_supplier,
)

suppliers_bp = Blueprint('suppliers', __name__, url_prefix='/api/suppliers')


@suppliers_bp.get('', strict_slashes=False)
@suppliers_bp.get('/', strict_slashes=False)
@authenticate
@require_permission('view_suppliers')
def get_suppliers():
    suppliers = list_suppliers()
    if not suppliers:
        from supplier_seed import ensure_suppliers_seeded

        ensure_suppliers_seeded()
        suppliers = list_suppliers()
    return jsonify({'success': True, 'suppliers': suppliers})


@suppliers_bp.post('', strict_slashes=False)
@suppliers_bp.post('/', strict_slashes=False)
@authenticate
@require_permission('manage_suppliers')
def create_supplier():
    body = request.get_json(silent=True) or {}
    if not str(body.get('name', '')).strip():
        return jsonify({'success': False, 'error': 'Supplier name is required.'}), 400
    supplier = insert_supplier(body)
    return jsonify({'success': True, 'supplier': supplier}), 201


@suppliers_bp.put('/<supplier_id>')
@authenticate
@require_permission('manage_suppliers')
def put_supplier(supplier_id: str):
    body = request.get_json(silent=True) or {}
    supplier = update_supplier(supplier_id, body)
    if not supplier:
        return jsonify({'success': False, 'error': 'Supplier not found.'}), 404
    return jsonify({'success': True, 'supplier': supplier})


@suppliers_bp.get('/<supplier_id>')
@authenticate
@require_permission('view_suppliers')
def get_supplier(supplier_id: str):
    supplier = find_supplier_by_id(supplier_id)
    if not supplier:
        return jsonify({'success': False, 'error': 'Supplier not found.'}), 404
    return jsonify({'success': True, 'supplier': supplier})
