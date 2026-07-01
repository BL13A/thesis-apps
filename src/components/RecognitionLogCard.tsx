import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScanSearch } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { RecognitionLog } from '@/types';
import { resolveRemoteImageUri } from '@/utils/imageUri';
import { sanitizeTileDisplayLabel } from '@/utils/tileLabels';

interface RecognitionLogCardProps {
  log: RecognitionLog;
  onPress?: () => void;
}

function formatLogDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecognitionLogCard({ log, onPress }: RecognitionLogCardProps) {
  const imageUri = resolveRemoteImageUri(log.imageUri);

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ScanSearch size={20} color={colors.primaryLight} />
            </View>
          )}
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>
              {sanitizeTileDisplayLabel(log.recognizedName)}
            </Text>
            <Text style={styles.meta}>
              {log.tileType?.toLowerCase() === 'intact' ? 'Ceramic' : log.tileType}
            </Text>
            <Text style={styles.confidence}>
              Confidence: {Math.round(log.confidenceScore * 100)}%
            </Text>
            <Text style={styles.meta}>{formatLogDate(log.createdAt)}</Text>
            <Text style={styles.user}>By {log.userName}</Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confidence: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
    marginTop: 4,
  },
  user: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
