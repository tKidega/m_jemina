import React, { useEffect, useMemo, useState } from 'react';
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
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiCreateOrder, apiGetCreditBalance, apiGetAddresses, apiApplyVoucher } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const PAYMENT_METHODS: { id: string; label: string; icon: IconName; note: string }[] = [
  { id: 'mtn', label: 'MTN Mobile Money', icon: 'smartphone', note: 'MoMo on delivery' },
  { id: 'stripe', label: 'Card Payment', icon: 'credit-card', note: 'Visa / Mastercard' },
  { id: 'flutterwave', label: 'Flutterwave', icon: 'account-balance-wallet', note: 'Cards & bank' },
  { id: 'bitcoin', label: 'Bitcoin', icon: 'currency-bitcoin', note: 'Crypto accepted' },
  { id: 'credit', label: 'JEMINA Credits', icon: 'local-atm', note: 'Pay with your credits' },
];

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  lines?: number;
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Full Name', placeholder: 'Your full name' },
  { key: 'phone', label: 'Phone Number', placeholder: '+256 ...', keyboardType: 'phone-pad' },
  { key: 'address', label: 'Street Address', placeholder: 'House no, street name' },
  { key: 'city', label: 'City', placeholder: 'e.g. Kampala' },
  { key: 'state', label: 'State / Region', placeholder: 'e.g. Central Region' },
  { key: 'zip_code', label: 'Postal Code', placeholder: 'e.g. 256', keyboardType: 'numeric' },
  { key: 'country', label: 'Country', placeholder: 'e.g. Uganda' },
  { key: 'notes', label: 'Order Notes (optional)', placeholder: 'Delivery instructions', lines: 3 },
];

export function CheckoutScreen() {
  const { items, vendorGroups, subtotal, totalDeliveryFees, clearCart } = useCart();
  const { token, user, authMode } = useAuth();
  const { goBack, navigate } = useNavigation();

  const [form, setForm] = useState<Record<string, string>>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Uganda',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState<number | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setCreditBalance(null);
      return;
    }
    let cancelled = false;
    apiGetCreditBalance(token)
      .then(data => { if (!cancelled) setCreditBalance(data.balance); })
      .catch(() => { if (!cancelled) setCreditBalance(null); });
    apiGetAddresses(token)
      .then(addrs => {
        if (!cancelled && addrs.length > 0) {
          const def = addrs.find(a => a.is_default) ?? addrs[0];
          setForm(prev => ({
            ...prev,
            name: def.full_name || def.name || prev.name,
            phone: def.phone || prev.phone,
            address: def.street_address || prev.address,
            city: def.city || prev.city,
            state: def.region || prev.state,
            zip_code: def.zip_code || prev.zip_code,
          }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const platformFee = 1500;
  const totals = useMemo(() => {
    const delivery = totalDeliveryFees;
    const discount = voucherDiscount ?? 0;
    const total = subtotal + delivery + platformFee - discount;
    return { subtotal, delivery, platformFee, discount, total: Math.max(total, 0) };
  }, [subtotal, totalDeliveryFees, platformFee, voucherDiscount]);

  const setField = (key: string) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !token) return;
    setVoucherLoading(true);
    setVoucherMessage(null);
    setVoucherDiscount(null);
    try {
      const result = await apiApplyVoucher(token, voucherCode.trim(), subtotal);
      setVoucherDiscount(result.discount);
      setVoucherMessage(result.formatted_discount + ' discount applied!');
    } catch (e) {
      setVoucherMessage(e instanceof Error ? e.message : 'Invalid voucher code');
    } finally {
      setVoucherLoading(false);
    }
  };

  const validate = (): string | null => {
    const required = ['name', 'phone', 'address', 'city', 'state', 'zip_code', 'country'];
    for (const key of required) {
      if (!form[key]?.trim()) {
        return 'Please fill in all shipping details.';
      }
    }
    if (!items.length) {
      return 'Your cart is empty.';
    }
    if (paymentMethod === 'credit' && creditBalance != null && creditBalance < totals.total) {
      return `Insufficient credits. You need ${formatUGX(totals.total)} but have ${formatUGX(creditBalance)}.`;
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!user) {
      navigate('Login');
      return;
    }
    if (authMode === 'demo') {
      clearCart();
      navigate('Orders');
      return;
    }
    if (!token) {
      navigate('Login');
      return;
    }
    setLoading(true);
    try {
      const order = await apiCreateOrder(token, {
        items: items.map(i => ({ product_id: Number(i.product.id), quantity: i.quantity })),
        shipping_address: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          country: form.country,
        },
        payment_method: paymentMethod,
        notes: form.notes || undefined,
        voucher_code: voucherCode || undefined,
        discount_amount: voucherDiscount || undefined,
      });
      clearCart();
      if (paymentMethod === 'credit') {
        navigate('Orders');
      } else {
        navigate('Payment', {
          gateway: paymentMethod,
          amount: totals.total,
          orderId: order.id,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Checkout" showBack onBack={goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="error-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!user ? (
            <View style={styles.signInCard}>
              <Icon name="lock" size={24} color={colors.secondary} />
              <Text style={styles.signInTitle}>Sign in to check out</Text>
              <Text style={styles.signInSub}>Your cart will be saved on the server.</Text>
              <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.signInBtn} />
              <Button label="Create an Account" variant="outline" fullWidth onPress={() => navigate('Register')} />
            </View>
          ) : null}

          {/* Vendor-grouped order summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {vendorGroups.map(group => (
              <View key={group.vendorId ?? group.vendorName} style={styles.summaryCard}>
                <View style={styles.vendorTag}>
                  <Icon name="store" size={14} color={colors.primary} />
                  <Text style={styles.vendorTagText}>{group.vendorName}</Text>
                </View>
                {group.items.map(item => (
                  <View key={item.product.id} style={styles.summaryRow}>
                    <Text style={styles.summaryItemName} numberOfLines={1}>
                      {item.quantity} x {item.product.title}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      {formatUGX(item.product.priceValue * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={styles.deliveryRow}>
                  <Icon name="local-shipping" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.deliveryLabel}>Delivery</Text>
                  <Text style={styles.deliveryValue}>{formatUGX(group.deliveryFee)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.totalsCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.delivery)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform Fee</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.platformFee)}</Text>
              </View>
              {totals.discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.statusFlash }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.statusFlash }]}>-{formatUGX(totals.discount)}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUGX(totals.total)}</Text>
              </View>
            </View>
          </View>

          {/* Coupon */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon / Promo Code</Text>
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Enter code"
                placeholderTextColor={colors.outline}
                autoCapitalize="characters"
              />
              <Button
                label={voucherLoading ? '...' : 'Apply'}
                variant="outline"
                onPress={handleApplyVoucher}
                style={styles.couponBtn}
              />
            </View>
            {voucherMessage ? (
              <Text style={[styles.couponMsg, voucherDiscount != null ? styles.couponSuccess : styles.couponError]}>
                {voucherMessage}
              </Text>
            ) : null}
          </View>

          {/* Shipping form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Details</Text>
            <View style={styles.formCard}>
              {FIELDS.map(field => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, field.lines ? styles.textArea : null]}
                    value={form[field.key]}
                    onChangeText={setField(field.key)}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.outline}
                    keyboardType={field.keyboardType ?? 'default'}
                    multiline={!!field.lines}
                    autoCapitalize={field.key === 'name' ? 'words' : 'sentences'}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {creditBalance != null ? (
              <View style={styles.creditCard}>
                <View style={styles.creditIcon}>
                  <Icon name="local-atm" size={20} color={colors.onSecondary} />
                </View>
                <View style={styles.creditBody}>
                  <Text style={styles.creditLabel}>JEMINA Credits Balance</Text>
                  <Text style={styles.creditValue}>{formatUGX(creditBalance)}</Text>
                </View>
              </View>
            ) : null}
            {PAYMENT_METHODS.map(method => {
              const active = paymentMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  style={[styles.payMethod, active && styles.payMethodActive]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <View style={[styles.payIcon, active && styles.payIconActive]}>
                    <Icon name={method.icon} size={20} color={active ? colors.onSecondary : colors.primary} />
                  </View>
                  <View style={styles.payBody}>
                    <Text style={[styles.payLabel, active && styles.payLabelActive]}>{method.label}</Text>
                    <Text style={styles.payNote}>{method.note}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={loading ? 'Placing Order...' : 'Place Order'}
            variant="primary"
            fullWidth
            onPress={handlePlaceOrder}
            style={styles.submitBtn}
          />
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.labelMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
  signInCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  signInTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  signInSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  signInBtn: {
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  vendorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  vendorTagText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  totalsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryItemName: {
    ...typography.labelSm,
    color: colors.onSurface,
    flex: 1,
  },
  summaryItemPrice: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deliveryLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  deliveryValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalLabel: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  couponRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  couponInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  couponBtn: {
    paddingHorizontal: spacing.lg,
  },
  couponMsg: {
    ...typography.labelSm,
    marginTop: spacing.xs,
  },
  couponSuccess: {
    color: colors.statusFlash,
  },
  couponError: {
    color: colors.error,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  payMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  payMethodActive: {
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  creditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditBody: {
    flex: 1,
  },
  creditLabel: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
  },
  creditValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconActive: {
    backgroundColor: colors.secondaryContainer,
  },
  payBody: {
    flex: 1,
  },
  payLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  payLabelActive: {
    color: colors.secondary,
  },
  payNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.secondaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
  },
  submitBtn: {
    paddingVertical: spacing.md,
  },
});
