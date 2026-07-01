import uuid

import bcrypt
from flask import Blueprint, jsonify, request

from auth_middleware import authenticate, require_permission
from repositories import (
    MANAGED_USER_ROLES,
    backfill_missing_employee_ids,
    find_user_by_email,
    find_user_by_id,
    generate_next_employee_id,
    insert_user,
    list_managed_users,
    update_user_profile,
)
from utils import to_public_user

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

DEFAULT_PASSWORD = 'password123'


def _is_managed_role(role: str) -> bool:
    return role in MANAGED_USER_ROLES


@users_bp.get('')
@users_bp.get('/')
@authenticate
@require_permission('manage_users')
def get_users():
    backfill_missing_employee_ids()
    return jsonify({'success': True, 'users': [to_public_user(user) for user in list_managed_users()]})


@users_bp.post('')
@users_bp.post('/')
@authenticate
@require_permission('manage_users')
def create_user():
    body = request.get_json(silent=True) or {}
    email = str(body.get('email') or '').strip().lower()
    name = str(body.get('name') or '').strip()
    role = str(body.get('role') or '').strip()
    department = str(body.get('department') or 'Operations').strip()

    if not email or not name or not role:
        return jsonify({'success': False, 'error': 'name, email, and role are required.'}), 400

    if not _is_managed_role(role):
        return jsonify({
            'success': False,
            'error': 'Invalid role. Allowed: Warehouse Personnel, System Administrator, Quality Assurance Manager, Inventory Manager, Purchasing Officer.',
        }), 400

    if find_user_by_email(email):
        return jsonify({'success': False, 'error': 'A user with this email already exists.'}), 409

    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    user_id = f'user-{uuid.uuid4().hex[:12]}'
    employee_id = str(body.get('employeeId') or '').strip()
    if not employee_id:
        employee_id = generate_next_employee_id(role)

    created = insert_user({
        'id': user_id,
        'email': email,
        'passwordHash': password_hash,
        'name': name,
        'role': role,
        'employeeId': employee_id,
        'mobileNumber': body.get('mobileNumber'),
        'department': department,
        'accountStatus': body.get('accountStatus') or 'Active',
    })
    return jsonify({'success': True, 'user': to_public_user(created)}), 201


@users_bp.patch('/<user_id>')
@authenticate
@require_permission('manage_users')
def patch_user(user_id: str):
    existing = find_user_by_id(user_id)
    if not existing:
        return jsonify({'success': False, 'error': 'User not found.'}), 404

    body = request.get_json(silent=True) or {}
    updates = {
        key: body[key]
        for key in ('name', 'email', 'role', 'employeeId', 'mobileNumber', 'department', 'accountStatus')
        if key in body
    }
    if 'email' in updates:
        updates['email'] = str(updates['email']).strip().lower()
        duplicate = find_user_by_email(updates['email'])
        if duplicate and duplicate['id'] != user_id:
            return jsonify({'success': False, 'error': 'Email is already in use.'}), 409

    if 'role' in updates and not _is_managed_role(str(updates['role'])):
        return jsonify({
            'success': False,
            'error': 'Invalid role. Allowed: Warehouse Personnel, System Administrator, Quality Assurance Manager, Inventory Manager, Purchasing Officer.',
        }), 400

    if existing.get('role') not in MANAGED_USER_ROLES:
        return jsonify({'success': False, 'error': 'This account is not managed here.'}), 404

    updated = update_user_profile(user_id, updates)
    return jsonify({'success': True, 'user': to_public_user(updated)})


@users_bp.post('/<user_id>/reset-password')
@authenticate
@require_permission('manage_users')
def reset_user_password(user_id: str):
    existing = find_user_by_id(user_id)
    if not existing:
        return jsonify({'success': False, 'error': 'User not found.'}), 404

    if existing.get('role') not in MANAGED_USER_ROLES:
        return jsonify({'success': False, 'error': 'This account is not managed here.'}), 404

    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    from repositories import update_user_password_hash

    update_user_password_hash(user_id, password_hash)
    return jsonify({
        'success': True,
        'message': f'Password reset to default for {existing["email"]}.',
    })
