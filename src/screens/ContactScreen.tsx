import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const CONTACT_ROWS: { icon: IconName; label: string; value: string; action?: () => void }[] = [
  { icon: 'location-on', label: 'Address', value: 'Plot 6 Republic Road, Gulu, UG' },
  { icon: 'mail', label: 'Email Us', value: 'support@jemi-na.com' },
  { icon: 'call', label: 'Call Support', value: '+256 765 368 348' },
];

const BUSINESS_HOURS = [
  { days: 'Monday - Friday', hours: '09:00 AM - 09:00 PM' },
  { days: 'Saturday - Sunday', hours: '09:00 AM - 12:00 PM' },
];

export function ContactScreen() {
  const { user, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    subject: '',
    message: '',
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
    setSent(false);
  };

  const openLink = (kind: 'email' | 'tel') => {
    const target =
      kind === 'email' ? `mailto:support@jemi-na.com` : `tel:+256765368348`;
    Linking.openURL(target).catch(() => setError('Could not open your mail or phone app.'));
  };

  const handleSend = () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!form.subject.trim()) {
      setError('Please enter a subject.');
      return;
    }
    if (!form.message.trim()) {
      setError('Please enter your message.');
      return;
    }
    const subject = encodeURIComponent(form.subject);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name}\n${form.email}`);
    Linking.openURL(`mailto:support@jemi-na.com?subject=${subject}&body=${body}`).catch(() =>
      setError('Could not open your mail app. Please email support@jemi-na.com directly.'),
    );
    setSent(true);
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Contact Us" showBack onBack={goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.pill}>
              <Icon name="mail" size={14} color={colors.onSecondary} />
              <Text style={styles.pillText}>Get In Touch</Text>
            </View>
            <Text style={styles.heroTitle}>Contact Us</Text>
            <Text style={styles.heroText}>Have a question or need assistance? We're here to help!</Text>
          </View>

          {/* Contact info */}
          <View style={styles.card}>
            {CONTACT_ROWS.map((row, i) => (
              <Pressable
                key={row.label}
                style={[styles.contactRow, i < CONTACT_ROWS.length - 1 && styles.contactRowBorder]}
                onPress={() => (row.icon === 'mail' ? openLink('email') : row.icon === 'call' ? openLink('tel') : undefined)}
              >
                <View style={styles.contactIcon}>
                  <Icon name={row.icon} size={20} color={colors.secondary} />
                </View>
                <View style={styles.contactBody}>
                  <Text style={styles.contactLabel}>{row.label}</Text>
                  <Text style={styles.contactValue}>{row.value}</Text>
                </View>
                {row.icon === 'mail' || row.icon === 'call' ? (
                  <Icon name="chevron-right" size={18} color={colors.outline} />
                ) : null}
              </Pressable>
            ))}
          </View>

          {/* Business hours */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Hours</Text>
            {BUSINESS_HOURS.map(row => (
              <View key={row.days} style={styles.hoursRow}>
                <Text style={styles.hoursDays}>{row.days}</Text>
                <Text style={styles.hoursValue}>{row.hours}</Text>
              </View>
            ))}
          </View>

          {/* Contact form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Send us a Message</Text>
            <Text style={styles.cardSub}>Use the form below to send us a quick message.</Text>

            {sent ? (
              <View style={styles.successBox}>
                <Icon name="check-circle" size={22} color={colors.statusSuccess} />
                <Text style={styles.successText}>
                  Your message has been prepared. Please send it from your mail app.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="error-outline" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={setField('name')}
                placeholder="Your Name"
                placeholderTextColor={colors.outline}
                editable={!isAuthenticated}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your Email</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={setField('email')}
                placeholder="Your Email"
                placeholderTextColor={colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isAuthenticated}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={setField('subject')}
                placeholder="Subject"
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.message}
                onChangeText={setField('message')}
                placeholder="Message"
                placeholderTextColor={colors.outline}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button label="Send Message" variant="primary" fullWidth onPress={handleSend} style={styles.sendBtn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
    marginBottom: spacing.lg,
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
  heroTitle: {
    ...typography.displayLgMobile,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  heroText: {
    ...typography.bodyLg,
    color: colors.onPrimaryContainer,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBody: {
    flex: 1,
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
  cardTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cardSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  hoursDays: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  hoursValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(40,167,69,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.statusSuccess,
    flex: 1,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
  },
});
