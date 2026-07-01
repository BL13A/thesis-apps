from datetime import datetime, timezone

from business_rules import (
    MIN_SUPPLIER_SAMPLES_FOR_ALERT,
    SUPPLIER_ALERT_COOLDOWN_DAYS,
    SUPPLIER_DEFECT_ALERT_PERCENT,
)
from notification_repository import (
    count_notifications_for_user,
    get_supplier_defect_stats,
    has_recent_supplier_alert,
    insert_notification,
    list_qa_users,
)
from push_service import send_expo_push_to_user


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _new_id(prefix: str) -> str:
    return f'{prefix}-{int(datetime.now().timestamp() * 1000)}'


def _supplier_key(supplier_name: str) -> str:
    return f'supplier:{supplier_name.strip().lower()}'


def create_user_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    related_id: str | None = None,
    send_push: bool = True,
) -> dict:
    record = {
        'id': _new_id('notif'),
        'userId': user_id,
        'title': title,
        'message': message,
        'type': notification_type,
        'relatedId': related_id,
        'read': False,
        'createdAt': _now_iso(),
    }
    insert_notification(record)
    if send_push:
        send_expo_push_to_user(user_id, title, message)
    return record


def ensure_welcome_notification(user_id: str) -> None:
    if count_notifications_for_user(user_id) > 0:
        return
    create_user_notification(
        user_id,
        'Welcome to TileVision',
        'Your enterprise tile inspection workspace is ready.',
        'system',
        related_id='system-welcome',
        send_push=False,
    )


def _qa_notification_for_inspection(inspection: dict) -> tuple[str, str, str]:
    batch_id = inspection['batchId']
    supplier = inspection['supplierName']
    result = inspection['result']
    defect_type = inspection.get('defectType', 'None')
    confidence = round(float(inspection.get('confidenceScore', 0)) * 100)

    if result == 'Manual':
        return (
            'Manual QA Verification',
            (
                f'Batch {batch_id} from {supplier} — '
                f'{defect_type} at {confidence}% (below 85% threshold).'
            ),
            'qa',
        )

    if result == 'Rejected':
        return (
            'New Rejected Inspection',
            f'Batch {batch_id} from {supplier} — {defect_type} at {confidence}%.',
            'inspection',
        )

    return (
        'New Inspection Submitted',
        f'Batch {batch_id} from {supplier} — Passed, no defects detected.',
        'inspection',
    )


def notify_after_inspection_created(inspection: dict) -> None:
    inspector_id = inspection['inspectedBy']
    batch_id = inspection['batchId']
    supplier = inspection['supplierName']

    create_user_notification(
        inspector_id,
        f'Inspection {inspection["result"]}',
        f'{batch_id} · {inspection.get("inventoryStatus", "Pending")}',
        'inspection',
        related_id=inspection['id'],
    )

    qa_title, qa_message, qa_type = _qa_notification_for_inspection(inspection)
    for qa_user in list_qa_users():
        create_user_notification(
            qa_user['id'],
            qa_title,
            qa_message,
            qa_type,
            related_id=inspection['id'],
        )

    _maybe_notify_supplier_defect_alert(supplier)


def notify_after_qa_review(inspection: dict, reviewer_id: str | None = None) -> None:
    batch_id = inspection['batchId']
    qa_status = inspection['qaStatus']

    create_user_notification(
        inspection['inspectedBy'],
        f'QA Update: {qa_status}',
        f'Batch {batch_id} QA review is {qa_status}.',
        'inspection',
        related_id=inspection['id'],
    )

    for qa_user in list_qa_users():
        if reviewer_id and qa_user['id'] == reviewer_id:
            continue
        create_user_notification(
            qa_user['id'],
            f'QA {qa_status}',
            f'Batch {batch_id} was marked as {qa_status}.',
            'qa',
            related_id=inspection['id'],
        )


def _maybe_notify_supplier_defect_alert(supplier_name: str) -> None:
    stats = get_supplier_defect_stats(supplier_name)
    threshold = SUPPLIER_DEFECT_ALERT_PERCENT / 100

    if stats['total'] < MIN_SUPPLIER_SAMPLES_FOR_ALERT:
        return
    if stats['rate'] < threshold:
        return

    supplier_key = _supplier_key(supplier_name)
    defect_percent = round(stats['rate'] * 100, 1)

    for qa_user in list_qa_users():
        if has_recent_supplier_alert(qa_user['id'], supplier_key, SUPPLIER_ALERT_COOLDOWN_DAYS):
            continue
        create_user_notification(
            qa_user['id'],
            'Supplier Defect Alert',
            (
                f'{supplier_name} defect rate is {defect_percent}% '
                f'({stats["defects"]}/{stats["total"]} inspections) — '
                f'exceeds {SUPPLIER_DEFECT_ALERT_PERCENT}% threshold.'
            ),
            'supplier',
            related_id=supplier_key,
        )
