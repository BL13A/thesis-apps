from database import get_connection
from utils import row_to_inspection, row_to_user


def find_user_by_email(email: str) -> dict | None:
    normalized = email.strip().lower()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM users WHERE LOWER(email) = %s LIMIT 1', (normalized,))
            return row_to_user(cursor.fetchone())
    finally:
        connection.close()


def list_users() -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM users ORDER BY name ASC')
            return [row_to_user(row) for row in cursor.fetchall() if row]
    finally:
        connection.close()


MANAGED_USER_ROLES = (
    'Warehouse Personnel',
    'System Administrator',
    'Quality Assurance Manager',
    'Quality Assurance Officer',
    'Inventory Manager',
    'Purchasing Officer',
)

_EMPLOYEE_ID_BASE = 1_042_000

CANONICAL_EMPLOYEE_IDS = {
    'admin@tilevision.com': '1042000',
    'rafael.benavidez@tilevision.com': '1042001',
    'qa@tilevision.com': '1042002',
    'inventory@tilevision.com': '1042003',
    'purchasing@tilevision.com': '1042004',
}


def generate_next_employee_id(_role: str) -> str:
    """Assign the next numeric employee ID (digits only, no letters)."""
    users = list_users()
    max_num = _EMPLOYEE_ID_BASE
    for user in users:
        employee_id = str(user.get('employeeId') or '').strip()
        if employee_id.isdigit():
            max_num = max(max_num, int(employee_id))
    return str(max_num + 1)


def _has_numeric_employee_id(user: dict) -> bool:
    employee_id = str(user.get('employeeId') or '').strip()
    return employee_id.isdigit()


def _next_free_employee_id(used_ids: set[str]) -> str:
    candidate = _EMPLOYEE_ID_BASE + 1
    while str(candidate) in used_ids:
        candidate += 1
    value = str(candidate)
    used_ids.add(value)
    return value


def backfill_missing_employee_ids() -> int:
    """Ensure unique numeric employee IDs for every user account."""
    updated = 0
    users = list_users()
    used_ids: set[str] = set()
    canonical_by_user_id: dict[str, str] = {}

    for user in users:
        email = str(user.get('email') or '').strip().lower()
        canonical = CANONICAL_EMPLOYEE_IDS.get(email)
        if canonical:
            canonical_by_user_id[user['id']] = canonical

    for user_id, employee_id in canonical_by_user_id.items():
        user = find_user_by_id(user_id)
        if not user:
            continue
        current = str(user.get('employeeId') or '').strip()
        if current != employee_id:
            update_user_profile(user_id, {'employeeId': employee_id})
            updated += 1
        used_ids.add(employee_id)

    id_owner_count: dict[str, int] = {}
    for user in users:
        employee_id = str(user.get('employeeId') or '').strip()
        if employee_id.isdigit():
            id_owner_count[employee_id] = id_owner_count.get(employee_id, 0) + 1

    for user in users:
        user_id = user['id']
        if user_id in canonical_by_user_id:
            continue

        employee_id = str(user.get('employeeId') or '').strip()
        is_duplicate = employee_id.isdigit() and id_owner_count.get(employee_id, 0) > 1
        if _has_numeric_employee_id(user) and not is_duplicate:
            used_ids.add(employee_id)
            continue

        if employee_id.isdigit() and is_duplicate:
            id_owner_count[employee_id] -= 1

        next_id = _next_free_employee_id(used_ids)
        update_user_profile(user_id, {'employeeId': next_id})
        updated += 1

    return updated


def list_managed_users() -> list[dict]:
    """Users shown in web User Management (all thesis roles)."""
    connection = get_connection()
    placeholders = ', '.join(['%s'] * len(MANAGED_USER_ROLES))
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f'''
                SELECT * FROM users
                WHERE role IN ({placeholders})
                ORDER BY name ASC
                ''',
                MANAGED_USER_ROLES,
            )
            return [row_to_user(row) for row in cursor.fetchall() if row]
    finally:
        connection.close()


def find_user_by_id(user_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM users WHERE id = %s LIMIT 1', (user_id,))
            return row_to_user(cursor.fetchone())
    finally:
        connection.close()


def insert_user(record: dict) -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO users (
                  id, email, password_hash, name, role, employee_id, mobile_number, department, account_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    record['id'],
                    record['email'],
                    record['passwordHash'],
                    record['name'],
                    record['role'],
                    record.get('employeeId'),
                    record.get('mobileNumber'),
                    record.get('department'),
                    record.get('accountStatus', 'Active'),
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_user_by_id(record['id'])


def update_user_profile(user_id: str, updates: dict) -> dict | None:
    allowed_fields = {
        'name': 'name',
        'email': 'email',
        'role': 'role',
        'employeeId': 'employee_id',
        'mobileNumber': 'mobile_number',
        'department': 'department',
        'accountStatus': 'account_status',
    }
    assignments: list[str] = []
    values: list[object] = []
    for key, column in allowed_fields.items():
        if key in updates and updates[key] is not None:
            assignments.append(f'{column} = %s')
            values.append(updates[key])
    if not assignments:
        return find_user_by_id(user_id)

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE users SET {', '.join(assignments)} WHERE id = %s",
                (*values, user_id),
            )
        connection.commit()
    finally:
        connection.close()
    return find_user_by_id(user_id)


def update_user_password_hash(user_id: str, password_hash: str) -> None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('UPDATE users SET password_hash = %s WHERE id = %s', (password_hash, user_id))
        connection.commit()
    finally:
        connection.close()


def find_inspection_by_id(inspection_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM inspections WHERE id = %s LIMIT 1', (inspection_id,))
            return row_to_inspection(cursor.fetchone())
    finally:
        connection.close()


def list_inspections_for_auth(auth: dict) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if 'view_all_inspections' in auth.get('permissions', []):
                cursor.execute('SELECT * FROM inspections ORDER BY date DESC')
            else:
                cursor.execute(
                    'SELECT * FROM inspections WHERE inspected_by = %s ORDER BY date DESC',
                    (auth['userId'],),
                )
            return [row_to_inspection(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def insert_inspection(record: dict) -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO inspections (
                  id, date, batch_id, supplier_name, tile_type, tile_size, quantity, expected_dimension,
                  image_uri, result, defect_type, confidence_score, size_validation, inventory_status,
                  inspected_by, inspected_by_name, qa_status, qa_remarks, reviewed_by, reviewed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    record['id'],
                    record['date'],
                    record['batchId'],
                    record['supplierName'],
                    record['tileType'],
                    record['tileSize'],
                    record['quantity'],
                    record['expectedDimension'],
                    record.get('imageUri'),
                    record['result'],
                    record['defectType'],
                    record['confidenceScore'],
                    record['sizeValidation'],
                    record['inventoryStatus'],
                    record['inspectedBy'],
                    record['inspectedByName'],
                    record['qaStatus'],
                    record.get('qaRemarks'),
                    record.get('reviewedBy'),
                    record.get('reviewedAt'),
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return record


def update_inspection_qa_review(inspection_id: str, updates: dict) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE inspections
                SET qa_status = %s,
                    qa_remarks = %s,
                    reviewed_by = %s,
                    reviewed_at = %s,
                    inventory_status = %s
                WHERE id = %s
                ''',
                (
                    updates['qaStatus'],
                    updates.get('qaRemarks'),
                    updates['reviewedBy'],
                    updates['reviewedAt'],
                    updates['inventoryStatus'],
                    inspection_id,
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_inspection_by_id(inspection_id)


def update_inspection_image(inspection_id: str, image_uri: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE inspections SET image_uri = %s WHERE id = %s',
                (image_uri, inspection_id),
            )
        connection.commit()
    finally:
        connection.close()
    return find_inspection_by_id(inspection_id)
