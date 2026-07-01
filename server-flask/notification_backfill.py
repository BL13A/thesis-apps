"""Create MySQL notification rows for inspections missing alerts."""

from database import get_connection
from notification_repository import list_qa_users
from notification_service import (
    _qa_notification_for_inspection,
    create_user_notification,
)
from repositories import list_inspections_for_auth


def _notification_exists(related_id: str, user_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT id FROM notifications
                WHERE related_id = %s AND user_id = %s
                LIMIT 1
                ''',
                (related_id, user_id),
            )
            return cursor.fetchone() is not None
    finally:
        connection.close()


def backfill_notifications_for_inspections() -> dict:
    qa_users = list_qa_users()
    auth = {
        'userId': 'system',
        'permissions': ['view_all_inspections'],
    }
    inspections = list_inspections_for_auth(auth)
    created = 0

    for inspection in inspections:
        related_id = inspection['id']
        inspector_id = inspection['inspectedBy']

        if not _notification_exists(related_id, inspector_id):
            create_user_notification(
                inspector_id,
                f'Inspection {inspection["result"]}',
                f'{inspection["batchId"]} · {inspection.get("inventoryStatus", "Pending")}',
                'inspection',
                related_id=related_id,
                send_push=False,
            )
            created += 1

        qa_title, qa_message, qa_type = _qa_notification_for_inspection(inspection)
        for qa_user in qa_users:
            if _notification_exists(related_id, qa_user['id']):
                continue
            create_user_notification(
                qa_user['id'],
                qa_title,
                qa_message,
                qa_type,
                related_id=related_id,
                send_push=False,
            )
            created += 1

    return {'processed': len(inspections), 'created': created}
