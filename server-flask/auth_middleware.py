from functools import wraps

import jwt
from flask import g, jsonify, request

from jwt_utils import verify_access_token
from permissions import get_permissions_for_role
from repositories import find_user_by_id


def authenticate(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization token.'}), 401

        token = header[7:].strip()
        if not token:
            return jsonify({'success': False, 'error': 'Missing authorization token.'}), 401

        try:
            payload = verify_access_token(token)
            user = find_user_by_id(payload['sub'])
            if not user or user['accountStatus'] != 'Active':
                return jsonify({'success': False, 'error': 'Account is not active.'}), 401

            g.auth = {
                'userId': user['id'],
                'email': user['email'],
                'role': user['role'],
                'permissions': get_permissions_for_role(user['role']),
                'tokenPayload': payload,
            }
            g.user_record = user
        except jwt.PyJWTError:
            return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 401

        return f(*args, **kwargs)

    return wrapper


def require_permission(*permissions):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not getattr(g, 'auth', None):
                return jsonify({'success': False, 'error': 'Authentication required.'}), 401
            if not all(permission in g.auth['permissions'] for permission in permissions):
                return jsonify({'success': False, 'error': 'You do not have permission for this action.'}), 403
            return f(*args, **kwargs)

        return wrapper

    return decorator
