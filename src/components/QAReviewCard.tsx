import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ImageIcon, Package } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, shadows, spacing } from '@/constants/theme';
import type { InspectionRecord } from '@/types';
import { formatConfidence, formatDate } from '@/utils/inspection';
import { getSizeValidationLabel } from '@/utils/status';

interface QAReviewCardProps {
  inspection: InspectionRecord;
  onPress: () => void;
}

export function QAReviewCard({ inspection, onPress }: QAReviewCardProps) {
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
        <StatusBadge label={inspection.qaStatus} variant={inspection.qaStatus} size="sm" />
      </View>

      <Text style={styles.supplier}>{inspection.supplierName}</Text>
      <Text style={styles.tileType}>{inspection.tileType}</Text>

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
        {inspection.sizeValidation === 'Invalid' ? (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={[styles.detailValue, { color: colors.reject }]}>
              {getSizeValidationLabel(inspection.sizeValidation)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.previewRow}>
        <View style={styles.previewPlaceholder}>
          <ImageIcon size={16} color={colors.textMuted} />
          <Text style={styles.previewText}>Tile Preview</Text>
        </View>
        <Text style={styles.date}>{formatDate(inspection.date)}</Text>
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
    opacity: 0.9,
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
  },
  tileType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  details: {
    flexDirection: 'row',
    gap: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  previewText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
