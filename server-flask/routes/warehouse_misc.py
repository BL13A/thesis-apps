from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from procurement_repository import list_suppliers
from repositories import list_inspections_for_auth
from warehouse_repository import (
    count_active_tiles,
    count_all_tiles,
    count_pending_deliveries,
    get_recommendations_for_tile,
    list_deliveries,
    list_low_stock_tiles,
    list_recognition_logs,
    list_stock_movements,
    total_inventory_quantity,
)
from procurement_repository import count_pending_procurement

warehouse_misc_bp = Blueprint('warehouse_misc', __name__, url_prefix='/api')


@warehouse_misc_bp.get('/recognition-logs')
@authenticate
@require_permission('view_recognition_logs')
def get_recognition_logs():
    limit = int(request.args.get('limit') or 100)
    logs = list_recognition_logs(limit)
    return jsonify({'success': True, 'logs': logs})


@warehouse_misc_bp.get('/recommendations/<tile_id>')
@authenticate
@require_permission('view_inventory')
def get_recommendations(tile_id: str):
    recommendations = get_recommendations_for_tile(tile_id)
    return jsonify({'success': True, 'recommendations': recommendations})


def _count_pending_manual_reviews(auth: dict) -> int:
    inspections = list_inspections_for_auth(auth)
    return sum(
        1
        for record in inspections
        if record.get('result') == 'Manual'
        or record.get('inventoryStatus') == 'Pending'
        or record.get('qaStatus') == 'Pending'
    )


def _count_inventory_blocked(auth: dict) -> int:
    inspections = list_inspections_for_auth(auth)
    return sum(
        1
        for record in inspections
        if record.get('inventoryStatus') == 'Rejected'
        or record.get('result') == 'Rejected'
    )


def _build_recent_activity(auth: dict, limit: int = 8) -> list[dict]:
    activity: list[dict] = []
    for log in list_recognition_logs(limit):
        activity.append({
            'id': log['id'],
            'timestamp': log.get('createdAt'),
            'user': log.get('userName', 'System'),
            'action': f"Recognized {log.get('recognizedName', 'tile')}",
            'module': 'AI Recognition Results',
        })
    for movement in list_stock_movements(limit=limit):
        activity.append({
            'id': movement['id'],
            'timestamp': movement.get('transactionDate') or movement.get('createdAt'),
            'user': movement.get('handledByName', 'Warehouse'),
            'action': f"{movement.get('transactionType')} {movement.get('quantity')} units",
            'module': 'Warehouse Inventory',
        })
    activity.sort(key=lambda item: str(item.get('timestamp') or ''), reverse=True)
    return activity[:limit]


@warehouse_misc_bp.get('/dashboard/web')
@authenticate
@require_permission('view_home')
def dashboard_web():
    deliveries = list_deliveries()
    auth = getattr(g, 'auth', {})
    return jsonify({
        'success': True,
        'summary': {
            'totalTiles': count_all_tiles(),
            'totalInventoryQuantity': total_inventory_quantity(),
            'lowStockCount': len(list_low_stock_tiles()),
            'pendingDeliveries': count_pending_deliveries(),
            'pendingPurchaseRequests': count_pending_procurement(),
            'pendingManualReviews': _count_pending_manual_reviews(auth),
            'inventoryBlocked': _count_inventory_blocked(auth),
            'supplierCount': len(list_suppliers()),
            'recentRecognitionLogs': list_recognition_logs(8),
            'recentDeliveries': deliveries[:6],
            'lowStockTiles': list_low_stock_tiles()[:8],
            'recentActivity': _build_recent_activity(auth),
        },
    })


@warehouse_misc_bp.get('/dashboard/summary')
@authenticate
@require_permission('view_home')
def dashboard_summary():
    return jsonify({
        'success': True,
        'summary': {
            'totalProducts': count_active_tiles(),
            'lowStockCount': len(list_low_stock_tiles()),
            'pendingDeliveries': count_pending_deliveries(),
            'recentRecognitionLogs': list_recognition_logs(5),
        },
    })

