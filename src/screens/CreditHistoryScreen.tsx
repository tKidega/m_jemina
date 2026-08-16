import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetCreditHistory, ApiCreditTransaction } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatDate(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function typeLabel(type: string): string {
  switch (type) {
    case 'purchase':
      return 'Credit Purchase';
    case 'spend':
      return 'Order Payment';
    case 'reward':
      return 'Reward';
    case 'adjustment':
      return 'Adjustment';
    case 'refund':
      return 'Refund';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function CreditHistoryScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<ApiCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setBalance(null);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetCreditHistory(token);
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit history.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) {
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const data = await apiGetCreditHistory(token);
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit history.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="JEMINA Credits" showBack onBack={goBack} />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="local-atm" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see your credits</Text>
          <Text style={styles.emptySubtitle}>Your balance and transaction history live here.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="JEMINA Credits" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
          }
        >
          <View style={styles.balanceCard}>
            <View style={styles.balanceIcon}>
              <Icon name="local-atm" size={28} color={colors.onSecondary} />
            </View>
            <View style={styles.balanceBody}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{balance != null ? formatUGX(balance) : 'UGX 0'}</Text>
            </View>
          </View>

          <Button
            label="Buy Credits"
            variant="secondary"
            icon="add"
            fullWidth
            onPress={() => navigate('BuyCredits')}
            style={styles.buyBtn}
          />

          <Text style={styles.sectionTitle}>Transaction History</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {transactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No transactions yet.</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txIcon}>
                  <Icon
                    name={tx.type === 'purchase' ? 'trending-up' : 'receipt-long'}
                    size={20}
                    color={tx.type === 'purchase' ? colors.statusSuccess : colors.primary}
                  />
                </View>
                <View style={styles.txBody}>
                  <Text style={styles.txType}>{typeLabel(tx.type)}</Text>
                  {tx.notes ? <Text style={styles.txNote} numberOfLines={1}>{tx.notes}</Text> : null}
                  {tx.reference ? <Text style={styles.txRef}>Ref: {tx.reference}</Text> : null}
                  <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={styles.txAmountWrap}>
                  <Text
                    style={[styles.txAmount, tx.type === 'spend' && styles.txAmountNegative]}
                  >
                    {tx.type === 'spend' ? '-' : '+'} {formatUGX(Math.abs(tx.amount))}
                  </Text>
                  <Text style={styles.txBalance}>Bal: {formatUGX(tx.balance_after)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    padding: spacing.xl,
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    ...typography.headlineLg,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  buyBtn: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
  },
  txType: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  txNote: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  txRef: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  txDate: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...typography.bodyLg,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  txAmountNegative: {
    color: colors.statusFlash,
  },
  txBalance: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
  },
  emptyHistoryText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.statusFlash,
    marginBottom: spacing.md,
  },
});
