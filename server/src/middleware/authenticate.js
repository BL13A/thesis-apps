import { verifyAccessToken } from '../lib/jwt.js';
import { findUserById } from '../data/users.js';
import { getPermissionsForRole } from '../lib/permissions.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization token.' });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authorization token.' });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);

    if (!user || user.accountStatus !== 'Active') {
      return res.status(401).json({ success: false, error: 'Account is not active.' });
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
      tokenPayload: payload,
    };
    req.userRecord = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}
