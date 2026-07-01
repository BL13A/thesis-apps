import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

function getConfig() {
  return {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'tilevision',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  };
}

async function ensureDatabaseExists(config) {
  const { database, ...serverConfig } = config;
  const connection = await mysql.createConnection(serverConfig);
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}

async function ensureTablesExist(db) {
  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);
}

export async function initDatabase() {
  const config = getConfig();
  await ensureDatabaseExists(config);
  pool = mysql.createPool(config);
  await ensureTablesExist(pool);
  await pool.query('SELECT 1');
  return pool;
}

export function getDatabaseInfo() {
  const config = getConfig();
  return {
    type: 'mysql',
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
  };
}
