import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface ProfileInfoRowProps {
  label: string;
  value: string | React.ReactNode;
  isLast?: boolean;
}

export function ProfileInfoRow({ label, value, isLast }: ProfileInfoRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' ? (
        <Text
          style={styles.value}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {value}
        </Text>
      ) : (
        <View style={styles.valueWrap}>{value}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    minWidth: 92,
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  valueWrap: {
    flex: 1,
    flexShrink: 1,
    alignItems: 'flex-end',
  },
});
