"""Seed warehouse delivery records — realistic demo data across all key statuses."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from database import get_connection
from warehouse_repository import find_delivery_by_id

SEED_DELIVERY_IDS = frozenset({
    'del-seed-001',
    'del-seed-002',
    'del-seed-003',
    'del-seed-004',
})

LEGACY_SEED_IDS = frozenset({
    'del-sched-001',
    'del-sched-002',
    'del-sched-003',
})

FAKE_CUSTOMER_NAMES = frozenset({'Yes', 'Anton'})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _new_item_id() -> str:
    return f'di-{uuid.uuid4().hex[:12]}'


SEED_DELIVERIES = [
    {
        'id': 'del-seed-001',
        'customerName': 'Santos Construction Supply',
        'contactNumber': '+63 917 220 4811',
        'address': '45 Katipunan Ave., Brgy. Loyola Heights, Quezon City',
        'deliveryDate': '2026-06-12',
        'status': 'Scheduled',
        'createdBy': 'user-warehouse-001',
        'items': [
            {'tileId': 'tile-wh-c60014', 'quantity': 60},
            {'tileId': 'tile-wh-c60015', 'quantity': 40},
        ],
    },
    {
        'id': 'del-seed-002',
        'customerName': 'Rivera Home Builders',
        'contactNumber': '+63 918 334 9022',
        'address': 'Unit 12B, Pacific Star Bldg., Sen. Gil Puyat Ave., Makati City',
        'deliveryDate': '2026-06-10',
        'status': 'Out for Delivery',
        'createdBy': 'user-warehouse-001',
        'items': [
            {'tileId': 'tile-wh-c63050', 'quantity': 48},
        ],
    },
    {
        'id': 'del-seed-003',
        'customerName': 'Garcia Tile Depot',
        'contactNumber': '+63 919 445 6610',
        'address': 'Block 7 Lot 14, Commonwealth Ave., Quezon City',
        'deliveryDate': '2026-06-05',
        'status': 'Delivered',
        'createdBy': 'user-warehouse-001',
        'items': [
            {'tileId': 'tile-wh-c60002', 'quantity': 72},
            {'tileId': 'tile-wh-c63051', 'quantity': 24},
        ],
    },
    {
        'id': 'del-seed-004',
        'customerName': 'Lim Realty & Development',
        'contactNumber': '+63 920 118 3390',
        'address': '22 Shaw Blvd., Brgy. Wack-Wack, Mandaluyong City',
        'deliveryDate': '2026-06-08',
        'status': 'Cancelled',
        'createdBy': 'user-warehouse-001',
        'items': [
            {'tileId': 'tile-wh-s30013', 'quantity': 50},
        ],
    },
]


def _delete_delivery(connection, delivery_id: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute('DELETE FROM delivery_items WHERE delivery_id = %s', (delivery_id,))
        cursor.execute('DELETE FROM deliveries WHERE id = %s', (delivery_id,))


def _insert_delivery(entry: dict) -> None:
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO deliveries (
                  id, customer_name, contact_number, address, delivery_date,
                  status, created_by, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    entry['id'],
                    entry['customerName'],
                    entry['contactNumber'],
                    entry['address'],
                    entry['deliveryDate'],
                    entry['status'],
                    entry['createdBy'],
                    now,
                    now,
                ),
            )
            for item in entry['items']:
                cursor.execute(
                    '''
                    INSERT INTO delivery_items (id, delivery_id, tile_id, quantity)
                    VALUES (%s, %s, %s, %s)
                    ''',
                    (_new_item_id(), entry['id'], item['tileId'], int(item['quantity'])),
                )
        connection.commit()
    finally:
        connection.close()


def _update_delivery(entry: dict) -> None:
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE deliveries SET
                  customer_name = %s,
                  contact_number = %s,
                  address = %s,
                  delivery_date = %s,
                  status = %s,
                  updated_at = %s
                WHERE id = %s
                ''',
                (
                    entry['customerName'],
                    entry['contactNumber'],
                    entry['address'],
                    entry['deliveryDate'],
                    entry['status'],
                    now,
                    entry['id'],
                ),
            )
            cursor.execute('DELETE FROM delivery_items WHERE delivery_id = %s', (entry['id'],))
            for item in entry['items']:
                cursor.execute(
                    '''
                    INSERT INTO delivery_items (id, delivery_id, tile_id, quantity)
                    VALUES (%s, %s, %s, %s)
                    ''',
                    (_new_item_id(), entry['id'], item['tileId'], int(item['quantity'])),
                )
        connection.commit()
    finally:
        connection.close()


def prune_fake_deliveries() -> dict:
    """Remove placeholder deliveries (e.g. Yes, Anton) and retired seed IDs."""
    connection = get_connection()
    removed = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT id, customer_name FROM deliveries')
            rows = cursor.fetchall()

        for row in rows:
            delivery_id = row['id']
            customer = (row.get('customer_name') or '').strip()
            should_remove = (
                customer in FAKE_CUSTOMER_NAMES
                or delivery_id in LEGACY_SEED_IDS
            )
            if should_remove:
                _delete_delivery(connection, delivery_id)
                removed += 1
        connection.commit()
    finally:
        connection.close()

    return {'removed': removed}


def seed_scheduled_deliveries() -> dict:
    """Upsert demo deliveries covering Scheduled, Out for Delivery, Delivered, and Cancelled."""
    prune_result = prune_fake_deliveries()
    inserted = 0
    updated = 0

    for entry in SEED_DELIVERIES:
        if find_delivery_by_id(entry['id']):
            _update_delivery(entry)
            updated += 1
        else:
            _insert_delivery(entry)
            inserted += 1

    return {
        'inserted': inserted,
        'updated': updated,
        'removedFake': prune_result.get('removed', 0),
        'total': len(SEED_DELIVERIES),
    }
