import AsyncStorage from '@react-native-async-storage/async-storage';

import { NotificationSettings, User } from '@/types';

const AUTH_KEY = '@tilevision_auth';
const NOTIFICATIONS_KEY = '@tilevision_notifications';
const READ_NOTIFICATIONS_KEY = '@tilevision_read_notifications';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  inspectionUpdates: true,
  qaReviews: true,
  warehouseAlerts: true,
  systemAlerts: true,
  emailDigest: false,
};

export async function getStoredUser(): Promise<User | null> {
  try {
    const data = await AsyncStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return DEFAULT_NOTIFICATION_SETTINGS;
    const all = JSON.parse(data) as Record<string, Partial<NotificationSettings>>;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(all[userId] ?? {}) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const all: Record<string, NotificationSettings> = data ? JSON.parse(data) : {};
    all[userId] = settings;
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
  } catch {
    // ignore write errors
  }
}

export async function getReadNotificationIds(userId: string): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!data) return [];
    const all = JSON.parse(data) as Record<string, string[]>;
    return all[userId] ?? [];
  } catch {
    return [];
  }
}

export async function saveReadNotificationIds(userId: string, ids: string[]): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    const all: Record<string, string[]> = data ? JSON.parse(data) : {};
    all[userId] = ids;
    await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(all));
  } catch {
    // ignore write errors
  }
}
