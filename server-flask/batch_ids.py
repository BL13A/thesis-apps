"""Numeric batch ID helpers — format YYYY-NNNN (e.g. 2026-0142)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from database import get_connection

BATCH_ID_PATTERN = re.compile(r'^\d{4}-\d{4}$')


def is_valid_batch_id(value: str | None) -> bool:
    if not value:
        return False
    return bool(BATCH_ID_PATTERN.match(str(value).strip()))


def normalize_batch_id(value: str) -> str | None:
    cleaned = str(value).strip()
    if is_valid_batch_id(cleaned):
        return cleaned
    return None


def generate_next_batch_id(year: int | None = None) -> str:
    target_year = year or datetime.now(timezone.utc).year
    prefix = f'{target_year}-'
    max_sequence = 0

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT batch_id FROM inspections WHERE batch_id LIKE %s',
                (f'{prefix}%',),
            )
            for row in cursor.fetchall():
                batch_id = str(row.get('batch_id') or '')
                match = re.match(rf'^{target_year}-(\d{{4}})$', batch_id)
                if match:
                    max_sequence = max(max_sequence, int(match.group(1)))
    finally:
        connection.close()

    return f'{target_year}-{max_sequence + 1:04d}'
