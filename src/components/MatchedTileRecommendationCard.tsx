import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductTileImage } from '@/components/ProductTileImage';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { RecommendedTileMatch } from '@/types';

interface MatchedTileRecommendationCardProps {
  tile: RecommendedTileMatch;
  onViewDetails?: () => void;
}

export function MatchedTileRecommendationCard({
  tile,
  onViewDetails,
}: MatchedTileRecommendationCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <ProductTileImage
          imageUri={tile.imageUrl}
          productCode={tile.skuId}
          style={styles.image}
          placeholderStyle={styles.imagePlaceholder}
        />
        <View style={styles.content}>
          <Text style={styles.label}>Inventory Match</Text>
          <Text style={styles.name} numberOfLines={2}>
            {tile.tileName}
          </Text>
          <Text style={styles.sku}>{tile.skuId}</Text>
          <Text style={styles.meta}>
            {tile.tileType} · {tile.sizeCategory}
          </Text>
          {tile.surfaceFinish ? (
            <Text style={styles.meta}>{tile.surfaceFinish}</Text>
          ) : null}
          <View style={styles.matchRow}>
            <Text style={styles.matchLabel}>Match</Text>
            <Text style={styles.matchValue}>{tile.matchPercentage}%</Text>
          </View>
        </View>
      </View>
      {onViewDetails ? (
        <PrimaryButton
          label="View Details"
          variant="outline"
          onPress={onViewDetails}
          style={styles.button}
        />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  image: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sku: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  matchLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  matchValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  button: { marginTop: spacing.md },
});
