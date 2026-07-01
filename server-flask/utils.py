from datetime import datetime, timezone
from pathlib import Path


def public_recognition_image_uri(image_uri: str | None) -> str | None:
    """Convert stored recognition image paths to a client-fetchable API URL."""
    if not image_uri:
        return None

    value = image_uri.strip()
    if not value:
        return None

    if value.startswith(('http://', 'https://', 'data:')):
        return value

    if value.startswith('/api/ai/recognition-images/'):
        return value

    normalized = value.replace('\\', '/')
    if 'recognition_logs/' in normalized or normalized.endswith('.jpg') or normalized.endswith('.jpeg') or normalized.endswith('.png'):
        filename = Path(normalized).name
        if filename and '.' in filename:
            return f'/api/ai/recognition-images/{filename}'

    return None


def snake_to_camel(name: str) -> str:
    parts = name.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])


def row_to_user(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'email': row['email'],
        'passwordHash': row['password_hash'],
        'name': row['name'],
        'role': row['role'],
        'employeeId': row.get('employee_id'),
        'mobileNumber': row.get('mobile_number'),
        'department': row.get('department'),
        'accountStatus': row['account_status'],
    }


def row_to_inspection(row: dict | None) -> dict | None:
    if not row:
        return None
    data = {snake_to_camel(key): value for key, value in row.items()}
    for key in ('imageUri', 'qaRemarks', 'reviewedBy', 'reviewedAt'):
        if data.get(key) is None:
            data.pop(key, None)
    return data


def row_to_notification(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'title': row['title'],
        'message': row['message'],
        'type': row['type'],
        'date': row['created_at'],
        'read': bool(row['is_read']),
        'relatedId': row.get('related_id'),
    }


def row_to_tile(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'name': row['name'],
        'tileType': row['tile_type'],
        'size': row['size'],
        'color': row['color'],
        'finish': row['finish'],
        'material': row['material'],
        'stockQuantity': int(row['stock_quantity']),
        'lowStockThreshold': int(row['low_stock_threshold']),
        'status': row['status'],
        'imageUri': row.get('image_uri'),
        'description': row.get('description'),
        'sku': row.get('sku'),
        'supplierName': row.get('supplier_name') or '',
        'warehouseLocation': row.get('warehouse_location') or '',
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def row_to_stock_movement(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'tileId': row['tile_id'],
        'transactionType': row['transaction_type'],
        'quantity': int(row['quantity']),
        'reason': row['reason'],
        'transactionDate': row['transaction_date'],
        'handledBy': row['handled_by'],
        'handledByName': row['handled_by_name'],
        'createdAt': row['created_at'],
    }


def _sanitize_log_label(name: str | None) -> str:
    if not name:
        return 'Ceramic Tile'
    lowered = name.strip().lower()
    defect_labels = {
        'intact', 'defect', 'defective', 'damaged', 'broken',
        'cracked', 'crack', 'chip', 'reject', 'rejected',
    }
    if lowered in defect_labels or any(token in lowered for token in ('defect', 'crack', 'damage')):
        return 'Ceramic Tile'
    return name


def row_to_recognition_log(row: dict | None) -> dict | None:
    if not row:
        return None
    recognized = _sanitize_log_label(row.get('recognized_name'))
    tile_type = row.get('tile_type') or 'Ceramic'
    if recognized == 'Ceramic Tile' and tile_type.lower() in ('intact', 'defect', 'unknown'):
        tile_type = 'Ceramic'
    return {
        'id': row['id'],
        'imageUri': public_recognition_image_uri(row.get('image_uri')),
        'recognizedName': recognized,
        'tileType': tile_type,
        'confidenceScore': float(row['confidence_score']),
        'matchedTileId': row.get('matched_tile_id'),
        'userId': row['user_id'],
        'userName': row['user_name'],
        'createdAt': row['created_at'],
    }


def row_to_delivery(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        'id': row['id'],
        'customerName': row['customer_name'],
        'contactNumber': row['contact_number'],
        'address': row['address'],
        'deliveryDate': row['delivery_date'],
        'status': row['status'],
        'createdBy': row['created_by'],
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    }


def to_public_user(user: dict) -> dict:
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'employeeId': user.get('employeeId'),
        'mobileNumber': user.get('mobileNumber'),
        'department': user.get('department'),
        'accountStatus': user['accountStatus'],
        'lastLogin': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    }
