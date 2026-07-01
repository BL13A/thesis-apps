import uuid
from datetime import datetime, timezone

from database import get_connection
from product_image_catalog import get_catalog_product_skus
from utils import row_to_delivery, row_to_recognition_log, row_to_stock_movement, row_to_tile


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _new_id(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:12]}'


def _catalog_sku_sql_clause() -> tuple[str, list[str]]:
    skus = sorted(get_catalog_product_skus())
    if not skus:
        return '1 = 0', []
    placeholders = ', '.join(['%s'] * len(skus))
    return f'UPPER(sku) IN ({placeholders})', skus


def compute_stock_status(tile: dict) -> str:
    qty = int(tile.get('stockQuantity') or 0)
    threshold = int(tile.get('lowStockThreshold') or 10)
    if qty <= 0:
        return 'Out of Stock'
    if qty <= threshold:
        return 'Low Stock'
    return 'In Stock'


def enrich_tile(tile: dict | None, *, image_size: int = 320) -> dict | None:
    if not tile:
        return None
    from product_image_catalog import resolve_product_image_for_tile

    tile['stockStatus'] = compute_stock_status(tile)
    product_code = (tile.get('sku') or tile.get('productCode') or '').strip().upper()
    tile['productCode'] = product_code

    image_uri, catalog_entry = resolve_product_image_for_tile(tile, max_dimension=image_size)
    if image_uri:
        tile['imageUri'] = image_uri
        tile['productImage'] = image_uri
    if catalog_entry:
        tile['series'] = catalog_entry.get('series') or tile.get('series') or ''
        if catalog_entry.get('size') and (not tile.get('size') or tile.get('size') in ('—', '-')):
            tile['size'] = f"{catalog_entry['size']} cm"

    return tile


def find_tile_by_sku(sku: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM tiles WHERE UPPER(sku) = %s LIMIT 1', (sku.strip().upper(),))
            return enrich_tile(row_to_tile(cursor.fetchone()), image_size=480)
    finally:
        connection.close()


def list_tiles(filters: dict | None = None) -> list[dict]:
    filters = filters or {}
    clauses = []
    params: list = []

    sku_clause, sku_params = _catalog_sku_sql_clause()
    clauses.append(sku_clause)
    params.extend(sku_params)

    for field, column in [
        ('tileType', 'tile_type'),
        ('size', 'size'),
        ('color', 'color'),
        ('finish', 'finish'),
        ('material', 'material'),
        ('status', 'status'),
    ]:
        value = filters.get(field)
        if value:
            clauses.append(f'{column} = %s')
            params.append(value)

    search = (filters.get('search') or '').strip()
    if search:
        clauses.append(
            '(name LIKE %s OR tile_type LIKE %s OR color LIKE %s OR sku LIKE %s)'
        )
        like = f'%{search}%'
        params.extend([like, like, like, like])

    where = f'WHERE {" AND ".join(clauses)}' if clauses else ''
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT * FROM tiles {where} ORDER BY name ASC',
                params,
            )
            return [enrich_tile(row_to_tile(row)) for row in cursor.fetchall()]
    finally:
        connection.close()


def find_tile_by_id(tile_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM tiles WHERE id = %s LIMIT 1', (tile_id,))
            return enrich_tile(row_to_tile(cursor.fetchone()), image_size=480)
    finally:
        connection.close()


def insert_tile(data: dict) -> dict:
    tile_id = data.get('id') or _new_id('tile')
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO tiles (
                  id, name, tile_type, size, color, finish, material,
                  stock_quantity, low_stock_threshold, status, image_uri,
                  description, sku, supplier_name, warehouse_location,
                  created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    tile_id,
                    data['name'],
                    data['tileType'],
                    data['size'],
                    data['color'],
                    data['finish'],
                    data['material'],
                    int(data.get('stockQuantity') or 0),
                    int(data.get('lowStockThreshold') or data.get('reorderLevel') or 10),
                    data.get('status') or 'Active',
                    data.get('imageUri'),
                    data.get('description'),
                    data.get('sku'),
                    data.get('supplierName') or data.get('supplier') or '',
                    data.get('warehouseLocation') or '',
                    now,
                    now,
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_tile_by_id(tile_id)


def update_tile(tile_id: str, data: dict) -> dict | None:
    existing = find_tile_by_id(tile_id)
    if not existing:
        return None

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE tiles SET
                  name = %s, tile_type = %s, size = %s, color = %s, finish = %s,
                  material = %s, stock_quantity = %s, low_stock_threshold = %s,
                  status = %s, image_uri = %s, description = %s, sku = %s,
                  supplier_name = %s, warehouse_location = %s, updated_at = %s
                WHERE id = %s
                ''',
                (
                    data.get('name', existing['name']),
                    data.get('tileType', existing['tileType']),
                    data.get('size', existing['size']),
                    data.get('color', existing['color']),
                    data.get('finish', existing['finish']),
                    data.get('material', existing['material']),
                    int(data.get('stockQuantity', existing['stockQuantity'])),
                    int(
                        data.get('lowStockThreshold', data.get('reorderLevel', existing['lowStockThreshold']))
                    ),
                    data.get('status', existing['status']),
                    data.get('imageUri', existing.get('imageUri')),
                    data.get('description', existing.get('description')),
                    data.get('sku', existing.get('sku')),
                    data.get('supplierName', data.get('supplier', existing.get('supplierName', ''))),
                    data.get('warehouseLocation', existing.get('warehouseLocation', '')),
                    _now_iso(),
                    tile_id,
                ),
            )
        connection.commit()
    finally:
        connection.close()
    return find_tile_by_id(tile_id)


def list_low_stock_tiles() -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            sku_clause, sku_params = _catalog_sku_sql_clause()
            cursor.execute(
                f'''
                SELECT * FROM tiles
                WHERE stock_quantity <= low_stock_threshold
                  AND status = 'Active'
                  AND {sku_clause}
                ORDER BY stock_quantity ASC, name ASC
                ''',
                sku_params,
            )
            return [enrich_tile(row_to_tile(row)) for row in cursor.fetchall()]
    finally:
        connection.close()


def adjust_tile_stock(tile_id: str, delta: int) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE tiles SET stock_quantity = GREATEST(0, stock_quantity + %s), updated_at = %s WHERE id = %s',
                (delta, _now_iso(), tile_id),
            )
        connection.commit()
    finally:
        connection.close()
    return find_tile_by_id(tile_id)


def insert_stock_movement(data: dict) -> dict:
    movement_id = _new_id('sm')
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO stock_movements (
                  id, tile_id, transaction_type, quantity, reason,
                  transaction_date, handled_by, handled_by_name, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    movement_id,
                    data['tileId'],
                    data['transactionType'],
                    int(data['quantity']),
                    data['reason'],
                    data['transactionDate'],
                    data['handledBy'],
                    data['handledByName'],
                    now,
                ),
            )
        connection.commit()
    finally:
        connection.close()

    delta = int(data['quantity']) if data['transactionType'] == 'In' else -int(data['quantity'])
    adjust_tile_stock(data['tileId'], delta)

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM stock_movements WHERE id = %s LIMIT 1', (movement_id,))
            return row_to_stock_movement(cursor.fetchone())
    finally:
        connection.close()


def list_stock_movements_for_tile(tile_id: str) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT * FROM stock_movements WHERE tile_id = %s ORDER BY transaction_date DESC, created_at DESC',
                (tile_id,),
            )
            return [row_to_stock_movement(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def list_stock_movements(limit: int = 20) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT * FROM stock_movements
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT %s
                ''',
                (max(1, min(limit, 100)),),
            )
            return [row_to_stock_movement(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def insert_recognition_log(data: dict) -> dict:
    log_id = _new_id('rl')
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO recognition_logs (
                  id, image_uri, recognized_name, tile_type, confidence_score,
                  matched_tile_id, user_id, user_name, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    log_id,
                    data.get('imageUri'),
                    data['recognizedName'],
                    data['tileType'],
                    float(data['confidenceScore']),
                    data.get('matchedTileId'),
                    data['userId'],
                    data['userName'],
                    now,
                ),
            )
        connection.commit()
    finally:
        connection.close()

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM recognition_logs WHERE id = %s LIMIT 1', (log_id,))
            return row_to_recognition_log(cursor.fetchone())
    finally:
        connection.close()


def list_recognition_logs(limit: int = 100) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT * FROM recognition_logs ORDER BY created_at DESC LIMIT %s',
                (max(1, min(limit, 500)),),
            )
            return [row_to_recognition_log(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def list_deliveries() -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM deliveries ORDER BY delivery_date DESC, created_at DESC')
            deliveries = [row_to_delivery(row) for row in cursor.fetchall()]
            for delivery in deliveries:
                delivery['items'] = list_delivery_items(delivery['id'])
            return deliveries
    finally:
        connection.close()


def list_delivery_items(delivery_id: str) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT di.*, t.name AS tile_name, t.tile_type, t.size, t.color
                FROM delivery_items di
                JOIN tiles t ON t.id = di.tile_id
                WHERE di.delivery_id = %s
                ''',
                (delivery_id,),
            )
            items = []
            for row in cursor.fetchall():
                items.append({
                    'id': row['id'],
                    'deliveryId': row['delivery_id'],
                    'tileId': row['tile_id'],
                    'quantity': int(row['quantity']),
                    'tileName': row['tile_name'],
                    'tileType': row['tile_type'],
                    'size': row['size'],
                    'color': row['color'],
                })
            return items
    finally:
        connection.close()


def find_delivery_by_id(delivery_id: str) -> dict | None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT * FROM deliveries WHERE id = %s LIMIT 1', (delivery_id,))
            delivery = row_to_delivery(cursor.fetchone())
            if delivery:
                delivery['items'] = list_delivery_items(delivery_id)
            return delivery
    finally:
        connection.close()


def insert_delivery(data: dict, items: list[dict]) -> dict:
    delivery_id = _new_id('del')
    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO deliveries (
                  id, customer_name, contact_number, address, delivery_date,
                  status, created_by, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    delivery_id,
                    data['customerName'],
                    data['contactNumber'],
                    data['address'],
                    data['deliveryDate'],
                    data.get('status') or 'Pending',
                    data['createdBy'],
                    now,
                    now,
                ),
            )
            for item in items:
                cursor.execute(
                    '''
                    INSERT INTO delivery_items (id, delivery_id, tile_id, quantity)
                    VALUES (%s, %s, %s, %s)
                    ''',
                    (_new_id('di'), delivery_id, item['tileId'], int(item['quantity'])),
                )
        connection.commit()
    finally:
        connection.close()
    return find_delivery_by_id(delivery_id)


def update_delivery(delivery_id: str, data: dict, items: list[dict] | None = None) -> dict | None:
    existing = find_delivery_by_id(delivery_id)
    if not existing:
        return None

    now = _now_iso()
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                UPDATE deliveries SET
                  customer_name = %s, contact_number = %s, address = %s,
                  delivery_date = %s, status = %s, updated_at = %s
                WHERE id = %s
                ''',
                (
                    data.get('customerName', existing['customerName']),
                    data.get('contactNumber', existing['contactNumber']),
                    data.get('address', existing['address']),
                    data.get('deliveryDate', existing['deliveryDate']),
                    data.get('status', existing['status']),
                    now,
                    delivery_id,
                ),
            )
            if items is not None:
                cursor.execute('DELETE FROM delivery_items WHERE delivery_id = %s', (delivery_id,))
                for item in items:
                    cursor.execute(
                        '''
                        INSERT INTO delivery_items (id, delivery_id, tile_id, quantity)
                        VALUES (%s, %s, %s, %s)
                        ''',
                        (_new_id('di'), delivery_id, item['tileId'], int(item['quantity'])),
                    )
        connection.commit()
    finally:
        connection.close()
    return find_delivery_by_id(delivery_id)


def count_pending_deliveries() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS count FROM deliveries WHERE status IN ('Pending', 'Scheduled', 'Out for Delivery')"
            )
            return int(cursor.fetchone()['count'])
    finally:
        connection.close()


def delete_tile(tile_id: str) -> tuple[bool, str | None]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM tiles WHERE id = %s', (tile_id,))
            deleted = cursor.rowcount > 0
        connection.commit()
        return deleted, None
    except Exception as error:
        connection.rollback()
        return False, str(error)
    finally:
        connection.close()


def list_all_stock_movements(limit: int = 500) -> list[dict]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT sm.*, t.name AS tile_name, t.sku AS tile_sku
                FROM stock_movements sm
                JOIN tiles t ON t.id = sm.tile_id
                ORDER BY sm.transaction_date DESC, sm.created_at DESC
                LIMIT %s
                ''',
                (max(1, min(limit, 1000)),),
            )
            rows = []
            for row in cursor.fetchall():
                movement = row_to_stock_movement(row)
                movement['tileName'] = row['tile_name']
                movement['tileSku'] = row.get('tile_sku')
                rows.append(movement)
            return rows
    finally:
        connection.close()


def count_all_tiles() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            sku_clause, sku_params = _catalog_sku_sql_clause()
            cursor.execute(
                f'SELECT COUNT(*) AS count FROM tiles WHERE {sku_clause}',
                sku_params,
            )
            return int(cursor.fetchone()['count'])
    finally:
        connection.close()


def total_inventory_quantity() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            sku_clause, sku_params = _catalog_sku_sql_clause()
            cursor.execute(
                f"SELECT COALESCE(SUM(stock_quantity), 0) AS total FROM tiles WHERE status = 'Active' AND {sku_clause}",
                sku_params,
            )
            return int(cursor.fetchone()['total'])
    finally:
        connection.close()


def count_active_tiles() -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            sku_clause, sku_params = _catalog_sku_sql_clause()
            cursor.execute(
                f"SELECT COUNT(*) AS count FROM tiles WHERE status = 'Active' AND {sku_clause}",
                sku_params,
            )
            return int(cursor.fetchone()['count'])
    finally:
        connection.close()


def get_recommendations_for_tile(tile_id: str, limit: int = 8) -> list[dict]:
    source = find_tile_by_id(tile_id)
    if not source:
        return []

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            sku_clause, sku_params = _catalog_sku_sql_clause()
            cursor.execute(
                f'''
                SELECT * FROM tiles
                WHERE id != %s AND status = 'Active' AND {sku_clause}
                ORDER BY
                  (tile_type = %s) DESC,
                  (color = %s) DESC,
                  (size = %s) DESC,
                  (finish = %s) DESC,
                  (material = %s) DESC,
                  (stock_quantity > 0) DESC,
                  stock_quantity DESC,
                  name ASC
                LIMIT %s
                ''',
                (
                    tile_id,
                    *sku_params,
                    source['tileType'],
                    source['color'],
                    source['size'],
                    source['finish'],
                    source['material'],
                    max(1, min(limit, 20)),
                ),
            )
            return [enrich_tile(row_to_tile(row)) for row in cursor.fetchall()]
    finally:
        connection.close()
