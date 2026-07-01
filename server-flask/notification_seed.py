"""Seed warehouse-relevant in-app notifications for Rafael (warehouse user)."""

from __future__ import annotations

from database import get_connection
from seed import WAREHOUSE_PROFILE

WAREHOUSE_USER_ID = WAREHOUSE_PROFILE['id']

WAREHOUSE_SEED_NOTIFICATIONS = [
    {
        'id': 'notif-wh-low-001',
        'title': 'Low Stock Alert',
        'message': 'C63050 Montes is at 10 pcs — reorder level is 25.',
        'type': 'inventory',
        'relatedId': 'tile-wh-c63050',
        'read': False,
    },
    {
        'id': 'notif-wh-out-001',
        'title': 'Out of Stock',
        'message': 'S30024 Marvila has 0 pcs. Restock before the next delivery run.',
        'type': 'inventory',
        'relatedId': 'tile-wh-s30024',
        'read': False,
    },
    {
        'id': 'notif-wh-del-001',
        'title': 'Delivery Scheduled',
        'message': 'Santos Construction Supply — Jun 12 · 100 pcs ceramic tiles.',
        'type': 'delivery',
        'relatedId': 'del-seed-001',
        'read': False,
    },
    {
        'id': 'notif-wh-del-002',
        'title': 'Out for Delivery',
        'message': 'Rivera Home Builders — Jun 10 · 48 pcs C63050 en route.',
        'type': 'delivery',
        'relatedId': 'del-seed-002',
        'read': True,
    },
    {
        'id': 'notif-wh-del-003',
        'title': 'Delivery Cancelled',
        'message': 'Lim Realty & Development — Jun 8 order was cancelled.',
        'type': 'delivery',
        'relatedId': 'del-seed-004',
        'read': True,
    },
    {
        'id': 'notif-wh-sys-001',
        'title': 'Welcome to TileVision',
        'message': 'Your warehouse workspace is ready. Scan tiles, manage stock, and track deliveries here.',
        'type': 'system',
        'relatedId': 'system-welcome',
        'read': True,
    },
]


def _notification_exists(notification_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT id FROM notifications WHERE id = %s LIMIT 1',
                (notification_id,),
            )
            return cursor.fetchone() is not None
    finally:
        connection.close()


def seed_warehouse_notifications() -> dict:
    from datetime import datetime, timezone

    from notification_repository import insert_notification

    connection = get_connection()
    removed = 0
    inserted = 0
    skipped = 0

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM notifications WHERE user_id = %s AND type = 'inspection'",
                (WAREHOUSE_USER_ID,),
            )
            removed = cursor.rowcount
        connection.commit()
    finally:
        connection.close()

    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    for entry in WAREHOUSE_SEED_NOTIFICATIONS:
        if _notification_exists(entry['id']):
            skipped += 1
            continue
        insert_notification({
            'id': entry['id'],
            'userId': WAREHOUSE_USER_ID,
            'title': entry['title'],
            'message': entry['message'],
            'type': entry['type'],
            'relatedId': entry.get('relatedId'),
            'read': bool(entry.get('read')),
            'createdAt': now,
        })
        inserted += 1

    return {
        'inserted': inserted,
        'skipped': skipped,
        'removedInspectionNoise': removed,
        'total': len(WAREHOUSE_SEED_NOTIFICATIONS),
    }


MANAGEMENT_SEED_NOTIFICATIONS: dict[str, list[dict]] = {
    'user-admin-001': [
        {
            'id': 'notif-admin-welcome',
            'title': 'Management Portal Ready',
            'message': 'Your administrator workspace is active. Manage users and review activity from here.',
            'type': 'system',
            'relatedId': 'system-welcome',
            'read': True,
        },
        {
            'id': 'notif-admin-users',
            'title': 'User Accounts Updated',
            'message': 'New warehouse and management accounts are available in User Management.',
            'type': 'users',
            'relatedId': 'users-management',
            'read': False,
        },
    ],
    'user-qa-001': [
        {
            'id': 'notif-qa-welcome',
            'title': 'QA Workspace Ready',
            'message': 'Review inspections, manual verifications, and supplier defect trends from this portal.',
            'type': 'system',
            'relatedId': 'system-welcome',
            'read': True,
        },
        {
            'id': 'notif-qa-manual',
            'title': 'Manual QA Verification',
            'message': 'One or more batches are below the 85% confidence threshold and need review.',
            'type': 'qa',
            'relatedId': 'sync:pending-qa',
            'read': False,
        },
    ],
    'user-inv-001': [
        {
            'id': 'notif-inv-welcome',
            'title': 'Inventory Portal Ready',
            'message': 'Monitor stock levels, batches, and reorder alerts from your dashboard.',
            'type': 'system',
            'relatedId': 'system-welcome',
            'read': True,
        },
        {
            'id': 'notif-inv-low',
            'title': 'Low Stock Alert',
            'message': 'Multiple SKUs are at or below reorder level. Review Reorder Alerts.',
            'type': 'inventory',
            'relatedId': 'sync:low-stock',
            'read': False,
        },
    ],
    'user-purch-001': [
        {
            'id': 'notif-purch-welcome',
            'title': 'Procurement Portal Ready',
            'message': 'Track reorder alerts, purchase requests, and supplier coordination here.',
            'type': 'system',
            'relatedId': 'system-welcome',
            'read': True,
        },
        {
            'id': 'notif-purch-reorder',
            'title': 'Reorder Alerts',
            'message': 'Low-stock tiles need procurement follow-up. Open Procurement Support.',
            'type': 'procurement',
            'relatedId': 'sync:reorder-alerts',
            'read': False,
        },
    ],
}


def seed_management_notifications() -> dict:
    from datetime import datetime, timezone

    from notification_repository import insert_notification

    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    inserted = 0
    skipped = 0

    for user_id, entries in MANAGEMENT_SEED_NOTIFICATIONS.items():
        for entry in entries:
            if _notification_exists(entry['id']):
                skipped += 1
                continue
            insert_notification({
                'id': entry['id'],
                'userId': user_id,
                'title': entry['title'],
                'message': entry['message'],
                'type': entry['type'],
                'relatedId': entry.get('relatedId'),
                'read': bool(entry.get('read')),
                'createdAt': now,
            })
            inserted += 1

    return {
        'inserted': inserted,
        'skipped': skipped,
        'users': len(MANAGEMENT_SEED_NOTIFICATIONS),
    }
