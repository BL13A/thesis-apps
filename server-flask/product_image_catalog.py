"""Index tile product images from tile_dataset/labeled/ for mobile inventory."""

from __future__ import annotations

import base64
import os
import re
import sys
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config.ai_paths import TILE_DATASET_LABELED_DIR  # noqa: E402
from inventory_categories import DATASET_CATEGORY_FOLDERS, infer_inventory_tile_type  # noqa: E402

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
PRODUCT_CODE_RE = re.compile(r'^([CSWH]\d{5})$', re.I)
PRODUCT_CODE_SEARCH_RE = re.compile(r'([CSWH]\d{5})', re.I)
NAMED_SKU_RE = re.compile(r'^[A-Z0-9]+(?:-[A-Z0-9]+)*$')


def _category_folder_from_path(image_path: Path, labeled_dir: Path) -> str:
    try:
        relative = image_path.relative_to(labeled_dir)
        if relative.parts:
            return relative.parts[0]
    except ValueError:
        pass
    return 'ceramic_tile'
SIZE_FOLDER_NAMES = {'300x300', '300x600', '600x600'}
SKIP_CATEGORY_FOLDERS = {'intact', 'labels', 'images'}


def _slug_to_sku(stem: str) -> str:
    parts = [part for part in re.split(r'[-_\s]+', stem.strip()) if part]
    return '-'.join(part.upper() for part in parts)


def extract_product_code(filename: str, *, category_folder: str = '') -> str | None:
    stem = Path(filename).stem
    if PRODUCT_CODE_RE.match(stem):
        return stem.upper()

    match = PRODUCT_CODE_SEARCH_RE.search(stem)
    if match:
        return match.group(1).upper()

    if category_folder != 'porcelain_tile' or not stem:
        return None

    parts = [part for part in re.split(r'[-_\s]+', stem.lower()) if part]
    if len(parts) >= 2 and parts[-1] == 'eterno':
        color = '-'.join(part.upper() for part in parts[:-1])
        return f'{color}-ETERNO'

    sku = _slug_to_sku(stem)
    return sku if NAMED_SKU_RE.match(sku) else None


def _infer_series_and_size(path: Path, *, category_folder: str = '') -> tuple[str, str]:
    series = ''
    size = ''
    parts = path.parts
    category_names = set(DATASET_CATEGORY_FOLDERS)

    for part in parts:
        if part in SIZE_FOLDER_NAMES:
            size = part
            break

    if path.parent.name in SIZE_FOLDER_NAMES:
        candidate = path.parent.parent.name
        if candidate not in category_names and candidate != 'labeled':
            series = candidate
    elif (
        path.parent.name not in category_names
        and path.parent.name not in SIZE_FOLDER_NAMES
        and path.parent.name != 'labeled'
    ):
        series = path.parent.name

    stem = path.stem.lower()
    if category_folder == 'porcelain_tile' and 'eterno' in stem:
        color_parts = [part for part in re.split(r'[-_\s]+', stem) if part and part != 'eterno']
        color_label = ' '.join(word.capitalize() for word in color_parts)
        series = f'Eterno {color_label}'.strip()
        if not size:
            size = '600x600'

    return series, size


def _dataset_labeled_dir() -> Path:
    override = os.getenv('TILE_DATASET_LABELED_DIR')
    if override:
        return Path(override).resolve()
    return TILE_DATASET_LABELED_DIR


@lru_cache(maxsize=1)
def build_product_image_catalog() -> dict[str, dict]:
    catalog: dict[str, dict] = {}
    labeled_dir = _dataset_labeled_dir()
    if not labeled_dir.is_dir():
        return catalog

    search_roots = [
        labeled_dir / folder_name
        for folder_name in DATASET_CATEGORY_FOLDERS
        if (labeled_dir / folder_name).is_dir()
    ]
    if not search_roots:
        search_roots = [labeled_dir]

    for search_root in search_roots:
        for image_path in sorted(search_root.rglob('*')):
            if not image_path.is_file():
                continue
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if any(part in SKIP_CATEGORY_FOLDERS for part in image_path.parts):
                continue
            if 'intact' in image_path.parts:
                continue

            category_folder = _category_folder_from_path(image_path, labeled_dir)
            product_code = extract_product_code(
                image_path.name,
                category_folder=category_folder,
            )
            if not product_code:
                continue

            series, size = _infer_series_and_size(
                image_path,
                category_folder=category_folder,
            )
            tile_type = infer_inventory_tile_type(category_folder, product_code)

            catalog[product_code] = {
                'productCode': product_code,
                'filename': image_path.name,
                'absolutePath': str(image_path.resolve()),
                'series': series,
                'size': size,
                'category': category_folder,
                'tileType': tile_type,
            }

    return catalog


def get_catalog_product_skus() -> set[str]:
    """Product codes (e.g. C63052) indexed from ceramic_tile dataset."""
    return set(build_product_image_catalog().keys())


def is_catalog_sku(sku: str | None) -> bool:
    if not sku:
        return False
    return sku.strip().upper() in get_catalog_product_skus()


def get_catalog_entry(product_code: str | None) -> dict | None:
    if not product_code:
        return None
    return build_product_image_catalog().get(product_code.strip().upper())


def resolve_product_image_file(filename: str) -> Path | None:
    safe_name = Path(filename).name
    if not safe_name or safe_name != filename:
        return None

    for entry in build_product_image_catalog().values():
        if entry['filename'] == safe_name:
            path = Path(entry['absolutePath'])
            if path.is_file():
                return path
    return None


def public_product_image_uri(product_code: str | None) -> str | None:
    entry = get_catalog_entry(product_code)
    if not entry:
        return None
    return f'/api/tiles/product-images/{entry["filename"]}'


def _normalize(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def _encode_image_data_uri(image_path: Path, *, max_dimension: int = 320) -> str | None:
    """Read ceramic dataset file and return an inline data: URI for the mobile app."""
    if not image_path.is_file():
        return None

    try:
        import cv2
        import numpy as np

        buffer = image_path.read_bytes()
        array = np.frombuffer(buffer, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            return None

        height, width = image.shape[:2]
        largest = max(height, width)
        if largest > max_dimension:
            scale = max_dimension / float(largest)
            image = cv2.resize(
                image,
                (max(1, int(width * scale)), max(1, int(height * scale))),
                interpolation=cv2.INTER_AREA,
            )

        success, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not success:
            return None
        payload = base64.b64encode(encoded).decode('utf-8')
        return f'data:image/jpeg;base64,{payload}'
    except Exception:
        try:
            payload = base64.b64encode(image_path.read_bytes()).decode('utf-8')
            suffix = image_path.suffix.lower()
            mime = 'image/png' if suffix == '.png' else 'image/jpeg'
            return f'data:{mime};base64,{payload}'
        except OSError:
            return None


def get_product_image_data_uri(product_code: str | None, *, max_dimension: int = 320) -> str | None:
    entry = get_catalog_entry(product_code)
    if not entry:
        return None
    return _encode_image_data_uri(Path(entry['absolutePath']), max_dimension=max_dimension)


def resolve_product_image_for_tile(
    tile: dict,
    *,
    max_dimension: int = 320,
) -> tuple[str | None, dict | None]:
    """Match dataset image by product code (e.g. C63052, H60092, BEIGE-ETERNO)."""
    catalog = build_product_image_catalog()
    if not catalog:
        return None, None

    product_code = (tile.get('sku') or tile.get('productCode') or '').strip().upper()
    if product_code and product_code in catalog:
        entry = catalog[product_code]
        data_uri = _encode_image_data_uri(Path(entry['absolutePath']), max_dimension=max_dimension)
        return data_uri, entry

    for source in (tile.get('name'), tile.get('description')):
        if not source:
            continue
        match = PRODUCT_CODE_SEARCH_RE.search(str(source))
        if not match:
            continue
        code = match.group(1).upper()
        entry = catalog.get(code)
        if entry:
            data_uri = _encode_image_data_uri(Path(entry['absolutePath']), max_dimension=max_dimension)
            return data_uri, entry

    return None, None
