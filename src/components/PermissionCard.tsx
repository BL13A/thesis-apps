import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { colors, spacing } from '@/constants/theme';

interface PermissionCardProps {
  title: string;
  allowed: string[];
  restricted: string[];
}

export function PermissionCard({ title, allowed, restricted }: PermissionCardProps) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sectionLabel}>Allowed</Text>
      {allowed.map((item) => (
        <View key={item} style={styles.row}>
          <Check size={14} color={colors.pass} />
          <Text style={styles.allowedText}>{item}</Text>
        </View>
      ))}
      <Text style={[styles.sectionLabel, styles.restrictedLabel]}>Restricted</Text>
      {restricted.map((item) => (
        <View key={item} style={styles.row}>
          <X size={14} color={colors.reject} />
          <Text style={styles.restrictedText}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.pass,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  restrictedLabel: {
    color: colors.reject,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  allowedText: {
    fontSize: 13,
    color: colors.slateLight,
    flex: 1,
  },
  restrictedText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
});
