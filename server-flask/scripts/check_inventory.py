#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from product_image_catalog import build_product_image_catalog, get_catalog_product_skus
from dataset_inventory_sync import sync_dataset_tiles_to_inventory
from warehouse_repository import list_tiles

build_product_image_catalog.cache_clear()
sync = sync_dataset_tiles_to_inventory()
catalog = build_product_image_catalog()
porcelain_catalog = [k for k in sorted(catalog) if catalog[k].get('tileType') == 'Porcelain']
tiles = list_tiles()
porcelain_tiles = [t for t in tiles if t.get('tileType') == 'Porcelain']

print('sync', sync)
print('catalog_total', len(catalog))
print('catalog_porcelain', len(porcelain_catalog), porcelain_catalog)
print('api_list_total', len(tiles))
print('api_list_porcelain', len(porcelain_tiles))
for t in porcelain_tiles:
    print(' ', t.get('sku'), t.get('name'), 'img=' + ('yes' if t.get('imageUri') else 'no'))
