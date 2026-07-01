from datetime import datetime, timedelta, timezone

from database import get_connection
from utils import row_to_notification


def insert_notification(record: dict) -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO notifications (
                  id, user_id, title, message, type, related_id, is_read, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    record['id'],
                    record['userId'],
                    record['title'],
                    record['message'],
                    record['type'],
                    record.get('relatedId'),
                    1 if record.get('read') else 0,
                    record['createdAt'],
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return record


def list_notifications_for_user(user_id: str, limit: int = 100) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT * FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                ''',
                (user_id, limit),
            )
            return [row_to_notification(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def mark_notification_read(notification_id: str, user_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE notifications
                SET is_read = 1
                WHERE id = %s AND user_id = %s
                ''',
                (notification_id, user_id),
            )
            updated = cursor.rowcount > 0
        connection.commit()
        return updated
    finally:
        connection.close()


def mark_all_notifications_read(user_id: str) -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE notifications SET is_read = 1 WHERE user_id = %s AND is_read = 0',
                (user_id,),
            )
            count = cursor.rowcount
        connection.commit()
        return count
    finally:
        connection.close()


def get_notification_by_id(notification_id: str, user_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT * FROM notifications WHERE id = %s AND user_id = %s LIMIT 1',
                (notification_id, user_id),
            )
            return row_to_notification(cursor.fetchone())
    finally:
        connection.close()


def upsert_notification(record: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT title, message, is_read FROM notifications WHERE id = %s AND user_id = %s LIMIT 1',
                (record['id'], record['userId']),
            )
            existing = cursor.fetchone()
            if existing:
                message_changed = existing['message'] != record['message']
                is_read = 0 if message_changed else int(existing['is_read'] or 0)
                cursor.execute(
                    '''
                    UPDATE notifications
                    SET title = %s, message = %s, type = %s, related_id = %s, is_read = %s
                    WHERE id = %s AND user_id = %s
                    ''',
                    (
                        record['title'],
                        record['message'],
                        record['type'],
                        record.get('relatedId'),
                        is_read,
                        record['id'],
                        record['userId'],
                    ),
                )
            else:
                cursor.execute(
                    '''
                    INSERT INTO notifications (
                      id, user_id, title, message, type, related_id, is_read, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''',
                    (
                        record['id'],
                        record['userId'],
                        record['title'],
                        record['message'],
                        record['type'],
                        record.get('relatedId'),
                        1 if record.get('read') else 0,
                        record.get('createdAt') or now,
                    ),
                )
        connection.commit()
    finally:
        connection.close()
    return record


def delete_notification(notification_id: str, user_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'DELETE FROM notifications WHERE id = %s AND user_id = %s',
                (notification_id, user_id),
            )
            deleted = cursor.rowcount > 0
        connection.commit()
        return deleted
    finally:
        connection.close()


def count_notifications_for_user(user_id: str) -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) AS count FROM notifications WHERE user_id = %s', (user_id,))
            return int(cursor.fetchone()['count'])
    finally:
        connection.close()


def has_recent_supplier_alert(user_id: str, supplier_key: str, days: int) -> bool:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace('+00:00', 'Z')
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT id FROM notifications
                WHERE user_id = %s
                  AND type = 'supplier'
                  AND related_id = %s
                  AND created_at >= %s
                LIMIT 1
                ''',
                (user_id, supplier_key, cutoff),
            )
            return cursor.fetchone() is not None
    finally:
        connection.close()


def upsert_push_token(user_id: str, expo_push_token: str, platform: str | None) -> None:
    import hashlib

    token_id = f'pt-{hashlib.sha256(expo_push_token.encode()).hexdigest()[:20]}'
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO push_tokens (id, user_id, expo_push_token, platform, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                  platform = VALUES(platform),
                  updated_at = VALUES(updated_at)
                ''',
                (token_id, user_id, expo_push_token, platform, now),
            )
        connection.commit()
    finally:
        connection.close()


def list_push_tokens_for_user(user_id: str) -> list[str]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT expo_push_token FROM push_tokens WHERE user_id = %s',
                (user_id,),
            )
            return [row['expo_push_token'] for row in cursor.fetchall()]
    finally:
        connection.close()


def list_users_by_role(role: str) -> list[dict]:
    from utils import row_to_user

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM users WHERE role = %s AND account_status = %s', (role, 'Active'))
            return [row_to_user(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def list_qa_users() -> list[dict]:
    from utils import row_to_user

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT * FROM users
                WHERE role IN (%s, %s) AND account_status = %s
                ''',
                ('Quality Assurance Manager', 'Quality Assurance Officer', 'Active'),
            )
            return [row_to_user(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def get_supplier_defect_stats(supplier_name: str) -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT
                  COUNT(*) AS total,
                  SUM(CASE WHEN result != 'Passed' THEN 1 ELSE 0 END) AS defects
                FROM inspections
                WHERE LOWER(supplier_name) = LOWER(%s)
                ''',
                (supplier_name.strip(),),
            )
            row = cursor.fetchone()
            total = int(row['total'] or 0)
            defects = int(row['defects'] or 0)
            rate = (defects / total) if total else 0.0
            return {'total': total, 'defects': defects, 'rate': rate}
    finally:
        connection.close()
