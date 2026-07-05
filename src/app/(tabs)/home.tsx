import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  Package,
  ScanSearch,
  Truck,
} from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  LoadingSkeleton,
  NotificationBell,
  QuickActionCard,
  RecognitionLogCard,
  StatCard,
  StatsGrid,
} from '@/components';
import { APP_SHORT_TAGLINE } from '@/constants/branding';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useWarehouse } from '@/hooks/useWarehouse';

function formatDashboardDateTime(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${datePart} · ${time}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { dashboard, recognitionLogs, isLoading, error, refreshDashboard } = useWarehouse();
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard({ silent: true });
    }, [refreshDashboard]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const recentLogs = dashboard?.recentRecognitionLogs ?? recognitionLogs.slice(0, 5);

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerFlex}>
            <AppHeader
              title={`Welcome, ${user?.name.split(' ')[0] ?? 'User'}`}
              subtitle={APP_SHORT_TAGLINE}
              compact
            />
          </View>
          <NotificationBell
            count={unreadCount}
            onPress={() => router.push('/(tabs)/notifications' as Href)}
          />
        </View>

        <Text style={styles.dateTimeText}>{formatDashboardDateTime(now)}</Text>

        {error ? (
          <AlertCard title="Unable to load dashboard data" message={error} variant="warning" />
        ) : null}

        <StatsGrid>
          <StatCard
            label="Total Products"
            value={dashboard?.totalProducts ?? 0}
            icon={Package}
            accentColor={colors.primaryLight}
            accentBg="rgba(59, 130, 246, 0.15)"
          />
          <StatCard
            label="Low Stock"
            value={dashboard?.lowStockCount ?? 0}
            icon={Boxes}
            accentColor={colors.review}
            accentBg={colors.reviewBg}
          />
          <StatCard
            label="Pending Deliveries"
            value={dashboard?.pendingDeliveries ?? 0}
            icon={Truck}
            accentColor={colors.accent}
            accentBg="rgba(250, 204, 21, 0.12)"
          />
          <StatCard
            label="Recent Scans"
            value={recentLogs.length}
            icon={ScanSearch}
            accentColor={colors.pass}
            accentBg={colors.passBg}
          />
        </StatsGrid>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            label="Scan Tile"
            icon={ScanSearch}
            onPress={() => router.push('/(tabs)/scan')}
          />
          <QuickActionCard
            label="New Inspection"
            icon={ClipboardCheck}
            onPress={() => router.push('/(tabs)/new-inspection' as Href)}
          />
          <QuickActionCard
            label="View Inventory"
            icon={Package}
            onPress={() => router.push('/(tabs)/inventory')}
          />
          <QuickActionCard
            label="Stock In/Out"
            icon={ArrowLeftRight}
            onPress={() => router.push('/(tabs)/stock-movement' as Href)}
          />
          <QuickActionCard
            label="Delivery Schedule"
            icon={Truck}
            onPress={() => router.push('/(tabs)/deliveries')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Recognition Logs</Text>
          <Pressable onPress={() => router.push('/(tabs)/recognition-logs' as Href)} hitSlop={8}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {recentLogs.length > 0 ? (
          recentLogs.map((log) => <RecognitionLogCard key={log.id} log={log} />)
        ) : (
          <Text style={styles.emptyText}>
            No recognition logs yet. Scan a tile to get started.
          </Text>
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
  },
  headerFlex: { flex: 1 },
  dateTimeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
