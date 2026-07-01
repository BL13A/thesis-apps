import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeftRight } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  FilterChips,
  GlassCard,
  InputField,
  PrimaryButton,
} from '@/components';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouse } from '@/hooks/useWarehouse';
import { createStockMovement } from '@/services/stockMovementService';
import type { StockTransactionType } from '@/types';

interface StockFormValues {
  tileId: string;
  transactionType: StockTransactionType;
  quantity: string;
  reason: string;
  transactionDate: string;
}

const TYPE_OPTIONS = [
  { label: 'Stock In', value: 'In' },
  { label: 'Stock Out', value: 'Out' },
];

export default function StockMovementScreen() {
  const { user } = useAuth();
  const { tiles, refreshTiles, refreshDashboard, setTiles } = useWarehouse();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, watch, reset } = useForm<StockFormValues>({
    defaultValues: {
      tileId: '',
      transactionType: 'In',
      quantity: '',
      reason: '',
      transactionDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedTileId = watch('tileId');
  const selectedTile = useMemo(
    () => tiles.find((tile) => tile.id === selectedTileId),
    [tiles, selectedTileId],
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!values.tileId) {
      Alert.alert('Validation', 'Select a tile product.');
      return;
    }
    const quantity = Number(values.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Validation', 'Enter a valid quantity greater than 0.');
      return;
    }
    if (!values.reason.trim()) {
      Alert.alert('Validation', 'Enter a reason for this stock movement.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createStockMovement({
        tileId: values.tileId,
        transactionType: values.transactionType,
        quantity,
        reason: values.reason.trim(),
        transactionDate: values.transactionDate,
      });

      setTiles((current) =>
        current.map((tile) => (tile.id === result.tile.id ? result.tile : tile)),
      );
      await Promise.all([
        refreshTiles({ silent: true }),
        refreshDashboard({ silent: true }),
      ]);

      Alert.alert(
        'Stock Updated',
        `${values.transactionType === 'In' ? 'Added' : 'Removed'} ${quantity} pcs for ${result.tile.name}.`,
      );
      reset({
        tileId: values.tileId,
        transactionType: values.transactionType,
        quantity: '',
        reason: '',
        transactionDate: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stock movement.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader
          title="Stock In / Out"
          subtitle="Record warehouse stock movements"
          compact
        />

        {error ? <AlertCard title="Transaction failed" message={error} variant="warning" /> : null}

        <GlassCard>
          <Text style={styles.label}>Transaction Type</Text>
          <Controller
            control={control}
            name="transactionType"
            render={({ field: { value, onChange } }) => (
              <FilterChips
                options={TYPE_OPTIONS}
                selected={value}
                onSelect={(next) => onChange(next as StockTransactionType)}
              />
            )}
          />

          <Text style={styles.label}>Tile Product</Text>
          <Controller
            control={control}
            name="tileId"
            render={({ field: { value, onChange } }) => (
              <View style={styles.tileList}>
                {tiles.map((tile) => (
                  <PrimaryButton
                    key={tile.id}
                    label={`${tile.name} (${tile.stockQuantity} pcs)`}
                    variant={value === tile.id ? 'primary' : 'secondary'}
                    onPress={() => onChange(tile.id)}
                    style={styles.tileButton}
                  />
                ))}
              </View>
            )}
          />

          {selectedTile ? (
            <Text style={styles.helper}>
              Current stock: {selectedTile.stockQuantity} pcs · {selectedTile.stockStatus}
            </Text>
          ) : null}

          <Controller
            control={control}
            name="quantity"
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Quantity"
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                placeholder="Enter quantity"
              />
            )}
          />

          <Controller
            control={control}
            name="reason"
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Reason"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. New shipment, customer order, adjustment"
              />
            )}
          />

          <Controller
            control={control}
            name="transactionDate"
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Date"
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
              />
            )}
          />

          <InputField label="Handled By" value={user?.name ?? ''} editable={false} />

          <PrimaryButton
            label="Save Transaction"
            icon={ArrowLeftRight}
            onPress={() => void onSubmit()}
            loading={submitting}
          />
          <PrimaryButton label="Back" variant="outline" onPress={() => router.back()} />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slateLight,
    marginBottom: spacing.sm,
  },
  tileList: { gap: spacing.sm, marginBottom: spacing.lg },
  tileButton: { marginBottom: 0 },
  helper: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
