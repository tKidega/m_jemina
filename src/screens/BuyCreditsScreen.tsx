import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiInitiatePayment, apiGetPaymentStatus, apiGetCreditBalance, ApiPaymentResult, ApiPaymentStatus } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

const GATEWAYS: { id: string; api: string; label: string; icon: IconName; currency: string }[] = [
  { id: 'mtn', api: 'mtn_mobile_money', label: 'MTN Mobile Money', icon: 'smartphone', currency: 'UGX' },
  { id: 'stripe', api: 'stripe', label: 'Card Payment', icon: 'credit-card', currency: 'USD' },
  { id: 'flutterwave', api: 'flutterwave', label: 'Flutterwave', icon: 'account-balance-wallet', currency: 'UGX' },
  { id: 'bitcoin', api: 'bitcoin', label: 'Bitcoin', icon: 'currency-bitcoin', currency: 'BTC' },
];

export function BuyCreditsScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [amount, setAmount] = useState<number>(AMOUNTS[1]);
  const [gateway, setGateway] = useState(GATEWAYS[0]);
  const [result, setResult] = useState<ApiPaymentResult | null>(null);
  const [status, setStatus] = useState<ApiPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBalance = useCallback(async () => {
    if (!token) {
      setBalance(null);
      return;
    }
    apiGetCreditBalance(token)
      .then(d => setBalance(d.balance))
      .catch(() => setBalance(null));
  }, [token]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const initiate = useCallback(async () => {
    if (!token) {
      setError('You need to be signed in to buy credits.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiInitiatePayment(token, {
        gateway: gateway.api,
        amount,
        currency: gateway.currency,
        description: 'Purchase JEMINA Credits',
        metadata: { type: 'credit_purchase' },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, gateway, amount]);

  useEffect(() => {
    if (!result?.transaction_id || !token) {
      return;
    }
    pollTimer.current = setInterval(() => {
      apiGetPaymentStatus(token, result.transaction_id as string)
        .then(s => {
          setStatus(s);
          if (s.status === 'completed' || s.gateway_status === 'completed' || s.gateway_status === 'succeeded') {
            loadBalance();
          }
        })
        .catch(() => {});
    }, 5000);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [result, token, loadBalance]);

  const checkStatus = async () => {
    if (!result?.transaction_id || !token) {
      return;
    }
    setChecking(true);
    try {
      const s = await apiGetPaymentStatus(token, result.transaction_id as string);
      setStatus(s);
      if (s.status === 'completed' || s.gateway_status === 'completed' || s.gateway_status === 'succeeded') {
        loadBalance();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check payment status.');
    } finally {
      setChecking(false);
    }
  };

  const openPaymentLink = () => {
    const link = result?.gateway_data?.payment_link as string | undefined;
    if (link) {
      Linking.openURL(link).catch(() => setError('Could not open the payment link.'));
    }
  };

  const paymentLink = result?.gateway_data?.payment_link as string | undefined;
  const paid = status?.status === 'completed' || status?.gateway_status === 'completed' || status?.gateway_status === 'succeeded';

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Buy Credits" showBack onBack={goBack} />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="local-atm" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to buy credits</Text>
          <Text style={styles.emptySubtitle}>Top up your JEMINA credits to pay for orders instantly.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Buy Credits" showBack onBack={goBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {balance != null ? (
          <View style={styles.balanceCard}>
            <View style={styles.balanceIcon}>
              <Icon name="local-atm" size={24} color={colors.onSecondary} />
            </View>
            <View style={styles.balanceBody}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceValue}>{formatUGX(balance)}</Text>
            </View>
          </View>
        ) : null}

        {/* Amount presets */}
        <Text style={styles.sectionTitle}>Amount to Purchase</Text>
        <View style={styles.amountRow}>
          {AMOUNTS.map(a => {
            const active = amount === a;
            return (
              <Pressable
                key={a}
                style={[styles.amountChip, active && styles.amountChipActive]}
                onPress={() => setAmount(a)}
              >
                <Text style={[styles.amountChipText, active && styles.amountChipTextActive]}>
                  {formatUGX(a)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Gateway selection */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {GATEWAYS.map(g => {
          const active = gateway.id === g.id;
          return (
            <Pressable
              key={g.id}
              style={[styles.gatewayRow, active && styles.gatewayRowActive]}
              onPress={() => setGateway(g)}
            >
              <View style={[styles.gatewayIcon, active && styles.gatewayIconActive]}>
                <Icon name={g.icon} size={22} color={active ? colors.onSecondary : colors.onSurfaceVariant} />
              </View>
              <Text style={[styles.gatewayLabel, active && styles.gatewayLabelActive]}>{g.label}</Text>
              <Icon name={active ? 'check-circle' : 'radio-button-unchecked'} size={20} color={active ? colors.secondary : colors.outline} />
            </Pressable>
          );
        })}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{formatUGX(amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Credits added</Text>
            <Text style={styles.summaryValue}>{formatUGX(amount)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={26} color={colors.error} />
            <Text style={styles.errorTitle}>Purchase not initiated</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Retry" variant="primary" fullWidth onPress={initiate} style={styles.actionBtn} />
          </View>
        ) : null}

        {result ? (
          <>
            <View style={styles.statusCard}>
              <Icon name={paid ? 'check-circle' : 'launch'} size={26} color={paid ? colors.statusSuccess : colors.secondary} />
              <Text style={styles.statusTitle}>{paid ? 'Credits added!' : 'Payment link ready'}</Text>
              <Text style={styles.statusSub}>
                {paid
                  ? 'Your JEMINA credits have been added to your balance.'
                  : paymentLink
                    ? 'Complete your payment securely to add credits to your balance.'
                    : 'Your payment is being processed. Your credits will appear once confirmed.'}
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
              {status ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, paid ? styles.detailPaid : null]}>{status.status}</Text>
                </View>
              ) : null}
            </View>
            {paymentLink ? (
              <Pressable style={styles.payNowBtn} onPress={openPaymentLink}>
                <Icon name="lock" size={20} color={colors.onSecondary} />
                <Text style={styles.payNowText}>Complete Payment</Text>
                <Icon name="launch" size={18} color={colors.onSecondary} />
              </Pressable>
            ) : null}
            <Button
              label={checking ? 'Checking...' : 'Check Payment Status'}
              variant="outline"
              fullWidth
              onPress={checkStatus}
              style={styles.actionBtn}
            />
            <Button label="View Credit History" variant="ghost" fullWidth onPress={() => navigate('CreditHistory')} />
          </>
        ) : (
          <Button
            label={loading ? 'Initiating...' : 'Buy Credits'}
            variant="primary"
            icon="add"
            fullWidth
            onPress={initiate}
            style={styles.actionBtn}
          />
        )}
      </ScrollView>
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBody: {
    flex: 1,
  },
  balanceLabel: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
  },
  balanceValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountChip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  amountChipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  amountChipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  amountChipTextActive: {
    color: colors.onSecondary,
  },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  gatewayRowActive: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  gatewayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayIconActive: {
    backgroundColor: colors.secondaryContainer,
  },
  gatewayLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  gatewayLabelActive: {
    color: colors.secondary,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  statusSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.headlineMd,
    color: colors.onErrorContainer,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  detailCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailPaid: {
    color: colors.statusSuccess,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  payNowText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
  },
});
