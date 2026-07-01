import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';

interface StatsGridProps {
  children: React.ReactNode[];
}

export function StatsGrid({ children }: StatsGridProps) {
  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];

  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((child, colIndex) => (
            <View key={colIndex} style={styles.cell}>
              {child}
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
  },
});
