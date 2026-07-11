import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AlertCard } from '@/components/AlertCard';
import { DetectedTilesSummary } from '@/components/DetectedTilesSummary';
import { GlassCard } from '@/components/GlassCard';
import { MatchedTileRecommendationCard } from '@/components/MatchedTileRecommendationCard';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { TileInspectResponse } from '@/types';
import { getStatusTone } from '@/utils/status';
import { formatConfidence } from '@/utils/inventory';

interface ScanRecognitionResultProps {
  inspect: TileInspectResponse;
}

function resolveStatusMessage(inspect: TileInspectResponse): 'success' | 'warning' | 'info' {
  const statuses = inspect.detectedTiles.map((tile) => tile.status);
  if (statuses.some((status) => status === 'Inventory Block')) return 'warning';
  if (statuses.some((status) => status === 'For Manual Review')) return 'info';
  return 'success';
}

export function ScanRecognitionResult({ inspect }: ScanRecognitionResultProps) {
  const primaryStatus = inspect.detectedTiles[0]?.status ?? 'For Manual Review';
  const annotatedUri = inspect.annotatedImageUrl ?? inspect.imageUrl;

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recognition Result</Text>
          <StatusBadge
            label={primaryStatus}
            variant={getStatusTone(primaryStatus)}
            size="sm"
          />
        </View>

        {annotatedUri ? (
          <View style={styles.annotatedWrap}>
            <Text style={styles.subLabel}>Detected Tiles</Text>
            <Image
              source={{ uri: annotatedUri }}
              style={styles.annotatedImage}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </GlassCard>

      {inspect.defects ? (
        <GlassCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Defect Detection</Text>
            {inspect.defects.result ? (
              <StatusBadge
                label={inspect.defects.result}
                variant={getStatusTone(inspect.defects.result)}
                size="sm"
              />
            ) : null}
          </View>
          <View style={styles.defectRow}>
            <Text style={styles.defectLabel}>Defect Type</Text>
            <Text style={styles.defectValue}>{inspect.defects.defectType ?? 'None detected'}</Text>
          </View>
          <View style={styles.defectRow}>
            <Text style={styles.defectLabel}>Confidence</Text>
            <Text style={styles.defectValue}>{formatConfidence(inspect.defects.confidence ?? 0)}</Text>
          </View>
          <View style={styles.defectRow}>
            <Text style={styles.defectLabel}>Defects Found</Text>
            <Text style={styles.defectValue}>{inspect.defects.boxes?.length ?? 0}</Text>
          </View>
        </GlassCard>
      ) : null}

      <AlertCard
        title="Warehouse Status"
        message={inspect.message}
        variant={resolveStatusMessage(inspect)}
      />

      <DetectedTilesSummary tiles={inspect.detectedTiles} />

      {inspect.recommendedTiles.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matched Tiles</Text>
          <Text style={styles.sectionSubtitle}>
            Recommended inventory matches ranked by recognition confidence and catalog fit.
          </Text>
          {inspect.recommendedTiles.map((tile) => (
            <MatchedTileRecommendationCard
              key={`${tile.skuId}-${tile.tileId ?? tile.tileName}`}
              tile={tile}
              onViewDetails={
                tile.tileId
                  ? () => router.push(`/(tabs)/inventory/${tile.tileId}` as Href)
                  : undefined
              }
            />
          ))}
        </View>
      ) : null}

      {inspect.topRecommendations.length > 0 ? (
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Top Recommendations</Text>
          {inspect.topRecommendations.map((item) => (
            <View key={`${item.rank}-${item.skuId}`} style={styles.rankRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{item.rank}</Text>
              </View>
              <View style={styles.rankContent}>
                <Text style={styles.rankName}>{item.tileName}</Text>
                <Text style={styles.rankSku}>{item.skuId}</Text>
              </View>
              <Text style={styles.rankMatch}>{item.matchPercentage}%</Text>
            </View>
          ))}
        </GlassCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  card: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  defectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  defectLabel: { fontSize: 14, color: colors.textSecondary },
  defectValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  annotatedWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  annotatedImage: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surface,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  rankContent: { flex: 1 },
  rankName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rankSku: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rankMatch: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});

