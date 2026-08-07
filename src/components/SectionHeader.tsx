import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Icon, IconName } from './Icon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  trailing?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor,
  actionLabel,
  onAction,
  trailing,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? (
          <View style={styles.titleRow}>
            <Icon name={icon} size={20} color={iconColor ?? colors.secondary} />
          </View>
        ) : null}
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {trailing}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel ? (
        <Pressable style={styles.action} onPress={onAction} hitSlop={8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon name="chevron-right" size={14} color={colors.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
});
