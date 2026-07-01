import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from config import RESET_TOKEN_EXPIRES_MINUTES
from database import get_connection


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_reset_token() -> str:
    return secrets.token_urlsafe(48)


def create_password_reset_token(user_id: str, email: str) -> str:
    token = generate_reset_token()
    digest = _token_digest(token)
    reset_id = f'reset-{int(datetime.now().timestamp() * 1000)}'
    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRES_MINUTES)
    ).isoformat().replace('+00:00', 'Z')

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE password_reset_codes SET used_at = %s WHERE user_id = %s AND used_at IS NULL',
                (_now_iso(), user_id),
            )
            cursor.execute(
                '''
                INSERT INTO password_reset_codes (
                  id, user_id, email, code_hash, expires_at, used_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, NULL, %s)
                ''',
                (reset_id, user_id, email, digest, expires_at, _now_iso()),
            )
        connection.commit()
    finally:
        connection.close()

    return token


def find_valid_reset_user_id(token: str) -> str | None:
    digest = _token_digest(token.strip())
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT id, user_id, expires_at, used_at
                FROM password_reset_codes
                WHERE code_hash = %s AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                ''',
                (digest,),
            )
            row = cursor.fetchone()
            if not row:
                return None

            expires_at = datetime.fromisoformat(row['expires_at'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_at:
                return None

            return row['user_id']
    finally:
        connection.close()


def verify_and_consume_reset_token(token: str) -> str | None:
    digest = _token_digest(token.strip())
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT id, user_id, expires_at, used_at
                FROM password_reset_codes
                WHERE code_hash = %s AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                ''',
                (digest,),
            )
            row = cursor.fetchone()
            if not row:
                return None

            expires_at = datetime.fromisoformat(row['expires_at'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_at:
                return None

            cursor.execute(
                'UPDATE password_reset_codes SET used_at = %s WHERE id = %s',
                (_now_iso(), row['id']),
            )
        connection.commit()
        return row['user_id']
    finally:
        connection.close()
