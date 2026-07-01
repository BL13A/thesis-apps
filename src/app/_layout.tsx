import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { paperTheme } from '@/constants/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { WarehouseProvider } from '@/hooks/useWarehouse';
import { NotificationsProvider } from '@/hooks/useNotifications';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <WarehouseProvider>
            <NotificationsProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            </NotificationsProvider>
          </WarehouseProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
