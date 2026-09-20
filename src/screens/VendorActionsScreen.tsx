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
import { PinManageModal } from '../components/PinManageModal';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetVendorActionsStatus,
  apiGetVendorAgreement,
  apiAcceptVendorAgreement,
  apiCreateVendorStore,
  apiGetPinStatus,
  apiSetPin,
  ApiVendorActionsStatus,
  ApiVendorAgreement,
  ApiAgreementSection,
} from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface StoreForm {
  shop_name: string;
  shop_owner: string;
  shop_email: string;
  shop_phone: string;
  rail: string;
  vendor_type: string;
  pay_method: string;
  hub: string;
  terms: boolean;
}

const EMPTY_FORM: StoreForm = {
  shop_name: '',
  shop_owner: '',
  shop_email: '',
  shop_phone: '',
  rail: 'MTN MoMo',
  vendor_type: 'local',
  pay_method: 'Momo',
  hub: 'Gulu Central Depot (Layibi Aggregation Yard)',
  terms: false,
};

const HUBS = [
  'Gulu Central Depot (Layibi Aggregation Yard)',
  'Lira Main Depot (Railway Quarters Hub)',
  'Arua Border Hub (West Nile Aggregation)',
  'Kitgum Grain Terminal',
  'Soroti Silo Distribution Center',
  'Kampala Central Depots',
];

const VENDOR_TYPES = [
  { value: 'local', label: 'Local', note: 'Buy & sell within your region' },
  { value: 'national', label: 'National', note: 'Regional distribution nationwide' },
  { value: 'international', label: 'International', note: 'Cross-border bulk trading' },
];

const VENDOR_SUPPORT_EMAIL = 'support@jemi-na.com';
const VENDOR_SUPPORT_PHONE = '+256 765 369 348';

function withCorrectContact(section: ApiAgreementSection): ApiAgreementSection {
  const fixText = (text: string) =>
    text
      .replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, VENDOR_SUPPORT_EMAIL)
      .replace(/\+256(?:[\s-]?\d){9}/g, VENDOR_SUPPORT_PHONE)
      .replace(/\+256[\s-]*X{5,}/gi, VENDOR_SUPPORT_PHONE);
  return {
    ...section,
    blocks: section.blocks.map(block => {
      if (block.type === 'list') {
        return { ...block, items: block.items.map(fixText) };
      }
      return { ...block, text: fixText(block.text) };
    }),
  };
}

function applyContactCorrections(sections: ApiAgreementSection[]): ApiAgreementSection[] {
  let target = -1;
  if (sections.length >= 20 && /20|contact/i.test(sections[19].heading)) {
    target = 19;
  } else {
    target = sections.findIndex(s => /contact|support/i.test(s.heading));
  }
  if (target < 0) {
    return sections;
  }
  return sections.map((s, i) => (i === target ? withCorrectContact(s) : s));
}

export function VendorActionsScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [step, setStep] = useState<1 | 2>(1);
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
  const [pinSet, setPinSet] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinManage, setShowPinManage] = useState(false);

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
        const [data, pin] = await Promise.all([
          apiGetVendorActionsStatus(token),
          apiGetPinStatus(token).catch(() => null),
        ]);
        setStatus(data);
        setAccepted(data.journey.agreement_accepted);
        setPinSet(!!pin?.pin_set);
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
      setAgreement({ ...data, sections: applyContactCorrections(data.sections) });
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
      Alert.alert('Agreement accepted', 'You can now register your vendor account.');
    } catch (e) {
      Alert.alert('Could not accept agreement', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAgreementLoading(false);
    }
  };

  const submitStep1 = () => {
    if (!form.shop_owner.trim() || !form.shop_name.trim() || !form.shop_email.trim() || !form.shop_phone.trim()) {
      setFormError('Full legal name, business name, business email and mobile money number are required.');
      return;
    }
    if (!form.terms) {
      setFormError('You must agree to the JEMINA Escrow Mandates & BOU Regulatory terms.');
      return;
    }
    setFormError(null);
    setStep(2);
  };

  const submitStep2 = async () => {
    if (!token) {
      return;
    }
    if (!pinSet && (newPin.length !== 4 || confirmPin.length !== 4)) {
      setFormError('Create and confirm your 4-digit JEMINA Trade PIN.');
      return;
    }
    if (!pinSet && newPin !== confirmPin) {
      setFormError('PINs do not match.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      // 1) Create the JEMINA Trade PIN (only if the user doesn't already have one).
      if (!pinSet) {
        await apiSetPin(token, newPin);
        setPinSet(true);
      }
      // 2) Register the vendor store.
      await apiCreateVendorStore(token, {
        shop_name: form.shop_name.trim(),
        shop_owner: form.shop_owner.trim(),
        shop_email: form.shop_email.trim(),
        shop_phone: form.shop_phone.trim(),
        vendor_type: form.vendor_type,
        pay_method: form.pay_method,
        terms: form.terms,
      });
      setRegistered(true);
      setForm(EMPTY_FORM);
      setNewPin('');
      setConfirmPin('');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to register your vendor account.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Trader Signup" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="storefront" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to register as a trader</Text>
          <Text style={styles.centerSub}>Create a verified vendor account on the JEMINA marketplace.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <AppHeader title="Trader Signup" showBack onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading trader signup...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <AppHeader title="Trader Signup" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load trader signup</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => load()} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  const journey = status?.journey;

  if (!journey) {
    return (
      <View style={styles.root}>
        <AppHeader title="Trader Signup" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load trader signup</Text>
          <Text style={styles.centerSub}>Please try again.</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => load()} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  if (journey.has_vendor || registered) {
    return (
      <View style={styles.root}>
        <AppHeader title="Trader Signup" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="check-circle" size={56} color={colors.statusSuccess} />
          <Text style={styles.centerTitle}>Vendor account created</Text>
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
      <AppHeader title="Trader Signup" showBack onBack={goBack} />
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
              Your account is not active yet. Please contact support to activate your account before creating your
              vendor account.
            </Text>
          </View>
        ) : null}

        {/* Brand hero */}
        <View style={styles.hero}>
          <View style={styles.shieldRow}>
            <Icon name="verified-user" size={14} color={colors.statusSuccess} />
            <Text style={styles.bouBadge}>ESCROW SECURE</Text>
          </View>
          <Text style={styles.brandTitle}>JEMINA</Text>
          <Text style={styles.brandSub}>TRADER SIGNUP</Text>
          {step === 1 ? (
            <>
              <Text style={styles.stepBadge}>Step 1 of 2: Profile & Phone</Text>
              <Text style={styles.title}>Create Trader Account</Text>
              <Text style={styles.subtitle}>
                Join Northern Uganda's verified agricultural marketplace and trade escrow network.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.stepBadge}>Step 2 of 2: Business & Escrow Verification</Text>
              <Text style={styles.title}>Trader Verification & Setup</Text>
              <Text style={styles.subtitle}>
                Complete your business profile and mobile money wallet setup for verified regional escrow trading.
              </Text>
            </>
          )}
          {/* Progress */}
          <View style={styles.progressRow}>
            {[1, 2].map(s => (
              <View key={s} style={[styles.progressDot, step >= s && styles.progressDotOn]} />
            ))}
          </View>
        </View>

        {!accepted ? (
          <View style={styles.agreementGate}>
            <Icon name="gavel" size={22} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.agreementGateTitle}>Vendor Agreement Required</Text>
              <Text style={styles.agreementGateText}>Review and accept the JEMINA Vendor Agreement to continue.</Text>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.form}>
            {/* Trader category */}
            <Text style={styles.sectionLabel}>
              Select Trader Category <Text style={styles.required}>REQUIRED</Text>
            </Text>
            {VENDOR_TYPES.map(t => (
              <Pressable
                key={t.value}
                style={[styles.selectCard, form.vendor_type === t.value && styles.selectCardOn]}
                onPress={() => setForm(f => ({ ...f, vendor_type: t.value }))}
              >
                <Icon
                  name={form.vendor_type === t.value ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={form.vendor_type === t.value ? colors.secondary : colors.outline}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectLabel}>{t.label}</Text>
                  <Text style={styles.selectNote}>{t.note}</Text>
                </View>
              </Pressable>
            ))}

            <Text style={styles.label}>Full Legal Name or Registered Business</Text>
            <View style={styles.inputWrap}>
              <Icon name="person" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={form.shop_owner}
                onChangeText={t => setForm(f => ({ ...f, shop_owner: t }))}
                placeholder="Must match your National ID (NIN) or URSB registration"
                placeholderTextColor={colors.outline}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Business Name</Text>
            <View style={styles.inputWrap}>
              <Icon name="storefront" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={form.shop_name}
                onChangeText={t => setForm(f => ({ ...f, shop_name: t }))}
                placeholder="e.g. Gulu Grain Traders Ltd"
                placeholderTextColor={colors.outline}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Business Email</Text>
            <View style={styles.inputWrap}>
              <Icon name="email" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={form.shop_email}
                onChangeText={t => setForm(f => ({ ...f, shop_email: t }))}
                placeholder="you@business.com"
                placeholderTextColor={colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Registered Mobile Money Number (Uganda)</Text>
            <View style={styles.inputWrap}>
              <Icon name="smartphone" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={form.shop_phone}
                onChangeText={t => setForm(f => ({ ...f, shop_phone: t }))}
                placeholder="+256 7•• ••• •••"
                placeholderTextColor={colors.outline}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.railRow}>
              {['MTN MoMo', 'Airtel Money'].map(rail => (
                <Pressable
                  key={rail}
                  style={[styles.railChip, form.rail === rail && styles.railChipOn]}
                  onPress={() => setForm(f => ({ ...f, rail, pay_method: 'Momo' }))}
                >
                  <Text style={[styles.railChipText, form.rail === rail && styles.railChipTextOn]}>{rail}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Primary Regional Trade Depot / Hub</Text>
            <View style={styles.hubSelect}>
              <Icon name="location-on" size={18} color={colors.secondary} />
              <Text style={styles.hubText}>{form.hub}</Text>
              <Icon name="expand-more" size={18} color={colors.outline} />
            </View>
            <View style={styles.hubList}>
              {HUBS.filter(h => h !== form.hub).map(h => (
                <Pressable key={h} style={styles.hubRow} onPress={() => setForm(f => ({ ...f, hub: h }))}>
                  <Text style={styles.hubOption}>{h}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.checkboxRow} onPress={() => setForm(f => ({ ...f, terms: !f.terms }))}>
              <View style={[styles.checkbox, form.terms && styles.checkboxOn]}>
                {form.terms ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the JEMINA Escrow Mandates & Bank of Uganda (BOU) Regulatory Sandbox Custodial Terms.
              </Text>
            </Pressable>

            {!accepted ? (
              <Button label="View Vendor Agreement First" variant="outline" fullWidth onPress={openAgreement} style={styles.cardBtn} />
            ) : null}
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Button label="Continue & Verify" variant="primary" icon="arrow-forward" fullWidth onPress={submitStep1} style={styles.cardBtn} />
          </View>
        ) : (
          <View style={styles.form}>
            {/* Confirmation summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Business</Text>
                <Text style={styles.summaryValue}>{form.shop_name}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Depot / Hub</Text>
                <Text style={styles.summaryValue}>{form.hub}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mobile Money</Text>
                <Text style={styles.summaryValue}>{form.rail} · {form.shop_phone || '+256 •••'}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Assigned Escrow Officer</Text>
                <Text style={styles.summaryValue}>JEMINA Desk Gulu #04</Text>
              </View>
            </View>

            <Text style={styles.label}>Registered Mobile Money Number (SIM-Locked)</Text>
            <View style={styles.inputWrap}>
              <Icon name="smartphone" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={form.shop_phone}
                onChangeText={t => setForm(f => ({ ...f, shop_phone: t }))}
                placeholder="+256 7•• ••• •••"
                placeholderTextColor={colors.outline}
                keyboardType="phone-pad"
              />
            </View>

            {/* JEMINA Trade PIN — unified with the wallet / escrow PIN */}
            {pinSet ? (
              <View style={styles.pinActiveCard}>
                <Icon name="verified" size={20} color={colors.statusSuccess} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinActiveTitle}>JEMINA Trade PIN Active</Text>
                  <Text style={styles.pinActiveText}>
                    Your 4-digit trade PIN is already set and shared with escrow & auto-reload. You can manage or change
                    it anytime.
                  </Text>
                </View>
                <Pressable onPress={() => setShowPinManage(true)} hitSlop={8} style={styles.managePinBtn}>
                  <Icon name="settings" size={18} color={colors.secondary} />
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Create 4-Digit Escrow PIN</Text>
                <Text style={styles.pinHint}>Authorizes bulk buy payouts & batch releases. Same PIN secures your JEMINA wallet & auto-reload.</Text>
                <View style={styles.inputWrap}>
                  <Icon name="lock" size={20} color={colors.outline} />
                  <TextInput
                    style={styles.input}
                    value={newPin}
                    onChangeText={t => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="New Escrow PIN"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={4}
                  />
                  <Pressable onPress={() => setShowPin(v => !v)} hitSlop={8}>
                    <Icon name={showPin ? 'visibility-off' : 'visibility'} size={20} color={colors.outline} />
                  </Pressable>
                </View>
                <View style={styles.inputWrap}>
                  <Icon name="lock" size={20} color={colors.outline} />
                  <TextInput
                    style={styles.input}
                    value={confirmPin}
                    onChangeText={t => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Confirm PIN"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={4}
                  />
                </View>
              </>
            )}

            <Pressable style={styles.checkboxRow} onPress={() => setShowPinManage(true)}>
              <Text style={styles.manageHint}>
                Already have a JEMINA Trade PIN? <Text style={styles.manageHintLink}>Set / manage it here</Text>
              </Text>
            </Pressable>

            <Pressable style={styles.checkboxRow} onPress={() => setForm(f => ({ ...f, terms: !f.terms }))}>
              <View style={[styles.checkbox, form.terms && styles.checkboxOn]}>
                {form.terms ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the JEMINA Escrow Mandates & BOU Regulatory Sandbox Custodial Terms. Authorize automated URA
                EFRIS electronic tax receipts for bulk settlements.
              </Text>
            </Pressable>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.btnRow}>
              <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
                <Icon name="arrow-back" size={18} color={colors.onSurface} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  label={saving ? 'Registering...' : 'Complete Registration & Verify via OTP'}
                  variant="primary"
                  icon="arrow-forward"
                  fullWidth
                  onPress={submitStep2}
                  style={styles.cardBtn}
                />
              </View>
            </View>
          </View>
        )}
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

      <PinManageModal visible={showPinManage} onClose={() => { setShowPinManage(false); load(true); }} />
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
    paddingHorizontal: spacing.sm + 2,
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
  hero: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  bouBadge: {
    ...typography.labelSm,
    color: '#065f46',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  brandTitle: {
    ...typography.displayLgMobile,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  brandSub: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 2,
    textAlign: 'center',
  },
  stepBadge: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
    lineHeight: 19,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.outlineVariant,
  },
  progressDotOn: {
    backgroundColor: colors.secondary,
  },
  agreementGate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  agreementGateTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  agreementGateText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  form: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  required: {
    color: colors.statusFlash,
    fontSize: 10,
    fontWeight: '700',
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  selectCardOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.surfaceContainerLow,
  },
  selectLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  selectNote: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
    lineHeight: 15,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.md,
  },
  railRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  railChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  railChipOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  railChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  railChipTextOn: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  hubSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceContainerLow,
  },
  hubText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  hubList: {
    marginTop: spacing.xs,
    gap: 2,
  },
  hubRow: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  hubOption: {
    ...typography.bodyMd,
    color: colors.secondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    lineHeight: 19,
  },
  cardBtn: {
    marginTop: spacing.md,
  },
  formError: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  summaryLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },
  pinActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: colors.statusSuccess,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  pinActiveTitle: {
    ...typography.labelMd,
    color: '#065f46',
    fontWeight: '700',
  },
  pinActiveText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  managePinBtn: {
    padding: spacing.xs,
  },
  pinHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  manageHint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  manageHintLink: {
    color: colors.secondary,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
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