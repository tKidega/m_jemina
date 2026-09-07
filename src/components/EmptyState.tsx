import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Icon, IconName } from './Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Icon name={icon} size={56} color={colors.outlineVariant} />
      <Text style={styles.centerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.centerSub}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="primary" fullWidth onPress={onAction} style={styles.centerBtn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  centerSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
});