from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from procurement_repository import list_procurement_requests, list_suppliers
from repositories import list_inspections_for_auth
from warehouse_repository import (
    list_all_stock_movements,
    list_deliveries,
    list_low_stock_tiles,
    list_recognition_logs,
    list_tiles,
)

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

REPORT_TYPES = {
    'inventory',
    'low-stock',
    'stock-movement',
    'procurement',
    'delivery',
    'recognition-logs',
    'inspections',
    'suppliers',
}


@reports_bp.get('/<report_type>')
@authenticate
@require_permission('view_reports')
def get_report(report_type: str):
    if report_type not in REPORT_TYPES:
        return jsonify({'success': False, 'error': 'Unknown report type.'}), 404

    if report_type == 'inventory':
        data = list_tiles()
    elif report_type == 'low-stock':
        data = list_low_stock_tiles()
    elif report_type == 'stock-movement':
        limit = int(request.args.get('limit') or 500)
        data = list_all_stock_movements(limit)
    elif report_type == 'procurement':
        data = list_procurement_requests()
    elif report_type == 'delivery':
        data = list_deliveries()
    elif report_type == 'inspections':
        data = list_inspections_for_auth(g.auth)
    elif report_type == 'suppliers':
        data = list_suppliers()
    else:
        limit = int(request.args.get('limit') or 500)
        data = list_recognition_logs(limit)

    return jsonify({
        'success': True,
        'reportType': report_type,
        'generatedAt': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat().replace('+00:00', 'Z'),
        'rows': data,
        'count': len(data),
    })
