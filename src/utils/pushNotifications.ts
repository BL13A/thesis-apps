import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

/** True when running inside the Expo Go app (not a dev/production build). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Remote push tokens require a development build or production app.
 * Expo Go SDK 53+ no longer supports remote push notifications.
 */
export function canUseRemotePushNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  if (isExpoGo()) return false;
  return true;
}
