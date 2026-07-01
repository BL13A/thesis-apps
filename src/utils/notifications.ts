import type { AppNotification, NotificationSettings } from '@/types';

/** In-app alert list filters (independent of phone push toggle). */
export function filterNotificationsBySettings(
  notifications: AppNotification[],
  settings: NotificationSettings,
): AppNotification[] {
  return notifications.filter((item) => {
    if (item.type === 'system') {
      return settings.systemAlerts;
    }
    if (item.type === 'inventory' || item.type === 'delivery') {
      return settings.warehouseAlerts;
    }
    if (item.type === 'qa' || item.type === 'supplier') {
      return settings.qaReviews;
    }
    if (item.type === 'inspection') {
      return settings.inspectionUpdates;
    }
    return true;
  });
}

export function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
