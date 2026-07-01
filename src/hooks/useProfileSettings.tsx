import { useCallback, useEffect, useState } from 'react';
import type { NotificationSettings } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettings,
} from '@/utils/storage';

export function useProfileSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      setIsLoading(false);
      return;
    }

    getNotificationSettings(user.id).then((stored) => {
      setSettings(stored);
      setIsLoading(false);
    });
  }, [user]);

  const updateSettings = useCallback(
    async (next: NotificationSettings) => {
      if (!user) return;
      setSettings(next);
      await saveNotificationSettings(user.id, next);
    },
    [user],
  );

  const toggleSetting = useCallback(
    async (key: keyof NotificationSettings) => {
      const next = { ...settings, [key]: !settings[key] };
      await updateSettings(next);
    },
    [settings, updateSettings],
  );

  return {
    settings,
    isLoading,
    updateSettings,
    toggleSetting,
  };
}
