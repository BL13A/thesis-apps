import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import authRoutes from './routes/auth.js';
import inspectionRoutes from './routes/inspections.js';
import { warehouseRouter, deliveriesRouter, stockRouter } from './routes/warehouse.js';
import { getDatabaseInfo, initDatabase } from './db/database.js';
import { seedDatabaseIfEmpty } from './db/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

let seedResult = { seededUsers: 0, seededInspections: 0 };
let dbInfo;

try {
  await initDatabase();
  seedResult = await seedDatabaseIfEmpty();
  dbInfo = getDatabaseInfo();
} catch (error) {
  console.error('\n❌ Cannot connect to MySQL.');
  console.error(`   ${error.message}`);
  console.error('\n   Setup guide: server/MYSQL.md');
  console.error('   1. Install MySQL Server + Workbench (no Docker)');
  console.error('   2. Set MYSQL_PASSWORD in .env');
  console.error('   3. Run: npm run api:dev\n');
  process.exit(1);
}

const app = express();
const port = Number(process.env.API_PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'tilevision-api',
    auth: 'jwt+rbac',
    warehouse: true,
    database: dbInfo.type,
    host: dbInfo.host,
    port: dbInfo.port,
    databaseName: dbInfo.database,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api', warehouseRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/stock-movements', stockRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`TileVision API (JWT + RBAC + MySQL) listening on http://0.0.0.0:${port}`);
  console.log(`  Database: ${dbInfo.user}@${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`);
  if (seedResult.seededUsers > 0) {
    console.log(
      `  Seeded ${seedResult.seededUsers} users and ${seedResult.seededInspections} inspections`,
    );
  }
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Login:        POST http://localhost:${port}/api/auth/login`);
  console.log(`  Inspections:  GET  http://localhost:${port}/api/inspections`);
});
