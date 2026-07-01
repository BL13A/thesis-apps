import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  EmptyState,
  LoadingSkeleton,
  TileProductCard,
} from '@/components';
import { colors, spacing } from '@/constants/theme';
import { fetchRecommendations } from '@/services/recommendationService';
import { fetchTileById } from '@/services/tileService';
import type { TileProduct } from '@/types';

export default function RecommendationsScreen() {
  const { tileId } = useLocalSearchParams<{ tileId?: string }>();
  const [sourceTile, setSourceTile] = useState<TileProduct | null>(null);
  const [recommendations, setRecommendations] = useState<TileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!tileId) {
      setError('No tile selected for recommendations.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [tileResult, items] = await Promise.all([
        fetchTileById(String(tileId)),
        fetchRecommendations(String(tileId)),
      ]);
      setSourceTile(tileResult.tile);
      const prioritized = [
        ...items.filter((tile) => tile.stockStatus === 'In Stock'),
        ...items.filter((tile) => tile.stockStatus !== 'In Stock'),
      ];
      setRecommendations(prioritized);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [tileId]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  if (loading) {
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
          title="Recommendations"
          subtitle={
            sourceTile
              ? `Alternatives for ${sourceTile.name}`
              : 'Similar or alternative tiles'
          }
          compact
        />

        {error ? <AlertCard title="Unable to load recommendations" message={error} variant="warning" /> : null}

        {sourceTile ? (
          <Text style={styles.note}>
            Prioritizing available stock based on type, color, size, finish, and material.
          </Text>
        ) : null}

        {recommendations.length > 0 ? (
          recommendations.map((tile) => (
            <TileProductCard
              key={tile.id}
              tile={tile}
              onPress={() => router.push(`/(tabs)/inventory/${tile.id}` as Href)}
            />
          ))
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No recommendations found"
            description="Try another tile or update the inventory catalog."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
});
