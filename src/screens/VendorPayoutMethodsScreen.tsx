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
  apiGetVendorPayoutMethods,
  apiCreateVendorPayoutMethod,
  apiUpdateVendorPayoutMethod,
  apiDeleteVendorPayoutMethod,
  ApiVendorPayoutMethod,
  ApiVendorPayoutMethodType,
} from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const TYPE_OPTIONS: { id: ApiVendorPayoutMethodType; label: string; icon: IconName }[] = [
  { id: 'mobile_money', label: 'Mobile Money', icon: 'smartphone' },
  { id: 'bank_account', label: 'Bank', icon: 'savings' },
  { id: 'credit_card', label: 'Card', icon: 'credit-card' },
  { id: 'bitcoin', label: 'Bitcoin', icon: 'currency-bitcoin' },
];

const PROVIDERS: Record<ApiVendorPayoutMethodType, { id: string; label: string }[]> = {
  mobile_money: [
    { id: 'mtn', label: 'MTN Mobile Money' },
    { id: 'airtel', label: 'Airtel Money' },
  ],
  bank_account: [
    { id: 'stanbic', label: 'Stanbic' },
    { id: 'absa', label: 'Absa' },
    { id: 'equity', label: 'Equity' },
    { id: 'centenary', label: 'Centenary' },
    { id: 'dfcu', label: 'DFCU' },
    { id: 'other', label: 'Other' },
  ],
  credit_card: [
    { id: 'mtn_virtual', label: 'MTN Virtual' },
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
  ],
  bitcoin: [{ id: 'onchain', label: 'On-chain' }],
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string; short: string }> = {
  mtn: { bg: '#ffcc00', text: '#000000', short: 'MTN' },
  airtel: { bg: '#ff0000', text: '#ffffff', short: 'AIR' },
  mtn_virtual: { bg: '#ffcc00', text: '#000000', short: 'MTN' },
  visa: { bg: '#1a1f71', text: '#ffffff', short: 'VISA' },
  mastercard: { bg: '#eb001b', text: '#ffffff', short: 'MC' },
  stanbic: { bg: '#0033a0', text: '#ffffff', short: 'SB' },
  absa: { bg: '#00549f', text: '#ffffff', short: 'AB' },
  equity: { bg: '#00a54f', text: '#ffffff', short: 'EQ' },
  centenary: { bg: '#006f44', text: '#ffffff', short: 'CT' },
  dfcu: { bg: '#7a1f2b', text: '#ffffff', short: 'DF' },
  other: { bg: '#5f6368', text: '#ffffff', short: 'BNK' },
  onchain: { bg: '#f7931a', text: '#ffffff', short: 'BTC' },
};

function typeLabel(type: ApiVendorPayoutMethodType): string {
  if (type === 'mobile_money') return 'Mobile Money';
  if (type === 'bank_account') return 'Bank Account';
  if (type === 'credit_card') return 'Card';
  return 'Bitcoin';
}

function accountLabel(type: ApiVendorPayoutMethodType): string {
  if (type === 'mobile_money') return 'Phone Number';
  if (type === 'bank_account') return 'Bank Account Number';
  if (type === 'credit_card') return 'Card Number';
  return 'Wallet Address';
}

function accountPlaceholder(type: ApiVendorPayoutMethodType): string {
  if (type === 'mobile_money') return 'e.g. 771234567';
  if (type === 'bank_account') return 'e.g. 0123456789';
  if (type === 'credit_card') return '5424 0000 0000 0000';
  return 'bc1...';
}

function nameLabel(type: ApiVendorPayoutMethodType): string {
  if (type === 'mobile_money') return 'Account Name';
  if (type === 'bank_account') return 'Account Name';
  if (type === 'credit_card') return 'Name on Card';
  return 'Wallet Label';
}

function toUgandanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('256')) return `+${digits}`;
  if (digits.startsWith('0')) return `+256${digits.slice(1)}`;
  return `+256${digits}`;
}

function fromUgandanPhone(raw: string): string {
  if (raw.startsWith('+256')) return raw.slice(4);
  return raw;
}

function maskedAccount(method: ApiVendorPayoutMethod): string {
  if (method.type === 'credit_card' || method.type === 'bank_account') {
    const last4 = method.account_number.slice(-4);
    return `•••• ${last4}`;
  }
  return method.account_number;
}

interface PayoutForm {
  type: ApiVendorPayoutMethodType;
  provider: string;
  account_name: string;
  account_number: string;
  card_expiry: string;
  bank_code: string;
  branch: string;
  is_default: boolean;
}

function emptyForm(): PayoutForm {
  return {
    type: 'mobile_money',
    provider: 'mtn',
    account_name: '',
    account_number: '',
    card_expiry: '',
    bank_code: '',
    branch: '',
    is_default: false,
  };
}

function PayoutCard({
  method,
  onEdit,
  onDelete,
}: {
  method: ApiVendorPayoutMethod;
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
          {method.card_expiry ? (
            <Text style={styles.methodExpiry}>Expires {method.card_expiry}</Text>
          ) : null}
          <Text style={styles.methodNote}>
            {method.is_default ? 'Default payout destination' : typeLabel(method.type)}
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

export function VendorPayoutMethodsScreen() {
  const { token, isAuthenticated, user } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [methods, setMethods] = useState<ApiVendorPayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiVendorPayoutMethod | null>(null);
  const [form, setForm] = useState<PayoutForm>(emptyForm());
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
        const data = await apiGetVendorPayoutMethods(token);
        setMethods(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load payout methods.');
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (method: ApiVendorPayoutMethod) => {
    setEditing(method);
    setForm({
      type: method.type,
      provider: method.provider,
      account_name: method.account_name ?? '',
      account_number:
        method.type === 'mobile_money'
          ? fromUgandanPhone(method.account_number ?? '')
          : method.account_number ?? '',
      card_expiry: method.card_expiry ?? '',
      bank_code: method.bank_code ?? '',
      branch: method.branch ?? '',
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

  const changeType = (type: ApiVendorPayoutMethodType) => {
    const providers = PROVIDERS[type];
    setForm(f => ({ ...f, type, provider: providers[0]?.id ?? '' }));
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.account_name.trim()) {
      setFormError(`Please enter the ${nameLabel(form.type).toLowerCase()}.`);
      return;
    }
    if (!form.account_number.trim()) {
      setFormError('Please enter the account details.');
      return;
    }
    let accountNumber = form.account_number.trim();
    if (form.type === 'mobile_money') {
      accountNumber = toUgandanPhone(accountNumber);
      if (!/^\+256[0-9]{9}$/.test(accountNumber)) {
        setFormError('Enter a valid number, e.g. 771234567.');
        return;
      }
    } else if (form.type === 'credit_card') {
      accountNumber = accountNumber.replace(/[\s-]/g, '');
      if (!/^[0-9]{12,19}$/.test(accountNumber)) {
        setFormError('Enter a valid card number.');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(form.card_expiry.trim())) {
        setFormError('Expiry must be MM/YY, e.g. 05/27.');
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        type: form.type,
        provider: form.provider,
        account_name: form.account_name.trim(),
        account_number: accountNumber,
        card_expiry: form.card_expiry.trim() || undefined,
        bank_code: form.bank_code.trim() || undefined,
        branch: form.branch.trim() || undefined,
        is_default: form.is_default,
      };
      if (editing) {
        await apiUpdateVendorPayoutMethod(token, editing.id, payload);
      } else {
        await apiCreateVendorPayoutMethod(token, payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save payout method.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (method: ApiVendorPayoutMethod) => {
    if (!token) return;
    try {
      await apiDeleteVendorPayoutMethod(token, method.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete payout method.');
    }
  };

  if (!isAuthenticated || !token || user?.role !== 'vendor') {
    return (
      <View style={styles.root}>
        <AppHeader title="Payout Methods" showBack onBack={goBack} />
        <EmptyState
          icon="savings"
          title="Vendor accounts only"
          subtitle="Payout methods let your shop receive sales proceeds. Sign in with a vendor account to manage them."
          actionLabel={isAuthenticated ? 'Go Back' : 'Sign In'}
          onAction={() => (isAuthenticated ? goBack() : navigate('Login'))}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Payout Methods" showBack onBack={goBack} />
      {loading ? (
        <SectionLoader text="Loading payout methods..." icon="savings" />
      ) : error ? (
        <EmptyState
          icon="error-outline"
          title="Couldn't load payout methods"
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
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>Where your sales are paid out</Text>
            <Text style={styles.introSub}>
              Add a mobile money wallet, bank account, card, or bitcoin wallet. Your default destination
              receives escrow releases automatically.
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIcon}>
                <Icon name="savings" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Payout Destinations</Text>
            </View>
            <Text style={styles.methodCount}>
              {methods.length} {methods.length === 1 ? 'method' : 'methods'}
            </Text>
          </View>

          {methods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="savings" size={40} color={colors.outline} />
              <Text style={styles.emptyTitle}>No payout methods yet</Text>
              <Text style={styles.emptySub}>
                Add a mobile money wallet or bank account so buyers' payments can reach you.
              </Text>
            </View>
          ) : (
            methods.map(method => (
              <PayoutCard
                key={method.id}
                method={method}
                onEdit={() => openEdit(method)}
                onDelete={() => handleDelete(method)}
              />
            ))
          )}

          <Pressable style={styles.addPaymentBtn} onPress={openCreate}>
            <Icon name="add" size={18} color={colors.primaryContainer} />
            <Text style={styles.addPaymentText}>Add Payout Method</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit Payout Method' : 'Add Payout Method'}
              </Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Text style={styles.label}>Payout Type</Text>
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

              <Text style={styles.label}>{nameLabel(form.type)}</Text>
              <TextInput
                style={styles.input}
                value={form.account_name}
                onChangeText={t => setForm(f => ({ ...f, account_name: t }))}
                placeholder="e.g. John Oke"
                placeholderTextColor={colors.outline}
                autoCapitalize="words"
              />

              <Text style={styles.label}>{accountLabel(form.type)}</Text>
              {form.type === 'mobile_money' ? (
                <View style={styles.phoneRow}>
                  <View style={styles.dialChip}>
                    <Text style={styles.dialText}>+256</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={form.account_number}
                    onChangeText={t => setForm(f => ({ ...f, account_number: t }))}
                    placeholder={accountPlaceholder(form.type)}
                    placeholderTextColor={colors.outline}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={12}
                  />
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={form.account_number}
                  onChangeText={t => setForm(f => ({ ...f, account_number: t }))}
                  placeholder={accountPlaceholder(form.type)}
                  placeholderTextColor={colors.outline}
                  keyboardType={form.type === 'bank_account' ? 'number-pad' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {form.type === 'credit_card' ? (
                <>
                  <Text style={styles.label}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    value={form.card_expiry}
                    onChangeText={t => setForm(f => ({ ...f, card_expiry: t }))}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                </>
              ) : null}

              {form.type === 'bank_account' ? (
                <>
                  <Text style={styles.label}>Bank Code (SWIFT)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.bank_code}
                    onChangeText={t => setForm(f => ({ ...f, bank_code: t }))}
                    placeholder="e.g. SBICUGKX"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.label}>Branch</Text>
                  <TextInput
                    style={styles.input}
                    value={form.branch}
                    onChangeText={t => setForm(f => ({ ...f, branch: t }))}
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
                <Text style={styles.checkboxLabel}>Set as default payout method</Text>
              </Pressable>

              <Button
                label={saving ? 'Saving...' : 'Save Payout Method'}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  introBox: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  introTitle: { ...typography.headlineSm, color: colors.onPrimary, fontWeight: '700' },
  introSub: { ...typography.bodySm, color: colors.primaryFixedDim, marginTop: 4, lineHeight: 18 },

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
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dialChip: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dialText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  phoneInput: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  typeChip: {
    flexBasis: '45%',
    flexGrow: 1,
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
