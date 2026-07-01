import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { registerPushToken } from '@/services/notificationService';
import { canUseRemotePushNotifications } from '@/utils/pushNotifications';

async function resolveExpoPushToken(): Promise<string | null> {
  if (!canUseRemotePushNotifications()) {
    return null;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TileVision Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function usePushNotifications(
  enabled: boolean,
  onNotificationReceived?: () => void,
) {
  const onReceivedRef = useRef(onNotificationReceived);
  onReceivedRef.current = onNotificationReceived;

  useEffect(() => {
    if (!enabled || !canUseRemotePushNotifications()) {
      return;
    }

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const token = await resolveExpoPushToken();
        if (!cancelled && token) {
          await registerPushToken(token, Platform.OS);
        }
      } catch {
        // Push is optional; skip silently when unavailable.
      }

      if (cancelled || !canUseRemotePushNotifications()) {
        return;
      }

      const Notifications = await import('expo-notifications');
      subscription = Notifications.addNotificationReceivedListener(() => {
        onReceivedRef.current?.();
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);
}
