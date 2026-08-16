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
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetPaymentMethods,
  apiSavePaymentMethod,
  apiUpdatePaymentMethod,
  apiDeletePaymentMethod,
  apiSetDefaultPaymentMethod,
  ApiPaymentMethod,
  ApiPaymentMethodType,
} from '../data/api';
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

function typeIcon(type: ApiPaymentMethodType): IconName {
  if (type === 'card') return 'credit-card';
  if (type === 'mobile_money') return 'smartphone';
  return 'account-balance-wallet';
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

function MethodCard({ method, onEdit, onDelete, onSetDefault }: {
  method: ApiPaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <View style={styles.typeIcon}>
            <Icon name={typeIcon(method.type)} size={20} color={colors.primary} />
          </View>
          <View style={styles.cardTitleBody}>
            <Text style={styles.cardName}>{method.provider.charAt(0).toUpperCase() + method.provider.slice(1)}</Text>
            <Text style={styles.cardType}>{typeLabel(method.type)}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
            <Icon name="edit" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.actionBtn} hitSlop={8}>
            <Icon name="delete-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.cardAccount}>{maskedAccount(method)}</Text>
        {method.account_name ? <Text style={styles.cardName}>{method.account_name}</Text> : null}
        {method.expiry_date ? (
          <Text style={styles.cardType}>Expires {method.expiry_date}</Text>
        ) : null}
      </View>
      <View style={styles.cardBottom}>
        {method.is_default ? (
          <View style={styles.defaultChip}>
            <Icon name="check-circle" size={14} color={colors.statusSuccess} />
            <Text style={styles.defaultChipText}>Default</Text>
          </View>
        ) : (
          <Pressable onPress={onSetDefault} hitSlop={8}>
            <Text style={styles.setDefaultText}>Set as default</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function PaymentMethodsScreen({ embedded = false }: { embedded?: boolean }) {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [methods, setMethods] = useState<ApiPaymentMethod[]>([]);
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
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
    if (saving) {
      return;
    }
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
    if (!token) {
      return;
    }
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
        is_default: form.is_default,
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
    if (!token) {
      return;
    }
    try {
      await apiDeletePaymentMethod(token, method.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete payment method.');
    }
  };

  const handleSetDefault = async (method: ApiPaymentMethod) => {
    if (!token) {
      return;
    }
    try {
      await apiSetDefaultPaymentMethod(token, method.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default payment method.');
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        {!embedded ? <AppHeader title="Payment Methods" showBack onBack={goBack} /> : null}
        <View style={styles.center}>
          <Icon name="credit-card" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to manage payment methods</Text>
          <Text style={styles.centerSub}>Save a card or mobile money number for faster checkout after signing in.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => {}} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!embedded ? <AppHeader title="Payment Methods" showBack onBack={goBack} /> : null}
      <View style={styles.topBar}>
        <Button label="+ Add Method" variant="secondary" onPress={openCreate} style={styles.addBtn} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load payment methods</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => load()} style={styles.centerBtn} />
        </View>
      ) : methods.length === 0 ? (
        <View style={styles.center}>
          <Icon name="account-balance-wallet" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No payment methods saved</Text>
          <Text style={styles.centerSub}>Add a credit card, mobile money number, or Cloud Pay account for faster checkout.</Text>
          <Button label="Add Payment Method" variant="primary" fullWidth onPress={openCreate} style={styles.centerBtn} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {methods.map(method => (
            <MethodCard
              key={method.id}
              method={method}
              onEdit={() => openEdit(method)}
              onDelete={() => handleDelete(method)}
              onSetDefault={() => handleSetDefault(method)}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Payment Method' : 'Add Payment Method'}</Text>
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
                      <Icon name={option.icon} size={16} color={active ? colors.onSecondary : colors.primary} />
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{option.label}</Text>
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
                      <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>{provider.label}</Text>
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
                keyboardType={form.type === 'mobile_money' ? 'phone-pad' : form.type === 'cloud_pay' ? 'email-address' : 'default'}
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
              <Pressable style={styles.checkboxRow} onPress={() => setForm(f => ({ ...f, is_default: !f.is_default }))}>
                <View style={[styles.checkbox, form.is_default && styles.checkboxOn]}>
                  {form.is_default ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Set as default payment method</Text>
              </Pressable>
              <Button label={saving ? 'Saving...' : 'Save Method'} variant="primary" fullWidth onPress={handleSave} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  addBtn: {
    alignSelf: 'flex-start',
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBody: {
    flex: 1,
  },
  cardName: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  cardType: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    padding: 4,
  },
  cardDetails: {
    marginTop: spacing.md,
  },
  cardAccount: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  cardBottom: {
    marginTop: spacing.sm,
  },
  defaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  defaultChipText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  setDefaultText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
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
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: colors.onSecondary,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerChip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  providerChipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  providerChipText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  providerChipTextActive: {
    color: colors.onSecondary,
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
  },
  saveBtn: {
    marginTop: spacing.xl,
  },
});