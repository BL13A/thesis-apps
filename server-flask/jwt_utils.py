from datetime import datetime, timedelta, timezone

import jwt

from config import JWT_EXPIRES_IN, JWT_SECRET
from permissions import get_permissions_for_role


def _parse_expires_in(value: str) -> timedelta:
    if value.endswith('d'):
        return timedelta(days=int(value[:-1]))
    if value.endswith('h'):
        return timedelta(hours=int(value[:-1]))
    if value.endswith('m'):
        return timedelta(minutes=int(value[:-1]))
    return timedelta(days=7)


def sign_access_token(user: dict) -> str:
    permissions = get_permissions_for_role(user['role'])
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'role': user['role'],
        'permissions': permissions,
        'exp': datetime.now(timezone.utc) + _parse_expires_in(JWT_EXPIRES_IN),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
