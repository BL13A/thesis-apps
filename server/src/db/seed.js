import bcrypt from 'bcryptjs';
import { getPool } from './database.js';
import { seedTilesIfEmpty } from '../data/warehouse.js';

const DEFAULT_PASSWORD = 'password123';

const SEED_USERS = [
  {
    id: 'user-warehouse-001',
    email: 'rafael.benavidez@tilevision.com',
    name: 'Rafael Benavidez',
    role: 'Warehouse Personnel',
    employeeId: '1042001',
    mobileNumber: '+63 917 842 3910',
    department: 'Warehouse Operations',
    accountStatus: 'Active',
  },
  {
    id: 'user-qa-001',
    email: 'qa@tilevision.com',
    name: 'Maria Santos',
    role: 'Quality Assurance Officer',
    employeeId: 'EMP-QA-2018',
    mobileNumber: '+63 918 556 2044',
    department: 'Quality Assurance',
    accountStatus: 'Active',
  },
];

const SEED_INSPECTIONS = [
  {
    id: '1',
    batchId: '2026-0142',
    date: '2026-06-07T09:15:00',
    supplierName: 'CeramicPro Industries',
    tileType: 'Porcelain Floor Tile',
    tileSize: '600x600 mm',
    quantity: '480',
    expectedDimension: '600x600 mm',
    result: 'Passed',
    defectType: 'None',
    confidenceScore: 0.94,
    sizeValidation: 'Valid',
    inventoryStatus: 'Available',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'None',
  },
  {
    id: '2',
    batchId: '2026-0138',
    date: '2026-06-07T08:42:00',
    supplierName: 'GraniteStone Co.',
    tileType: 'Glazed Vitrified Tile',
    tileSize: '800x800 mm',
    quantity: '320',
    expectedDimension: '800x800 mm',
    result: 'Rejected',
    defectType: 'Crack',
    confidenceScore: 0.91,
    sizeValidation: 'Valid',
    inventoryStatus: 'Rejected',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'None',
  },
  {
    id: '3',
    batchId: '2026-0135',
    date: '2026-06-06T16:30:00',
    supplierName: 'TileMaster Global',
    tileType: 'Ceramic Wall Tile',
    tileSize: '300x600 mm',
    quantity: '600',
    expectedDimension: '300x600 mm',
    result: 'Manual',
    defectType: 'Color Variation',
    confidenceScore: 0.72,
    sizeValidation: 'Valid',
    inventoryStatus: 'Pending',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'Pending',
  },
  {
    id: '4',
    batchId: '2026-0129',
    date: '2026-06-06T14:10:00',
    supplierName: 'PorcelainWorks Ltd.',
    tileType: 'Marble Look Porcelain',
    tileSize: '600x1200 mm',
    quantity: '240',
    expectedDimension: '600x1200 mm',
    result: 'Passed',
    defectType: 'None',
    confidenceScore: 0.88,
    sizeValidation: 'Valid',
    inventoryStatus: 'Available',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'None',
  },
  {
    id: '5',
    batchId: '2026-0121',
    date: '2026-06-06T11:05:00',
    supplierName: 'MarbleEdge Supply',
    tileType: 'Polished Porcelain',
    tileSize: '400x400 mm',
    quantity: '720',
    expectedDimension: '400x400 mm',
    result: 'Rejected',
    defectType: 'Dimensional Deviation',
    confidenceScore: 0.86,
    sizeValidation: 'Invalid',
    inventoryStatus: 'Rejected',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'None',
  },
  {
    id: '6',
    batchId: '2026-0115',
    date: '2026-06-05T15:48:00',
    supplierName: 'StoneCraft Philippines',
    tileType: 'Wood Effect Ceramic',
    tileSize: '300x300 mm',
    quantity: '960',
    expectedDimension: '300x300 mm',
    result: 'Manual',
    defectType: 'Glaze Defect',
    confidenceScore: 0.68,
    sizeValidation: 'Valid',
    inventoryStatus: 'Pending',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'Passed',
    qaRemarks: 'Minor glaze variation within acceptable tolerance.',
    reviewedBy: 'Maria Santos',
    reviewedAt: '2026-06-05T17:00:00',
  },
  {
    id: '7',
    batchId: '2026-0108',
    date: '2026-06-05T10:22:00',
    supplierName: 'CeramicPro Industries',
    tileType: 'Matt Finish Vitrified',
    tileSize: '600x600 mm',
    quantity: '400',
    expectedDimension: '600x600 mm',
    result: 'Manual',
    defectType: 'Edge Damage',
    confidenceScore: 0.74,
    sizeValidation: 'Valid',
    inventoryStatus: 'Pending',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'Rejected',
    qaRemarks: 'Edge damage exceeds warehouse acceptance criteria.',
    reviewedBy: 'Maria Santos',
    reviewedAt: '2026-06-05T14:30:00',
  },
  {
    id: '8',
    batchId: '2026-0099',
    date: '2026-06-04T13:55:00',
    supplierName: 'GraniteStone Co.',
    tileType: 'Granite Finish Tile',
    tileSize: '800x800 mm',
    quantity: '280',
    expectedDimension: '800x800 mm',
    result: 'Rejected',
    defectType: 'Chip',
    confidenceScore: 0.93,
    sizeValidation: 'Valid',
    inventoryStatus: 'Rejected',
    inspectedBy: 'user-warehouse-001',
    inspectedByName: 'Juan Dela Cruz',
    qaStatus: 'None',
  },
];

export async function seedDatabaseIfEmpty() {
  const pool = getPool();
  const [countRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  const userCount = Number(countRows[0].count);

  if (userCount > 0) {
    const seededTiles = await seedTilesIfEmpty();
    return { seededUsers: 0, seededInspections: 0, seededTiles };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const user of SEED_USERS) {
      await connection.query(
        `INSERT INTO users (
          id, email, password_hash, name, role, employee_id, mobile_number, department, account_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          passwordHash,
          user.name,
          user.role,
          user.employeeId,
          user.mobileNumber,
          user.department,
          user.accountStatus,
        ],
      );
    }

    for (const inspection of SEED_INSPECTIONS) {
      await connection.query(
        `INSERT INTO inspections (
          id, date, batch_id, supplier_name, tile_type, tile_size, quantity, expected_dimension,
          image_uri, result, defect_type, confidence_score, size_validation, inventory_status,
          inspected_by, inspected_by_name, qa_status, qa_remarks, reviewed_by, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inspection.id,
          inspection.date,
          inspection.batchId,
          inspection.supplierName,
          inspection.tileType,
          inspection.tileSize,
          inspection.quantity,
          inspection.expectedDimension,
          inspection.imageUri ?? null,
          inspection.result,
          inspection.defectType,
          inspection.confidenceScore,
          inspection.sizeValidation,
          inspection.inventoryStatus,
          inspection.inspectedBy,
          inspection.inspectedByName,
          inspection.qaStatus,
          inspection.qaRemarks ?? null,
          inspection.reviewedBy ?? null,
          inspection.reviewedAt ?? null,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const seededTiles = await seedTilesIfEmpty();

  return {
    seededUsers: SEED_USERS.length,
    seededInspections: SEED_INSPECTIONS.length,
    seededTiles,
  };
}
