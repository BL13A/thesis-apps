import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { borderRadius, colors } from '@/constants/theme';
import type {
  InspectionResultType,
  InventoryStatus,
  QAStatus,
} from '@/types';
import { getStatusTone } from '@/utils/status';

type BadgeVariant =
  | InspectionResultType
  | InventoryStatus
  | QAStatus
  | 'default';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant | string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

function getBadgeColors(variant: string) {
  switch (getStatusTone(variant)) {
    case 'passed':
      return { bg: colors.passBg, text: colors.pass, border: 'rgba(34, 197, 94, 0.3)' };
    case 'rejected':
      return { bg: colors.rejectBg, text: colors.reject, border: 'rgba(239, 68, 68, 0.3)' };
    case 'pending':
      return { bg: colors.reviewBg, text: colors.review, border: 'rgba(245, 158, 11, 0.3)' };
    case 'neutral':
    default:
      return {
        bg: 'rgba(148, 163, 184, 0.15)',
        text: colors.slateLight,
        border: colors.cardBorder,
      };
  }
}

export function StatusBadge({ label, variant = 'default', size = 'md', style }: StatusBadgeProps) {
  const badgeColors = getBadgeColors(variant);

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {
          backgroundColor: badgeColors.bg,
          borderColor: badgeColors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: badgeColors.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
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
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'none',
  },
  textSm: {
    fontSize: 10,
  },
});
