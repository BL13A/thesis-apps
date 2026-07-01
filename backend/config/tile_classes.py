"""Tile product class labels for YOLOv8 — not defect/QA categories."""

from __future__ import annotations

import re

# Legacy defect-detection labels — never treat as tile products.
DEFECT_CLASS_LABELS = frozenset({
    'intact',
    'defect',
    'defective',
    'damaged',
    'broken',
    'crack',
    'cracked',
    'chip',
    'chipping',
    'edgechipping',
    'edge_chipping',
    'hole',
    'line',
    'scratch',
    'reject',
    'rejected',
    'pass',
    'fail',
    'manual',
})


def normalize_label(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def slugify_tile_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def humanize_class_label(label: str) -> str:
    if not label:
        return 'Unknown Tile'
    cleaned = label.replace('-', '_').replace('/', '_')
    parts = [part for part in cleaned.split('_') if part]
    if not parts:
        return label
    return ' '.join(word.capitalize() for word in parts)


def is_defect_class_label(label: str) -> bool:
    normalized = normalize_label(label.replace('-', '_'))
    if not normalized:
        return True
    if normalized in DEFECT_CLASS_LABELS:
        return True
    return any(token in normalized for token in ('defect', 'damage', 'reject', 'chip', 'crack'))


# YOLOv8 training folders -> inventory tileType values
TILE_CATEGORY_CLASSES: dict[str, str] = {
    'ceramic_tile': 'Ceramic',
    'ceramic': 'Ceramic',
    'decor': 'Decor',
    'glazed_polished_porcelain': 'Glazed Polished Porcelain',
    'glazed_polished': 'Glazed Polished Porcelain',
    'porcelain_tile': 'Porcelain',
    'porcelain': 'Porcelain',
    'marble_tile': 'Marble',
    'marble': 'Marble',
    'granite_tile': 'Granite',
    'granite': 'Granite',
    'mosaic_tile': 'Mosaic',
    'mosaic': 'Mosaic',
    'wood_look_tile': 'Wood Look',
    'woodlook_tile': 'Wood Look',
    'wood_look': 'Wood Look',
}

TILE_CATEGORY_DISPLAY: dict[str, str] = {
    'Ceramic': 'Ceramic Tile',
    'Decor': 'Decor Tile',
    'Glazed Polished Porcelain': 'Glazed Polished Porcelain Tile',
    'Porcelain': 'Porcelain Tile',
    'Marble': 'Marble Tile',
    'Granite': 'Granite Tile',
    'Mosaic': 'Mosaic Tile',
    'Wood Look': 'Wood-Look Tile',
}


def map_label_to_tile_type(label: str) -> str | None:
    if not label or is_defect_class_label(label):
        return None

    slug = slugify_tile_name(label)
    normalized = normalize_label(slug)

    if slug in TILE_CATEGORY_CLASSES:
        return TILE_CATEGORY_CLASSES[slug]
    if normalized in {normalize_label(key) for key in TILE_CATEGORY_CLASSES}:
        for key, tile_type in TILE_CATEGORY_CLASSES.items():
            if normalize_label(key) == normalized:
                return tile_type

    for key, tile_type in TILE_CATEGORY_CLASSES.items():
        if key in slug or slug in key:
            return tile_type

    human = humanize_class_label(label)
    for tile_type, display in TILE_CATEGORY_DISPLAY.items():
        if tile_type.lower() in human.lower():
            return tile_type

    return None


def sanitize_display_label(label: str) -> str:
    """Never show defect labels (intact, cracked, etc.) in the UI."""
    if not label:
        return 'Ceramic Tile'
    if is_defect_class_label(label):
        return 'Ceramic Tile'
    return format_detected_class_label(label)


def format_tile_type_detection_label(label: str) -> str:
    """Short warehouse label for overlays: Ceramic, Decor, Porcelain, etc."""
    if not label or is_defect_class_label(label):
        return 'Ceramic'
    tile_type = map_label_to_tile_type(label)
    if tile_type:
        return tile_type
    human = humanize_class_label(label)
    if human.lower().endswith(' tile'):
        return human[:-5].strip() or 'Ceramic'
    return human if human != 'Unknown Tile' else 'Ceramic'


def format_detected_class_label(label: str) -> str:
    if not label or is_defect_class_label(label):
        return 'Ceramic Tile'
    tile_type = map_label_to_tile_type(label)
    if tile_type:
        return TILE_CATEGORY_DISPLAY.get(tile_type, f'{tile_type} Tile')
    human = humanize_class_label(label)
    if human.lower().endswith('tile'):
        return human
    return f'{human} Tile' if human != 'Unknown Tile' else human


def model_has_defect_classes(class_names: list[str]) -> bool:
    if not class_names:
        return False
    return all(is_defect_class_label(name) for name in class_names)


def inventory_match_keys(tile: dict) -> set[str]:
    keys: set[str] = set()
    for raw in (
        tile.get('id'),
        tile.get('sku'),
        tile.get('name'),
        tile.get('tileType'),
        slugify_tile_name(tile.get('name') or ''),
    ):
        if not raw:
            continue
        keys.add(normalize_label(str(raw)))
        keys.add(normalize_label(str(raw).replace('-', '_')))

    name_slug = slugify_tile_name(tile.get('name') or '')
    if name_slug:
        keys.add(normalize_label(name_slug))
    return {key for key in keys if key}
