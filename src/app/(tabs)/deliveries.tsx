import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Truck, X } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  DeliveryCard,
  EmptyState,
  FilterChips,
  GlassCard,
  InputField,
  LoadingSkeleton,
  PrimaryButton,
} from '@/components';
import { colors, spacing } from '@/constants/theme';
import { useWarehouse } from '@/hooks/useWarehouse';
import { createDelivery, updateDelivery } from '@/services/deliveryService';
import type { Delivery, DeliveryStatus } from '@/types';

const STATUS_OPTIONS: Array<{ label: string; value: DeliveryStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Out for Delivery', value: 'Out for Delivery' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter((option) => option.value !== '');

interface DeliveryFormValues {
  customerName: string;
  contactNumber: string;
  address: string;
  deliveryDate: string;
  status: DeliveryStatus;
  tileId: string;
  quantity: string;
}

export default function DeliveriesScreen() {
  const { deliveries, tiles, isLoading, error, refreshDeliveries, setDeliveries } = useWarehouse();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm<DeliveryFormValues>({
    defaultValues: {
      customerName: '',
      contactNumber: '',
      address: '',
      deliveryDate: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      tileId: '',
      quantity: '',
    },
  });

  useFocusEffect(
    useCallback(() => {
      void refreshDeliveries({ silent: true });
    }, [refreshDeliveries]),
  );

  const filteredDeliveries = deliveries.filter(
    (delivery) => !statusFilter || delivery.status === statusFilter,
  );

  const openCreateModal = () => {
    setEditingDelivery(null);
    reset({
      customerName: '',
      contactNumber: '',
      address: '',
      deliveryDate: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      tileId: tiles[0]?.id ?? '',
      quantity: '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    reset({
      customerName: delivery.customerName,
      contactNumber: delivery.contactNumber,
      address: delivery.address,
      deliveryDate: delivery.deliveryDate,
      status: delivery.status,
      tileId: delivery.items[0]?.tileId ?? '',
      quantity: String(delivery.items[0]?.quantity ?? ''),
    });
    setFormError(null);
    setModalVisible(true);
  };

  const confirmCancelDelivery = (delivery: Delivery) => {
    Alert.alert(
      'Cancel Delivery',
      `Cancel delivery for ${delivery.customerName}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Delivery',
          style: 'destructive',
          onPress: () => void handleStatusUpdate(delivery, 'Cancelled'),
        },
      ],
    );
  };

  const handleStatusUpdate = async (delivery: Delivery, status: DeliveryStatus) => {
    try {
      const updated = await updateDelivery(delivery.id, { status });
      setDeliveries((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Could not update delivery.');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const quantity = Number(values.quantity);
    if (!values.customerName.trim() || !values.contactNumber.trim() || !values.address.trim()) {
      setFormError('Customer name, contact number, and address are required.');
      return;
    }
    if (!values.tileId || !Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Select a tile and enter a valid quantity.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        customerName: values.customerName.trim(),
        contactNumber: values.contactNumber.trim(),
        address: values.address.trim(),
        deliveryDate: values.deliveryDate,
        status: values.status,
        items: [{ tileId: values.tileId, quantity }],
      };

      if (editingDelivery) {
        const updated = await updateDelivery(editingDelivery.id, payload);
        setDeliveries((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createDelivery(payload);
        setDeliveries((current) => [created, ...current]);
      }

      setModalVisible(false);
      await refreshDeliveries({ silent: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save delivery.');
    } finally {
      setSubmitting(false);
    }
  });

  if (isLoading && deliveries.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader title="Delivery Schedule" subtitle="Manage customer deliveries" compact />

        {error ? <AlertCard title="Unable to load deliveries" message={error} variant="warning" /> : null}

        <PrimaryButton label="New Delivery" icon={Plus} onPress={openCreateModal} style={styles.cta} />
        <FilterChips
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onSelect={(value) => setStatusFilter(value as DeliveryStatus | '')}
        />

        {filteredDeliveries.length > 0 ? (
          filteredDeliveries.map((delivery) => (
            <View key={delivery.id}>
              <DeliveryCard delivery={delivery} onPress={() => openEditModal(delivery)} />
              {delivery.status !== 'Cancelled' && delivery.status !== 'Delivered' ? (
                <PrimaryButton
                  label="Cancel Delivery"
                  variant="danger"
                  onPress={() => confirmCancelDelivery(delivery)}
                  style={styles.cancelButton}
                />
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState
            icon={Truck}
            title="No deliveries scheduled"
            description="Create a delivery schedule for customer tile orders."
          />
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDelivery ? 'Update Delivery' : 'Create Delivery'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? (
                <AlertCard title="Validation" message={formError} variant="warning" />
              ) : null}

              <Controller
                control={control}
                name="customerName"
                render={({ field: { value, onChange } }) => (
                  <InputField label="Customer Name" value={value} onChangeText={onChange} />
                )}
              />
              <Controller
                control={control}
                name="contactNumber"
                render={({ field: { value, onChange } }) => (
                  <InputField label="Contact Number" value={value} onChangeText={onChange} keyboardType="phone-pad" />
                )}
              />
              <Controller
                control={control}
                name="address"
                render={({ field: { value, onChange } }) => (
                  <InputField label="Address" value={value} onChangeText={onChange} multiline />
                )}
              />
              <Controller
                control={control}
                name="deliveryDate"
                render={({ field: { value, onChange } }) => (
                  <InputField label="Delivery Date" value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />
                )}
              />
              <Controller
                control={control}
                name="status"
                render={({ field: { value, onChange } }) => (
                  <>
                    <Text style={styles.label}>Status</Text>
                    <FilterChips
                      options={FORM_STATUS_OPTIONS}
                      selected={value}
                      onSelect={(next) => onChange(next as DeliveryStatus)}
                    />
                  </>
                )}
              />
              <Text style={styles.label}>Tile Item</Text>
              <Controller
                control={control}
                name="tileId"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.tileList}>
                    {tiles.map((tile) => (
                      <PrimaryButton
                        key={tile.id}
                        label={tile.name}
                        variant={value === tile.id ? 'primary' : 'secondary'}
                        onPress={() => {
                          onChange(tile.id);
                          setValue('tileId', tile.id);
                        }}
                        style={styles.tileButton}
                      />
                    ))}
                  </View>
                )}
              />
              <Controller
                control={control}
                name="quantity"
                render={({ field: { value, onChange } }) => (
                  <InputField label="Quantity" value={value} onChangeText={onChange} keyboardType="number-pad" />
                )}
              />

              <PrimaryButton
                label={editingDelivery ? 'Save Changes' : 'Create Delivery'}
                onPress={() => void onSubmit()}
                loading={submitting}
              />
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  cta: { marginBottom: spacing.lg },
  cancelButton: { marginTop: -spacing.sm, marginBottom: spacing.lg },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slateLight,
    marginBottom: spacing.sm,
  },
  tileList: { gap: spacing.sm, marginBottom: spacing.lg },
  tileButton: { marginBottom: 0 },
});
