import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoPage, InfoSection, FeatureCard, BulletList } from '../components/InfoPage';
import { Icon, IconName } from '../components/Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const CAPABILITIES: { icon: IconName; title: string; description: string }[] = [
  { icon: 'storefront', title: 'Virtual Shops', description: 'Launch your branded online store in minutes. Customize your presence and reach millions of potential customers globally.' },
  { icon: 'business-center', title: 'Multi-Category', description: 'Sell anything from electronics to agricultural produce. Our flexible platform supports diverse product types and services.' },
  { icon: 'replay', title: 'New & Renewed', description: 'Support for circular economy. List brand new items or quality renewed products with detailed condition grading.' },
];

const STATS: { icon: IconName; value: string; label: string; color: string }[] = [
  { icon: 'people', value: '10,000+', label: 'Active Users', color: colors.onSurfaceVariant },
  { icon: 'storefront', value: '250+', label: 'Vendors', color: '#0d6efd' },
  { icon: 'shopping-bag', value: '50,000+', label: 'Products', color: '#198754' },
  { icon: 'star', value: '99%', label: 'Satisfaction', color: '#ffc107' },
];

const FEATURES: { icon: IconName; title: string; description: string; tint: string }[] = [
  { icon: 'search', title: 'Smart Search', description: 'AI-powered algorithms to help you find exactly what you need.', tint: 'rgba(13,110,253,0.1)' },
  { icon: 'lock', title: 'Secure Transactions', description: 'Bank-grade encryption and escrow services for peace of mind.', tint: 'rgba(25,135,84,0.1)' },
  { icon: 'star', title: 'Verified Ratings', description: 'Authentic reviews from verified purchases to build trust.', tint: 'rgba(255,193,7,0.12)' },
  { icon: 'local-shipping', title: 'Flexible Logistics', description: 'Negotiable delivery options tailored to your needs.', tint: 'rgba(13,202,240,0.1)' },
];

const STEPS: { icon: IconName; step: string; title: string; description: string }[] = [
  { icon: 'person-add', step: '1', title: 'Create Account', description: 'Register as a vendor and complete your business profile in minutes.' },
  { icon: 'add-shopping-cart', step: '2', title: 'List Products', description: 'Upload your inventory with detailed descriptions and attractive images.' },
  { icon: 'trending-up', step: '3', title: 'Start Selling', description: 'Connect with customers, manage orders, and grow your business.' },
];

export function ServicesScreen() {
  return (
    <InfoPage
      title="Services Built for Growth"
      pill="Comprehensive Solutions"
      pillIcon="settings"
      heroText="Discover an ecosystem designed to empower vendors and delight customers. From virtual storefronts to secure transactions, we handle the complexity so you can focus on success."
    >
      {/* Core capabilities */}
      <InfoSection icon="build" title="Core Capabilities">
        {CAPABILITIES.map(c => (
          <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.description} />
        ))}
      </InfoSection>

      {/* Solutions for everyone */}
      <InfoSection icon="groups" title="Solutions for Everyone">
        <View style={styles.solutionCard}>
          <View style={[styles.solutionAccent, styles.accentPrimary]} />
          <View style={styles.solutionIconWrap}>
            <View style={styles.solutionIcon}>
              <Icon name="business-center" size={30} color="#0d6efd" />
            </View>
          </View>
          <Text style={styles.solutionTitle}>For Vendors</Text>
          <BulletList
            items={[
              { text: 'Real-time Inventory Management' },
              { text: 'Advanced Sales Analytics' },
              { text: 'Direct Customer Messaging' },
            ]}
          />
        </View>
        <View style={styles.solutionCard}>
          <View style={[styles.solutionAccent, styles.accentSuccess]} />
          <View style={styles.solutionIconWrap}>
            <View style={styles.solutionIcon}>
              <Icon name="shopping-bag" size={30} color="#198754" />
            </View>
          </View>
          <Text style={styles.solutionTitle}>For Shoppers</Text>
          <BulletList
            items={[
              { text: 'Secure Escrow Payments' },
              { text: 'Verified Seller Badges' },
              { text: 'Seamless Order Tracking' },
            ]}
          />
        </View>
      </InfoSection>

      {/* Impact stats */}
      <InfoSection icon="trending-up" title="Our Impact">
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Icon name={s.icon} size={20} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </InfoSection>

      {/* Platform features */}
      <InfoSection icon="auto-awesome" title="Platform Features">
        <Text style={styles.sectionLead}>Why Choose Us.</Text>
        {FEATURES.map(f => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} tint={f.tint} />
        ))}
      </InfoSection>

      {/* How it works */}
      <InfoSection icon="list" title="How It Works">
        <Text style={styles.sectionLead}>Simple steps to get started.</Text>
        {STEPS.map(s => (
          <View key={s.step} style={styles.stepRow}>
            <View style={styles.stepIconWrap}>
              <View style={styles.stepIcon}>
                <Icon name={s.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{s.step}</Text>
              </View>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.description}</Text>
            </View>
          </View>
        ))}
      </InfoSection>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  sectionLead: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  solutionCard: {
    position: 'relative',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  solutionAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
  },
  accentPrimary: {
    backgroundColor: '#0d6efd',
  },
  accentSuccess: {
    backgroundColor: '#198754',
  },
  solutionIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  solutionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(13,110,253,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solutionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  statValue: {
    ...typography.headlineLg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepIconWrap: {
    position: 'relative',
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  stepBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  stepDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 20,
  },
});
