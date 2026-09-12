import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, HeaderActions } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import type { RouteName } from '../navigation/NavigationContext';
import { apiGetCreditBalance, apiGetAddresses } from '../data/api';
import type { ApiAddress } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface MenuRow {
  icon: IconName;
  label: string;
  sub?: string;
  route: RouteName;
  pill?: string;
}

const MENU_ITEMS: MenuRow[] = [
  { icon: 'receipt-long', label: 'My Orders & Purchase History', route: 'Orders' },
  { icon: 'request-quote', label: 'Wholesale Inquiries & RFQs', sub: 'B2B corporate quotes', route: 'ProductInquiry' },
  { icon: 'favorite', label: 'My Wishlist & Saved Products', route: 'Wishlist' },
  { icon: 'local-shipping', label: 'Track Active Order', route: 'OrderTracking' },
  { icon: 'manage-accounts', label: 'Account Settings & Security', route: 'AccountSettings' },
  { icon: 'rate-review', label: 'Surveys & Feedback', route: 'Surveys' },
  { icon: 'support-agent', label: 'Support & Help Desk', sub: 'WhatsApp / Call', route: 'HelpCenter' },
];

export function ProfileScreen() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const { navigate } = useNavigation();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<ApiAddress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setCreditBalance(null);
      setDefaultAddress(null);
      return;
    }
    try {
      const data = await apiGetCreditBalance(token);
      setCreditBalance(data.balance);
    } catch {
      setCreditBalance(null);
    }
    try {
      const addrs = await apiGetAddresses(token);
      const def = addrs.find(a => a.is_default) ?? addrs[0] ?? null;
      setDefaultAddress(def);
    } catch {
      setDefaultAddress(null);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  const displayName = user?.name ?? 'JEMINA Customer';
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const dashStats = [
    { label: 'Orders', value: '0' },
    { label: 'Wishlist', value: '0' },
    { label: 'In Cart', value: String(itemCount) },
  ];

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Account" right={<HeaderActions />} />
        <View style={styles.signedOut}>
          <View style={styles.avatar}>
            <Icon name="person" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.signedOutTitle}>Sign in to your account</Text>
          <Text style={styles.signedOutSubtitle}>
            Manage your orders, wishlist and account details from one place.
          </Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.signInBtn} />
          <Button label="Create an Account" variant="outline" fullWidth onPress={() => navigate('Register')} />
        </View>
        <BottomNav />
      </View>
    );
  }

  const addressLine = defaultAddress
    ? [defaultAddress.street_address, defaultAddress.city, defaultAddress.region, defaultAddress.zip_code]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <View style={styles.root}>
      <AppHeader title="My Account" right={<HeaderActions />} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* User hero card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarFilled}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>B2B Wholesale Buyer</Text>
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.verifiedRow}>
              <Icon name="verified" size={14} color={colors.secondaryContainer} />
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
            </View>
            {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {dashStats.map((s, i) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, i === 2 && styles.statValueAccent]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Credits card */}
        {creditBalance != null ? (
          <View style={styles.creditCard}>
            <View style={styles.creditTop}>
              <View style={styles.creditBody}>
                <Text style={styles.creditLabel}>JEMINA Credits Balance</Text>
                <Text style={styles.creditValue}>{formatUGX(creditBalance)}</Text>
              </View>
              <Pressable style={styles.topUpBtn} onPress={() => navigate('BuyCredits')}>
                <Icon name="add-circle" size={18} color={colors.onSecondaryContainer} />
                <Text style={styles.topUpText}>Top Up</Text>
              </Pressable>
            </View>
            <Pressable style={styles.creditHistoryLink} onPress={() => navigate('CreditHistory')} hitSlop={8}>
              <Text style={styles.creditHistoryText}>Credit History</Text>
              <Icon name="chevron-right" size={16} color={colors.secondaryFixed} />
            </Pressable>
          </View>
        ) : null}

        {/* Default address */}
        <View style={styles.infoCard}>
          <Icon name="location-on" size={18} color={colors.outline} style={styles.infoIcon} />
          <View style={styles.infoBody}>
            <Text style={styles.infoLabel}>Default Delivery Address</Text>
            {addressLine ? (
              <Text style={styles.infoValue}>{addressLine}</Text>
            ) : (
              <Text style={styles.infoEmpty}>No address saved yet</Text>
            )}
          </View>
          <Pressable onPress={() => navigate('AddressBook')} hitSlop={8}>
            <Text style={styles.editBtn}>Edit</Text>
          </Pressable>
        </View>

        {/* Account menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuItem, i > 0 && styles.menuItemDivider]}
              onPress={() => navigate(item.route)}
            >
              <Icon name={item.icon} size={22} color={colors.outline} />
              <View style={styles.menuBody}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
              </View>
              {item.pill ? (
                <View style={styles.menuPill}>
                  <Text style={styles.menuPillText}>{item.pill}</Text>
                </View>
              ) : null}
              <Icon name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Icon name="logout" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav />
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
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatarFilled: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(224,226,232,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(253,173,93,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 4,
  },
  roleText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 9,
  },
  name: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  email: {
    ...typography.bodySm,
    color: colors.primaryFixedDim,
    flexShrink: 1,
  },
  phone: {
    ...typography.bodySm,
    color: colors.primaryFixedDim,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  statValue: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  statValueAccent: {
    color: colors.secondary,
  },
  statLabel: {
    ...typography.labelMd,
    color: colors.outline,
    textAlign: 'center',
  },
  creditCard: {
    backgroundColor: colors.inverseSurface,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  creditTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  creditBody: {
    flex: 1,
  },
  creditLabel: {
    ...typography.labelMd,
    color: colors.secondaryFixed,
  },
  creditValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 4,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topUpText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  creditHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  creditHistoryText: {
    ...typography.bodySm,
    color: colors.secondaryFixed,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    ...typography.labelMd,
    color: colors.outline,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  infoEmpty: {
    ...typography.bodyMd,
    color: colors.outline,
    fontStyle: 'italic',
    marginTop: 2,
  },
  editBtn: {
    ...typography.labelLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  menuCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
  },
  menuBody: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  menuSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  menuPill: {
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  menuPillText: {
    ...typography.labelSm,
    color: colors.onSecondaryFixed,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    height: 48,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.full,
  },
  logoutText: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: '600',
  },
  signedOut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  signedOutTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  signedOutSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  signInBtn: {
    marginBottom: spacing.md,
  },
});