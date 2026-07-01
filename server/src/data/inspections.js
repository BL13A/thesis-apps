import { getPool } from '../db/database.js';

function rowToInspection(row) {
  if (!row) return null;

  return {
    id: row.id,
    batchId: row.batch_id,
    date: row.date,
    supplierName: row.supplier_name,
    tileType: row.tile_type,
    tileSize: row.tile_size,
    quantity: row.quantity,
    expectedDimension: row.expected_dimension,
    imageUri: row.image_uri ?? undefined,
    result: row.result,
    defectType: row.defect_type,
    confidenceScore: row.confidence_score,
    sizeValidation: row.size_validation,
    inventoryStatus: row.inventory_status,
    inspectedBy: row.inspected_by,
    inspectedByName: row.inspected_by_name,
    qaStatus: row.qa_status,
    qaRemarks: row.qa_remarks ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export async function findInspectionById(id) {
  const [rows] = await getPool().query('SELECT * FROM inspections WHERE id = ? LIMIT 1', [id]);
  return rowToInspection(rows[0]);
}

export async function listInspectionsForAuth(auth) {
  if (auth.permissions.includes('view_all_inspections')) {
    const [rows] = await getPool().query('SELECT * FROM inspections ORDER BY date DESC');
    return rows.map(rowToInspection);
  }

  const [rows] = await getPool().query(
    'SELECT * FROM inspections WHERE inspected_by = ? ORDER BY date DESC',
    [auth.userId],
  );
  return rows.map(rowToInspection);
}

export async function insertInspection(record) {
  await getPool().query(
    `
    INSERT INTO inspections (
      id, date, batch_id, supplier_name, tile_type, tile_size, quantity, expected_dimension,
      image_uri, result, defect_type, confidence_score, size_validation, inventory_status,
      inspected_by, inspected_by_name, qa_status, qa_remarks, reviewed_by, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      record.id,
      record.date,
      record.batchId,
      record.supplierName,
      record.tileType,
      record.tileSize,
      record.quantity,
      record.expectedDimension,
      record.imageUri ?? null,
      record.result,
      record.defectType,
      record.confidenceScore,
      record.sizeValidation,
      record.inventoryStatus,
      record.inspectedBy,
      record.inspectedByName,
      record.qaStatus,
      record.qaRemarks ?? null,
      record.reviewedBy ?? null,
      record.reviewedAt ?? null,
    ],
  );

  return record;
}

export async function updateInspectionQaReview(id, updates) {
  await getPool().query(
    `
    UPDATE inspections
    SET qa_status = ?,
        qa_remarks = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        inventory_status = ?
    WHERE id = ?
  `,
    [
      updates.qaStatus,
      updates.qaRemarks ?? null,
      updates.reviewedBy,
      updates.reviewedAt,
      updates.inventoryStatus,
      id,
    ],
  );

  return findInspectionById(id);
}
