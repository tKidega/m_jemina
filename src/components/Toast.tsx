import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onDone?: () => void;
  duration?: number;
}

const ICONS: Record<string, { icon: string; bg: string; fg: string }> = {
  success: { icon: 'check-circle', bg: '#d4edda', fg: '#155724' },
  error: { icon: 'error-outline', bg: '#f8d7da', fg: '#721c24' },
  info: { icon: 'info', bg: '#d1ecf1', fg: '#0c5460' },
};

export function Toast({ message, type = 'success', visible, onDone, duration = 2600 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone?.());
      }, duration);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, duration, onDone, opacity]);

  if (!visible) return null;

  const cfg = ICONS[type] ?? ICONS.info;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon as any} size={16} color={cfg.fg} />
      </View>
      <Text style={[styles.message, { color: cfg.fg }]} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    zIndex: 100,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.labelMd,
    fontWeight: '600',
    flex: 1,
  },
});
