import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Bell,
  ClipboardCheck,
  Package,
  ScanSearch,
  Truck,
} from 'lucide-react-native';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { AppNotification } from '@/types';
import { formatRelativeTime } from '@/utils/notifications';

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'inventory') {
    return <Package size={18} color={colors.review} />;
  }
  if (type === 'delivery') {
    return <Truck size={18} color={colors.primaryLight} />;
  }
  if (type === 'qa') {
    return <ClipboardCheck size={18} color={colors.primaryLight} />;
  }
  if (type === 'inspection') {
    return <ScanSearch size={18} color={colors.primaryLight} />;
  }
  if (type === 'supplier') {
    return <AlertTriangle size={18} color={colors.review} />;
  }
  return <Bell size={18} color={colors.primaryLight} />;
}

function iconBackground(type: AppNotification['type']): string {
  if (type === 'inventory' || type === 'supplier') {
    return colors.reviewBg;
  }
  if (type === 'delivery') {
    return 'rgba(59, 130, 246, 0.12)';
  }
  return 'rgba(59, 130, 246, 0.12)';
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !notification.read && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackground(notification.type) }]}>
        <NotificationIcon type={notification.type} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.message} numberOfLines={3}>
          {notification.message}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(notification.date)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  unread: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
