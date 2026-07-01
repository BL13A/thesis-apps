import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { borderRadius, colors, spacing } from '@/constants/theme';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

const DEFAULT_LABELS = ['Batch', 'Photo', 'Review', 'Result'];
const CIRCLE_SIZE = 32;

export function StepIndicator({
  currentStep,
  totalSteps = 4,
  labels = DEFAULT_LABELS,
}: StepIndicatorProps) {
  const stepLabels = labels.slice(0, totalSteps);
  const edgeInsetPercent = (0.5 / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.connectorRail,
            { left: `${edgeInsetPercent}%`, right: `${edgeInsetPercent}%` },
          ]}
          pointerEvents="none"
        >
          {Array.from({ length: totalSteps - 1 }).map((_, index) => {
            const segmentDone = index + 1 < currentStep;
            return (
              <View
                key={`seg-${index}`}
                style={[
                  styles.connectorSegment,
                  segmentDone && styles.connectorDone,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.stepsRow}>
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;

            return (
              <View key={label} style={styles.stepColumn}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={14} color={colors.white} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    width: '100%',
  },
  track: {
    position: 'relative',
    width: '100%',
  },
  connectorRail: {
    position: 'absolute',
    top: CIRCLE_SIZE / 2 - 1,
    flexDirection: 'row',
    height: 2,
    zIndex: 0,
  },
  connectorSegment: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surfaceLight,
  },
  connectorDone: {
    backgroundColor: colors.pass,
  },
  stepsRow: {
    flexDirection: 'row',
    width: '100%',
    zIndex: 1,
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  circleCompleted: {
    backgroundColor: colors.pass,
    borderColor: colors.pass,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  stepNumberActive: {
    color: colors.white,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    alignSelf: 'stretch',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  labelActive: {
    color: colors.primaryLight,
  },
  labelCompleted: {
    color: colors.pass,
  },
});
