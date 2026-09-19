import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { SectionLoader } from '../components/Loader';
import { BuyCreditsModal } from '../components/BuyCreditsModal';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetCreditHistory, ApiCreditTransaction } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

/* ─── Helpers ─────────────────────────────────────── */

function formatDate(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function txConfig(type: string) {
  switch (type) {
    case 'purchase':
    case 'topup':
      return { icon: 'add' as const, bg: '#e8f5e9', fg: '#2e7d32', label: 'Top-up', badge: 'Completed', badgeBg: '#e8f5e9', badgeFg: '#2e7d32' };
    case 'spend':
      return { icon: 'shopping-bag' as const, bg: '#fff3e0', fg: '#e65100', label: 'Order Payment', badge: 'Escrow Locked', badgeBg: '#fff3e0', badgeFg: '#e65100' };
    case 'reward':
    case 'cashback':
      return { icon: 'redeem' as const, bg: colors.secondaryFixed, fg: colors.secondary, label: 'Promo Cashback', badge: 'Credited', badgeBg: colors.secondaryFixed, badgeFg: colors.secondary };
    case 'refund':
      return { icon: 'replay' as const, bg: '#e3f2fd', fg: '#1565c0', label: 'Escrow Refund', badge: 'Refunded', badgeBg: '#e3f2fd', badgeFg: '#1565c0' };
    case 'signup_bonus':
      return { icon: 'savings' as const, bg: '#f3e5f5', fg: '#7b1fa2', label: 'Signup Bonus', badge: 'Credited', badgeBg: '#f3e5f5', badgeFg: '#7b1fa2' };
    default:
      return { icon: 'receipt-long' as const, bg: colors.surfaceContainer, fg: colors.onSurfaceVariant, label: type.charAt(0).toUpperCase() + type.slice(1), badge: '', badgeBg: colors.surfaceContainer, badgeFg: colors.onSurfaceVariant };
  }
}

/* ─── Component ───────────────────────────────────── */

type TxFilter = 'all' | 'topup' | 'spend' | 'refund';

export function CreditHistoryScreen() {
  const { token, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { goBack, navigate, switchTab } = useNavigation();
  const [balance, setBalance] = useState<number>(0);
  const [totalPurchased, setTotalPurchased] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<ApiCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [selectedTier, setSelectedTier] = useState(500000);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetCreditHistory(token);
      setBalance(data.balance);
      if ((data as any).total_purchased != null) setTotalPurchased((data as any).total_purchased);
      if ((data as any).total_spent != null) setTotalSpent((data as any).total_spent);
      setTransactions(data.transactions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit history.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const data = await apiGetCreditHistory(token);
      setBalance(data.balance);
      if ((data as any).total_purchased != null) setTotalPurchased((data as any).total_purchased);
      if ((data as any).total_spent != null) setTotalSpent((data as any).total_spent);
      setTransactions(data.transactions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filteredTx = txFilter === 'all'
    ? transactions
    : transactions.filter(t => {
        if (txFilter === 'topup') return t.type === 'purchase' || t.type === 'topup' || t.type === 'reward' || t.type === 'signup_bonus' || t.type === 'cashback';
        if (txFilter === 'spend') return t.type === 'spend';
        if (txFilter === 'refund') return t.type === 'refund';
        return true;
      });

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Jemina Credits & Wallet" showBack onBack={goBack} />
        <EmptyState icon="local-atm" title="Sign in to see your credits" subtitle="Your balance and transaction history live here." actionLabel="Sign In" onAction={() => navigate('Login')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Jemina Credits & Wallet"
        showBack
        onBack={goBack}
        right={
          <>
            <HeaderNotificationButton />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />

      {loading ? (
        <View style={styles.loading}>
          <SectionLoader text="Loading your credits..." icon="account-balance-wallet" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* 1. Hero Balance Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroShieldBadge}>
              <Icon name="shield" size={14} color={colors.primaryFixed} />
              <Text style={styles.heroShieldText}>BOU Escrow Protected</Text>
            </View>

            <View style={styles.heroLabelRow}>
              <Icon name="account-balance-wallet" size={16} color={colors.secondaryFixed} />
              <Text style={styles.heroLabel}>Available Trade Credits</Text>
            </View>
            <View style={styles.heroBalanceRow}>
              <Text style={styles.heroBalance}>{formatUGX(balance)}</Text>
              <View style={styles.heroBalanceBadge}>
                <Text style={styles.heroBalanceBadgeText}>{Math.round(balance / 1000)}k J-Credits</Text>
              </View>
            </View>
            <Text style={styles.heroDesc}>
              1 J-Credit = 1 UGX {'\u2022'} Instantly spendable across Gulu, Lira & Arua depots
            </Text>

            <View style={styles.heroSubLedger}>
              <View style={styles.heroSubItem}>
                <Text style={styles.heroSubLabel}>Total Purchased</Text>
                <View style={styles.heroSubValueRow}>
                  <View style={[styles.heroDot, { backgroundColor: '#ffb74d' }]} />
                  <Text style={styles.heroSubValue}>{formatUGX(totalPurchased)}</Text>
                </View>
              </View>
              <View style={styles.heroSubDivider} />
              <View style={styles.heroSubItem}>
                <Text style={styles.heroSubLabel}>Total Spent</Text>
                <View style={styles.heroSubValueRow}>
                  <View style={[styles.heroDot, { backgroundColor: '#81c784' }]} />
                  <Text style={styles.heroSubValue}>{formatUGX(totalSpent)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroActions}>
              <Pressable style={styles.heroActionPrimary} onPress={() => navigate('BuyCredits')}>
                <Icon name="add_card" size={16} color={colors.onPrimary} />
                <Text style={styles.heroActionPrimaryText}>Top Up</Text>
              </Pressable>
              <View style={styles.heroActionSecondary}>
                <Icon name="sync" size={16} color="#81c784" />
                <Text style={styles.heroActionSecondaryText}>Auto-On</Text>
              </View>
              <View style={styles.heroActionSecondary}>
                <Icon name="qr_code_scanner" size={16} color={colors.primaryFixed} />
                <Text style={styles.heroActionSecondaryText}>Pay Depot</Text>
              </View>
            </View>
          </View>

          {/* 2. Quick Top Up Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="bolt" size={20} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Buy Trade Credits</Text>
              </View>
              <View style={styles.zeroFeeBadge}>
                <Text style={styles.zeroFeeText}>Zero Fee</Text>
              </View>
            </View>
            <Text style={styles.sectionDesc}>Instant settlement via MTN MoMo & Airtel Money Uganda rails</Text>

            {/* Tier Cards */}
            <View style={styles.tierList}>
              <Pressable
                style={[styles.tierCard, selectedTier === 100000 && styles.tierCardActive]}
                onPress={() => setSelectedTier(100000)}
              >
                <View style={styles.tierLeft}>
                  <View style={styles.tierIcon}>
                    <Icon name="person" size={18} color={colors.onSurface} />
                  </View>
                  <View>
                    <View style={styles.tierNameRow}>
                      <Text style={styles.tierAmount}>{formatUGX(100000)}</Text>
                      <View style={styles.tierBadge}><Text style={styles.tierBadgeText}>Starter</Text></View>
                    </View>
                    <Text style={styles.tierBonus}>+{formatUGX(2000)} Bonus Credits</Text>
                  </View>
                </View>
                <Icon name={selectedTier === 100000 ? 'check-circle' : 'radio-button-unchecked'} size={20} color={selectedTier === 100000 ? colors.secondary : colors.outline} />
              </Pressable>

              <Pressable
                style={[styles.tierCard, styles.tierCardPopular, selectedTier === 500000 && styles.tierCardActive]}
                onPress={() => setSelectedTier(500000)}
              >
                <View style={styles.tierPopularBadge}>
                  <Text style={styles.tierPopularText}>Most Popular</Text>
                </View>
                <View style={styles.tierLeft}>
                  <View style={[styles.tierIcon, { backgroundColor: colors.secondary }]}>
                    <Icon name="storefront" size={18} color={colors.onPrimary} />
                  </View>
                  <View>
                    <View style={styles.tierNameRow}>
                      <Text style={[styles.tierAmount, { fontWeight: '800' }]}>{formatUGX(500000)}</Text>
                      <View style={[styles.tierBadge, { backgroundColor: colors.secondaryContainer }]}>
                        <Text style={[styles.tierBadgeText, { color: colors.onSecondaryContainer, fontWeight: '700' }]}>Merchant</Text>
                      </View>
                    </View>
                    <Text style={[styles.tierBonus, { fontWeight: '700' }]}>+{formatUGX(15000)} Bonus (3% Rebate)</Text>
                  </View>
                </View>
                <Icon name={selectedTier === 500000 ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selectedTier === 500000 ? colors.secondary : colors.outline} />
              </Pressable>

              <Pressable
                style={[styles.tierCard, selectedTier === 1000000 && styles.tierCardActive]}
                onPress={() => setSelectedTier(1000000)}
              >
                <View style={styles.tierLeft}>
                  <View style={styles.tierIcon}>
                    <Icon name="groups" size={18} color={colors.onSurface} />
                  </View>
                  <View>
                    <View style={styles.tierNameRow}>
                      <Text style={styles.tierAmount}>{formatUGX(1000000)}</Text>
                      <View style={[styles.tierBadge, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.tierBadgeText, { color: colors.onPrimary }]}>Wholesale</Text>
                      </View>
                    </View>
                    <Text style={styles.tierBonus}>+{formatUGX(40000)} Bonus (4% Rebate)</Text>
                  </View>
                </View>
                <Icon name={selectedTier === 1000000 ? 'check-circle' : 'radio-button-unchecked'} size={20} color={selectedTier === 1000000 ? colors.secondary : colors.outline} />
              </Pressable>
            </View>

            <Button label="Buy Credits" variant="primary" icon="add_card" fullWidth onPress={() => setShowBuyModal(true)} style={styles.buyBtn} />
          </View>

          {/* 3. Wallet Privileges */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wallet Privileges</Text>
              <Text style={styles.sectionTag}>B2B Trade Perks</Text>
            </View>
            <View style={styles.perksGrid}>
              <View style={styles.perkCard}>
                <View style={styles.perkIcon}>
                  <Icon name="bolt" size={18} color={colors.secondary} />
                </View>
                <Text style={styles.perkTitle}>Instant Escrow</Text>
                <Text style={styles.perkDesc}>Skip mobile OTP delay during timed produce bids</Text>
              </View>
              <View style={styles.perkCard}>
                <View style={styles.perkIcon}>
                  <Icon name="percent" size={18} color={colors.secondary} />
                </View>
                <Text style={styles.perkTitle}>Up to 4% Rebate</Text>
                <Text style={styles.perkDesc}>Cashback on grain seeds & fertilizer bulk packs</Text>
              </View>
              <View style={styles.perkCard}>
                <View style={styles.perkIcon}>
                  <Icon name="handshake" size={18} color={colors.secondary} />
                </View>
                <Text style={styles.perkTitle}>0% Transfer Fee</Text>
                <Text style={styles.perkDesc}>Inter-depot payouts between Gulu & Lira hubs</Text>
              </View>
            </View>
          </View>

          {/* 4. Transaction Ledger */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trade Credit Ledger</Text>
                <Text style={styles.sectionDesc}>Real-time escrow logs & credits</Text>
              </View>
              <Pressable style={styles.statementBtn}>
                <Icon name="receipt-long" size={16} color={colors.secondary} />
                <Text style={styles.statementBtnText}>Statement</Text>
              </Pressable>
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {([
                { key: 'all' as TxFilter, label: 'All Transactions' },
                { key: 'topup' as TxFilter, label: 'Top-ups' },
                { key: 'spend' as TxFilter, label: 'Orders Paid' },
                { key: 'refund' as TxFilter, label: 'Escrow Refunds' },
              ]).map(f => (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, txFilter === f.key && styles.filterChipActive]}
                  onPress={() => setTxFilter(f.key)}
                >
                  <Text style={[styles.filterChipText, txFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Transaction Items */}
            {filteredTx.length === 0 ? (
              <View style={styles.emptyTx}>
                <Icon name="receipt-long" size={40} color={colors.outline} />
                <Text style={styles.emptyTxText}>No transactions yet.</Text>
              </View>
            ) : (
              filteredTx.map(tx => {
                const cfg = txConfig(tx.type);
                const isCredit = tx.type !== 'spend';
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txIcon, { backgroundColor: cfg.bg }]}>
                        <Icon name={cfg.icon} size={18} color={cfg.fg} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>{tx.notes || cfg.label}</Text>
                        <Text style={styles.txMeta}>{formatDate(tx.created_at)} {formatTime(tx.created_at)} {tx.reference ? `• Ref: ${tx.reference}` : ''}</Text>
                        {cfg.badge ? (
                          <View style={[styles.txBadge, { backgroundColor: cfg.badgeBg }]}>
                            <Text style={[styles.txBadgeText, { color: cfg.badgeFg }]}>{cfg.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color: isCredit ? '#2e7d32' : colors.onSurface }]}>
                        {isCredit ? '+' : '-'}{formatUGX(Math.abs(tx.amount))}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Trust Footer */}
          <View style={styles.trustCard}>
            <View style={styles.trustIcon}>
              <Icon name="security" size={20} color={colors.primaryFixed} />
            </View>
            <View style={styles.trustInfo}>
              <Text style={styles.trustTitle}>Bank of Uganda Compliant Escrow</Text>
              <Text style={styles.trustDesc}>Funds held in tier-1 custody until depot inspection sign-off.</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <BuyCreditsModal
        visible={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onPurchased={load}
        initialAmount={selectedTier}
      />
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.bodyMd, color: colors.statusFlash, marginBottom: spacing.md },

  /* Hero Card */
  heroCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroShieldBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroShieldText: { ...typography.labelSm, color: colors.primaryFixed, fontSize: 9 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroLabel: { ...typography.labelMd, color: colors.onPrimaryContainer, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroBalanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 4 },
  heroBalance: { ...typography.headlineLg, color: colors.onPrimary, fontWeight: '800' },
  heroBalanceBadge: { backgroundColor: `${colors.secondary}4d`, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  heroBalanceBadgeText: { ...typography.labelSm, color: colors.secondaryFixed, fontSize: 10 },
  heroDesc: { ...typography.bodySm, color: colors.onPrimaryContainer, marginBottom: spacing.md, lineHeight: 16 },
  heroSubLedger: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroSubItem: { flex: 1 },
  heroSubLabel: { ...typography.labelSm, color: colors.onPrimaryContainer, fontSize: 9 },
  heroSubValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroSubValue: { ...typography.labelMd, color: colors.onPrimary, fontWeight: '600' },
  heroSubDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: spacing.sm },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  heroActionPrimary: {
    flex: 1,
    height: 36,
    backgroundColor: '#ff9817',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroActionPrimaryText: { ...typography.labelMd, color: colors.onPrimary, fontWeight: '700' },
  heroActionSecondary: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroActionSecondaryText: { ...typography.labelMd, color: colors.onPrimary, fontSize: 10 },

  /* Sections */
  section: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    marginBottom: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.headlineSm, color: colors.onSurface },
  sectionDesc: { ...typography.bodySm, color: colors.outline, marginBottom: spacing.md },
  sectionTag: { ...typography.labelSm, color: colors.secondary, fontWeight: '600' },
  zeroFeeBadge: { backgroundColor: colors.surfaceContainer, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  zeroFeeText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 10 },

  /* Tier Cards */
  tierList: { gap: spacing.sm, marginBottom: spacing.md },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: `${colors.surfaceContainerLow}66`,
  },
  tierCardPopular: {
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondaryFixed}33`,
  },
  tierCardActive: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}0d`,
  },
  tierPopularBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  tierPopularText: { ...typography.labelSm, color: colors.onPrimary, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 },
  tierLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1 },
  tierIcon: { width: 32, height: 32, borderRadius: radius.lg, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierAmount: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  tierBadge: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  tierBadgeText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 9 },
  tierBonus: { ...typography.bodySm, color: colors.secondary, fontWeight: '500', marginTop: 1 },
  buyBtn: {},

  /* Perks */
  perksGrid: { flexDirection: 'row', gap: spacing.sm },
  perkCard: { flex: 1, padding: spacing.sm + 2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, backgroundColor: colors.surfaceContainerLowest },
  perkIcon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: `${colors.secondaryFixed}66`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  perkTitle: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700', marginBottom: 2 },
  perkDesc: { ...typography.bodySm, color: colors.outline, fontSize: 10, lineHeight: 14 },

  /* Ledger */
  statementBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statementBtnText: { ...typography.labelMd, color: colors.secondary, fontWeight: '600' },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: `${colors.outlineVariant}80` },
  filterChipActive: { backgroundColor: '#ff9817', borderColor: '#ff9817' },
  filterChipText: { ...typography.labelMd, color: colors.onSurface, fontSize: 10 },
  filterChipTextActive: { color: colors.onPrimary },
  emptyTx: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTxText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.sm },

  /* Transaction Item */
  txItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHigh },
  txLeft: { flexDirection: 'row', gap: spacing.sm + 2, flex: 1 },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txTitle: { ...typography.labelMd, color: colors.onSurface, fontWeight: '600' },
  txMeta: { ...typography.bodySm, color: colors.outline, marginTop: 1, fontSize: 10 },
  txBadge: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  txBadgeText: { ...typography.labelSm, fontSize: 9 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { ...typography.labelLg, fontWeight: '700' },

  /* Trust Footer */
  trustCard: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4d`,
    marginBottom: spacing.md,
  },
  trustIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  trustInfo: { flex: 1 },
  trustTitle: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700' },
  trustDesc: { ...typography.bodySm, color: colors.outline, marginTop: 2, lineHeight: 16 },
});
