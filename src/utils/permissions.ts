import { ROLE_PERMISSIONS } from '@/constants/permissions';
import type { Permission, User, UserRole } from '@/types';

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}

export function isWarehousePersonnel(user: User | null): boolean {
  return hasRole(user, 'Warehouse Personnel');
}

export function isQAOfficer(user: User | null): boolean {
  return hasRole(user, 'Quality Assurance Officer');
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
