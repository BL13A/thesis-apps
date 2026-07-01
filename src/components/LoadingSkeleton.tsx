import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { borderRadius, colors, spacing } from '@/constants/theme';

function SkeletonBox({ style }: { style?: object }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.box, style, animatedStyle]} />
  );
}

export function LoadingSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox style={styles.header} />
      <View style={styles.statsRow}>
        <SkeletonBox style={styles.stat} />
        <SkeletonBox style={styles.stat} />
      </View>
      <View style={styles.statsRow}>
        <SkeletonBox style={styles.stat} />
        <SkeletonBox style={styles.stat} />
      </View>
      <SkeletonBox style={styles.card} />
      <SkeletonBox style={styles.card} />
      <SkeletonBox style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  box: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  header: {
    height: 28,
    width: '60%',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    height: 100,
    borderRadius: borderRadius.lg,
  },
  card: {
    height: 88,
    borderRadius: borderRadius.lg,
  },
});
