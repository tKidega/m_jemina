import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetVendorActionsStatus,
  apiGetVendorAgreement,
  apiAcceptVendorAgreement,
  apiCreateVendorStore,
  ApiVendorActionsStatus,
  ApiVendorAgreement,
} from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface StoreForm {
  shop_name: string;
  shop_owner: string;
  shop_email: string;
  shop_phone: string;
  pay_method: string;
  terms: boolean;
}

const EMPTY_FORM: StoreForm = {
  shop_name: '',
  shop_owner: '',
  shop_email: '',
  shop_phone: '',
  pay_method: 'Momo',
  terms: false,
};

export function VendorActionsScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [status, setStatus] = useState<ApiVendorActionsStatus | null>(null);
  const [agreement, setAgreement] = useState<ApiVendorAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await apiGetVendorActionsStatus(token);
        setStatus(data);
        setAccepted(data.journey.agreement_accepted);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load vendor actions.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => load(true), [load]);

  const openAgreement = async () => {
    if (!token) {
      return;
    }
    if (agreement) {
      setShowAgreement(true);
      return;
    }
    setAgreementLoading(true);
    try {
      const data = await apiGetVendorAgreement(token);
      setAgreement(data);
      setShowAgreement(true);
    } catch (e) {
      Alert.alert('Could not load agreement', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAgreementLoading(false);
    }
  };

  const acceptAgreement = async () => {
    if (!token) {
      return;
    }
    setAgreementLoading(true);
    try {
      await apiAcceptVendorAgreement(token);
      setAccepted(true);
      setShowAgreement(false);
      Alert.alert('Agreement accepted', 'You can now register your e-Store.');
    } catch (e) {
      Alert.alert('Could not accept agreement', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAgreementLoading(false);
    }
  };

  const submitStore = async () => {
    if (!token) {
      return;
    }
    if (!form.shop_name.trim() || !form.shop_owner.trim() || !form.shop_email.trim() || !form.shop_phone.trim()) {
      setFormError('Business name, owner name, email and phone are required.');
      return;
    }
    if (!form.terms) {
      setFormError('You must accept the terms and conditions to proceed.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await apiCreateVendorStore(token, {
        shop_name: form.shop_name.trim(),
        shop_owner: form.shop_owner.trim(),
        shop_email: form.shop_email.trim(),
        shop_phone: form.shop_phone.trim(),
        pay_method: form.pay_method,
        terms: form.terms,
      });
      setRegistered(true);
      setForm(EMPTY_FORM);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to register your e-Store.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Vendor Actions" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="storefront" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to access vendor actions</Text>
          <Text style={styles.centerSub}>Complete both surveys to unlock vendor registration.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <AppHeader title="Vendor Actions" showBack onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading vendor actions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <AppHeader title="Vendor Actions" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load vendor actions</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => load()} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  const journey = status?.journey;

  if (!journey || !journey.both_completed) {
    return (
      <View style={styles.root}>
        <AppHeader title="Vendor Actions" showBack onBack={goBack} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          <View style={styles.lockedCard}>
            <View style={styles.lockedIcon}>
              <Icon name="lock" size={32} color={colors.statusFlash} />
            </View>
            <Text style={styles.lockedTitle}>Vendor Actions Locked</Text>
            <Text style={styles.lockedBody}>
              Complete both surveys to unlock the vendor actions, where you can review the Vendor Agreement and
              register your e-Store.
            </Text>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, journey?.user_survey_completed && styles.stepDotDone]}>
                <Text style={styles.stepDotText}>{journey?.user_survey_completed ? '\u2713' : '1'}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>User Feedback</Text>
                <Text style={styles.stepSub}>Complete the user experience survey</Text>
              </View>
              {journey?.user_survey_completed ? (
                <Icon name="check-circle" size={20} color={colors.statusSuccess} />
              ) : null}
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, journey?.vendor_survey_completed && styles.stepDotDone]}>
                <Text style={styles.stepDotText}>{journey?.vendor_survey_completed ? '\u2713' : '2'}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Vendor Profile</Text>
                <Text style={styles.stepSub}>Complete the vendor qualification survey</Text>
              </View>
              {journey?.vendor_survey_completed ? (
                <Icon name="check-circle" size={20} color={colors.statusSuccess} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (journey.has_vendor || registered) {
    return (
      <View style={styles.root}>
        <AppHeader title="Vendor Actions" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="check-circle" size={56} color={colors.statusSuccess} />
          <Text style={styles.centerTitle}>You have a registered e-Store</Text>
          <Text style={styles.centerSub}>
            {status?.vendor?.shop_name
              ? `Your store "${status.vendor.shop_name}" is active on JEMINA.`
              : 'Your vendor account has been created successfully.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Vendor Actions" showBack onBack={goBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        {!journey.account_active ? (
          <View style={styles.warningCard}>
            <Icon name="error-outline" size={20} color={colors.statusFlash} />
            <Text style={styles.warningText}>
              Your account is not active yet. Please contact support to activate your account before creating an
              e-Store.
            </Text>
          </View>
        ) : null}

        {!accepted ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Vendor Agreement</Text>
            <Text style={styles.cardText}>
              Review and accept the JEMINA Vendor Agreement to proceed with e-Store registration.
            </Text>
            <Button label="View Vendor Agreement" variant="primary" fullWidth onPress={openAgreement} style={styles.cardBtn} />
          </View>
        ) : (
          <View style={[styles.card, styles.cardDone]}>
            <View style={styles.cardDoneHeader}>
              <Icon name="check-circle" size={20} color={colors.statusSuccess} />
              <Text style={styles.cardTitle}>1. Vendor Agreement</Text>
            </View>
            <Text style={styles.cardText}>Agreement accepted. You can now register your e-Store.</Text>
          </View>
        )}

        <View style={[styles.card, !accepted && styles.cardMuted]}>
          <Text style={styles.cardTitle}>2. Register Your e-Store</Text>
          <Text style={styles.cardText}>No credit card required. Setup in 2 minutes.</Text>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={[styles.input, !accepted && styles.inputMuted]}
            value={form.shop_name}
            onChangeText={t => setForm(f => ({ ...f, shop_name: t }))}
            placeholder="e.g. Kampala Crafts"
            placeholderTextColor={colors.outline}
            editable={accepted}
          />
          <Text style={styles.label}>Owner Name</Text>
          <TextInput
            style={[styles.input, !accepted && styles.inputMuted]}
            value={form.shop_owner}
            onChangeText={t => setForm(f => ({ ...f, shop_owner: t }))}
            placeholder="Full name"
            placeholderTextColor={colors.outline}
            editable={accepted}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Business Email</Text>
          <TextInput
            style={[styles.input, !accepted && styles.inputMuted]}
            value={form.shop_email}
            onChangeText={t => setForm(f => ({ ...f, shop_email: t }))}
            placeholder="you@business.com"
            placeholderTextColor={colors.outline}
            editable={accepted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, !accepted && styles.inputMuted]}
            value={form.shop_phone}
            onChangeText={t => setForm(f => ({ ...f, shop_phone: t }))}
            placeholder="+256..."
            placeholderTextColor={colors.outline}
            editable={accepted}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.payRow}>
            {['Momo', 'Visa', '$BTC'].map(method => (
              <Pressable
                key={method}
                style={[styles.payChip, accepted && form.pay_method === method && styles.payChipOn]}
                onPress={() => accepted && setForm(f => ({ ...f, pay_method: method }))}
              >
                <Text style={[styles.payChipText, accepted && form.pay_method === method && styles.payChipTextOn]}>
                  {method}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.checkboxRow} onPress={() => accepted && setForm(f => ({ ...f, terms: !f.terms }))}>
            <View style={[styles.checkbox, accepted && form.terms && styles.checkboxOn]}>
              {accepted && form.terms ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
            </View>
            <Text style={styles.checkboxLabel}>I accept the terms and conditions</Text>
          </Pressable>
          <Button
            label={saving ? 'Registering...' : 'Register e-Store'}
            variant="primary"
            fullWidth
            onPress={submitStore}
            style={styles.cardBtn}
          />
        </View>
      </ScrollView>

      {showAgreement && agreement ? (
        <KeyboardAvoidingView style={styles.agreementOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.agreementSheet}>
            <View style={styles.agreementHeader}>
              <View style={styles.agreementHeaderTitle}>
                <Icon name="gavel" size={20} color={colors.primary} />
                <Text style={styles.agreementTitle}>{agreement.title}</Text>
              </View>
              <Pressable onPress={() => setShowAgreement(false)} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView style={styles.agreementScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.agreementMeta}>Last Updated: {agreement.last_updated}</Text>
              <View style={styles.noticeCard}>
                <Icon name="info" size={18} color={colors.secondary} />
                <Text style={styles.noticeText}>{agreement.notice}</Text>
              </View>
              {agreement.sections.map((section, si) => (
                <View key={si} style={styles.agreementSection}>
                  <Text style={styles.agreementSectionHeading}>{section.heading}</Text>
                  {section.blocks.map((block, bi) => {
                    if (block.type === 'subheading') {
                      return (
                        <Text key={bi} style={styles.agreementSubheading}>
                          {block.text}
                        </Text>
                      );
                    }
                    if (block.type === 'list') {
                      return (
                        <View key={bi}>
                          {block.items.map((item, ii) => (
                            <View key={ii} style={styles.agreementBulletRow}>
                              <Text style={styles.agreementBulletDot}>•</Text>
                              <Text style={styles.agreementBulletText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    }
                    return (
                      <Text key={bi} style={styles.agreementParagraph}>
                        {block.text}
                      </Text>
                    );
                  })}
                </View>
              ))}
              <View style={styles.acceptanceCard}>
                <Icon name="check-circle" size={18} color={colors.statusSuccess} />
                <Text style={styles.acceptanceText}>{agreement.acceptance}</Text>
              </View>
            </ScrollView>
            <Button
              label={agreementLoading ? 'Accepting...' : 'Accept Agreement'}
              variant="primary"
              fullWidth
              onPress={acceptAgreement}
              style={styles.agreementAcceptBtn}
            />
          </View>
        </KeyboardAvoidingView>
      ) : null}
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
  },
  centerBtn: {
    width: '100%',
    marginTop: spacing.lg,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardDone: {
    borderColor: colors.statusSuccess,
  },
  cardMuted: {
    opacity: 0.6,
  },
  cardDoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  cardText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  cardBtn: {
    marginTop: spacing.md,
  },
  lockedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  lockedIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  lockedBody: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.statusSuccess,
  },
  stepDotText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  stepSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
  },
  inputMuted: {
    color: colors.outlineVariant,
  },
  payRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  payChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  payChipOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  payChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  payChipTextOn: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  checkboxLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  formError: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  agreementOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  agreementSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  agreementHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  agreementTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  agreementScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  agreementMeta: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  agreementSection: {
    marginBottom: spacing.lg,
  },
  agreementSectionHeading: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  agreementSubheading: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  agreementParagraph: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  agreementBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  agreementBulletDot: {
    ...typography.bodyMd,
    color: colors.secondary,
    marginTop: 1,
  },
  agreementBulletText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  acceptanceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  acceptanceText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  agreementAcceptBtn: {
    marginTop: spacing.sm,
  },
});