import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import { borderRadius, colors, shadows, spacing } from '@/constants/theme';

interface AlertCardProps {
  title: string;
  message: string;
  variant?: 'warning' | 'info';
}

export function AlertCard({ title, message, variant = 'info' }: AlertCardProps) {
  const isWarning = variant === 'warning';
  const Icon = isWarning ? AlertTriangle : Info;
  const iconColor = isWarning ? colors.review : colors.primaryLight;
  const bg = isWarning ? colors.reviewBg : 'rgba(59, 130, 246, 0.1)';
  const border = isWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.2)';

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <Icon size={18} color={iconColor} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
