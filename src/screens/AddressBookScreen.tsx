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
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetAddresses, apiSaveAddress, apiUpdateAddress, apiDeleteAddress, apiSetDefaultAddress, ApiAddress } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface AddressForm {
  name: string;
  phone: string;
  street_address: string;
  city: string;
  region: string;
  zip_code: string;
  is_default: boolean;
}

const EMPTY_FORM: AddressForm = {
  name: '',
  phone: '',
  street_address: '',
  city: '',
  region: '',
  zip_code: '',
  is_default: false,
};

function AddressCard({ address, onEdit, onDelete, onSetDefault }: {
  address: ApiAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Icon name={address.type === 'billing' ? 'credit-card' : 'home'} size={20} color={colors.secondary} />
          <Text style={styles.cardName}>{address.name || address.full_name || 'Address'}</Text>
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
      <Text style={styles.cardText} numberOfLines={2}>
        {address.street_address}
        {address.city ? `, ${address.city}` : ''}
        {address.region ? `, ${address.region}` : ''}
        {address.zip_code ? ` ${address.zip_code}` : ''}
      </Text>
      {address.phone ? <Text style={styles.cardPhone}>{address.phone}</Text> : null}
      <View style={styles.cardBottom}>
        {address.is_default ? (
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

export function AddressBookScreen({ embedded = false }: { embedded?: boolean }) {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAddress | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
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
        const data = await apiGetAddresses(token);
        setAddresses(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load addresses.');
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
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (address: ApiAddress) => {
    setEditing(address);
    setForm({
      name: address.name ?? '',
      phone: address.phone ?? '',
      street_address: address.street_address ?? '',
      city: address.city ?? '',
      region: address.region ?? '',
      zip_code: address.zip_code ?? '',
      is_default: address.is_default,
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
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!token) {
      return;
    }
    if (!form.name.trim() || !form.street_address.trim()) {
      setFormError('Name and street address are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Partial<ApiAddress> & { name: string; street_address: string } = {
        name: form.name.trim(),
        street_address: form.street_address.trim(),
        phone: form.phone?.trim() || null,
        city: form.city?.trim() || null,
        region: form.region?.trim() || null,
        zip_code: form.zip_code?.trim() || null,
        is_default: form.is_default,
      };
      if (editing) {
        await apiUpdateAddress(token, editing.id, payload);
      } else {
        await apiSaveAddress(token, payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address: ApiAddress) => {
    if (!token) {
      return;
    }
    try {
      await apiDeleteAddress(token, address.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete address.');
    }
  };

  const handleSetDefault = async (address: ApiAddress) => {
    if (!token) {
      return;
    }
    try {
      await apiSetDefaultAddress(token, address.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default address.');
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        {!embedded ? <AppHeader title="Address Book" showBack onBack={goBack} /> : null}
        <View style={styles.center}>
          <Icon name="home" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to manage addresses</Text>
          <Text style={styles.centerSub}>Add and manage your delivery addresses after signing in.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => {}} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!embedded ? <AppHeader title="Address Book" showBack onBack={goBack} /> : null}
      <View style={styles.topBar}>
        <Button label="+ Add Address" variant="secondary" onPress={openCreate} style={styles.addBtn} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load addresses</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => load()} style={styles.centerBtn} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Icon name="home" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No addresses yet</Text>
          <Text style={styles.centerSub}>Add a delivery address to make checkout faster.</Text>
          <Button label="Add Address" variant="primary" fullWidth onPress={openCreate} style={styles.centerBtn} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {addresses.map(address => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => openEdit(address)}
              onDelete={() => handleDelete(address)}
              onSetDefault={() => handleSetDefault(address)}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Address' : 'Add Address'}</Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} placeholder="Recipient name" placeholderTextColor={colors.outline} autoCapitalize="words" />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={t => setForm(f => ({ ...f, phone: t }))} placeholder="+256..." placeholderTextColor={colors.outline} keyboardType="phone-pad" />
              <Text style={styles.label}>Street Address</Text>
              <TextInput style={styles.input} value={form.street_address} onChangeText={t => setForm(f => ({ ...f, street_address: t }))} placeholder="Street address" placeholderTextColor={colors.outline} />
              <Text style={styles.label}>City</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={t => setForm(f => ({ ...f, city: t }))} placeholder="City" placeholderTextColor={colors.outline} />
              <Text style={styles.label}>Region / State</Text>
              <TextInput style={styles.input} value={form.region} onChangeText={t => setForm(f => ({ ...f, region: t }))} placeholder="Region" placeholderTextColor={colors.outline} />
              <Text style={styles.label}>Postal Code</Text>
              <TextInput style={styles.input} value={form.zip_code} onChangeText={t => setForm(f => ({ ...f, zip_code: t }))} placeholder="Postal code" placeholderTextColor={colors.outline} />
              <Pressable style={styles.checkboxRow} onPress={() => setForm(f => ({ ...f, is_default: !f.is_default }))}>
                <View style={[styles.checkbox, form.is_default && styles.checkboxOn]}>
                  {form.is_default ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </Pressable>
              <Button label={saving ? 'Saving...' : 'Save Address'} variant="primary" fullWidth onPress={handleSave} style={styles.saveBtn} />
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
  },
  cardName: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    padding: 4,
  },
  cardText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  cardPhone: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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