import { ApiError, apiRequest, getNotificationsApiUrl } from '@/services/apiClient';
import type { AppNotification } from '@/types';

interface NotificationsResponse {
  success: boolean;
  notifications?: AppNotification[];
  unreadCount?: number;
  error?: string;
}

export async function fetchNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
  available: boolean;
}> {
  try {
    const result = await apiRequest<NotificationsResponse>(getNotificationsApiUrl('/'), {
      auth: true,
    });

    if (!result.success) {
      return { notifications: [], unreadCount: 0, available: false };
    }

    return {
      notifications: result.notifications ?? [],
      unreadCount: result.unreadCount ?? 0,
      available: true,
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      return { notifications: [], unreadCount: 0, available: false };
    }
    throw error;
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(getNotificationsApiUrl(`/${notificationId}/read`), {
    method: 'PATCH',
    auth: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<{ success: boolean }>(getNotificationsApiUrl('/read-all'), {
    method: 'POST',
    auth: true,
  });
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
  await apiRequest<{ success: boolean }>(getNotificationsApiUrl('/push-token'), {
    method: 'POST',
    auth: true,
    body: { token, platform },
  });
}
