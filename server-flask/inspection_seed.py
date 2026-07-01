"""Seed demo inspection records for QA monitoring and manual review workflows."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from database import get_connection
from repositories import insert_inspection
from seed import WAREHOUSE_PROFILE

WAREHOUSE_USER_ID = WAREHOUSE_PROFILE['id']
WAREHOUSE_USER_NAME = WAREHOUSE_PROFILE['name']


def _days_ago(days: int, hour: int = 9, minute: int = 15) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return dt.isoformat().replace('+00:00', 'Z')


def _entry(
    entry_id: str,
    *,
    days_ago: int,
    batch_id: str,
    supplier: str,
    tile_type: str,
    tile_size: str = '600x600 mm',
    quantity: str = '120 pcs',
    expected_dimension: str = '600x600 mm',
    result: str,
    defect_type: str,
    confidence: float,
    size_validation: str = 'Valid',
    inventory_status: str = 'Pending',
    qa_status: str = 'Pending',
    qa_remarks: str | None = None,
    reviewed_by: str | None = None,
    reviewed_at: str | None = None,
) -> dict:
    inspected_at = _days_ago(days_ago)
    return {
        'id': entry_id,
        'date': inspected_at,
        'batchId': batch_id,
        'supplierName': supplier,
        'tileType': tile_type,
        'tileSize': tile_size,
        'quantity': quantity,
        'expectedDimension': expected_dimension,
        'imageUri': None,
        'result': result,
        'defectType': defect_type,
        'confidenceScore': confidence,
        'sizeValidation': size_validation,
        'inventoryStatus': inventory_status,
        'inspectedBy': WAREHOUSE_USER_ID,
        'inspectedByName': WAREHOUSE_USER_NAME,
        'qaStatus': qa_status,
        'qaRemarks': qa_remarks,
        'reviewedBy': reviewed_by,
        'reviewedAt': reviewed_at,
    }


SEED_INSPECTIONS = [
    _entry(
        'insp-seed-001',
        days_ago=1,
        batch_id='2026-0143',
        supplier='Santos Construction Supply',
        tile_type='Ceramic Glazed Polished C63050 Montes',
        result='Passed',
        defect_type='None',
        confidence=0.94,
        inventory_status='Available',
        qa_status='None',
    ),
    _entry(
        'insp-seed-002',
        days_ago=2,
        batch_id='2026-0144',
        supplier='Rivera Home Builders',
        tile_type='Ceramic Glazed Polished C60014',
        result='Passed',
        defect_type='None',
        confidence=0.91,
        inventory_status='Available',
        qa_status='None',
    ),
    _entry(
        'insp-seed-003',
        days_ago=0,
        batch_id='2026-0145',
        supplier='Garcia Tile Depot',
        tile_type='Ceramic Glazed Polished C60015',
        result='Manual',
        defect_type='Crack',
        confidence=0.78,
        qa_status='Pending',
    ),
    _entry(
        'insp-seed-004',
        days_ago=0,
        batch_id='2026-0146',
        supplier='Lim Tile Trading',
        tile_type='Ceramic Decor S30024 Marvila',
        tile_size='300x300 mm',
        expected_dimension='300x300 mm',
        quantity='80 pcs',
        result='Manual',
        defect_type='Chipping',
        confidence=0.71,
        qa_status='Pending',
    ),
    _entry(
        'insp-seed-005',
        days_ago=1,
        batch_id='2026-0147',
        supplier='Santos Construction Supply',
        tile_type='Porcelain C60002',
        result='Manual',
        defect_type='Surface Defect',
        confidence=0.68,
        qa_status='Pending',
    ),
    _entry(
        'insp-seed-006',
        days_ago=3,
        batch_id='2026-0148',
        supplier='Rivera Home Builders',
        tile_type='Ceramic Glazed Polished C63050 Montes',
        result='Passed',
        defect_type='None',
        confidence=0.84,
        qa_status='Pending',
    ),
    _entry(
        'insp-seed-007',
        days_ago=2,
        batch_id='2026-0149',
        supplier='Garcia Tile Depot',
        tile_type='Ceramic Glazed Polished C60014',
        result='Manual',
        defect_type='Color Variation',
        confidence=0.76,
        qa_status='Pending',
    ),
    _entry(
        'insp-seed-008',
        days_ago=4,
        batch_id='2026-0150',
        supplier='Lim Tile Trading',
        tile_type='Ceramic Decor S30024 Marvila',
        tile_size='300x300 mm',
        expected_dimension='300x300 mm',
        quantity='96 pcs',
        result='Rejected',
        defect_type='Crack',
        confidence=0.52,
        inventory_status='Rejected',
        qa_status='None',
    ),
    _entry(
        'insp-seed-009',
        days_ago=5,
        batch_id='2026-0151',
        supplier='Santos Construction Supply',
        tile_type='Porcelain C60002',
        result='Passed',
        defect_type='None',
        confidence=0.96,
        size_validation='Invalid',
        expected_dimension='595x595 mm',
        inventory_status='Rejected',
        qa_status='None',
    ),
    _entry(
        'insp-seed-010',
        days_ago=6,
        batch_id='2026-0152',
        supplier='Rivera Home Builders',
        tile_type='Ceramic Glazed Polished C60015',
        result='Manual',
        defect_type='Edge Chip',
        confidence=0.73,
        qa_status='Passed',
        qa_remarks='Minor edge chip within acceptable tolerance after visual confirmation.',
        reviewed_by='Maria Santos',
        reviewed_at=_days_ago(5, hour=14, minute=20),
        inventory_status='Available',
    ),
    _entry(
        'insp-seed-011',
        days_ago=7,
        batch_id='2026-0153',
        supplier='Garcia Tile Depot',
        tile_type='Ceramic Glazed Polished C63050 Montes',
        result='Passed',
        defect_type='None',
        confidence=0.89,
        inventory_status='Available',
        qa_status='None',
    ),
    _entry(
        'insp-seed-012',
        days_ago=8,
        batch_id='2026-0154',
        supplier='Lim Tile Trading',
        tile_type='Ceramic Glazed Polished C60014',
        result='Manual',
        defect_type='Glaze Defect',
        confidence=0.79,
        qa_status='Rejected',
        qa_remarks='Glaze defect exceeds QA tolerance. Batch held for supplier return.',
        reviewed_by='Maria Santos',
        reviewed_at=_days_ago(7, hour=11, minute=5),
        inventory_status='Rejected',
    ),
    _entry(
        'insp-seed-013',
        days_ago=9,
        batch_id='2026-0155',
        supplier='Santos Construction Supply',
        tile_type='Porcelain C60002',
        result='Passed',
        defect_type='None',
        confidence=0.92,
        inventory_status='Available',
        qa_status='None',
    ),
    _entry(
        'insp-seed-014',
        days_ago=10,
        batch_id='2026-0156',
        supplier='Rivera Home Builders',
        tile_type='Ceramic Decor S30024 Marvila',
        tile_size='300x300 mm',
        expected_dimension='300x300 mm',
        quantity='64 pcs',
        result='Manual',
        defect_type='Crack',
        confidence=0.74,
        qa_status='Pending',
    ),
]


def _inspection_exists(inspection_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM inspections WHERE id = %s LIMIT 1', (inspection_id,))
            return cursor.fetchone() is not None
    finally:
        connection.close()


LEGACY_BATCH_ID_MAP = {
    'BATCH-2026-0607-A': '2026-0143',
    'BATCH-2026-0606-B': '2026-0144',
    'BATCH-2026-0607-C': '2026-0145',
    'BATCH-2026-0607-D': '2026-0146',
    'BATCH-2026-0606-E': '2026-0147',
    'BATCH-2026-0604-F': '2026-0148',
    'BATCH-2026-0605-G': '2026-0149',
    'BATCH-2026-0603-H': '2026-0150',
    'BATCH-2026-0602-I': '2026-0151',
    'BATCH-2026-0601-J': '2026-0152',
    'BATCH-2026-0531-K': '2026-0153',
    'BATCH-2026-0530-L': '2026-0154',
    'BATCH-2026-0529-M': '2026-0155',
    'BATCH-2026-0528-N': '2026-0156',
}


def backfill_inspection_batch_ids() -> dict:
    from batch_ids import generate_next_batch_id, is_valid_batch_id

    synced_seed = 0
    converted_legacy = 0
    converted_other = 0

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for entry in SEED_INSPECTIONS:
                cursor.execute(
                    'UPDATE inspections SET batch_id = %s WHERE id = %s AND batch_id <> %s',
                    (entry['batchId'], entry['id'], entry['batchId']),
                )
                synced_seed += cursor.rowcount

            for old_batch, new_batch in LEGACY_BATCH_ID_MAP.items():
                cursor.execute(
                    'UPDATE inspections SET batch_id = %s WHERE batch_id = %s',
                    (new_batch, old_batch),
                )
                converted_legacy += cursor.rowcount

            cursor.execute('SELECT id, batch_id FROM inspections ORDER BY date ASC, id ASC')
            next_batch_id = generate_next_batch_id()
            for row in cursor.fetchall():
                if is_valid_batch_id(row.get('batch_id')):
                    continue
                cursor.execute(
                    'UPDATE inspections SET batch_id = %s WHERE id = %s',
                    (next_batch_id, row['id']),
                )
                converted_other += 1
                year, sequence = next_batch_id.split('-', 1)
                next_batch_id = f'{year}-{int(sequence) + 1:04d}'

        connection.commit()
    finally:
        connection.close()

    return {
        'syncedSeed': synced_seed,
        'convertedLegacy': converted_legacy,
        'convertedOther': converted_other,
    }


def seed_inspection_records() -> dict:
    inserted = 0
    skipped = 0

    for entry in SEED_INSPECTIONS:
        if _inspection_exists(entry['id']):
            skipped += 1
            continue
        insert_inspection(entry)
        inserted += 1

    batch_backfill = backfill_inspection_batch_ids()

    return {
        'inserted': inserted,
        'skipped': skipped,
        'total': len(SEED_INSPECTIONS),
        'batchIdsBackfilled': batch_backfill,
    }
