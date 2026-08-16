import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InfoPage, InfoSection, BulletList } from '../components/InfoPage';
import { IconName } from '../components/Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const SECTIONS: { icon: IconName; title: string; paragraphs?: string[]; bullets?: { text: string; bold?: string }[] }[] = [
  {
    icon: 'handshake',
    title: '1. Acceptance of Terms',
    paragraphs: [
      'Welcome to JEMINA. These Terms of Service ("Terms") govern your use of our website, mobile applications, and services (collectively, the "Service") operated by JEMINA ("us", "we", or "our").',
      'By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.',
      'Important: These Terms constitute a legally binding agreement between you and JEMINA. Please read them carefully.',
    ],
  },
  {
    icon: 'storefront',
    title: '2. Description of Service',
    paragraphs: [
      'JEMINA is an e-commerce marketplace platform that connects buyers with independent vendors selling various products including but not limited to:',
    ],
    bullets: [
      { text: 'Electronics and mobile devices' },
      { text: 'Fashion and clothing items' },
      { text: 'Home and garden products' },
      { text: 'Beauty and personal care items' },
      { text: 'Books and media' },
      { text: 'Sports and outdoor equipment' },
      { text: 'Other consumer goods' },
    ],
  },
  {
    icon: 'verified-user',
    title: '3. User Accounts and Registration',
    bullets: [
      { bold: 'Account Creation', text: 'You must provide accurate, current, and complete information. You are responsible for maintaining the security of your account, notifying us immediately of any unauthorized use, and for all activities under your account.' },
      { bold: 'Buyer Accounts:', text: 'For individuals purchasing products' },
      { bold: 'Vendor Accounts:', text: 'For businesses selling products' },
      { bold: 'Admin Accounts:', text: 'For platform management' },
    ],
  },
  {
    icon: 'business-center',
    title: '4. Vendor Terms',
    bullets: [
      { bold: 'Vendor Registration:', text: 'To become a vendor, you must be legally authorized to conduct business, provide valid registration documents, and comply with all applicable laws.' },
      { bold: 'Vendor Products:', text: 'Vendors agree to accurately describe products, price competitively, and provide excellent customer service.' },
    ],
  },
  {
    icon: 'shopping-cart',
    title: '5. Buyer Terms',
    bullets: [
      { bold: 'The customer:', text: 'When purchasing, you agree to pay all applicable fees and taxes. We strive for availability but products may be unavailable without notice.' },
    ],
  },
  {
    icon: 'credit-card',
    title: '6. Payment & Refunds',
    bullets: [
      { bold: 'The stakeholders:', text: 'We accept secure payments via cards, mobile money, and wallets. Refunds are processed within 5-10 business days according to our 30-day return policy.' },
    ],
  },
  {
    icon: 'gavel',
    title: '7. Dispute Resolution',
    bullets: [
      { bold: 'The stakeholders:', text: 'We encourage direct resolution between users. If that fails, our support team can mediate. These Terms are governed by the laws of Uganda.' },
    ],
  },
  {
    icon: 'mail',
    title: '8. Contact Information',
    paragraphs: [],
    bullets: [
      { bold: 'Email:', text: 'support@jemi-na.com' },
      { bold: 'Phone:', text: '+256 765 368 348' },
      { bold: 'Address:', text: 'JEMINA Uganda Limited, Plot 6 Republic Road, Gulu, Uganda' },
    ],
  },
];

export function TermsOfServiceScreen() {
  return (
    <InfoPage
      title="Terms of Service"
      pill="Legal"
      pillIcon="gavel"
      heroText="These Terms of Service govern your use of the JEMINA marketplace, mobile applications, and services. Last updated: August 2026."
    >
      {SECTIONS.map(section => (
        <InfoSection key={section.title} icon={section.icon} title={section.title}>
          {section.paragraphs?.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
          {section.bullets ? <BulletList items={section.bullets} /> : null}
        </InfoSection>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>By using our service, you agree to these terms.</Text>
        <Text style={styles.noticeText}>
          If you have any questions about these Terms, contact our support team at support@jemi-na.com.
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
