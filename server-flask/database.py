import pymysql
from pymysql.cursors import DictCursor

from config import MYSQL_CONFIG

_pool_config = None


def get_connection():
    config = {**MYSQL_CONFIG, 'cursorclass': DictCursor}
    return pymysql.connect(**config)


def ensure_database_exists():
    config = {k: v for k, v in MYSQL_CONFIG.items() if k != 'database'}
    connection = pymysql.connect(**config, cursorclass=DictCursor)
    try:
        with connection.cursor() as cursor:
            database = MYSQL_CONFIG['database']
            cursor.execute(
                f'CREATE DATABASE IF NOT EXISTS `{database}` '
                'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            )
        connection.commit()
    finally:
        connection.close()


def ensure_tables_exist():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS users (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  email VARCHAR(255) NOT NULL UNIQUE,
                  password_hash VARCHAR(255) NOT NULL,
                  name VARCHAR(255) NOT NULL,
                  role VARCHAR(128) NOT NULL,
                  employee_id VARCHAR(64) NULL,
                  mobile_number VARCHAR(32) NULL,
                  department VARCHAR(128) NULL,
                  account_status VARCHAR(32) NOT NULL DEFAULT 'Active'
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS inspections (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  date VARCHAR(32) NOT NULL,
                  batch_id VARCHAR(64) NOT NULL,
                  supplier_name VARCHAR(255) NOT NULL,
                  tile_type VARCHAR(255) NOT NULL,
                  tile_size VARCHAR(64) NOT NULL,
                  quantity VARCHAR(32) NOT NULL,
                  expected_dimension VARCHAR(64) NOT NULL,
                  image_uri TEXT NULL,
                  result VARCHAR(32) NOT NULL,
                  defect_type VARCHAR(128) NOT NULL,
                  confidence_score DOUBLE NOT NULL,
                  size_validation VARCHAR(32) NOT NULL DEFAULT 'Valid',
                  inventory_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
                  inspected_by VARCHAR(64) NOT NULL,
                  inspected_by_name VARCHAR(255) NOT NULL,
                  qa_status VARCHAR(32) NOT NULL DEFAULT 'None',
                  qa_remarks TEXT NULL,
                  reviewed_by VARCHAR(255) NULL,
                  reviewed_at VARCHAR(32) NULL,
                  CONSTRAINT fk_inspections_inspected_by
                    FOREIGN KEY (inspected_by) REFERENCES users(id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,
                  INDEX idx_inspections_inspected_by (inspected_by),
                  INDEX idx_inspections_date (date)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS notifications (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  user_id VARCHAR(64) NOT NULL,
                  title VARCHAR(255) NOT NULL,
                  message TEXT NOT NULL,
                  type VARCHAR(32) NOT NULL,
                  related_id VARCHAR(255) NULL,
                  is_read TINYINT(1) NOT NULL DEFAULT 0,
                  created_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_notifications_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                  INDEX idx_notifications_user (user_id),
                  INDEX idx_notifications_created (created_at),
                  INDEX idx_notifications_type (type)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS push_tokens (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  user_id VARCHAR(64) NOT NULL,
                  expo_push_token VARCHAR(255) NOT NULL,
                  platform VARCHAR(16) NULL,
                  updated_at VARCHAR(32) NOT NULL,
                  UNIQUE KEY uk_expo_push_token (expo_push_token),
                  CONSTRAINT fk_push_tokens_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                  INDEX idx_push_tokens_user (user_id)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS tiles (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  name VARCHAR(255) NOT NULL,
                  tile_type VARCHAR(128) NOT NULL,
                  size VARCHAR(64) NOT NULL,
                  color VARCHAR(64) NOT NULL,
                  finish VARCHAR(64) NOT NULL,
                  material VARCHAR(64) NOT NULL,
                  stock_quantity INT NOT NULL DEFAULT 0,
                  low_stock_threshold INT NOT NULL DEFAULT 10,
                  status VARCHAR(32) NOT NULL DEFAULT 'Active',
                  image_uri TEXT NULL,
                  description TEXT NULL,
                  sku VARCHAR(64) NULL,
                  created_at VARCHAR(32) NOT NULL,
                  updated_at VARCHAR(32) NOT NULL,
                  INDEX idx_tiles_type (tile_type),
                  INDEX idx_tiles_status (status),
                  INDEX idx_tiles_stock (stock_quantity)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS stock_movements (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  tile_id VARCHAR(64) NOT NULL,
                  transaction_type VARCHAR(16) NOT NULL,
                  quantity INT NOT NULL,
                  reason VARCHAR(255) NOT NULL,
                  transaction_date VARCHAR(32) NOT NULL,
                  handled_by VARCHAR(64) NOT NULL,
                  handled_by_name VARCHAR(255) NOT NULL,
                  created_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_stock_tile
                    FOREIGN KEY (tile_id) REFERENCES tiles(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  CONSTRAINT fk_stock_user
                    FOREIGN KEY (handled_by) REFERENCES users(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  INDEX idx_stock_tile (tile_id),
                  INDEX idx_stock_date (transaction_date)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS recognition_logs (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  image_uri TEXT NULL,
                  recognized_name VARCHAR(255) NOT NULL,
                  tile_type VARCHAR(128) NOT NULL,
                  confidence_score DOUBLE NOT NULL,
                  matched_tile_id VARCHAR(64) NULL,
                  user_id VARCHAR(64) NOT NULL,
                  user_name VARCHAR(255) NOT NULL,
                  created_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_recognition_tile
                    FOREIGN KEY (matched_tile_id) REFERENCES tiles(id)
                    ON DELETE SET NULL ON UPDATE CASCADE,
                  CONSTRAINT fk_recognition_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  INDEX idx_recognition_user (user_id),
                  INDEX idx_recognition_date (created_at)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS deliveries (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  customer_name VARCHAR(255) NOT NULL,
                  contact_number VARCHAR(32) NOT NULL,
                  address TEXT NOT NULL,
                  delivery_date VARCHAR(32) NOT NULL,
                  status VARCHAR(32) NOT NULL DEFAULT 'Pending',
                  created_by VARCHAR(64) NOT NULL,
                  created_at VARCHAR(32) NOT NULL,
                  updated_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_delivery_user
                    FOREIGN KEY (created_by) REFERENCES users(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  INDEX idx_delivery_status (status),
                  INDEX idx_delivery_date (delivery_date)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS delivery_items (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  delivery_id VARCHAR(64) NOT NULL,
                  tile_id VARCHAR(64) NOT NULL,
                  quantity INT NOT NULL,
                  CONSTRAINT fk_delivery_item_delivery
                    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
                    ON DELETE CASCADE ON UPDATE CASCADE,
                  CONSTRAINT fk_delivery_item_tile
                    FOREIGN KEY (tile_id) REFERENCES tiles(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  INDEX idx_delivery_items_delivery (delivery_id)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS suppliers (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  name VARCHAR(255) NOT NULL,
                  contact_person VARCHAR(255) NOT NULL DEFAULT '',
                  email VARCHAR(255) NOT NULL DEFAULT '',
                  phone VARCHAR(64) NULL,
                  address TEXT NULL,
                  lead_time_days INT NOT NULL DEFAULT 7,
                  status VARCHAR(32) NOT NULL DEFAULT 'Active',
                  created_at VARCHAR(32) NOT NULL,
                  updated_at VARCHAR(32) NOT NULL,
                  INDEX idx_suppliers_status (status)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS procurement_requests (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  pr_number VARCHAR(64) NOT NULL,
                  tile_id VARCHAR(64) NULL,
                  tile_name VARCHAR(255) NOT NULL,
                  supplier_id VARCHAR(64) NULL,
                  supplier_name VARCHAR(255) NULL,
                  quantity INT NOT NULL,
                  status VARCHAR(32) NOT NULL DEFAULT 'Pending',
                  requested_by VARCHAR(64) NOT NULL,
                  requested_by_name VARCHAR(255) NOT NULL,
                  notes TEXT NULL,
                  created_at VARCHAR(32) NOT NULL,
                  updated_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_procurement_tile
                    FOREIGN KEY (tile_id) REFERENCES tiles(id)
                    ON DELETE SET NULL ON UPDATE CASCADE,
                  CONSTRAINT fk_procurement_supplier
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
                    ON DELETE SET NULL ON UPDATE CASCADE,
                  CONSTRAINT fk_procurement_user
                    FOREIGN KEY (requested_by) REFERENCES users(id)
                    ON DELETE RESTRICT ON UPDATE CASCADE,
                  INDEX idx_procurement_status (status),
                  INDEX idx_procurement_date (created_at)
                ) ENGINE=InnoDB
                '''
            )
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS password_reset_codes (
                  id VARCHAR(64) NOT NULL PRIMARY KEY,
                  user_id VARCHAR(64) NOT NULL,
                  email VARCHAR(255) NOT NULL,
                  code_hash VARCHAR(255) NOT NULL,
                  expires_at VARCHAR(32) NOT NULL,
                  used_at VARCHAR(32) NULL,
                  created_at VARCHAR(32) NOT NULL,
                  CONSTRAINT fk_reset_codes_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                  INDEX idx_reset_codes_email (email),
                  INDEX idx_reset_codes_expires (expires_at)
                ) ENGINE=InnoDB
                '''
            )
        connection.commit()
    finally:
        connection.close()


def migrate_schema():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for statement in [
                'ALTER TABLE tiles ADD COLUMN supplier_name VARCHAR(255) NULL',
                'ALTER TABLE tiles ADD COLUMN warehouse_location VARCHAR(128) NULL',
                'ALTER TABLE recognition_logs MODIFY image_uri LONGTEXT NULL',
                'ALTER TABLE inspections MODIFY image_uri LONGTEXT NULL',
                'ALTER TABLE tiles MODIFY image_uri LONGTEXT NULL',
            ]:
                try:
                    cursor.execute(statement)
                except Exception:
                    pass
        connection.commit()
    finally:
        connection.close()


def init_database():
    ensure_database_exists()
    ensure_tables_exist()
    migrate_schema()
    connection = get_connection()
    connection.close()


def get_database_info() -> dict:
    return {
        'type': 'mysql',
        'host': MYSQL_CONFIG['host'],
        'port': MYSQL_CONFIG['port'],
        'database': MYSQL_CONFIG['database'],
        'user': MYSQL_CONFIG['user'],
    }
