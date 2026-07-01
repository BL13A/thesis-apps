import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  EmptyState,
  FilterChips,
  LoadingSkeleton,
  SearchBar,
  TileProductCard,
} from '@/components';
import { colors, spacing } from '@/constants/theme';
import { useWarehouse } from '@/hooks/useWarehouse';

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Ceramic', value: 'Ceramic' },
  { label: 'Decor', value: 'Decor' },
  { label: 'Glazed Polished Porcelain', value: 'Glazed Polished Porcelain' },
  { label: 'Porcelain', value: 'Porcelain' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'In Stock', value: 'In Stock' },
  { label: 'Low Stock', value: 'Low Stock' },
  { label: 'Out of Stock', value: 'Out of Stock' },
];

export default function InventoryScreen() {
  const { tiles, isLoading, error, refreshTiles } = useWarehouse();
  const [search, setSearch] = useState('');
  const [tileType, setTileType] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshTiles({ silent: true });
    }, [refreshTiles]),
  );

  const filteredTiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tiles.filter((tile) => {
      if (tileType && tile.tileType !== tileType) return false;
      if (stockStatus && tile.stockStatus !== stockStatus) return false;
      if (!query) return true;
      return (
        tile.name.toLowerCase().includes(query) ||
        tile.tileType.toLowerCase().includes(query) ||
        tile.color.toLowerCase().includes(query) ||
        tile.size.toLowerCase().includes(query) ||
        tile.finish.toLowerCase().includes(query) ||
        tile.material.toLowerCase().includes(query) ||
        (tile.sku ?? '').toLowerCase().includes(query) ||
        (tile.productCode ?? '').toLowerCase().includes(query) ||
        (tile.series ?? '').toLowerCase().includes(query)
      );
    });
  }, [tiles, search, tileType, stockStatus]);

  if (isLoading && tiles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader
          title="Inventory"
          subtitle="Browse tile products and stock levels"
          compact
        />

        {error ? <AlertCard title="Unable to load inventory" message={error} variant="warning" /> : null}

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search tiles..." />
        <FilterChips options={TYPE_OPTIONS} selected={tileType} onSelect={setTileType} />
        <FilterChips options={STATUS_OPTIONS} selected={stockStatus} onSelect={setStockStatus} />

        <Text style={styles.count}>{filteredTiles.length} products</Text>

        {filteredTiles.length > 0 ? (
          filteredTiles.map((tile) => (
            <TileProductCard
              key={tile.id}
              tile={tile}
              onPress={() => router.push(`/(tabs)/inventory/${tile.id}` as Href)}
            />
          ))
        ) : (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your search or filters, or add products from the web dashboard."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
