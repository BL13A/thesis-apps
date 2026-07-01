import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { DetectedTileSummary } from '@/types';
import { formatConfidence } from '@/utils/inventory';
import { getStatusTone } from '@/utils/status';

interface DetectedTilesSummaryProps {
  tiles: DetectedTileSummary[];
}

const COLUMNS = [
  { key: 'tileId', label: 'Tile ID', flex: 1.1 },
  { key: 'predictedType', label: 'Predicted Type', flex: 1.2 },
  { key: 'confidence', label: 'Confidence', flex: 1 },
  { key: 'color', label: 'Color', flex: 0.9 },
  { key: 'pattern', label: 'Pattern', flex: 0.9 },
  { key: 'surfaceFinish', label: 'Surface Finish', flex: 1.1 },
  { key: 'sizeCategory', label: 'Size Category', flex: 1.1 },
  { key: 'status', label: 'Warehouse Status', flex: 1.3 },
] as const;

function statusVariant(status: string): string {
  if (status === 'Available for Sale' || status === 'Matched') return 'Available for Sale';
  if (status === 'Inventory Block') return 'Inventory Block';
  if (status === 'For Manual Review') return 'Manual Review';
  return status;
}

function cellValue(tile: DetectedTileSummary, key: (typeof COLUMNS)[number]['key']): string {
  if (key === 'confidence') return formatConfidence(tile.confidence);
  if (key === 'tileId') return tile.tileId;
  if (key === 'predictedType') return tile.predictedType;
  if (key === 'color') return tile.color;
  if (key === 'pattern') return tile.pattern;
  if (key === 'surfaceFinish') return tile.surfaceFinish;
  if (key === 'sizeCategory') return tile.sizeCategory;
  return tile.status;
}

export function DetectedTilesSummary({ tiles }: DetectedTilesSummaryProps) {
  if (!tiles.length) {
    return (
      <GlassCard>
        <Text style={styles.empty}>No supported tile detected in the captured image.</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Detected Tiles Summary</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            {COLUMNS.map((column) => (
              <Text key={column.key} style={[styles.headerCell, { flex: column.flex }]}>
                {column.label}
              </Text>
            ))}
          </View>
          {tiles.map((tile) => (
            <View key={tile.tileId} style={styles.dataRow}>
              {COLUMNS.map((column) =>
                column.key === 'status' ? (
                  <View key={column.key} style={[styles.statusCell, { flex: column.flex }]}>
                    <StatusBadge
                      label={statusVariant(tile.status)}
                      variant={getStatusTone(tile.status)}
                      size="sm"
                    />
                  </View>
                ) : (
                  <Text
                    key={column.key}
                    style={[styles.dataCell, { flex: column.flex }]}
                    numberOfLines={2}
                  >
                    {cellValue(tile, column.key)}
                  </Text>
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xl },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    minWidth: 920,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    minWidth: 920,
  },
  dataCell: {
    fontSize: 13,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  statusCell: {
    paddingHorizontal: spacing.xs,
    alignItems: 'flex-start',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
