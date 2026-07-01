import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  EmptyState,
  FilterChips,
  LoadingSkeleton,
  NotificationCard,
} from '@/components';
import type { FilterOption } from '@/components/FilterChips';
import { colors, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useWarehouse } from '@/hooks/useWarehouse';
import type { AppNotification } from '@/types';

const FILTERS: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Deliveries', value: 'delivery' },
];

function resolveNotificationRoute(notification: AppNotification): Href {
  if (notification.type === 'inventory' && notification.relatedId) {
    return `/(tabs)/inventory/${notification.relatedId}` as Href;
  }
  if (notification.type === 'delivery') {
    return '/(tabs)/deliveries' as Href;
  }
  if (notification.type === 'inspection' || notification.type === 'qa') {
    return '/(tabs)/recognition-logs' as Href;
  }
  return '/(tabs)/home' as Href;
}

export default function NotificationsScreen() {
  const { refreshDashboard } = useWarehouse();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isAvailable,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard({ silent: true });
      void refreshNotifications();
    }, [refreshDashboard, refreshNotifications]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshDashboard({ silent: true }), refreshNotifications()]);
    setRefreshing(false);
  }, [refreshDashboard, refreshNotifications]);

  const filtered = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((item) => !item.read);
    }
    if (activeFilter === 'inventory' || activeFilter === 'delivery') {
      return notifications.filter((item) => item.type === activeFilter);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handlePress = async (notification: AppNotification) => {
    await markAsRead(notification.id);
    router.push(resolveNotificationRoute(notification));
  };

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerFlex}>
            <AppHeader
              title="Notifications"
              subtitle={
                unreadCount > 0
                  ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`
                  : 'You are all caught up'
              }
            />
          </View>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        <FilterChips options={FILTERS} selected={activeFilter} onSelect={setActiveFilter} />

        {error ? (
          <AlertCard title="Unable to load notifications" message={error} variant="warning" />
        ) : null}

        {!isAvailable && !error ? (
          <AlertCard
            title="Notifications unavailable"
            message="Could not reach the notification service. Pull down to refresh."
            variant="info"
          />
        ) : null}

        {filtered.length > 0 ? (
          filtered.map((item) => (
            <NotificationCard
              key={item.id}
              notification={item}
              onPress={() => void handlePress(item)}
            />
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="No Notifications"
            description={
              activeFilter === 'all'
                ? 'Low stock, delivery, and inventory alerts will appear here.'
                : 'No alerts match this filter right now.'
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerFlex: { flex: 1 },
  markAllButton: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
});
