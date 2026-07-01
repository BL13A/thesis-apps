import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { hasPermission } from '../lib/permissions.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  findInspectionById,
  insertInspection,
  listInspectionsForAuth,
  updateInspectionQaReview,
} from '../data/inspections.js';
import { findUserById } from '../data/users.js';

const router = Router();

const REQUIRED_BATCH_FIELDS = [
  'batchId',
  'supplierName',
  'tileType',
  'tileSize',
  'quantity',
  'expectedDimension',
];

function computeInventoryStatus(qaStatus, currentStatus) {
  if (qaStatus === 'Passed') return 'Available';
  if (qaStatus === 'Rejected') return 'Rejected';
  return currentStatus ?? 'Pending';
}

router.get('/', authenticate, async (req, res) => {
  const records = await listInspectionsForAuth(req.auth);
  return res.json({ success: true, inspections: records });
});

router.get('/:id', authenticate, async (req, res) => {
  const record = await findInspectionById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Inspection not found.' });
  }

  const canViewAll = hasPermission(req.auth, 'view_all_inspections');
  if (!canViewAll && record.inspectedBy !== req.auth.userId) {
    return res.status(403).json({ success: false, error: 'You do not have access to this inspection.' });
  }

  return res.json({ success: true, inspection: record });
});

router.post('/', authenticate, requirePermission('submit_inspection'), async (req, res) => {
  const body = req.body ?? {};
  const missing = REQUIRED_BATCH_FIELDS.filter((field) => !body[field]?.toString().trim());
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  if (!body.result || !body.defectType || body.confidenceScore === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Inspection result fields are required.',
    });
  }

  const inspector = await findUserById(req.auth.userId);
  const record = {
    id: body.id?.toString() || `insp-${Date.now()}`,
    date: body.date || new Date().toISOString(),
    batchId: body.batchId.trim(),
    supplierName: body.supplierName.trim(),
    tileType: body.tileType.trim(),
    tileSize: body.tileSize.trim(),
    quantity: body.quantity.trim(),
    expectedDimension: body.expectedDimension.trim(),
    imageUri: body.imageUri,
    result: body.result,
    defectType: body.defectType,
    confidenceScore: Number(body.confidenceScore),
    sizeValidation: body.sizeValidation ?? 'Valid',
    inventoryStatus: body.inventoryStatus ?? 'Pending',
    inspectedBy: req.auth.userId,
    inspectedByName: inspector?.name ?? body.inspectedByName ?? 'Warehouse User',
    qaStatus: body.qaStatus ?? (body.result === 'Manual' ? 'Pending' : 'None'),
    qaRemarks: body.qaRemarks,
    reviewedBy: body.reviewedBy,
    reviewedAt: body.reviewedAt,
  };

  await insertInspection(record);
  return res.status(201).json({ success: true, inspection: record });
});

router.patch('/:id/qa', authenticate, async (req, res) => {
  const record = await findInspectionById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Inspection not found.' });
  }

  const qaStatus = req.body?.qaStatus;
  const qaRemarks = req.body?.qaRemarks?.trim() ?? '';
  const reviewer = await findUserById(req.auth.userId);
  const reviewerName = req.body?.reviewerName?.trim() || reviewer?.name || 'QA Officer';

  if (!['Passed', 'Rejected'].includes(qaStatus)) {
    return res.status(400).json({ success: false, error: 'qaStatus must be Passed or Rejected.' });
  }

  const needsApprove = qaStatus === 'Passed';
  const needsReject = qaStatus === 'Rejected';
  if (needsApprove && !hasPermission(req.auth, 'approve_inspection')) {
    return res.status(403).json({ success: false, error: 'You cannot approve inspections.' });
  }
  if (needsReject && !hasPermission(req.auth, 'reject_inspection')) {
    return res.status(403).json({ success: false, error: 'You cannot reject inspections.' });
  }
  if (!hasPermission(req.auth, 'add_qa_remarks') && !hasPermission(req.auth, 'review_manual_cases')) {
    return res.status(403).json({ success: false, error: 'You cannot review inspections.' });
  }

  const updated = await updateInspectionQaReview(record.id, {
    qaStatus,
    qaRemarks,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    inventoryStatus: computeInventoryStatus(qaStatus, record.inventoryStatus),
  });

  return res.json({ success: true, inspection: updated });
});

export default router;
