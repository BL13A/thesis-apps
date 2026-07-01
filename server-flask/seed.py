import bcrypt

from config import DEFAULT_PASSWORD
from database import get_connection
from warehouse_repository import insert_tile

WAREHOUSE_PROFILE = {
    'id': 'user-warehouse-001',
    'email': 'rafael.benavidez@tilevision.com',
    'name': 'Rafael Benavidez',
    'employeeId': '1042001',
}

SEED_USERS = [
    {
        'id': WAREHOUSE_PROFILE['id'],
        'email': WAREHOUSE_PROFILE['email'],
        'name': WAREHOUSE_PROFILE['name'],
        'role': 'Warehouse Personnel',
        'employeeId': WAREHOUSE_PROFILE['employeeId'],
        'mobileNumber': '+63 917 842 3910',
        'department': 'Warehouse Operations',
        'accountStatus': 'Active',
    },
    {
        'id': 'user-qa-001',
        'email': 'qa@tilevision.com',
        'name': 'Maria Santos',
        'role': 'Quality Assurance Manager',
        'employeeId': '1042002',
        'mobileNumber': '+63 918 556 2044',
        'department': 'Quality Assurance',
        'accountStatus': 'Active',
    },
    {
        'id': 'user-admin-001',
        'email': 'admin@tilevision.com',
        'name': 'System Admin',
        'role': 'System Administrator',
        'employeeId': '1042000',
        'mobileNumber': '+63 917 000 0001',
        'department': 'IT Administration',
        'accountStatus': 'Active',
    },
    {
        'id': 'user-inv-001',
        'email': 'inventory@tilevision.com',
        'name': 'Ana Reyes',
        'role': 'Inventory Manager',
        'employeeId': '1042003',
        'mobileNumber': '+63 918 300 1001',
        'department': 'Inventory Control',
        'accountStatus': 'Active',
    },
    {
        'id': 'user-purch-001',
        'email': 'purchasing@tilevision.com',
        'name': 'Carlos Mendoza',
        'role': 'Purchasing Officer',
        'employeeId': '1042004',
        'mobileNumber': '+63 918 400 1001',
        'department': 'Procurement',
        'accountStatus': 'Active',
    },
]

# Inventory comes from ceramic dataset sync (dataset_inventory_sync.py).
SEED_TILES: list[dict] = []


def _seed_tiles_if_empty() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) AS count FROM tiles')
            if int(cursor.fetchone()['count']) > 0:
                return 0
    finally:
        connection.close()

    for tile in SEED_TILES:
        insert_tile(tile)
    return len(SEED_TILES)


WEB_ADMIN_USERS = [
    user for user in SEED_USERS
    if user['role'] in ('System Administrator', 'Inventory Manager', 'Purchasing Officer')
]


def _seed_web_users_if_missing() -> int:
    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    seeded = 0
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for user in WEB_ADMIN_USERS:
                cursor.execute('SELECT id FROM users WHERE email = %s LIMIT 1', (user['email'],))
                if cursor.fetchone():
                    continue
                cursor.execute(
                    '''
                    INSERT INTO users (
                      id, email, password_hash, name, role, employee_id, mobile_number, department, account_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''',
                    (
                        user['id'],
                        user['email'],
                        password_hash,
                        user['name'],
                        user['role'],
                        user['employeeId'],
                        user['mobileNumber'],
                        user['department'],
                        user['accountStatus'],
                    ),
                )
                seeded += 1
        connection.commit()
    finally:
        connection.close()
    return seeded


def _sync_numeric_employee_ids() -> int:
    """Normalize employee IDs to numeric-only values for all accounts."""
    from repositories import backfill_missing_employee_ids

    return backfill_missing_employee_ids()


def _sync_warehouse_profile() -> bool:
    connection = get_connection()
    updated = False
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE users
                SET name = %s, employee_id = %s, email = %s
                WHERE id = %s
                   OR email IN (%s, %s)
                ''',
                (
                    WAREHOUSE_PROFILE['name'],
                    WAREHOUSE_PROFILE['employeeId'],
                    WAREHOUSE_PROFILE['email'],
                    WAREHOUSE_PROFILE['id'],
                    WAREHOUSE_PROFILE['email'],
                    'warehouse@tilevision.com',
                ),
            )
            updated = cursor.rowcount > 0
        connection.commit()
    finally:
        connection.close()
    return updated


def seed_database_if_empty() -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) AS count FROM users')
            user_count = int(cursor.fetchone()['count'])

        warehouse_profile_synced = _sync_warehouse_profile()
        employee_ids_synced = _sync_numeric_employee_ids()

        if user_count > 0:
            seeded_tiles = _seed_tiles_if_empty()
            seeded_web = _seed_web_users_if_missing()
            return {
                'seededUsers': seeded_web,
                'seededInspections': 0,
                'seededTiles': seeded_tiles,
                'warehouseProfileSynced': warehouse_profile_synced,
                'employeeIdsSynced': employee_ids_synced,
            }

        password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()

        with connection.cursor() as cursor:
            for user in SEED_USERS:
                cursor.execute(
                    '''
                    INSERT INTO users (
                      id, email, password_hash, name, role, employee_id, mobile_number, department, account_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''',
                    (
                        user['id'],
                        user['email'],
                        password_hash,
                        user['name'],
                        user['role'],
                        user['employeeId'],
                        user['mobileNumber'],
                        user['department'],
                        user['accountStatus'],
                    ),
                )
        connection.commit()
        seeded_tiles = _seed_tiles_if_empty()
        employee_ids_synced = _sync_numeric_employee_ids()
        return {
            'seededUsers': len(SEED_USERS),
            'seededInspections': 0,
            'seededTiles': seeded_tiles,
            'warehouseProfileSynced': warehouse_profile_synced,
            'employeeIdsSynced': employee_ids_synced,
        }
    finally:
        connection.close()
