import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, screenBackground } from '@/constants/theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
}

export function ScreenBackground({ children }: ScreenBackgroundProps) {
  const { gradientColors, gradientLocations, glowBlue, glowYellow } = screenBackground;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={[...gradientLocations]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glow,
          {
            top: glowBlue.top,
            right: glowBlue.right,
            width: glowBlue.size,
            height: glowBlue.size,
            borderRadius: glowBlue.size / 2,
            backgroundColor: glowBlue.color,
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            bottom: glowYellow.bottom,
            left: glowYellow.left,
            width: glowYellow.size,
            height: glowYellow.size,
            borderRadius: glowYellow.size / 2,
            backgroundColor: glowYellow.color,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
  },
});
