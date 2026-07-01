import uuid
from datetime import datetime, timezone

from database import get_connection

VALID_PR_STATUSES = {'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _new_id(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:12]}'


def _row_to_supplier(row) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'name': row['name'],
        'contactPerson': row['contact_person'],
        'email': row['email'],
        'phone': row.get('phone') or '',
        'address': row.get('address') or '',
        'leadTimeDays': int(row.get('lead_time_days') or 0),
        'status': row['status'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def _row_to_procurement(row) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'prNumber': row['pr_number'],
        'tileId': row.get('tile_id'),
        'tileName': row['tile_name'],
        'supplierId': row.get('supplier_id'),
        'supplierName': row.get('supplier_name') or '',
        'quantity': int(row['quantity']),
        'status': row['status'],
        'requestedBy': row['requested_by'],
        'requestedByName': row['requested_by_name'],
        'notes': row.get('notes') or '',
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def list_suppliers() -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM suppliers ORDER BY name ASC')
            return [_row_to_supplier(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def find_supplier_by_id(supplier_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM suppliers WHERE id = %s LIMIT 1', (supplier_id,))
            return _row_to_supplier(cursor.fetchone())
    finally:
        connection.close()


def insert_supplier(data: dict) -> dict:
    supplier_id = _new_id('sup')
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO suppliers (
                  id, name, contact_person, email, phone, address,
                  lead_time_days, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    supplier_id,
                    data['name'],
                    data.get('contactPerson') or '',
                    data.get('email') or '',
                    data.get('phone') or '',
                    data.get('address') or '',
                    int(data.get('leadTimeDays') or 7),
                    data.get('status') or 'Active',
                    now,
                    now,
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_supplier_by_id(supplier_id)


def update_supplier(supplier_id: str, data: dict) -> dict | None:
    existing = find_supplier_by_id(supplier_id)
    if not existing:
        return None
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE suppliers SET
                  name = %s, contact_person = %s, email = %s, phone = %s,
                  address = %s, lead_time_days = %s, status = %s, updated_at = %s
                WHERE id = %s
                ''',
                (
                    data.get('name', existing['name']),
                    data.get('contactPerson', existing['contactPerson']),
                    data.get('email', existing['email']),
                    data.get('phone', existing['phone']),
                    data.get('address', existing['address']),
                    int(data.get('leadTimeDays', existing['leadTimeDays'])),
                    data.get('status', existing['status']),
                    now,
                    supplier_id,
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_supplier_by_id(supplier_id)


def list_procurement_requests() -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM procurement_requests ORDER BY created_at DESC')
            return [_row_to_procurement(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def insert_procurement_request(data: dict) -> dict:
    pr_id = _new_id('pr')
    now = _now_iso()
    pr_number = data.get('prNumber') or f'PR-{now[:10].replace("-", "")}-{pr_id[-4:].upper()}'
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO procurement_requests (
                  id, pr_number, tile_id, tile_name, supplier_id, supplier_name,
                  quantity, status, requested_by, requested_by_name, notes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    pr_id,
                    pr_number,
                    data.get('tileId'),
                    data['tileName'],
                    data.get('supplierId'),
                    data.get('supplierName') or '',
                    int(data['quantity']),
                    data.get('status') or 'Pending',
                    data['requestedBy'],
                    data['requestedByName'],
                    data.get('notes') or '',
                    now,
                    now,
                ),
            )
        connection.commit()
    finally:
        connection.close()

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM procurement_requests WHERE id = %s LIMIT 1', (pr_id,))
            return _row_to_procurement(cursor.fetchone())
    finally:
        connection.close()


def update_procurement_request(pr_id: str, data: dict) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM procurement_requests WHERE id = %s LIMIT 1', (pr_id,))
            existing = cursor.fetchone()
            if not existing:
                return None
            status = data.get('status', existing['status'])
            if status not in VALID_PR_STATUSES:
                raise ValueError('Invalid procurement status')
            cursor.execute(
                '''
                UPDATE procurement_requests SET
                  tile_name = %s, supplier_id = %s, supplier_name = %s,
                  quantity = %s, status = %s, notes = %s, updated_at = %s
                WHERE id = %s
                ''',
                (
                    data.get('tileName', existing['tile_name']),
                    data.get('supplierId', existing.get('supplier_id')),
                    data.get('supplierName', existing.get('supplier_name')),
                    int(data.get('quantity', existing['quantity'])),
                    status,
                    data.get('notes', existing.get('notes') or ''),
                    _now_iso(),
                    pr_id,
                ),
            )
        connection.commit()
    finally:
        connection.close()

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM procurement_requests WHERE id = %s LIMIT 1', (pr_id,))
            return _row_to_procurement(cursor.fetchone())
    finally:
        connection.close()


def count_pending_procurement() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS count FROM procurement_requests WHERE status IN ('Pending', 'Approved')"
            )
            return int(cursor.fetchone()['count'])
    finally:
        connection.close()
