import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from './AppHeader';
import { Icon, IconName } from './Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface InfoPageProps {
  title: string;
  pill: string;
  pillIcon?: IconName;
  heroText: string;
  children: React.ReactNode;
}

export function InfoPage({ title, pill, pillIcon, heroText, children }: InfoPageProps) {
  const { goBack } = useNavigation();

  return (
    <View style={styles.root}>
      <AppHeader title="JEMINA" showBack onBack={goBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.pill}>
            {pillIcon ? <Icon name={pillIcon} size={14} color={colors.onSecondary} /> : null}
            <Text style={styles.pillText}>{pill}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.heroText}>{heroText}</Text>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

interface InfoSectionProps {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}

export function InfoSection({ icon, title, children }: InfoSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={20} color={colors.secondary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface FeatureCardProps {
  icon: IconName;
  title: string;
  description: string;
  tint?: string;
}

export function FeatureCard({ icon, title, description, tint = 'rgba(13,110,253,0.1)' }: FeatureCardProps) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  );
}

export function BulletList({ items }: { items: { text: string; bold?: string }[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Icon name="check" size={16} color={colors.statusSuccess} />
          <Text style={styles.bulletText}>
            {item.bold ? <Text style={styles.bulletBold}>{item.bold} </Text> : null}
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  pillText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.displayLgMobile,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  heroText: {
    ...typography.bodyLg,
    color: colors.onPrimaryContainer,
    marginTop: spacing.md,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  sectionBody: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 20,
  },
  bulletBold: {
    color: colors.onSurface,
    fontWeight: '700',
  },
});
