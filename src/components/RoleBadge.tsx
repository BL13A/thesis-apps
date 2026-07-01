import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Shield, Warehouse } from 'lucide-react-native';
import { borderRadius, colors } from '@/constants/theme';
import type { UserRole } from '@/types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const isQA = role === 'Quality Assurance Officer';
  const Icon = isQA ? Shield : Warehouse;
  const bg = isQA ? 'rgba(59, 130, 246, 0.15)' : 'rgba(250, 204, 21, 0.12)';
  const textColor = isQA ? colors.primaryLight : colors.accent;
  const borderColor = isQA ? 'rgba(59, 130, 246, 0.3)' : 'rgba(250, 204, 21, 0.25)';

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: bg, borderColor },
      ]}
    >
      <Icon size={size === 'sm' ? 12 : 14} color={textColor} />
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: textColor }]}>
        {role}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});
