import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { ProductTileImage } from '@/components/ProductTileImage';
import { StatusBadge } from '@/components/StatusBadge';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { TileProduct } from '@/types';
interface TileProductCardProps {
  tile: TileProduct;
  onPress?: () => void;
  compact?: boolean;
}

export function TileProductCard({ tile, onPress, compact }: TileProductCardProps) {
  const stockStatus = tile.stockStatus ?? 'In Stock';
  const productCode = tile.productCode ?? tile.sku;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard style={[styles.card, compact && styles.compact]}>
        <View style={styles.row}>
          <ProductTileImage
            imageUri={tile.productImage ?? tile.imageUri}
            productCode={productCode}
            style={styles.image}
            placeholderStyle={styles.imagePlaceholder}
          />
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={2}>
              {tile.name}
            </Text>
            {productCode ? (
              <Text style={styles.code}>{productCode}</Text>
            ) : null}
            <Text style={styles.meta}>
              {tile.tileType} · {tile.size}
            </Text>
            <Text style={styles.meta}>{tile.color} · {tile.finish}</Text>
            <View style={styles.footer}>
              <Text style={styles.stock}>{tile.stockQuantity} pcs</Text>
              <StatusBadge label={stockStatus} variant={stockStatus} size="sm" />
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  compact: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  image: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stock: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
