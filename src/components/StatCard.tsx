import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { borderRadius, colors, shadows, spacing } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accentColor?: string;
  accentBg?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accentColor = colors.primary,
  accentBg = 'rgba(59, 130, 246, 0.15)',
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: accentBg }]}>
        <Icon size={20} color={accentColor} strokeWidth={2.2} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 118,
    justifyContent: 'flex-start',
    ...shadows.card,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '500',
    lineHeight: 16,
    minHeight: 32,
  },
});
