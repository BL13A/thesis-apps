import sys
from pathlib import Path

from flask import Flask, jsonify

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
from flask_cors import CORS

from config import API_PORT
from database import get_database_info, init_database
from routes.ai import ai_bp
from routes.inspect import inspect_bp
from routes.auth import auth_bp
from routes.deliveries import deliveries_bp
from routes.inspections import inspections_bp
from routes.notifications import notifications_bp
from routes.reset_page import reset_page_bp
from routes.stock_movements import stock_bp
from routes.tiles import tiles_bp
from routes.procurement import procurement_bp
from routes.reports import reports_bp
from routes.suppliers import suppliers_bp
from routes.users import users_bp
from routes.warehouse_misc import warehouse_misc_bp
from notification_backfill import backfill_notifications_for_inspections
from repositories import backfill_missing_employee_ids
from seed import seed_database_if_empty


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.get('/health')
    def health():
        info = get_database_info()
        return jsonify({
            'ok': True,
            'service': 'tilevision-api',
            'auth': 'jwt+rbac',
            'framework': 'flask',
            'database': info['type'],
            'host': info['host'],
            'port': info['port'],
            'databaseName': info['database'],
            'warehouse': True,
        })

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({'success': False, 'error': 'Not found'}), 404

    app.register_blueprint(ai_bp)
    app.register_blueprint(inspect_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(inspections_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(reset_page_bp)
    app.register_blueprint(tiles_bp)
    app.register_blueprint(stock_bp)
    app.register_blueprint(deliveries_bp)
    app.register_blueprint(procurement_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(suppliers_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(warehouse_misc_bp)
    return app


def bootstrap_app() -> dict:
    try:
        from backend.config.ai_paths import ensure_ai_directories, get_ai_paths_summary

        ensure_ai_directories()
        from backend.services.ai_recognition_service import ensure_valid_production_model

        try:
            model_status = ensure_valid_production_model()
            print('  YOLO model status:', model_status, flush=True)
        except Exception as model_error:
            model_status = {'status': 'unavailable', 'message': str(model_error)}
            print('  YOLO model unavailable:', model_error, flush=True)
            print('  Local AI recognize disabled; Roboflow analysis unaffected.', flush=True)
        init_database()
        seed_result = seed_database_if_empty()
        backfilled_ids = backfill_missing_employee_ids()
        if backfilled_ids > 0:
            seed_result['employeeIdsBackfilled'] = backfilled_ids
            print(f'  Employee IDs: assigned numeric IDs to {backfilled_ids} user(s)', flush=True)
        from dataset_inventory_sync import sync_dataset_tiles_to_inventory

        seed_result['datasetInventorySync'] = sync_dataset_tiles_to_inventory()
        from delivery_seed import seed_scheduled_deliveries

        seed_result['seedDeliveries'] = seed_scheduled_deliveries()
        from inspection_seed import backfill_inspection_batch_ids, seed_inspection_records
        from notification_seed import seed_management_notifications, seed_warehouse_notifications

        seed_result['warehouseNotifications'] = seed_warehouse_notifications()
        seed_result['managementNotifications'] = seed_management_notifications()

        seed_result['inspectionRecords'] = seed_inspection_records()
        from supplier_seed import ensure_suppliers_seeded

        seed_result['suppliers'] = ensure_suppliers_seeded()
        batch_backfill = backfill_inspection_batch_ids()
        if any(batch_backfill.values()):
            seed_result['inspectionBatchIdsBackfilled'] = batch_backfill
        from migrate_recognition_logs import migrate_defect_recognition_logs

        seed_result['recognitionLogMigration'] = migrate_defect_recognition_logs()
        seed_result['aiPaths'] = get_ai_paths_summary()
        backfill_result = backfill_notifications_for_inspections()
        if backfill_result.get('created', 0) > 0:
            print(
                f'  Notifications: backfilled {backfill_result["created"]} '
                f'inspection alert(s) in MySQL',
                flush=True,
            )
        return seed_result
    except Exception as error:
        print('\n[ERROR] Cannot connect to MySQL.')
        print(f'   {error}')
        print('\n   Setup guide: server/MYSQL.md')
        print('   1. Start MySQL service')
        print('   2. Check MYSQL_* values in .env')
        print('   3. Run: npm run api:dev\n')
        sys.exit(1)


def print_startup_banner(seed_result: dict, mode: str) -> None:
    info = get_database_info()
    print(f'TileVision API ({mode}) listening on http://0.0.0.0:{API_PORT}')
    print(f'  Database: {info["user"]}@{info["host"]}:{info["port"]}/{info["database"]}')
    if seed_result.get('seededUsers', 0) > 0:
        print(f'  Seeded {seed_result["seededUsers"]} users')
    inventory_sync = seed_result.get('datasetInventorySync') or {}
    if inventory_sync.get('catalogProducts'):
        print(f'  Inventory catalog: {inventory_sync["catalogProducts"]} products synced')
    print(f'  Health: http://localhost:{API_PORT}/health')


def main():
    seed_result = bootstrap_app()
    app = create_app()
    print_startup_banner(seed_result, 'Flask dev')
    print('  Note: dev-server warning is normal. For production use: npm run api:start')
    app.run(host='0.0.0.0', port=API_PORT, debug=False)


if __name__ == '__main__':
    main()
