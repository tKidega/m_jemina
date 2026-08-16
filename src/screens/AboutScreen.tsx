import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoPage, InfoSection, FeatureCard } from '../components/InfoPage';
import { Icon, IconName } from '../components/Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const CORE_VALUES: { icon: IconName; title: string; description: string }[] = [
  { icon: 'verified-user', title: 'Integrity', description: 'We operate with transparency and honesty in all our dealings.' },
  { icon: 'people', title: 'Community', description: 'We believe in the power of connection and shared success.' },
  { icon: 'lightbulb', title: 'Innovation', description: 'We constantly evolve to provide the best solutions for you.' },
  { icon: 'eco', title: 'Sustainability', description: 'We support responsible consumption and long-term growth.' },
];

const WHY_US: { icon: IconName; title: string; description: string }[] = [
  { icon: 'shopping-cart', title: 'Easy to Use', description: 'Simple and intuitive interface designed for both buyers and sellers to navigate effortlessly.' },
  { icon: 'lock', title: 'Secure Platform', description: 'Advanced security measures and encryption to ensure your transactions are always protected.' },
  { icon: 'public', title: 'Global Reach', description: 'Connect with a worldwide community. Buy from international vendors or sell to global customers.' },
  { icon: 'star', title: 'Trusted Sellers', description: 'Shop with confidence from verified sellers with authentic ratings and reviews.' },
];

const BADGES: { icon: IconName; label: string; tint: string; fg: string }[] = [
  { icon: 'people', label: 'Community', tint: 'rgba(40,167,69,0.12)', fg: '#1e7e34' },
  { icon: 'trending-up', label: 'Growth', tint: 'rgba(13,110,253,0.12)', fg: '#0d6efd' },
];

const VALUES = [...CORE_VALUES];

export function AboutScreen() {
  return (
    <InfoPage
      title="About JEMINA"
      pill="Who We Are"
      pillIcon="search"
      heroText="Your trusted online marketplace connecting quality vendors with discerning customers. We believe in commerce that builds community, fosters trust, and drives local growth."
    >
      {/* Mission & Vision */}
      <View style={styles.mvRow}>
        <View style={[styles.mvCard, styles.mvMission]}>
          <View style={styles.mvIcon}>
            <Icon name="track-changes" size={26} color="#0d6efd" />
          </View>
          <Text style={styles.mvTitle}>Our Mission</Text>
          <Text style={styles.mvText}>
            To create a trusted and inclusive marketplace where registered businesses can establish their
            online presence, manage products effectively, and reach customers both locally and globally.
          </Text>
          <View style={styles.badgeRow}>
            {BADGES.slice(0, 2).map(b => (
              <View key={b.label} style={[styles.badge, { backgroundColor: b.tint }]}>
                <Icon name={b.icon} size={13} color={b.fg} />
                <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.mvCard, styles.mvVision]}>
          <View style={styles.mvIcon}>
            <Icon name="visibility" size={26} color="#0dcaf0" />
          </View>
          <Text style={styles.mvTitle}>Our Vision</Text>
          <Text style={styles.mvText}>
            To become the leading platform for e-commerce innovation, empowering businesses and individuals
            to thrive in the global digital marketplace through technology and trust.
          </Text>
          <View style={styles.badgeRow}>
            {BADGES.slice(0, 2).map(b => (
              <View key={b.label} style={[styles.badge, { backgroundColor: b.tint }]}>
                <Icon name="auto-awesome" size={13} color={b.fg} />
                <Text style={[styles.badgeText, { color: b.fg }]}>{b.label === 'Growth' ? 'Global Reach' : b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Core Values */}
      <InfoSection icon="star" title="Our Core Values">
        <Text style={styles.sectionLead}>The principles that guide every decision we make.</Text>
        <View style={styles.valueGrid}>
          {VALUES.map(v => (
            <View key={v.title} style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Icon name={v.icon} size={22} color={colors.secondary} />
              </View>
              <Text style={styles.valueTitle}>{v.title}</Text>
              <Text style={styles.valueDesc}>{v.description}</Text>
            </View>
          ))}
        </View>
      </InfoSection>

      {/* Why Choose Us */}
      <InfoSection icon="verified-user" title="Why Choose Us">
        <Text style={styles.sectionLead}>Experience the difference with our premium features.</Text>
        {WHY_US.map(w => (
          <FeatureCard key={w.title} icon={w.icon} title={w.title} description={w.description} />
        ))}
      </InfoSection>

      {/* Our Story */}
      <InfoSection icon="history" title="Our Story">
        <Text style={styles.sectionLead}>From humble beginnings to a global marketplace.</Text>
        <Text style={styles.storyText}>
          Founded in 2024, our platform was created to address the growing need for accessible e-commerce
          solutions. What started as a small project has evolved into a thriving marketplace connecting
          thousands of buyers and sellers across Uganda and beyond.
        </Text>
        <View style={styles.storyStat}>
          <View style={styles.storyStatIcon}>
            <Icon name="trending-up" size={20} color={colors.secondary} />
          </View>
          <Text style={styles.storyStatLabel}>Consistent user base expansion since launch</Text>
        </View>
      </InfoSection>

      {/* Get in touch */}
      <InfoSection icon="mail" title="Get in Touch">
        <Text style={styles.sectionLead}>Still have unanswered queries? We'd love to hear from you.</Text>
        {[
          { icon: 'location-on' as IconName, label: 'Our Location', value: 'Plot 6 Republic Road, Gulu, UG' },
          { icon: 'mail' as IconName, label: 'Email Us', value: 'support@jemi-na.com' },
          { icon: 'call' as IconName, label: 'Call Us', value: '+256 765 368 348' },
        ].map(row => (
          <View key={row.label} style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Icon name={row.icon} size={18} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.contactLabel}>{row.label}</Text>
              <Text style={styles.contactValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </InfoSection>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  mvRow: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  mvCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  mvMission: {
    borderTopWidth: 4,
    borderTopColor: '#0d6efd',
  },
  mvVision: {
    borderTopWidth: 4,
    borderTopColor: '#0dcaf0',
  },
  mvIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,110,253,0.1)',
    marginBottom: spacing.md,
  },
  mvTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  mvText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  sectionLead: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  valueItem: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  valueTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  valueDesc: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  storyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  storyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  storyStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyStatLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...typography.labelSm,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
});
