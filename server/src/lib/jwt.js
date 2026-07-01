import jwt from 'jsonwebtoken';
import { getPermissionsForRole } from './permissions.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'tilevision-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export function signAccessToken(user) {
  const permissions = getPermissionsForRole(user.role);

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
