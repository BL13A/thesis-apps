"""Replace legacy defect labels in recognition_logs with Ceramic Tile."""

from __future__ import annotations

from database import get_connection

DEFECT_NAMES = (
    'intact',
    'defect',
    'defective',
    'damaged',
    'broken',
    'cracked',
    'crack',
    'chip',
    'reject',
)


def migrate_defect_recognition_logs() -> dict:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            placeholders = ', '.join(['%s'] * len(DEFECT_NAMES))
            cursor.execute(
                f'''
                UPDATE recognition_logs
                SET recognized_name = %s, tile_type = %s
                WHERE LOWER(recognized_name) IN ({placeholders})
                ''',
                ('Ceramic Tile', 'Ceramic', *DEFECT_NAMES),
            )
            updated = cursor.rowcount
        connection.commit()
        return {'updatedRecognitionLogs': updated}
    finally:
        connection.close()
