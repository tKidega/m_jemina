import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetPaymentMethods,
  apiSavePaymentMethod,
  apiUpdatePaymentMethod,
  apiDeletePaymentMethod,
  apiGetAcceptedPaymentMethods,
  apiGetCreditBalance,
  ApiAcceptedPaymentMethod,
  ApiPaymentMethod,
  ApiPaymentMethodType,
} from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const TYPE_OPTIONS: { id: ApiPaymentMethodType; label: string; icon: IconName }[] = [
  { id: 'card', label: 'Card', icon: 'credit-card' },
  { id: 'mobile_money', label: 'Mobile Money', icon: 'smartphone' },
  { id: 'cloud_pay', label: 'Cloud Pay', icon: 'account-balance-wallet' },
];

const PROVIDERS: Record<ApiPaymentMethodType, { id: string; label: string }[]> = {
  card: [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
  ],
  mobile_money: [
    { id: 'mtn', label: 'MTN Mobile Money' },
    { id: 'airtel', label: 'Airtel Money' },
  ],
  cloud_pay: [
    { id: 'stripe', label: 'Stripe' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'flutterwave', label: 'Flutterwave' },
  ],
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  mtn: { bg: '#ffcc00', text: '#000000', short: 'MTN' },
  airtel: { bg: '#ff0000', text: '#ffffff', short: 'AIR' },
  visa: { bg: '#1a1f71', text: '#ffffff', short: 'VISA' },
  mastercard: { bg: '#eb001b', text: '#ffffff', short: 'MC' },
  stripe: { bg: '#635bff', text: '#ffffff', short: 'STR' },
  paypal: { bg: '#003087', text: '#ffffff', short: 'PP' },
  flutterwave: { bg: '#f5a623', text: '#ffffff', short: 'FLW' },
};

function accountLabel(type: ApiPaymentMethodType): string {
  if (type === 'card') return 'Card Number';
  if (type === 'mobile_money') return 'Phone Number';
  return 'Email Address';
}

function accountPlaceholder(type: ApiPaymentMethodType): string {
  if (type === 'card') return '0000 0000 0000 0000';
  if (type === 'mobile_money') return 'e.g. 0770000000';
  return 'name@example.com';
}

function maskedAccount(method: ApiPaymentMethod): string {
  if (method.type === 'card') {
    const last4 = method.account_number.slice(-4);
    return `•••• ${last4}`;
  }
  return method.account_number;
}

function typeLabel(type: ApiPaymentMethodType): string {
  if (type === 'card') return 'Card';
  if (type === 'mobile_money') return 'Mobile Money';
  return 'Cloud Pay';
}

interface MethodForm {
  type: ApiPaymentMethodType;
  provider: string;
  account_number: string;
  expiry_date: string;
  account_name: string;
  is_default: boolean;
}

function emptyForm(): MethodForm {
  return {
    type: 'card',
    provider: 'visa',
    account_number: '',
    expiry_date: '',
    account_name: '',
    is_default: false,
  };
}

/* ─── JEMINA Credits Box ─────────────────────────────── */

function CreditsBox({ token }: { token: string | null }) {
  const { navigate } = useNavigation();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    apiGetCreditBalance(token)
      .then(data => {
        if (mounted) setBalance(data.balance);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <View style={styles.creditsBox}>
      <View style={styles.creditsTop}>
        <View>
          <Text style={styles.creditsLabel}>JEMINA B2B Credit Balance</Text>
          <Text style={styles.creditsAmount}>
            {balance == null ? 'UGX —' : formatUGX(balance)}
          </Text>
        </View>
      </View>
      <View style={styles.creditsDivider} />
      <View style={styles.creditsFooter}>
        <Text style={styles.creditsFooterLabel}>Automatic Escrow Clearance</Text>
        <Text style={styles.creditsFooterValue}>Enabled</Text>
      </View>
      <Pressable
        style={styles.creditHistoryBtn}
        onPress={() => navigate('CreditHistory')}
        hitSlop={8}
      >
        <Text style={styles.creditHistoryText}>Credit History</Text>
        <Icon name="chevron-right" size={16} color={colors.primaryFixedDim} />
      </Pressable>
    </View>
  );
}

/* ─── Payment Method Card ────────────────────────────── */

function MethodCard({
  method,
  onEdit,
  onDelete,
}: {
  method: ApiPaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pc = PROVIDER_COLORS[method.provider] ?? {
    bg: colors.surfaceContainerHigh,
    text: colors.onSurface,
    short: method.provider.slice(0, 3).toUpperCase(),
  };

  return (
    <View style={styles.methodCard}>
      <View style={styles.methodLeft}>
        <View style={[styles.methodLogo, { backgroundColor: pc.bg }]}>
          <Text style={[styles.methodLogoText, { color: pc.text }]}>{pc.short}</Text>
        </View>
        <View style={styles.methodInfo}>
          <View style={styles.methodNameRow}>
            <Text style={styles.methodName}>
              {method.provider.charAt(0).toUpperCase() + method.provider.slice(1)}
            </Text>
            {method.is_default ? (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.methodAccount}>{maskedAccount(method)}</Text>
          {method.expiry_date ? (
            <Text style={styles.methodExpiry}>Expires {method.expiry_date}</Text>
          ) : null}
          <Text style={styles.methodNote}>
            {method.is_default
              ? 'Default for Escrow Payouts & USSD Push'
              : typeLabel(method.type)}
          </Text>
        </View>
      </View>
      <View style={styles.methodRight}>
        {method.is_default ? (
          <Icon name="check-circle" size={22} color={colors.statusSuccess} />
        ) : (
          <View style={styles.methodActions}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.methodActionBtn}>
              <Icon name="edit" size={18} color={colors.outline} />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.methodActionBtn}>
              <Icon name="delete-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/* ─── Main Screen ────────────────────────────────────── */

export function PaymentMethodsScreen({ embedded = false }: { embedded?: boolean }) {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [methods, setMethods] = useState<ApiPaymentMethod[]>([]);
  const [accepted, setAccepted] = useState<ApiAcceptedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPaymentMethod | null>(null);
  const [form, setForm] = useState<MethodForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGetPaymentMethods(token);
        setMethods(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load payment methods.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    apiGetAcceptedPaymentMethods(token)
      .then(setAccepted)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => load(true), [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (method: ApiPaymentMethod) => {
    setEditing(method);
    setForm({
      type: method.type,
      provider: method.provider,
      account_number: method.account_number ?? '',
      expiry_date: method.expiry_date ?? '',
      account_name: method.account_name ?? '',
      is_default: method.is_default,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const changeType = (type: ApiPaymentMethodType) => {
    const providers = PROVIDERS[type];
    setForm(f => ({ ...f, type, provider: providers[0]?.id ?? '' }));
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.account_number.trim()) {
      setFormError('Please enter the account details.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        type: form.type,
        provider: form.provider,
        account_number: form.account_number.trim(),
        expiry_date: form.expiry_date.trim() || undefined,
        account_name: form.account_name.trim() || undefined,
        ...(editing ? { is_default: form.is_default } : {}),
      };
      if (editing) {
        await apiUpdatePaymentMethod(token, editing.id, payload);
      } else {
        await apiSavePaymentMethod(token, payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save payment method.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (method: ApiPaymentMethod) => {
    if (!token) return;
    try {
      await apiDeletePaymentMethod(token, method.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete payment method.');
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        {!embedded ? <AppHeader title="Payment Methods" showBack onBack={goBack} /> : null}
        <EmptyState
          icon="credit-card"
          title="Sign in to manage payment methods"
          subtitle="Save a card or mobile money number for faster checkout after signing in."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!embedded ? <AppHeader title="Payment Methods" showBack onBack={goBack} /> : null}
      {loading ? (
        <SectionLoader text="Loading payment methods..." icon="credit-card" />
      ) : error ? (
        <EmptyState
          icon="error-outline"
          title="Couldn't load payment methods"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => load()}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
          }
        >
          {/* JEMINA Credits Box */}
          <CreditsBox token={token} />

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIcon}>
                <Icon name="account-balance-wallet" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
            </View>
            <Text style={styles.methodCount}>
              {methods.length} {methods.length === 1 ? 'method' : 'methods'}
            </Text>
          </View>

          {/* Payment Method Cards */}
          {methods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="account-balance-wallet" size={40} color={colors.outline} />
              <Text style={styles.emptyTitle}>No payment methods saved</Text>
              <Text style={styles.emptySub}>
                Add a credit card, mobile money number, or Cloud Pay account for faster checkout.
              </Text>
            </View>
          ) : (
            methods.map(method => (
              <MethodCard
                key={method.id}
                method={method}
                onEdit={() => openEdit(method)}
                onDelete={() => handleDelete(method)}
              />
            ))
          )}

          {/* Add Payment Button */}
          <Pressable style={styles.addPaymentBtn} onPress={openCreate}>
            <Icon name="add" size={18} color={colors.primaryContainer} />
            <Text style={styles.addPaymentText}>Add Mobile Money / Card</Text>
          </Pressable>

          {/* Accepted payment methods */}
          {accepted.length > 0 ? (
<View style={styles.acceptedBox}>
              <Text style={styles.acceptedTitle}>All accepted payment methods</Text>
              <Text style={styles.acceptedSub}>
                Jemina accepts the methods below at checkout. Saving a payment rail makes checkout faster - your
                default is pre-selected and your other saved rails stay one tap away.
              </Text>
              {accepted.length > 0 ? (
                accepted.map(m => (
                  <View key={m.key} style={styles.acceptedRow}>
                    <View style={styles.acceptedDot} />
                    <View style={styles.acceptedInfo}>
                      <Text style={styles.acceptedName}>{m.label}</Text>
                      {m.gateways && m.gateways.length > 0 ? (
                        <Text style={styles.acceptedMeta}>{m.gateways.join(', ')}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.acceptedEmpty}>
                  <Icon name="credit-card" size={22} color={colors.outline} />
                  <Text style={styles.acceptedEmptyText}>No system payment methods available right now.</Text>
                </View>
              )}
            </View>
        ) : null}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit Payment Method' : 'Add Payment Method'}
              </Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Text style={styles.label}>Payment Type</Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map(option => {
                  const active = form.type === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => changeType(option.id)}
                    >
                      <Icon
                        name={option.icon}
                        size={16}
                        color={active ? colors.onSecondary : colors.primary}
                      />
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Provider</Text>
              <View style={styles.providerRow}>
                {PROVIDERS[form.type].map(provider => {
                  const active = form.provider === provider.id;
                  return (
                    <Pressable
                      key={provider.id}
                      style={[styles.providerChip, active && styles.providerChipActive]}
                      onPress={() => setForm(f => ({ ...f, provider: provider.id }))}
                    >
                      <Text
                        style={[styles.providerChipText, active && styles.providerChipTextActive]}
                      >
                        {provider.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{accountLabel(form.type)}</Text>
              <TextInput
                style={styles.input}
                value={form.account_number}
                onChangeText={t => setForm(f => ({ ...f, account_number: t }))}
                placeholder={accountPlaceholder(form.type)}
                placeholderTextColor={colors.outline}
                keyboardType={
                  form.type === 'mobile_money'
                    ? 'phone-pad'
                    : form.type === 'cloud_pay'
                      ? 'email-address'
                      : 'default'
                }
                autoCapitalize="none"
                autoCorrect={false}
              />

              {form.type === 'card' ? (
                <>
                  <Text style={styles.label}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    value={form.expiry_date}
                    onChangeText={t => setForm(f => ({ ...f, expiry_date: t }))}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.label}>Name on Account</Text>
                  <TextInput
                    style={styles.input}
                    value={form.account_name}
                    onChangeText={t => setForm(f => ({ ...f, account_name: t }))}
                    placeholder="Optional"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="words"
                  />
                </>
              ) : null}

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
              >
                <View style={[styles.checkbox, form.is_default && styles.checkboxOn]}>
                  {form.is_default ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Set as default payment method</Text>
              </Pressable>

              <Button
                label={saving ? 'Saving...' : 'Save Method'}
                variant="primary"
                fullWidth
                onPress={handleSave}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  loadingText: { ...typography.bodyMd, color: colors.outline },

  /* Credits Box */
  creditsBox: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  creditsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditsLabel: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditsAmount: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  creditsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.sm,
  },
  creditsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsFooterLabel: { ...typography.bodySm, color: colors.primaryFixedDim },
  creditsFooterValue: { ...typography.bodySm, color: colors.white, fontWeight: '600' },
  creditHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: spacing.sm,
  },
  creditHistoryText: {
    ...typography.bodySm,
    color: colors.primaryFixedDim,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' },
  methodCount: { ...typography.labelSm, color: colors.outline },

  /* Empty Card */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: 8,
  },
  emptyTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  emptySub: { ...typography.bodySm, color: colors.outline, textAlign: 'center' },

  /* Method Card */
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  methodLogo: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLogoText: { ...typography.labelSm, fontWeight: '800' },
  methodInfo: { flex: 1 },
  methodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  methodName: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  primaryBadge: {
    backgroundColor: '#333e48',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  primaryBadgeText: { ...typography.labelSm, color: colors.white, fontWeight: '700', fontSize: 9 },
  methodAccount: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  methodExpiry: { ...typography.bodySm, color: colors.outline, marginTop: 1 },
  methodNote: { ...typography.labelSm, color: colors.secondary, fontWeight: '500', marginTop: 2 },
  methodRight: { marginLeft: 8 },
  methodActions: { flexDirection: 'row', gap: 4 },
  methodActionBtn: { padding: 4 },

  /* Add Payment Button */
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  addPaymentText: { ...typography.labelLg, color: colors.primaryContainer, fontWeight: '600' },

  /* Accepted Payment Methods Info */
  acceptedBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  acceptedTitle: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700' },
  acceptedSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 },
  acceptedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  acceptedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  acceptedInfo: { flex: 1 },
  acceptedName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  acceptedMeta: { ...typography.bodySm, color: colors.outline, textTransform: 'capitalize' },
  acceptedEmpty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  acceptedEmptyText: { ...typography.bodySm, color: colors.outline, textAlign: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '700' },
  label: { ...typography.labelLg, color: colors.onSurface, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  typeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  typeChipText: { ...typography.labelLg, color: colors.onSurface },
  typeChipTextActive: { color: colors.onSecondary },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  providerChipActive: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  providerChipText: { ...typography.labelLg, color: colors.onSurface },
  providerChipTextActive: { color: colors.onSecondary },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  checkboxLabel: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  formError: { ...typography.bodyMd, color: colors.error, marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.xl },
});
