import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  GlassCard,
  LoadingSkeleton,
  PrimaryButton,
  ProductTileImage,
  StatusBadge,
} from '@/components';
import { borderRadius, colors, spacing } from '@/constants/theme';
import { fetchTileById } from '@/services/tileService';
import type { StockMovement, TileProduct } from '@/types';
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tile, setTile] = useState<TileProduct | null>(null);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await fetchTileById(String(id));
      setTile(result.tile);
      setStockHistory(result.stockHistory);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTile();
  }, [loadTile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  if (!tile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <AlertCard title="Product not found" message={error ?? 'This tile product could not be loaded.'} />
          <PrimaryButton label="Back to Inventory" icon={ArrowLeft} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const productCode = tile.productCode ?? tile.sku ?? '—';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader title={tile.name} subtitle="Product details and stock history" compact />

        {error ? <AlertCard title="Load error" message={error} variant="warning" /> : null}

        <GlassCard>
          <ProductTileImage
            imageUri={tile.productImage ?? tile.imageUri}
            productCode={productCode}
            style={styles.productImage}
            placeholderStyle={styles.imagePlaceholder}
            iconSize={36}
          />

          <DetailRow label="Product Code" value={productCode} />
          <DetailRow label="Series" value={tile.series || '—'} />
          <DetailRow label="Material" value={tile.material} />
          <DetailRow label="Finish" value={tile.finish} />
          <DetailRow label="Size" value={tile.size} />
          <DetailRow label="Color" value={tile.color} />
          <DetailRow label="Type" value={tile.tileType} />
          <DetailRow label="Stock Quantity" value={`${tile.stockQuantity} pcs`} />
          <DetailRow label="Reorder Level" value={`${tile.lowStockThreshold} pcs`} />
          <DetailRow label="Warehouse Location" value={tile.warehouseLocation || '—'} />
          <View style={styles.badgeRow}>
            <Text style={styles.detailLabel}>Stock Status</Text>
            <StatusBadge
              label={tile.stockStatus ?? 'In Stock'}
              variant={tile.stockStatus ?? 'In Stock'}
              size="sm"
            />
          </View>
          {tile.description ? (
            <Text style={styles.description}>{tile.description}</Text>
          ) : null}
        </GlassCard>

        <PrimaryButton
          label="View Recommendations"
          icon={Sparkles}
          variant="outline"
          onPress={() => router.push(`/(tabs)/recommendations?tileId=${tile.id}` as Href)}
          style={styles.cta}
        />

        <Text style={styles.sectionTitle}>Stock History</Text>
        {stockHistory.length > 0 ? (
          stockHistory.map((movement) => (
            <GlassCard key={movement.id} style={styles.historyCard}>
              <DetailRow label="Type" value={movement.transactionType} />
              <DetailRow label="Quantity" value={`${movement.quantity} pcs`} />
              <DetailRow label="Reason" value={movement.reason} />
              <DetailRow label="Date" value={movement.transactionDate} />
              <DetailRow label="Handled By" value={movement.handledByName} />
            </GlassCard>
          ))
        ) : (
          <Text style={styles.emptyText}>No stock movements recorded yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.lg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  productImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.md,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  description: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cta: { marginVertical: spacing.lg },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  historyCard: { marginBottom: spacing.md },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
