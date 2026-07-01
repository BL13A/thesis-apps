import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Truck } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing } from '@/constants/theme';
import type { Delivery } from '@/types';

interface DeliveryCardProps {
  delivery: Delivery;
  onPress?: () => void;
}

export function DeliveryCard({ delivery, onPress }: DeliveryCardProps) {
  const itemCount = delivery.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Truck size={18} color={colors.primaryLight} />
            <Text style={styles.customer} numberOfLines={1}>
              {delivery.customerName}
            </Text>
          </View>
          <StatusBadge label={delivery.status} variant={delivery.status} size="sm" />
        </View>
        <Text style={styles.meta}>{delivery.contactNumber}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {delivery.address}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.meta}>{delivery.deliveryDate}</Text>
          <Text style={styles.items}>{itemCount} pcs · {delivery.items?.length ?? 0} items</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  customer: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  items: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
