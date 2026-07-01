"""Inventory tile types aligned with dataset category folders."""

from __future__ import annotations

INVENTORY_TILE_TYPES: tuple[str, ...] = (
    'Ceramic',
    'Decor',
    'Glazed Polished Porcelain',
    'Porcelain',
)

DATASET_CATEGORY_FOLDERS: tuple[str, ...] = (
    'ceramic_tile',
    'decor',
    'glazed_polished_porcelain',
    'porcelain_tile',
)

_FOLDER_TILE_TYPE: dict[str, str] = {
    'decor': 'Decor',
    'glazed_polished_porcelain': 'Glazed Polished Porcelain',
    'porcelain_tile': 'Porcelain',
}


def infer_inventory_tile_type(category_folder: str, product_code: str) -> str:
    mapped = _FOLDER_TILE_TYPE.get(category_folder)
    if mapped:
        return mapped

    prefix = (product_code or '')[:1].upper()
    if prefix == 'S':
        return 'Decor'
    if prefix == 'W':
        return 'Glazed Polished Porcelain'
    return 'Ceramic'


def default_material_for_type(tile_type: str) -> str:
    if tile_type in ('Porcelain', 'Glazed Polished Porcelain'):
        return 'Porcelain'
    return 'Ceramic'


def demo_stock_levels(sku: str) -> tuple[int, int]:
    """Stable demo mix: ~10% out of stock, ~30% low stock, rest in stock."""
    threshold = 25
    score = sum(ord(char) for char in (sku or '').upper())
    bucket = score % 10
    if bucket == 0:
        return 0, threshold
    if bucket in (1, 2, 3):
        return 8 + (score % 12), threshold
    return 48 + (score % 72), threshold


def default_finish_for_type(tile_type: str) -> str:
    if tile_type == 'Glazed Polished Porcelain':
        return 'Glazed Polished'
    if tile_type == 'Porcelain':
        return 'Polished'
    if tile_type == 'Decor':
        return 'Decorative'
    return 'Glazed'
