import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Icon, IconName } from './Icon';

type BadgeVariant = 'featured' | 'flash' | 'secondary' | 'wholesale' | 'corporate' | 'new';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: IconName;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
  featured: { bg: colors.statusFeatured, fg: colors.white },
  flash: { bg: colors.statusFlash, fg: colors.white },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondary },
  wholesale: { bg: colors.primaryContainer, fg: colors.onPrimary },
  corporate: { bg: colors.secondaryContainer, fg: colors.onSecondary },
  new: { bg: colors.primary, fg: colors.white },
};

export function Badge({ label, variant = 'featured', icon, style, textStyle }: BadgeProps) {
  const { bg, fg } = palette[variant];
  return (
    <Text style={[styles.badge, { backgroundColor: bg, color: fg }, style, textStyle]}>
      {icon ? <Icon name={icon} size={11} color={fg} style={styles.icon} /> : null}
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    ...typography.labelSm,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  icon: {},
});
