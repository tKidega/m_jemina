import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from './Icon';
import { Button } from './Button';
import { useAuth } from '../state/AuthContext';
import { apiInitiatePayment, apiGetPaymentStatus, apiGetCreditBalance, apiGetAcceptedPaymentMethods, ApiAcceptedPaymentMethod, ApiPaymentResult, ApiPaymentStatus } from '../data/api';
import { formatUGX } from './ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

const METHOD_META: Record<string, { icon: IconName; color: string }> = {
  mobile_money: { icon: 'smartphone', color: '#ffcc00' },
  card: { icon: 'credit-card', color: '#1a1f71' },
  bitcoin: { icon: 'currency-bitcoin', color: '#f7931a' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
  initialAmount?: number;
}

export function BuyCreditsModal({ visible, onClose, onPurchased, initialAmount }: Props) {
  const { token } = useAuth();
  const [amount, setAmount] = useState<number>(AMOUNTS[1]);
  const [methods, setMethods] = useState<ApiAcceptedPaymentMethod[]>([]);
  const [gateway, setGateway] = useState<ApiAcceptedPaymentMethod | null>(null);
  const [result, setResult] = useState<ApiPaymentResult | null>(null);
  const [status, setStatus] = useState<ApiPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMethods = useCallback(async () => {
    try {
      const list = await apiGetAcceptedPaymentMethods();
      setMethods(list);
      setGateway(current => current ?? list[0] ?? null);
    } catch {
      setError('Could not load payment methods.');
    }
  }, []);

  const loadBalance = useCallback(async () => {
    if (!token) return;
    apiGetCreditBalance(token).then(d => setBalance(d.balance)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (visible) {
      loadBalance();
      loadMethods();
      setResult(null);
      setStatus(null);
      setError(null);
      setAmount(initialAmount ?? AMOUNTS[1]);
    }
  }, [visible, loadBalance, loadMethods, initialAmount]);

  useEffect(() => {
    if (!result?.transaction_id || !token) return;
    pollTimer.current = setInterval(() => {
      apiGetPaymentStatus(token, result.transaction_id as string)
        .then(s => {
          setStatus(s);
          if (s.status === 'completed' || s.gateway_status === 'completed' || s.gateway_status === 'succeeded') {
            loadBalance();
            onPurchased?.();
          }
        })
        .catch(() => {});
    }, 5000);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [result, token, loadBalance, onPurchased]);

  const initiate = useCallback(async () => {
    if (!token) { setError('Sign in to buy credits.'); return; }
    if (!gateway) { setError('Select a payment method.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await apiInitiatePayment(token, {
        gateway: gateway.gateways?.[0] ?? gateway.key,
        amount,
        currency: gateway.currencies?.[0] ?? (gateway.key === 'bitcoin' ? 'BTC' : 'UGX'),
        description: 'Purchase JEMINA Credits',
        metadata: { type: 'credit_purchase' },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  }, [token, gateway, amount]);

  const openPaymentLink = () => {
    const link = result?.gateway_data?.payment_link as string | undefined;
    if (link) Linking.openURL(link).catch(() => {});
  };

  const paid = status?.status === 'completed' || status?.gateway_status === 'completed' || status?.gateway_status === 'succeeded';
  const paymentLink = result?.gateway_data?.payment_link as string | undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="add_card" size={20} color={colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.title}>Top Up Credits</Text>
                {balance != null && <Text style={styles.subtitle}>Balance: {formatUGX(balance)}</Text>}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.outline} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBox}>
                <Icon name="error-outline" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!result ? (
              <>
                {/* Amount Presets */}
                <Text style={styles.sectionLabel}>Select Amount</Text>
                <View style={styles.amountGrid}>
                  {AMOUNTS.map(a => (
                    <Pressable
                      key={a}
                      style={[styles.amountChip, amount === a && styles.amountChipActive]}
                      onPress={() => setAmount(a)}
                    >
                      <Text style={[styles.amountText, amount === a && styles.amountTextActive]}>
                        {a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}K`}
                      </Text>
                      <Text style={[styles.amountSub, amount === a && styles.amountSubActive]}>
                        {formatUGX(a)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Payment Methods */}
                <Text style={styles.sectionLabel}>Payment Method</Text>
                {methods.length === 0 ? (
                  <Text style={styles.gatewayLabel}>Loading payment methods...</Text>
                ) : (
                  methods.map(m => {
                    const meta = METHOD_META[m.key] ?? { icon: 'account-balance-wallet' as IconName, color: colors.secondary };
                    const active = gateway?.key === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        style={[styles.gatewayRow, active && styles.gatewayRowActive]}
                        onPress={() => setGateway(m)}
                      >
                        <View style={[styles.gatewayIcon, { backgroundColor: `${meta.color}1a` }]}>
                          <Icon name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <Text style={[styles.gatewayLabel, active && styles.gatewayLabelActive]}>
                          {m.label}
                        </Text>
                        <View style={[styles.radio, active && styles.radioActive]}>
                          {active && <View style={styles.radioDot} />}
                        </View>
                      </Pressable>
                    );
                  })
                )}

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={styles.summaryValue}>{formatUGX(amount)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Credits you get</Text>
                    <Text style={[styles.summaryValue, { color: colors.statusSuccess }]}>{formatUGX(amount)}</Text>
                  </View>
                </View>

                <Button
                  label={loading ? 'Processing...' : `Pay ${formatUGX(amount)}`}
                  variant="primary"
                  icon="lock"
                  fullWidth
                  onPress={initiate}
                  disabled={loading}
                  style={styles.payBtn}
                />
              </>
            ) : (
              <>
                {/* Payment Status */}
                <View style={styles.statusCard}>
                  <View style={[styles.statusIconWrap, paid && styles.statusIconPaid]}>
                    <Icon name={paid ? 'check-circle' : 'launch'} size={32} color={paid ? colors.statusSuccess : colors.secondary} />
                  </View>
                  <Text style={styles.statusTitle}>{paid ? 'Credits Added!' : 'Complete Payment'}</Text>
                  <Text style={styles.statusDesc}>
                    {paid
                      ? 'Your credits have been added to your balance.'
                      : paymentLink
                        ? 'Tap below to complete your payment securely.'
                        : 'Your payment is being processed...'}
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{result.transaction_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>{formatUGX(amount)}</Text>
                  </View>
                  {status && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, paid && { color: colors.statusSuccess }]}>{status.status}</Text>
                    </View>
                  )}
                </View>

                {paymentLink && (
                  <Pressable style={styles.payLinkBtn} onPress={openPaymentLink}>
                    <Icon name="launch" size={18} color={colors.onPrimary} />
                    <Text style={styles.payLinkText}>Open Payment Link</Text>
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {result ? (
              <Button label="Done" variant="primary" fullWidth onPress={onClose} />
            ) : (
              <Button label="Cancel" variant="outline" fullWidth onPress={onClose} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '95%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.outline,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  /* Amount Grid */
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountChip: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  amountChipActive: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}0d`,
  },
  amountText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  amountTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  amountSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  amountSubActive: {
    color: colors.secondary,
  },

  /* Gateway */
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    marginBottom: spacing.sm,
  },
  gatewayRowActive: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}0d`,
  },
  gatewayIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  gatewayLabelActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.secondary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },

  /* Summary */
  summaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
  },

  /* Status */
  statusCard: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.secondary}1a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconPaid: {
    backgroundColor: `${colors.statusSuccess}1a`,
  },
  statusTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  statusDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  /* Details */
  detailCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },

  /* Pay Link */
  payLinkBtn: {
    height: 48,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  payLinkText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },

  /* Error */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },

  /* Footer */
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainerHigh,
  },
  payBtn: {},
});
