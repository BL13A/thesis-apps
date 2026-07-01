import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, Package } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, shadows, spacing } from '@/constants/theme';
import type { InspectionRecord } from '@/types';
import { formatConfidence, formatDate, formatTime } from '@/utils/inspection';
import { getInventoryStatusLabel } from '@/utils/status';

interface InspectionCardProps {
  inspection: InspectionRecord;
  onPress?: () => void;
  compact?: boolean;
  showQA?: boolean;
}

export function InspectionCard({
  inspection,
  onPress,
  compact,
  showQA,
}: InspectionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.batchRow}>
          <Package size={16} color={colors.primaryLight} />
          <Text style={styles.batchId}>{inspection.batchId}</Text>
        </View>
        <StatusBadge label={inspection.result} variant={inspection.result} size="sm" />
      </View>

      <Text style={styles.supplier}>{inspection.supplierName}</Text>
      <Text style={styles.tileType}>{inspection.tileType}</Text>

      {!compact && (
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Defect</Text>
            <Text style={styles.detailValue}>{inspection.defectType}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Confidence</Text>
            <Text style={styles.detailValue}>
              {formatConfidence(inspection.confidenceScore)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Calendar size={13} color={colors.textMuted} />
          <Text style={styles.date}>
            {formatDate(inspection.date)} · {formatTime(inspection.date)}
          </Text>
        </View>
        <View style={styles.badges}>
          <StatusBadge
            label={getInventoryStatusLabel(inspection.inventoryStatus)}
            variant={inspection.inventoryStatus}
            size="sm"
          />
          {showQA && inspection.qaStatus !== 'None' ? (
            <StatusBadge label={inspection.qaStatus} variant={inspection.qaStatus} size="sm" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batchId: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  supplier: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slateLight,
    marginBottom: 2,
  },
  tileType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  details: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
