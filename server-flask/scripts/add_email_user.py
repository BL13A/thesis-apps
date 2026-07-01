"""Add a real email user for password reset testing."""

import sys
from pathlib import Path

import bcrypt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import get_connection

EMAIL = sys.argv[1] if len(sys.argv) > 1 else 'amagdaleneb@gmail.com'
NAME = sys.argv[2] if len(sys.argv) > 2 else 'Aury Benavidez'
PASSWORD = sys.argv[3] if len(sys.argv) > 3 else 'password123'
USER_ID = 'user-aury-001'

password_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()

connection = get_connection()
try:
    with connection.cursor() as cursor:
        cursor.execute('SELECT id FROM users WHERE email = %s', (EMAIL.lower(),))
        if cursor.fetchone():
            print(f'User already exists: {EMAIL}')
        else:
            cursor.execute(
                '''
                INSERT INTO users (
                  id, email, password_hash, name, role, employee_id, mobile_number, department, account_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    USER_ID,
                    EMAIL.lower(),
                    password_hash,
                    NAME,
                    'Warehouse Personnel',
                    'EMP-WH-2001',
                    '+63 900 000 0001',
                    'Warehouse Operations',
                    'Active',
                ),
            )
            connection.commit()
            print(f'Created user: {EMAIL} / {PASSWORD}')
finally:
    connection.close()
