import { useMemo } from 'react';
import { PERMISSION_LABELS, ROLE_PERMISSIONS } from '@/constants/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { Permission } from '@/types';
import { hasPermission } from '@/utils/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role];
  }, [user]);

  const permissionLabels = useMemo(
    () => permissions.map((p) => PERMISSION_LABELS[p]),
    [permissions],
  );

  const can = (permission: Permission) => hasPermission(user, permission);

  return { permissions, permissionLabels, can };
}
