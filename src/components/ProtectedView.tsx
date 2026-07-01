import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldOff } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/types';

interface ProtectedViewProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedView({ permission, children, fallback }: ProtectedViewProps) {
  const { can } = usePermissions();

  if (can(permission)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.denied}>
      <ShieldOff size={32} color={colors.textMuted} />
      <Text style={styles.deniedTitle}>Access Restricted</Text>
      <Text style={styles.deniedText}>
        Your role does not have permission to view this section.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  deniedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
