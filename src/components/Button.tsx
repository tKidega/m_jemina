import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', icon, fullWidth, disabled, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary
    ? colors.secondaryContainer
    : isSecondary
      ? colors.primary
      : isGhost
        ? 'transparent'
        : 'transparent';
  const fg = isPrimary
    ? colors.onSecondary
    : isSecondary
      ? colors.onPrimary
      : isGhost
        ? colors.primary
        : colors.primary;
  const border = isOutline ? 1 : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderWidth: border,
          borderColor: colors.primary,
          paddingVertical: isGhost ? 8 : 12,
        },
        fullWidth && styles.full,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  full: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.labelMd,
    fontWeight: '700',
  },
});
