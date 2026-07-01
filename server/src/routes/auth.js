import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/rbac.js';
import { findUserByEmail, toPublicUser, updateUserPasswordHash } from '../data/users.js';
import { signAccessToken } from '../lib/jwt.js';
import { getPermissionsForRole } from '../lib/permissions.js';

const router = Router();
const DEFAULT_PASSWORD = 'password123';

router.post('/login', async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const password = req.body?.password ?? '';

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  if (user.accountStatus !== 'Active') {
    return res.status(403).json({ success: false, error: 'Account is not active.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const accessToken = signAccessToken(user);
  const publicUser = toPublicUser(user);

  return res.json({
    success: true,
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    user: publicUser,
    permissions: getPermissionsForRole(user.role),
  });
});

router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    user: toPublicUser(req.userRecord),
    permissions: req.auth.permissions,
  });
});

router.get(
  '/permissions',
  authenticate,
  requirePermission('view_profile'),
  (req, res) => {
    return res.json({
      success: true,
      role: req.auth.role,
      permissions: req.auth.permissions,
    });
  },
);

router.post('/change-password', authenticate, async (req, res) => {
  const currentPassword = req.body?.currentPassword ?? '';
  const newPassword = req.body?.newPassword ?? '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
  }

  const valid = await bcrypt.compare(currentPassword, req.userRecord.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  updateUserPasswordHash(req.userRecord.id, passwordHash);
  req.userRecord.passwordHash = passwordHash;
  return res.json({ success: true, message: 'Password updated successfully.' });
});

router.post('/reset-password', async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists for that email, the password has been reset.',
    });
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  updateUserPasswordHash(user.id, passwordHash);
  return res.json({
    success: true,
    message: `Password reset for ${email}. Sign in with: ${DEFAULT_PASSWORD}`,
  });
});

export default router;
