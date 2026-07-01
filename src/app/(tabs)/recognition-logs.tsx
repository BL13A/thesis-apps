import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanSearch } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  EmptyState,
  LoadingSkeleton,
  RecognitionLogCard,
} from '@/components';
import { spacing } from '@/constants/theme';
import { useWarehouse } from '@/hooks/useWarehouse';

export default function RecognitionLogsScreen() {
  const { recognitionLogs, isLoading, error, refreshRecognitionLogs } = useWarehouse();

  useFocusEffect(
    useCallback(() => {
      void refreshRecognitionLogs({ silent: true });
    }, [refreshRecognitionLogs]),
  );

  if (isLoading && recognitionLogs.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader
          title="Recognition Logs"
          subtitle="Previous AI tile recognition results"
          compact
        />

        {error ? <AlertCard title="Unable to load logs" message={error} variant="warning" /> : null}

        {recognitionLogs.length > 0 ? (
          recognitionLogs.map((log) => <RecognitionLogCard key={log.id} log={log} />)
        ) : (
          <EmptyState
            icon={ScanSearch}
            title="No recognition logs yet"
            description="Scan a tile to save your first recognition result."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
});
