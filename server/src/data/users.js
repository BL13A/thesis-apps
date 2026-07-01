import { getPool } from '../db/database.js';

function rowToUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    employeeId: row.employee_id,
    mobileNumber: row.mobile_number,
    department: row.department,
    accountStatus: row.account_status,
  };
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const [rows] = await getPool().query(
    'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalized],
  );
  return rowToUser(rows[0]);
}

export async function findUserById(id) {
  const [rows] = await getPool().query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rowToUser(rows[0]);
}

export async function updateUserPasswordHash(userId, passwordHash) {
  await getPool().query('UPDATE users SET password_hash = ? WHERE id = ?', [
    passwordHash,
    userId,
  ]);
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    mobileNumber: user.mobileNumber,
    department: user.department,
    accountStatus: user.accountStatus,
    lastLogin: new Date().toISOString(),
  };
}
