import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/spacing';

interface SurfaceCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  paddingOverride?: number;
  marginBottom?: number;
}

export function SurfaceCard({ children, onPress, style, paddingOverride, marginBottom }: SurfaceCardProps) {
  const surface = [
    styles.card,
    paddingOverride !== undefined ? { padding: paddingOverride } : null,
    marginBottom !== undefined ? { marginBottom } : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [surface, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={surface}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceContainer,
  },
});