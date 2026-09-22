import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, HeaderActions } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { BuyCreditsModal } from '../components/BuyCreditsModal';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import type { RouteName } from '../navigation/NavigationContext';
import { apiGetCreditBalance, apiGetAddresses, apiGetProfile, apiGetOrders, apiGetWishlist, absoluteUrl } from '../data/api';
import type { ApiUser, ApiAddress } from '../data/api';
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
  { icon: 'receipt-long', label: 'Orders & Purchases', sub: 'Order and purchase history', route: 'Orders' },
  { icon: 'chat', label: 'Messages & Inbox', sub: 'Order updates & support replies', route: 'Messages' },
  { icon: 'rate-review', label: 'Ratings & Reviews', sub: 'Earn credits on reviews', route: 'MyReviews' },
  { icon: 'request-quote', label: 'Wholesale Inquiries & RFQs', sub: 'B2B corporate quotes', route: 'MyInquiries' },
  { icon: 'favorite', label: 'Wishlist & Coupons', sub: 'Saved products & promo codes', route: 'Wishlist' },
  { icon: 'manage-accounts', label: 'Settings & Security', sub: 'User data and privacy', route: 'AccountSettings' },
  { icon: 'support-agent', label: 'Help & Support', sub: 'Chatbot / FAQ', route: 'HelpCenter' },
];

export function AccountScreen() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const { navigate } = useNavigation();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<ApiAddress | null>(null);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [subEmail, setSubEmail] = useState(user?.email ?? '');
  const [subscribed, setSubscribed] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const newsletterKeyFor = (id: string) => `@jemina/newsletter/v1:${id}`;

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      setSubEmail('');
      return;
    }
    setSubEmail(user.email ?? '');
    AsyncStorage.getItem(newsletterKeyFor(user.id))
      .then(raw => {
        if (!raw) {
          setSubscribed(false);
          return;
        }
        try {
          const saved = JSON.parse(raw) as { subscribed?: boolean; email?: string };
          setSubscribed(saved.subscribed === true);
          if (typeof saved.email === 'string' && saved.email) {
            setSubEmail(saved.email);
          }
        } catch {
          setSubscribed(false);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSubscribe = useCallback(() => {
    const email = subEmail.trim();
    if (!email || !user) {
      return;
    }
    setSubscribed(true);
    AsyncStorage.setItem(newsletterKeyFor(user.id), JSON.stringify({ subscribed: true, email })).catch(
      () => {},
    );
  }, [subEmail, user]);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setCreditBalance(null);
      setDefaultAddress(null);
      setProfile(null);
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
    try {
      const p = await apiGetProfile(token);
      setProfile(p);
    } catch {
      setProfile(null);
    }
    try {
      const orders = await apiGetOrders(token);
      setOrdersCount(orders.length);
    } catch {
      setOrdersCount(0);
    }
    try {
      const wl = await apiGetWishlist(token);
      setWishlistCount(wl.length);
    } catch {
      setWishlistCount(0);
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

  const displayName = profile?.name ?? user?.name ?? 'JEMINA Customer';
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const photoUrl = profile?.photo ? absoluteUrl(profile.photo) ?? profile.photo : undefined;

  const dashStats = [
    { label: 'Orders', value: String(ordersCount) },
    { label: 'Wishlist', value: String(wishlistCount) },
    { label: 'In Cart', value: String(itemCount) },
  ];

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.root}>
        <AppHeader title={`${initials}'s Account`} right={<HeaderActions />} />
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
      <AppHeader title={`${initials}'s Account`} right={<HeaderActions />} />
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
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarFilled}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.heroInfo}>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer'}</Text>
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
              <Pressable style={styles.topUpBtn} onPress={() => setShowBuyCredits(true)}>
                <Icon name="add-circle" size={18} color={colors.onSecondaryContainer} />
                <Text style={styles.topUpText}>Top Up</Text>
              </Pressable>
            </View>
            <Pressable style={styles.creditHistoryLink} onPress={() => navigate('CreditHistory')} hitSlop={8}>
              <Text style={styles.creditHistoryText}>{initials}'s Wallet</Text>
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

        {/* Newsletter subscription */}
        <View style={styles.newsletterCard}>
          <Icon name="mail" size={24} color={colors.white} />
          <Text style={styles.newsletterTitle}>Stay Ahead of the Curve</Text>
          <Text style={styles.newsletterSub}>
            Get deals, promotions, and new arrivals straight to your inbox.
          </Text>
          {subscribed ? (
            <View style={styles.subSuccess}>
              <Icon name="check-circle" size={18} color={colors.white} />
              <Text style={styles.subSuccessText}>Subscribed successfully!</Text>
            </View>
          ) : (
            <View style={styles.newsletterForm}>
              <TextInput
                style={styles.newsletterInput}
                placeholder="Enter your email address"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                value={subEmail}
                onChangeText={setSubEmail}
              />
              <Pressable
                style={[styles.subscribeBtn, !subEmail && styles.subscribeBtnDisabled]}
                onPress={handleSubscribe}
                disabled={!subEmail}
              >
                <Text style={styles.subscribeBtnText}>Subscribe</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNav />
      <BuyCreditsModal
        visible={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
      />
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
  avatarPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(253,173,93,0.4)',
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
  newsletterCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  newsletterTitle: {
    ...typography.headlineSm,
    color: colors.white,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  newsletterSub: {
    ...typography.bodySm,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  newsletterForm: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  newsletterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
  },
  subscribeBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  subSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subSuccessText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '600',
  },
});