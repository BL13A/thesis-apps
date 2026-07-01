import { randomBytes } from 'node:crypto';
import { getPool } from '../db/database.js';

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}-${randomBytes(6).toString('hex')}`;
}

function rowToTile(row) {
  if (!row) return null;
  const tile = {
    id: row.id,
    name: row.name,
    tileType: row.tile_type,
    size: row.size,
    color: row.color,
    finish: row.finish,
    material: row.material,
    stockQuantity: Number(row.stock_quantity),
    lowStockThreshold: Number(row.low_stock_threshold),
    status: row.status,
    imageUri: row.image_uri ?? undefined,
    description: row.description ?? undefined,
    sku: row.sku ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  tile.stockStatus = computeStockStatus(tile);
  return tile;
}

export function computeStockStatus(tile) {
  const qty = Number(tile.stockQuantity ?? 0);
  const threshold = Number(tile.lowStockThreshold ?? 10);
  if (qty <= 0) return 'Out of Stock';
  if (qty <= threshold) return 'Low Stock';
  return 'In Stock';
}

function rowToStockMovement(row) {
  if (!row) return null;
  return {
    id: row.id,
    tileId: row.tile_id,
    transactionType: row.transaction_type,
    quantity: Number(row.quantity),
    reason: row.reason,
    transactionDate: row.transaction_date,
    handledBy: row.handled_by,
    handledByName: row.handled_by_name,
    createdAt: row.created_at,
  };
}

function rowToRecognitionLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    imageUri: row.image_uri ?? undefined,
    recognizedName: row.recognized_name,
    tileType: row.tile_type,
    confidenceScore: Number(row.confidence_score),
    matchedTileId: row.matched_tile_id ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  };
}

function rowToDelivery(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    contactNumber: row.contact_number,
    address: row.address,
    deliveryDate: row.delivery_date,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
  };
}

export async function listTiles(filters = {}) {
  const pool = getPool();
  const clauses = [];
  const params = [];

  const map = {
    tileType: 'tile_type',
    size: 'size',
    color: 'color',
    finish: 'finish',
    material: 'material',
    status: 'status',
  };

  for (const [key, column] of Object.entries(map)) {
    if (filters[key]) {
      clauses.push(`${column} = ?`);
      params.push(filters[key]);
    }
  }

  if (filters.search?.trim()) {
    const like = `%${filters.search.trim()}%`;
    clauses.push('(name LIKE ? OR tile_type LIKE ? OR color LIKE ? OR sku LIKE ?)');
    params.push(like, like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM tiles ${where} ORDER BY name ASC`, params);
  return rows.map(rowToTile);
}

export async function findTileById(tileId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM tiles WHERE id = ? LIMIT 1', [tileId]);
  return rowToTile(rows[0]);
}

export async function listLowStockTiles() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM tiles WHERE stock_quantity <= low_stock_threshold AND status = 'Active' ORDER BY stock_quantity ASC, name ASC`,
  );
  return rows.map(rowToTile);
}

export async function listStockMovementsForTile(tileId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM stock_movements WHERE tile_id = ? ORDER BY transaction_date DESC, created_at DESC',
    [tileId],
  );
  return rows.map(rowToStockMovement);
}

export async function adjustTileStock(tileId, delta) {
  const pool = getPool();
  await pool.query(
    'UPDATE tiles SET stock_quantity = GREATEST(0, stock_quantity + ?), updated_at = ? WHERE id = ?',
    [delta, nowIso(), tileId],
  );
  return findTileById(tileId);
}

export async function insertStockMovement(data) {
  const pool = getPool();
  const movementId = newId('sm');
  const createdAt = nowIso();
  await pool.query(
    `INSERT INTO stock_movements (
      id, tile_id, transaction_type, quantity, reason, transaction_date, handled_by, handled_by_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movementId,
      data.tileId,
      data.transactionType,
      data.quantity,
      data.reason,
      data.transactionDate,
      data.handledBy,
      data.handledByName,
      createdAt,
    ],
  );

  const delta = data.transactionType === 'In' ? data.quantity : -data.quantity;
  await adjustTileStock(data.tileId, delta);

  const [rows] = await pool.query('SELECT * FROM stock_movements WHERE id = ? LIMIT 1', [movementId]);
  return rowToStockMovement(rows[0]);
}

export async function listRecognitionLogs(limit = 100) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const [rows] = await pool.query(
    'SELECT * FROM recognition_logs ORDER BY created_at DESC LIMIT ?',
    [safeLimit],
  );
  return rows.map(rowToRecognitionLog);
}

export async function insertRecognitionLog(data) {
  const pool = getPool();
  const logId = newId('rl');
  const createdAt = nowIso();
  await pool.query(
    `INSERT INTO recognition_logs (
      id, image_uri, recognized_name, tile_type, confidence_score, matched_tile_id, user_id, user_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      data.imageUri ?? null,
      data.recognizedName,
      data.tileType,
      data.confidenceScore,
      data.matchedTileId ?? null,
      data.userId,
      data.userName,
      createdAt,
    ],
  );
  const [rows] = await pool.query('SELECT * FROM recognition_logs WHERE id = ? LIMIT 1', [logId]);
  return rowToRecognitionLog(rows[0]);
}

export async function listDeliveryItems(deliveryId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT di.*, t.name AS tile_name, t.tile_type, t.size, t.color
     FROM delivery_items di
     JOIN tiles t ON t.id = di.tile_id
     WHERE di.delivery_id = ?`,
    [deliveryId],
  );
  return rows.map((row) => ({
    id: row.id,
    deliveryId: row.delivery_id,
    tileId: row.tile_id,
    quantity: Number(row.quantity),
    tileName: row.tile_name,
    tileType: row.tile_type,
    size: row.size,
    color: row.color,
  }));
}

export async function listDeliveries() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM deliveries ORDER BY delivery_date DESC, created_at DESC');
  const deliveries = rows.map(rowToDelivery);
  for (const delivery of deliveries) {
    delivery.items = await listDeliveryItems(delivery.id);
  }
  return deliveries;
}

export async function findDeliveryById(deliveryId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM deliveries WHERE id = ? LIMIT 1', [deliveryId]);
  const delivery = rowToDelivery(rows[0]);
  if (delivery) {
    delivery.items = await listDeliveryItems(deliveryId);
  }
  return delivery;
}

export async function insertDelivery(data, items) {
  const pool = getPool();
  const deliveryId = newId('del');
  const createdAt = nowIso();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO deliveries (
        id, customer_name, contact_number, address, delivery_date, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryId,
        data.customerName,
        data.contactNumber,
        data.address,
        data.deliveryDate,
        data.status ?? 'Pending',
        data.createdBy,
        createdAt,
        createdAt,
      ],
    );
    for (const item of items) {
      await connection.query(
        'INSERT INTO delivery_items (id, delivery_id, tile_id, quantity) VALUES (?, ?, ?, ?)',
        [newId('di'), deliveryId, item.tileId, item.quantity],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return findDeliveryById(deliveryId);
}

export async function updateDelivery(deliveryId, data, items) {
  const existing = await findDeliveryById(deliveryId);
  if (!existing) return null;

  const pool = getPool();
  const updatedAt = nowIso();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE deliveries SET
        customer_name = ?, contact_number = ?, address = ?, delivery_date = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.customerName ?? existing.customerName,
        data.contactNumber ?? existing.contactNumber,
        data.address ?? existing.address,
        data.deliveryDate ?? existing.deliveryDate,
        data.status ?? existing.status,
        updatedAt,
        deliveryId,
      ],
    );
    if (items) {
      await connection.query('DELETE FROM delivery_items WHERE delivery_id = ?', [deliveryId]);
      for (const item of items) {
        await connection.query(
          'INSERT INTO delivery_items (id, delivery_id, tile_id, quantity) VALUES (?, ?, ?, ?)',
          [newId('di'), deliveryId, item.tileId, item.quantity],
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return findDeliveryById(deliveryId);
}

export async function countActiveTiles() {
  const pool = getPool();
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM tiles WHERE status = 'Active'");
  return Number(rows[0].count);
}

export async function countPendingDeliveries() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM deliveries WHERE status IN ('Pending', 'Scheduled', 'Out for Delivery')",
  );
  return Number(rows[0].count);
}

export async function getRecommendationsForTile(tileId, limit = 8) {
  const source = await findTileById(tileId);
  if (!source) return [];

  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const [rows] = await pool.query(
    `SELECT * FROM tiles
     WHERE id != ? AND status = 'Active'
     ORDER BY
       (tile_type = ?) DESC,
       (color = ?) DESC,
       (size = ?) DESC,
       (finish = ?) DESC,
       (material = ?) DESC,
       (stock_quantity > 0) DESC,
       stock_quantity DESC,
       name ASC
     LIMIT ?`,
    [tileId, source.tileType, source.color, source.size, source.finish, source.material, safeLimit],
  );
  return rows.map(rowToTile);
}

const COLOR_KEYWORDS = {
  white: [245, 245, 245],
  cream: [255, 253, 208],
  beige: [245, 245, 220],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  black: [30, 30, 30],
  brown: [139, 90, 43],
  blue: [59, 130, 246],
  green: [34, 197, 94],
  red: [239, 68, 68],
  marble: [230, 230, 230],
  wood: [160, 110, 60],
};

function colorDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

function parseCatalogColor(label) {
  const normalized = String(label).toLowerCase();
  for (const [keyword, rgb] of Object.entries(COLOR_KEYWORDS)) {
    if (normalized.includes(keyword)) return rgb;
  }
  return null;
}

function scoreTileMatch(tile) {
  let score = 0.1;
  if (Number(tile.stockQuantity) > 0) score += 0.15;
  const name = `${tile.name} ${tile.tileType} ${tile.finish}`.toLowerCase();
  if (name.includes('ceramic')) score += 0.05;
  if (name.includes('porcelain')) score += 0.05;
  return Math.min(score, 0.99);
}

export function recognizeTileFromCatalog(tiles) {
  const active = tiles.filter((tile) => tile.status === 'Active');
  if (!active.length) {
    return {
      recognizedName: 'Unknown Tile',
      tileType: 'Unknown',
      confidenceScore: 0,
      matchedTile: null,
      provider: 'catalog-heuristic',
    };
  }

  const ranked = [...active].sort((a, b) => scoreTileMatch(b) - scoreTileMatch(a));
  const best = ranked[0];
  return {
    recognizedName: best.name,
    tileType: best.tileType,
    confidenceScore: Number(scoreTileMatch(best).toFixed(4)),
    matchedTile: best,
    provider: 'catalog-heuristic',
  };
}

export async function insertTile(data) {
  const pool = getPool();
  const tileId = data.id ?? newId('tile');
  const createdAt = nowIso();
  await pool.query(
    `INSERT INTO tiles (
      id, name, tile_type, size, color, finish, material,
      stock_quantity, low_stock_threshold, status, image_uri, description, sku, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tileId,
      data.name,
      data.tileType,
      data.size,
      data.color,
      data.finish,
      data.material,
      Number(data.stockQuantity ?? 0),
      Number(data.lowStockThreshold ?? 10),
      data.status ?? 'Active',
      data.imageUri ?? null,
      data.description ?? null,
      data.sku ?? null,
      createdAt,
      createdAt,
    ],
  );
  return findTileById(tileId);
}

export const SEED_TILES = [
  {
    id: 'tile-ceramic-white-60',
    name: 'Arctic White Ceramic',
    tileType: 'Ceramic',
    size: '60x60 cm',
    color: 'White',
    finish: 'Matte',
    material: 'Ceramic',
    stockQuantity: 240,
    lowStockThreshold: 50,
    sku: 'CER-WHT-6060',
    description: 'Bright white ceramic floor tile for residential and commercial spaces.',
  },
  {
    id: 'tile-porcelain-gray-60',
    name: 'Slate Gray Porcelain',
    tileType: 'Porcelain',
    size: '60x60 cm',
    color: 'Gray',
    finish: 'Polished',
    material: 'Porcelain',
    stockQuantity: 18,
    lowStockThreshold: 25,
    sku: 'POR-GRY-6060',
    description: 'Polished gray porcelain with stone-inspired texture.',
  },
  {
    id: 'tile-marble-beige-80',
    name: 'Calacatta Beige Marble',
    tileType: 'Marble',
    size: '80x80 cm',
    color: 'Beige',
    finish: 'Glossy',
    material: 'Natural Stone',
    stockQuantity: 42,
    lowStockThreshold: 20,
    sku: 'MRB-BGE-8080',
    description: 'Premium beige marble look tile for showroom displays.',
  },
  {
    id: 'tile-wood-brown-20',
    name: 'Oak Wood Plank',
    tileType: 'Wood Look',
    size: '20x120 cm',
    color: 'Brown',
    finish: 'Wood Grain',
    material: 'Porcelain',
    stockQuantity: 0,
    lowStockThreshold: 15,
    sku: 'WDP-OAK-20120',
    description: 'Wood-look porcelain plank for warm interior designs.',
  },
  {
    id: 'tile-mosaic-blue-30',
    name: 'Ocean Blue Mosaic',
    tileType: 'Mosaic',
    size: '30x30 cm',
    color: 'Blue',
    finish: 'Glossy',
    material: 'Glass',
    stockQuantity: 96,
    lowStockThreshold: 30,
    sku: 'MSC-BLU-3030',
    description: 'Blue glass mosaic accent tile for bathrooms and feature walls.',
  },
];

export async function seedTilesIfEmpty() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM tiles');
  if (Number(rows[0].count) > 0) return 0;

  for (const tile of SEED_TILES) {
    await insertTile(tile);
  }
  return SEED_TILES.length;
}
