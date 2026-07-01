import bcrypt
from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from config import JWT_EXPIRES_IN, RESET_PASSWORD_URL
from email_service import is_smtp_configured, send_password_reset_email
from jwt_utils import sign_access_token
from password_reset import (
    create_password_reset_token,
    find_valid_reset_user_id,
    verify_and_consume_reset_token,
)
from permissions import get_permissions_for_role
from repositories import find_user_by_email, update_user_password_hash, update_user_profile
from utils import to_public_user

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

GENERIC_RESET_MESSAGE = (
    'If an account exists for that email, a password reset link has been sent.'
)


@auth_bp.post('/login')
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    user = find_user_by_email(email)
    if not user:
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    if user['accountStatus'] != 'Active':
        return jsonify({'success': False, 'error': 'Account is not active.'}), 403

    if not bcrypt.checkpw(password.encode(), user['passwordHash'].encode()):
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    return jsonify({
        'success': True,
        'accessToken': sign_access_token(user),
        'tokenType': 'Bearer',
        'expiresIn': JWT_EXPIRES_IN,
        'user': to_public_user(user),
        'permissions': get_permissions_for_role(user['role']),
    })


@auth_bp.get('/me')
@authenticate
def me():
    return jsonify({
        'success': True,
        'user': to_public_user(g.user_record),
        'permissions': g.auth['permissions'],
    })


@auth_bp.patch('/profile')
@authenticate
def update_profile():
    body = request.get_json(silent=True) or {}
    updates = {key: body[key] for key in ('name', 'email', 'mobileNumber') if key in body}

    if not updates:
        return jsonify({'success': False, 'error': 'No profile fields to update.'}), 400

    if 'name' in updates:
        updates['name'] = str(updates['name']).strip()
        if not updates['name']:
            return jsonify({'success': False, 'error': 'Full name is required.'}), 400

    if 'email' in updates:
        updates['email'] = str(updates['email']).strip().lower()
        duplicate = find_user_by_email(updates['email'])
        if duplicate and duplicate['id'] != g.auth['userId']:
            return jsonify({'success': False, 'error': 'Email is already in use.'}), 409

    if 'mobileNumber' in updates:
        updates['mobileNumber'] = str(updates['mobileNumber']).strip()
        if not updates['mobileNumber']:
            return jsonify({'success': False, 'error': 'Mobile number is required.'}), 400

    updated = update_user_profile(g.auth['userId'], updates)
    if not updated:
        return jsonify({'success': False, 'error': 'User not found.'}), 404

    return jsonify({'success': True, 'user': to_public_user(updated)})


@auth_bp.get('/permissions')
@authenticate
@require_permission('view_profile')
def permissions():
    return jsonify({
        'success': True,
        'role': g.auth['role'],
        'permissions': g.auth['permissions'],
    })


@auth_bp.post('/change-password')
@authenticate
def change_password():
    body = request.get_json(silent=True) or {}
    current_password = body.get('currentPassword') or ''
    new_password = body.get('newPassword') or ''

    if not current_password or not new_password:
        return jsonify({'success': False, 'error': 'Current and new password are required.'}), 400

    if len(new_password) < 8:
        return jsonify({'success': False, 'error': 'New password must be at least 8 characters.'}), 400

    if not bcrypt.checkpw(current_password.encode(), g.user_record['passwordHash'].encode()):
        return jsonify({'success': False, 'error': 'Current password is incorrect.'}), 401

    password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=10)).decode()
    update_user_password_hash(g.user_record['id'], password_hash)
    g.user_record['passwordHash'] = password_hash

    return jsonify({'success': True, 'message': 'Password updated successfully.'})


@auth_bp.post('/forgot-password')
def forgot_password():
    body = request.get_json(silent=True) or {}
    email = (body.get('email') or '').strip().lower()

    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    user = find_user_by_email(email)
    if not user:
        return jsonify({'success': True, 'message': GENERIC_RESET_MESSAGE})

    token = create_password_reset_token(user['id'], email)

    if is_smtp_configured():
        try:
            send_password_reset_email(email, user['name'], token)
        except Exception as error:
            print(f'[EMAIL ERROR] Failed to send reset email to {email}: {error}', flush=True)
            return jsonify({
                'success': False,
                'error': 'Unable to send reset email. Check SMTP settings on the server.',
            }), 500
    else:
        reset_url = f'{RESET_PASSWORD_URL}?token={token}'
        print(f'[DEV] SMTP not configured. Reset link for {email}:', flush=True)
        print(f'      {reset_url}', flush=True)

    return jsonify({
        'success': True,
        'message': GENERIC_RESET_MESSAGE,
        'emailSent': is_smtp_configured(),
    })


@auth_bp.get('/validate-reset-token')
def validate_reset_token():
    token = (request.args.get('token') or '').strip()
    if not token or not find_valid_reset_user_id(token):
        return jsonify({'success': False, 'valid': False}), 400
    return jsonify({'success': True, 'valid': True})


@auth_bp.post('/reset-password')
def reset_password():
    body = request.get_json(silent=True) or {}
    token = (body.get('token') or '').strip()
    new_password = body.get('newPassword') or ''

    if not token or not new_password:
        return jsonify({
            'success': False,
            'error': 'Reset token and new password are required.',
        }), 400

    if len(new_password) < 8:
        return jsonify({'success': False, 'error': 'New password must be at least 8 characters.'}), 400

    user_id = verify_and_consume_reset_token(token)
    if not user_id:
        return jsonify({
            'success': False,
            'error': 'Invalid or expired reset link. Request a new password reset email.',
        }), 400

    password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=10)).decode()
    update_user_password_hash(user_id, password_hash)

    return jsonify({
        'success': True,
        'message': 'Password updated successfully. You can now sign in with your new password.',
    })
