"""Seed supplier directory and link tile inventory to suppliers."""

from __future__ import annotations

from database import get_connection
from procurement_repository import insert_supplier, list_suppliers
from warehouse_repository import list_tiles, update_tile

SEED_SUPPLIERS = [
    {
        'id': 'sup-santos-001',
        'name': 'Santos Construction Supply',
        'contactPerson': 'Engr. Carlo Santos',
        'email': 'procurement@santosconstruction.com',
        'phone': '+63 917 220 4811',
        'address': '45 Katipunan Ave., Brgy. Loyola Heights, Quezon City',
        'leadTimeDays': 7,
        'status': 'Active',
    },
    {
        'id': 'sup-rivera-001',
        'name': 'Rivera Home Builders',
        'contactPerson': 'Maria Rivera',
        'email': 'supply@riverahomebuilders.com',
        'phone': '+63 918 334 9022',
        'address': 'Unit 12B, Pacific Star Bldg., Sen. Gil Puyat Ave., Makati City',
        'leadTimeDays': 5,
        'status': 'Active',
    },
    {
        'id': 'sup-garcia-001',
        'name': 'Garcia Tile Depot',
        'contactPerson': 'Antonio Garcia',
        'email': 'orders@garciatiledepot.com',
        'phone': '+63 919 445 6610',
        'address': 'Block 7 Lot 14, Commonwealth Ave., Quezon City',
        'leadTimeDays': 10,
        'status': 'Active',
    },
    {
        'id': 'sup-lim-001',
        'name': 'Lim Tile Trading',
        'contactPerson': 'Jennifer Lim',
        'email': 'sales@limtiletrading.com',
        'phone': '+63 920 118 4420',
        'address': '88 EDSA cor. Boni Ave., Mandaluyong City',
        'leadTimeDays': 8,
        'status': 'Active',
    },
    {
        'id': 'sup-ceramicpro-001',
        'name': 'CeramicPro Industries',
        'contactPerson': 'Ramon Delgado',
        'email': 'logistics@ceramicpro.ph',
        'phone': '+63 917 880 1200',
        'address': 'Lot 18, Cavite Industrial Park, Rosario, Cavite',
        'leadTimeDays': 14,
        'status': 'Active',
    },
    {
        'id': 'sup-granite-001',
        'name': 'GraniteStone Co.',
        'contactPerson': 'Patricia Yu',
        'email': 'tiles@granitestoneco.com',
        'phone': '+63 918 552 9033',
        'address': 'Warehouse 3, Port Area, Manila',
        'leadTimeDays': 12,
        'status': 'Active',
    },
    {
        'id': 'sup-tilemaster-001',
        'name': 'TileMaster Global',
        'contactPerson': 'Henry Cruz',
        'email': 'warehouse@tilemasterglobal.com',
        'phone': '+63 919 661 7788',
        'address': '12 Laguna Blvd., Santa Rosa, Laguna',
        'leadTimeDays': 9,
        'status': 'Active',
    },
    {
        'id': 'sup-porcelain-001',
        'name': 'PorcelainWorks Ltd.',
        'contactPerson': 'Grace Mendoza',
        'email': 'supply@porcelainworks.ph',
        'phone': '+63 917 441 2290',
        'address': 'Bldg. 5, Mamplasan Industrial Estate, Biñan, Laguna',
        'leadTimeDays': 11,
        'status': 'Inactive',
    },
]


def _supplier_exists(supplier_id: str) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM suppliers WHERE id = %s LIMIT 1', (supplier_id,))
            return cursor.fetchone() is not None
    finally:
        connection.close()


def seed_suppliers() -> dict:
    inserted = 0
    skipped = 0

    for entry in SEED_SUPPLIERS:
        if _supplier_exists(entry['id']):
            skipped += 1
            continue
        insert_supplier(entry)
        inserted += 1

    return {
        'inserted': inserted,
        'skipped': skipped,
        'total': len(SEED_SUPPLIERS),
    }


def assign_suppliers_to_inventory_tiles() -> int:
    suppliers = [item for item in list_suppliers() if item.get('status') == 'Active']
    if not suppliers:
        return 0

    updated = 0
    tiles = [tile for tile in list_tiles({'status': 'Active'}) if not (tile.get('supplierName') or '').strip()]

    for index, tile in enumerate(tiles):
        supplier = suppliers[index % len(suppliers)]
        update_tile(tile['id'], {'supplierName': supplier['name']})
        updated += 1

    return updated


def ensure_suppliers_seeded() -> dict:
    result = seed_suppliers()
    result['tilesLinked'] = assign_suppliers_to_inventory_tiles()
    return result
