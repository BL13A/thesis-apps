import { hasPermission, hasRole } from '../lib/permissions.js';

export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const allowed = permissions.every((permission) => hasPermission(req.auth, permission));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'You do not have permission for this action.' });
    }

    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const allowed = roles.some((role) => hasRole(req.auth, role));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'This action is restricted to your role.' });
    }

    next();
  };
}
