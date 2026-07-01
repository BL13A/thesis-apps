/** RBAC permission map — warehouse / inventory mobile app */
const WAREHOUSE_PERMISSIONS = [
  'view_home',
  'view_profile',
  'view_inventory',
  'manage_inventory',
  'manage_stock',
  'view_deliveries',
  'manage_deliveries',
  'recognize_tiles',
  'view_recognition_logs',
];

export const ROLE_PERMISSIONS = {
  'Warehouse Personnel': WAREHOUSE_PERMISSIONS,
  'Quality Assurance Officer': WAREHOUSE_PERMISSIONS,
  'Customer Service': WAREHOUSE_PERMISSIONS,
};

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(user, permission) {
  return user?.permissions?.includes(permission) ?? false;
}

export function hasRole(user, role) {
  return user?.role === role;
}
