import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { borderRadius, colors, spacing } from '@/constants/theme';

interface ProfileMenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  showDivider?: boolean;
}

export function ProfileMenuItem({
  icon: Icon,
  label,
  onPress,
  destructive,
  showDivider = true,
}: ProfileMenuItemProps) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.iconWrap,
            destructive && styles.iconWrapDestructive,
          ]}
        >
          <Icon
            size={18}
            color={destructive ? colors.reject : colors.primaryLight}
          />
        </View>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>
          {label}
        </Text>
        {!destructive && (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </Pressable>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDestructive: {
    backgroundColor: colors.rejectBg,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  labelDestructive: {
    color: colors.reject,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
});
