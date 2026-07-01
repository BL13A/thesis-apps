import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/rbac.js';
import { findUserById } from '../data/users.js';
import {
  countActiveTiles,
  countPendingDeliveries,
  findDeliveryById,
  findTileById,
  getRecommendationsForTile,
  insertDelivery,
  insertRecognitionLog,
  insertStockMovement,
  listDeliveries,
  listLowStockTiles,
  listRecognitionLogs,
  listStockMovementsForTile,
  listTiles,
  recognizeTileFromCatalog,
  updateDelivery,
} from '../data/warehouse.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const VALID_DELIVERY_STATUSES = new Set([
  'Pending',
  'Scheduled',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
]);

function normalizeItems(rawItems) {
  const items = [];
  for (const item of rawItems ?? []) {
    const tileId = String(item.tileId ?? '').trim();
    const quantity = Number(item.quantity ?? 0);
    if (tileId && quantity > 0) {
      items.push({ tileId, quantity });
    }
  }
  return items;
}

router.get('/tiles', authenticate, requirePermission('view_inventory'), async (req, res) => {
  const tiles = await listTiles({
    search: req.query.search,
    tileType: req.query.tileType,
    size: req.query.size,
    color: req.query.color,
    finish: req.query.finish,
    material: req.query.material,
    status: req.query.status,
  });
  return res.json({ success: true, tiles });
});

router.get('/tiles/:tileId', authenticate, requirePermission('view_inventory'), async (req, res) => {
  const tile = await findTileById(req.params.tileId);
  if (!tile) {
    return res.status(404).json({ success: false, error: 'Tile product not found.' });
  }
  const stockHistory = await listStockMovementsForTile(req.params.tileId);
  return res.json({ success: true, tile, stockHistory });
});

router.get('/inventory/low-stock', authenticate, requirePermission('view_inventory'), async (_req, res) => {
  const tiles = await listLowStockTiles();
  return res.json({ success: true, tiles, count: tiles.length });
});

router.get('/dashboard/summary', authenticate, requirePermission('view_home'), async (_req, res) => {
  return res.json({
    success: true,
    summary: {
      totalProducts: await countActiveTiles(),
      lowStockCount: (await listLowStockTiles()).length,
      pendingDeliveries: await countPendingDeliveries(),
      recentRecognitionLogs: await listRecognitionLogs(5),
    },
  });
});

router.get('/recognition-logs', authenticate, requirePermission('view_recognition_logs'), async (req, res) => {
  const logs = await listRecognitionLogs(req.query.limit);
  return res.json({ success: true, logs });
});

router.get(
  '/recommendations/:tileId',
  authenticate,
  requirePermission('view_inventory'),
  async (req, res) => {
    const recommendations = await getRecommendationsForTile(req.params.tileId);
    return res.json({ success: true, recommendations });
  },
);

router.post(
  '/ai/recognize',
  authenticate,
  requirePermission('recognize_tiles'),
  upload.single('image'),
  async (req, res) => {
    const tiles = await listTiles();
    if (!tiles.length) {
      return res.status(404).json({ success: false, error: 'No tile products in inventory catalog.' });
    }

    if (!req.file && !req.body?.imageBase64) {
      return res.status(400).json({ success: false, error: 'image is required.' });
    }

    const result = recognizeTileFromCatalog(tiles);
    const matchedTile = result.matchedTile;
    const user = await findUserById(req.auth.userId);

    const log = await insertRecognitionLog({
      imageUri: matchedTile?.imageUri,
      recognizedName: result.recognizedName,
      tileType: result.tileType,
      confidenceScore: result.confidenceScore,
      matchedTileId: matchedTile?.id,
      userId: req.auth.userId,
      userName: user?.name ?? req.auth.email,
    });

    let alternatives = [];
    if (matchedTile) {
      alternatives = await getRecommendationsForTile(matchedTile.id);
      if (['Low Stock', 'Out of Stock'].includes(matchedTile.stockStatus)) {
        alternatives = alternatives.filter((tile) => tile.stockStatus === 'In Stock').slice(0, 6);
      } else {
        alternatives = alternatives.slice(0, 4);
      }
    }

    return res.json({
      success: true,
      recognition: {
        recognizedName: result.recognizedName,
        tileType: result.tileType,
        confidenceScore: result.confidenceScore,
        matchedTile,
        availableStock: matchedTile?.stockQuantity ?? 0,
        stockStatus: matchedTile?.stockStatus ?? 'Unknown',
        productImage: matchedTile?.imageUri,
        provider: result.provider,
        logId: log.id,
      },
      alternatives,
      log,
    });
  },
);

const deliveriesRouter = Router();

deliveriesRouter.get('/', authenticate, requirePermission('view_deliveries'), async (_req, res) => {
  const deliveries = await listDeliveries();
  return res.json({ success: true, deliveries });
});

deliveriesRouter.post('/', authenticate, requirePermission('manage_deliveries'), async (req, res) => {
  const body = req.body ?? {};
  const required = ['customerName', 'contactNumber', 'address', 'deliveryDate'];
  const missing = required.filter((field) => !String(body[field] ?? '').trim());
  if (missing.length) {
    return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  const items = normalizeItems(body.items);
  if (!items.length) {
    return res.status(400).json({ success: false, error: 'At least one tile item is required.' });
  }

  const status = String(body.status ?? 'Pending').trim();
  if (!VALID_DELIVERY_STATUSES.has(status)) {
    return res.status(400).json({ success: false, error: 'Invalid delivery status.' });
  }

  const delivery = await insertDelivery(
    {
      customerName: String(body.customerName).trim(),
      contactNumber: String(body.contactNumber).trim(),
      address: String(body.address).trim(),
      deliveryDate: String(body.deliveryDate).trim(),
      status,
      createdBy: req.auth.userId,
    },
    items,
  );
  return res.status(201).json({ success: true, delivery });
});

deliveriesRouter.put('/:deliveryId', authenticate, requirePermission('manage_deliveries'), async (req, res) => {
  const body = req.body ?? {};
  if (body.status !== undefined && !VALID_DELIVERY_STATUSES.has(String(body.status).trim())) {
    return res.status(400).json({ success: false, error: 'Invalid delivery status.' });
  }

  const items = body.items !== undefined ? normalizeItems(body.items) : undefined;
  if (items && !items.length) {
    return res.status(400).json({ success: false, error: 'At least one tile item is required.' });
  }

  const delivery = await updateDelivery(req.params.deliveryId, body, items);
  if (!delivery) {
    return res.status(404).json({ success: false, error: 'Delivery not found.' });
  }
  return res.json({ success: true, delivery });
});

const stockRouter = Router();

stockRouter.post('/', authenticate, requirePermission('manage_stock'), async (req, res) => {
  const body = req.body ?? {};
  const required = ['tileId', 'transactionType', 'quantity', 'reason', 'transactionDate'];
  const missing = required.filter((field) => !String(body[field] ?? '').trim());
  if (missing.length) {
    return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  const transactionType = String(body.transactionType).trim();
  if (!['In', 'Out'].includes(transactionType)) {
    return res.status(400).json({ success: false, error: 'transactionType must be In or Out.' });
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, error: 'quantity must be greater than 0.' });
  }

  const tile = await findTileById(body.tileId);
  if (!tile) {
    return res.status(404).json({ success: false, error: 'Tile product not found.' });
  }
  if (transactionType === 'Out' && tile.stockQuantity < quantity) {
    return res.status(400).json({ success: false, error: 'Insufficient stock for stock out transaction.' });
  }

  const handler = await findUserById(req.auth.userId);
  const movement = await insertStockMovement({
    tileId: body.tileId,
    transactionType,
    quantity,
    reason: String(body.reason).trim(),
    transactionDate: String(body.transactionDate).trim(),
    handledBy: req.auth.userId,
    handledByName: handler?.name ?? req.auth.email,
  });

  return res.status(201).json({
    success: true,
    movement,
    tile: await findTileById(body.tileId),
  });
});

stockRouter.get('/:tileId', authenticate, requirePermission('view_inventory'), async (req, res) => {
  const tile = await findTileById(req.params.tileId);
  if (!tile) {
    return res.status(404).json({ success: false, error: 'Tile product not found.' });
  }
  const movements = await listStockMovementsForTile(req.params.tileId);
  return res.json({ success: true, movements });
});

export { router as warehouseRouter, deliveriesRouter, stockRouter };
