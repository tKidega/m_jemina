import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { apiSubmitInquiry, ApiInquiryResult } from '../data/api';
import type { Product } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const SUBJECTS = [
  { key: 'bulk_order' as const, label: 'Bulk Order Request', icon: 'inventory' as const },
  { key: 'wholesale_pricing' as const, label: 'Wholesale Pricing', icon: 'sell' as const },
  { key: 'custom_order' as const, label: 'Custom Order', icon: 'build' as const },
  { key: 'partnership' as const, label: 'Business Partnership', icon: 'handshake' as const },
  { key: 'other' as const, label: 'Other Inquiry', icon: 'more-horiz' as const },
];

export function ProductInquiryScreen() {
  const { goBack, navigate, params } = useNavigation();
  const { user, token, isAuthenticated } = useAuth();
  const product = params?.product as Product | undefined;

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    company: '',
    quantity: String(product?.minOrderValue ?? 1),
    location: '',
    subject: 'bulk_order' as typeof SUBJECTS[number]['key'],
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiInquiryResult | null>(null);

  const minOrder = useMemo(() => product?.minOrderValue ?? 1, [product]);

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  if (!product) {
    return (
      <View style={styles.root}>
        <AppHeader title="Product Inquiry" showBack onBack={goBack} />
        <View style={styles.centerBox}>
          <Icon name="error-outline" size={40} color={colors.error} />
          <Text style={styles.centerTitle}>Product not found</Text>
          <Text style={styles.centerText}>Please open the product again and retry your inquiry.</Text>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    if (!isAuthenticated || !token) {
      navigate('Login');
      return;
    }
    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    const quantity = Number.parseInt(form.quantity, 10);
    if (Number.isNaN(quantity) || quantity < 1) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (quantity < minOrder) {
      setError(`Minimum order quantity is ${minOrder} units. Please adjust your quantity.`);
      return;
    }
    if (form.message.trim().length < 10) {
      setError('Please describe your requirements in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const inquiry = await apiSubmitInquiry(token, {
        product_id: product.id,
        vendor_id: product.vendor?.id ?? 1,
        user_name: form.name.trim(),
        user_email: form.email.trim(),
        user_phone: form.phone.trim(),
        company_name: form.company.trim() || undefined,
        quantity_required: quantity,
        delivery_location: form.location.trim() || undefined,
        inquiry_subject: form.subject,
        inquiry_message: form.message.trim(),
      });
      setResult(inquiry);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Product Inquiry" showBack onBack={goBack} />
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
          {result ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Icon name="check-circle" size={48} color={colors.statusSuccess} />
              </View>
              <Text style={styles.successTitle}>Inquiry Submitted!</Text>
              <Text style={styles.successText}>
                Your inquiry for {result.product_name} has been sent to the vendor.
              </Text>
              <View style={styles.refBox}>
                <Text style={styles.refLabel}>Reference</Text>
                <Text style={styles.refValue}>{result.formatted_reference}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Status</Text>
                <Text style={styles.successRowValue}>{result.status_name}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Quantity</Text>
                <Text style={styles.successRowValue}>{result.quantity_required} units</Text>
              </View>
              <Text style={styles.successHint}>
                The vendor will review your inquiry and respond shortly. You can track progress from your
                account messages.
              </Text>
              <Button
                label="Done"
                variant="primary"
                fullWidth
                onPress={goBack}
                style={styles.doneBtn}
              />
            </View>
          ) : (
            <>
              {/* Product summary */}
              <View style={styles.productCard}>
                <View style={styles.productThumb}>
                  {product.image ? (
                    <Text style={styles.productThumbPlaceholder}>{product.title.slice(0, 1).toUpperCase()}</Text>
                  ) : (
                    <Icon name="store" size={28} color={colors.outlineVariant} />
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                  <Text style={styles.productMinOrder}>{product.minOrder}</Text>
                </View>
              </View>

              {!isAuthenticated ? (
                <View style={styles.loginCard}>
                  <Icon name="lock" size={20} color={colors.secondary} />
                  <Text style={styles.loginText}>Sign in to submit an inquiry.</Text>
                  <Button
                    label="Sign In"
                    variant="primary"
                    onPress={() => navigate('Login')}
                    style={styles.loginBtn}
                  />
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="error-outline" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Your Details</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={setField('name')}
                    placeholder="Your full name"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={setField('email')}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={setField('phone')}
                    placeholder="+256..."
                    placeholderTextColor={colors.outline}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Company / Organisation (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.company}
                    onChangeText={setField('company')}
                    placeholder="Company name"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Quantity Required</Text>
                  <TextInput
                    style={styles.input}
                    value={form.quantity}
                    onChangeText={setField('quantity')}
                    placeholder={`Minimum: ${minOrder}`}
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Delivery Location (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.location}
                    onChangeText={setField('location')}
                    placeholder="e.g. Kampala, Uganda"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="words"
                  />
                </View>

                <Text style={[styles.formTitle, styles.subjectTitle]}>Inquiry Type</Text>
                <View style={styles.subjectGrid}>
                  {SUBJECTS.map(s => {
                    const active = form.subject === s.key;
                    return (
                      <Pressable
                        key={s.key}
                        style={[styles.subjectChip, active && styles.subjectChipActive]}
                        onPress={() => setField('subject')(s.key)}
                      >
                        <Icon
                          name={s.icon}
                          size={16}
                          color={active ? colors.onSecondary : colors.onSurfaceVariant}
                        />
                        <Text style={[styles.subjectText, active && styles.subjectTextActive]}>
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Requirements / Message</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.message}
                    onChangeText={setField('message')}
                    placeholder="Describe what you need, quantities, timelines, etc."
                    placeholderTextColor={colors.outline}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <Button
                  label={submitting ? 'Submitting...' : 'Submit Inquiry'}
                  variant="primary"
                  fullWidth
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                  disabled={submitting}
                />
              </View>
            </>
          )}
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
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  centerTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  centerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  productCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbPlaceholder: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productCategory: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  productTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  productPrice: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  productMinOrder: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  loginText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSecondary,
  },
  loginBtn: {
    paddingVertical: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(186,26,26,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.error,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  formTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  subjectTitle: {
    marginTop: spacing.lg,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  subjectChipActive: {
    backgroundColor: colors.secondaryContainer,
  },
  subjectText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  subjectTextActive: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: 6,
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textArea: {
    minHeight: 110,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(40,167,69,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  successText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  refBox: {
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  refLabel: {
    ...typography.labelMd,
    color: colors.onSecondary,
  },
  refValue: {
    ...typography.headlineMd,
    color: colors.onSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginTop: spacing.sm,
  },
  successRowLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  successRowValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  successHint: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: spacing.lg,
  },
});
