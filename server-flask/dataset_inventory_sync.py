"""Upsert inventory rows from tile_dataset product images."""

from __future__ import annotations

from database import get_connection
from inventory_categories import (
    default_finish_for_type,
    default_material_for_type,
    demo_stock_levels,
)
from product_image_catalog import build_product_image_catalog, get_catalog_product_skus
from warehouse_repository import find_tile_by_sku, insert_tile, update_tile


def _default_tile_payload(entry: dict) -> dict:
    code = entry['productCode']
    series = entry.get('series') or ''
    size = entry.get('size') or '600x600'
    tile_type = entry.get('tileType') or 'Ceramic'
    display_name = f'{series} {code}'.strip() if series else f'{tile_type} {code}'
    material = default_material_for_type(tile_type)
    finish = default_finish_for_type(tile_type)
    stock_quantity, low_stock_threshold = demo_stock_levels(code)

    return {
        'id': f'tile-{code.lower()}',
        'name': display_name,
        'sku': code,
        'tileType': tile_type,
        'size': f'{size} mm',
        'color': 'Standard',
        'finish': finish,
        'material': material,
        'stockQuantity': stock_quantity,
        'lowStockThreshold': low_stock_threshold,
        'warehouseLocation': 'A-01-01',
        'description': f'{tile_type} — Product Code {code}.',
        'status': 'Active',
    }


def prune_non_catalog_tiles() -> dict:
    """Deactivate legacy/demo tiles not in the dataset catalog."""
    catalog_skus = get_catalog_product_skus()
    if not catalog_skus:
        return {'deactivated': 0, 'catalogSkus': 0}

    connection = get_connection()
    deactivated = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT id, sku, status FROM tiles')
            for row in cursor.fetchall():
                sku = (row.get('sku') or '').strip().upper()
                if sku in catalog_skus:
                    continue
                if row.get('status') == 'Inactive':
                    continue
                cursor.execute(
                    "UPDATE tiles SET status = 'Inactive' WHERE id = %s",
                    (row['id'],),
                )
                deactivated += 1
        connection.commit()
    finally:
        connection.close()

    return {'deactivated': deactivated, 'catalogSkus': len(catalog_skus)}


def sync_dataset_tiles_to_inventory() -> dict:
    build_product_image_catalog.cache_clear()
    try:
        from tile_visual_match import clear_visual_match_cache

        clear_visual_match_cache()
    except ImportError:
        pass
    catalog = build_product_image_catalog()
    inserted = 0
    updated = 0

    for entry in catalog.values():
        payload = _default_tile_payload(entry)
        existing = find_tile_by_sku(payload['sku'])

        if existing:
            update_tile(existing['id'], {
                'name': payload['name'],
                'tileType': payload['tileType'],
                'size': payload['size'],
                'finish': payload['finish'],
                'material': payload['material'],
                'description': payload['description'],
                'stockQuantity': payload['stockQuantity'],
                'lowStockThreshold': payload['lowStockThreshold'],
                'status': 'Active',
            })
            updated += 1
        else:
            insert_tile(payload)
            inserted += 1

    prune_result = prune_non_catalog_tiles()

    return {
        'catalogProducts': len(catalog),
        'inserted': inserted,
        'updated': updated,
        'deactivatedLegacy': prune_result.get('deactivated', 0),
    }
