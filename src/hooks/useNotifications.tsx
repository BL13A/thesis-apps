import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import type { AppNotification } from '@/types';
import { filterNotificationsBySettings } from '@/utils/notifications';
import { canUseRemotePushNotifications } from '@/utils/pushNotifications';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(
  undefined,
);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { settings } = useProfileSettings();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setAllNotifications([]);
      setError(null);
      setIsAvailable(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchNotifications();
      setAllNotifications(result.notifications);
      setIsAvailable(result.available);
      setError(null);
    } catch (err) {
      setAllNotifications([]);
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  usePushNotifications(
    isAuthenticated && settings.pushEnabled && canUseRemotePushNotifications(),
    refreshNotifications,
  );

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const notifications = useMemo(
    () => filterNotificationsBySettings(allNotifications, settings),
    [allNotifications, settings],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      setAllNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );

      if (!isAvailable) {
        return;
      }

      try {
        await markNotificationRead(id);
      } catch {
        void refreshNotifications();
      }
    },
    [isAvailable, refreshNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    setAllNotifications((current) => current.map((item) => ({ ...item, read: true })));

    if (!isAvailable) {
      return;
    }

    try {
      await markAllNotificationsRead();
    } catch {
      void refreshNotifications();
    }
  }, [isAvailable, refreshNotifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      isAvailable,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      error,
      isAvailable,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
