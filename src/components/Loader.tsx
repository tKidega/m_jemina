import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from './Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

/* ─── Bouncing Dots Loader ─────────────────────────── */

export function BounceDotsLoader({ color }: { color?: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -8, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const a = makeAnim(dot1, 0);
    const b = makeAnim(dot2, 150);
    const c = makeAnim(dot3, 300);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dot1, dot2, dot3]);

  const c = color ?? colors.secondary;

  return (
    <View style={bounceStyles.row}>
      <Animated.View style={[bounceStyles.dot, { backgroundColor: c, transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[bounceStyles.dot, { backgroundColor: c, transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[bounceStyles.dot, { backgroundColor: c, transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const bounceStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

/* ─── Spinning Ring Loader ─────────────────────────── */

export function SpinLoader({ size, color }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const s = size ?? 28;
  const c = color ?? colors.secondary;

  return (
    <Animated.View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        borderWidth: 3,
        borderColor: `${c}33`,
        borderTopColor: c,
        transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

/* ─── Shimmer Skeleton Loader ──────────────────────── */

export function ShimmerBar({ width, height, style }: { width?: number | string; height?: number; style?: object }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: false }),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.7, 0.4] });

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height: height ?? 14,
          borderRadius: 6,
          backgroundColor: colors.surfaceContainerHigh,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ShimmerCard({ style }: { style?: object }) {
  return (
    <View style={[shimmerCardStyles.card, style]}>
      <ShimmerBar height={120} style={{ borderRadius: 8 }} />
      <View style={shimmerCardStyles.body}>
        <ShimmerBar width="70%" height={12} />
        <ShimmerBar width="50%" height={10} style={{ marginTop: 6 }} />
        <ShimmerBar width="40%" height={10} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

const shimmerCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  body: { padding: 12, gap: 2 },
});

/* ─── Full-Screen Loading Overlay ──────────────────── */

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <View style={overlayStyles.container}>
      <View style={overlayStyles.card}>
        <SpinLoader size={36} />
        {text ? <Text style={overlayStyles.text}>{text}</Text> : null}
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});

/* ─── Inline Loading Bar (for sections) ────────────── */

export function SectionLoader({ text, icon }: { text?: string; icon?: IconName }) {
  return (
    <View style={sectionStyles.container}>
      <SpinLoader size={22} />
      {icon && <Icon name={icon} size={18} color={colors.outline} />}
      {text ? <Text style={sectionStyles.text}>{text}</Text> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  text: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});

/* ─── Pulse Dot (single animated dot) ──────────────── */

export function PulseDot({ color }: { color?: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color ?? colors.statusSuccess,
        transform: [{ scale }],
      }}
    />
  );
}

/* ─── Branded Full-Screen Loader (Cart / Account) ──── */

export function BrandScreenLoader({
  title,
  subtitle,
  hint,
  icon = 'verified-user',
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  icon?: IconName;
}) {
  return (
    <View style={brandStyles.root}>
      <View style={brandStyles.mark}>
        <View style={brandStyles.ring} />
        <View style={brandStyles.badge}>
          <Icon name={icon} size={30} color={colors.onPrimary} />
        </View>
      </View>
      <Text style={brandStyles.title}>JEMINA</Text>
      <Text style={brandStyles.subtitle}>{subtitle ?? title}</Text>
      <View style={brandStyles.spinner}>
        <SpinLoader color={colors.primary} />
      </View>
      {hint ? <Text style={brandStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

const brandStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  mark: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ring: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: `${colors.primary}33`,
    borderLeftColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  spinner: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: 'center',
  },
});
