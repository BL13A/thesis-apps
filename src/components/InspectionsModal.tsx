import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, ImageIcon, X } from 'lucide-react-native';
import { FilterChips } from '@/components/FilterChips';
import type { FilterOption } from '@/components/FilterChips';
import { GlassCard } from '@/components/GlassCard';
import { InspectionCard } from '@/components/InspectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { InspectionRecord } from '@/types';
import {
  getInventoryStatusLabel,
  getSizeValidationLabel,
} from '@/utils/status';
import {
  filterByDateRange,
  formatConfidence,
  formatDate,
  formatTime,
  type DateRangeFilter,
} from '@/utils/inspection';

const DATE_FILTERS: FilterOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'All', value: 'all' },
];

interface InspectionsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  inspections: InspectionRecord[];
  showQA?: boolean;
  referenceDate?: Date;
  initialInspectionId?: string | null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function emptyMessage(filter: DateRangeFilter): string {
  if (filter === 'today') return 'No inspections today.';
  if (filter === 'yesterday') return 'No inspections yesterday.';
  if (filter === 'last30days') return 'No inspections in the last 30 days.';
  return 'No inspections yet.';
}

export function InspectionsModal({
  visible,
  onClose,
  title,
  inspections,
  showQA,
  referenceDate = new Date(),
  initialInspectionId,
}: InspectionsModalProps) {
  const [selected, setSelected] = useState<InspectionRecord | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      return;
    }

    if (initialInspectionId) {
      const match = inspections.find((item) => item.id === initialInspectionId) ?? null;
      setSelected(match);
      return;
    }

    setSelected(null);
  }, [visible, initialInspectionId, inspections]);

  const filtered = useMemo(
    () => filterByDateRange(inspections, dateFilter, referenceDate),
    [inspections, dateFilter, referenceDate],
  );

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={selected ? () => setSelected(null) : handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            {selected ? (
              <Pressable
                onPress={() => setSelected(null)}
                hitSlop={8}
                style={styles.backButton}
              >
                <ArrowLeft size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {selected ? 'Inspection Details' : title}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeButton}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selected ? (
              <InspectionDetailContent inspection={selected} showQA={showQA} />
            ) : (
              <>
                <FilterChips
                  options={DATE_FILTERS}
                  selected={dateFilter}
                  onSelect={(value) => setDateFilter(value as DateRangeFilter)}
                />

                <Text style={styles.countText}>
                  Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </Text>

                {filtered.length > 0 ? (
                  filtered.map((inspection) => (
                    <InspectionCard
                      key={inspection.id}
                      inspection={inspection}
                      showQA={showQA}
                      onPress={() => setSelected(inspection)}
                    />
                  ))
                ) : (
                  <Text style={styles.emptyText}>{emptyMessage(dateFilter)}</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InspectionDetailContent({
  inspection,
  showQA,
}: {
  inspection: InspectionRecord;
  showQA?: boolean;
}) {
  return (
    <View style={styles.detailContent}>
      <Text style={styles.batchId}>{inspection.batchId}</Text>

      <View style={styles.previewBox}>
        <ImageIcon size={32} color={colors.textMuted} />
        <Text style={styles.previewLabel}>Tile Preview</Text>
      </View>

      <GlassCard style={styles.infoCard}>
        <InfoRow label="Supplier" value={inspection.supplierName} />
        <InfoRow label="Tile Type" value={inspection.tileType} />
        <InfoRow label="Tile Size" value={inspection.tileSize} />
        <InfoRow label="Quantity" value={inspection.quantity} />
        <InfoRow label="Expected Dimension" value={inspection.expectedDimension} />
        <InfoRow label="Defect Type" value={inspection.defectType} />
        <InfoRow label="Confidence" value={formatConfidence(inspection.confidenceScore)} />
        <InfoRow
          label="Size Validation"
          value={getSizeValidationLabel(inspection.sizeValidation)}
        />
        <InfoRow
          label="Inspected By"
          value={inspection.inspectedByName}
        />
        <InfoRow
          label="Date & Time"
          value={`${formatDate(inspection.date)} · ${formatTime(inspection.date)}`}
        />
        <View style={styles.badgeRow}>
          <StatusBadge label={inspection.result} variant={inspection.result} />
          <StatusBadge
            label={getInventoryStatusLabel(inspection.inventoryStatus)}
            variant={inspection.inventoryStatus}
          />
          {showQA && inspection.qaStatus !== 'None' ? (
            <StatusBadge label={inspection.qaStatus} variant={inspection.qaStatus} />
          ) : null}
        </View>
      </GlassCard>

      {showQA && inspection.qaRemarks ? (
        <GlassCard style={styles.remarksCard}>
          <Text style={styles.remarksTitle}>QA Remarks</Text>
          <Text style={styles.remarksText}>{inspection.qaRemarks}</Text>
          {inspection.reviewedBy ? (
            <Text style={styles.reviewedBy}>
              Reviewed by {inspection.reviewedBy}
              {inspection.reviewedAt
                ? ` · ${formatDate(inspection.reviewedAt)}`
                : ''}
            </Text>
          ) : null}
        </GlassCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  detailContent: {
    paddingBottom: spacing.lg,
  },
  batchId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  previewBox: {
    height: 140,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.lg,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  remarksCard: {
    marginBottom: spacing.lg,
  },
  remarksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  remarksText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reviewedBy: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
