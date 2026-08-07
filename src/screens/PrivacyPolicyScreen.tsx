import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoPage, InfoSection, BulletList } from '../components/InfoPage';
import { Icon, IconName } from '../components/Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const SECTIONS: { icon: IconName; title: string; paragraphs?: string[]; bullets?: { text: string; bold?: string }[] }[] = [
  {
    icon: 'info',
    title: '1. Introduction',
    paragraphs: [
      'Welcome to JEMINA ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our e-commerce services.',
      'By using our platform, you consent to the data practices described in this policy.',
    ],
  },
  {
    icon: 'description',
    title: '2. Information We Collect',
    paragraphs: [
      'We collect personal data you voluntarily provide (name, profile info, contact details such as email, phone and address, and payment details processed securely) as well as usage data automatically collected when you visit, including your IP address, browser, operating system, pages visited, time spent, and cookie preferences.',
    ],
  },
  {
    icon: 'list',
    title: '3. How We Use Your Information',
    bullets: [
      { text: 'Process and fulfill your orders' },
      { text: 'Create and manage your account' },
      { text: 'Communicate with you about your orders and our services' },
      { text: 'Analyze usage patterns and trends' },
      { text: 'Prevent fraud and ensure security' },
    ],
  },
  {
    icon: 'share',
    title: '4. Information Sharing',
    paragraphs: ['We generally do not share your personal info, except with:'],
    bullets: [
      { bold: 'Service Providers:', text: 'Payment processors, shipping partners.' },
      { bold: 'Vendors:', text: 'Only necessary info to fulfill your specific order.' },
      { bold: 'Legal Authorities:', text: 'If required by law or to protect safety.' },
    ],
  },
  {
    icon: 'lock',
    title: '5. Data Security',
    paragraphs: [
      'We use SSL encryption and secure payment gateways. While we implement robust security measures, no method of transmission over the internet is 100% secure.',
    ],
  },
  {
    icon: 'verified-user',
    title: '6. Your Rights',
    bullets: [
      { bold: 'Right to Access', text: 'Request a copy of your data.' },
      { bold: 'Right to Rectify', text: 'Update incomplete or incorrect data.' },
      { bold: 'Right to Delete', text: 'Request deletion of your data.' },
      { bold: 'Right to Object', text: 'Object to processing or marketing.' },
    ],
  },
  {
    icon: 'mail',
    title: '7. Contact Privacy Team',
    bullets: [
      { bold: 'Email:', text: 'privacy@jemina.co.ug' },
      { bold: 'Address:', text: 'JEMINA Uganda Limited, 123 Republic Road, Gulu City, Uganda' },
    ],
  },
];

export function PrivacyPolicyScreen() {
  return (
    <InfoPage
      title="Privacy Policy"
      pill="Privacy Policy"
      pillIcon="verified-user"
      heroText="Learn how JEMINA collects, uses, and protects your personal information when you shop online in Uganda. Last updated: August 2026."
    >
      {SECTIONS.map(section => (
        <InfoSection key={section.title} icon={section.icon} title={section.title}>
          {section.paragraphs?.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
          {section.bullets ? (
            section.title === '6. Your Rights' ? (
              <View style={styles.rightsGrid}>
                {section.bullets.map((b, i) => (
                  <View key={i} style={styles.rightCard}>
                    <Icon name="check-circle" size={18} color={colors.statusSuccess} />
                    <Text style={styles.rightTitle}>{b.bold}</Text>
                    <Text style={styles.rightDesc}>{b.text}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <BulletList items={section.bullets} />
            )
          ) : null}
        </InfoSection>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>We value your trust.</Text>
        <Text style={styles.noticeText}>
          For any privacy-related questions, contact our privacy team at privacy@jemina.co.ug.
        </Text>
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  rightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  rightCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rightTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  rightDesc: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  notice: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  noticeTitle: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  noticeText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    lineHeight: 20,
  },
});
