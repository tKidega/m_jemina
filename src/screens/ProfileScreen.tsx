import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, HeaderCartButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetCreditBalance, apiGetAddresses } from '../data/api';
import type { ApiAddress } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const MENU_ITEMS = [
  { icon: 'receipt-long' as const, label: 'My Orders', sub: 'Track and manage your orders', route: 'Orders' },
  { icon: 'favorite' as const, label: 'Wishlist', sub: 'Products you saved for later', route: 'Wishlist' },
  { icon: 'star-border' as const, label: 'My Reviews', sub: 'Ratings and reviews you have written', route: 'MyReviews' },
  { icon: 'settings' as const, label: 'Account Settings', sub: 'Profile, payments & addresses', route: 'AccountSettings' },
  { icon: 'edit-note' as const, label: 'Surveys', sub: 'Earn credits with feedback', route: 'Surveys' },
  { icon: 'track-changes' as const, label: 'Track Order', sub: 'Follow your packages live', route: 'OrderTracking' },
  { icon: 'mail' as const, label: 'Messages', sub: 'Support replies and updates', route: 'Messages' },
  { icon: 'support-agent' as const, label: 'Help & Support', sub: 'Contact support and tickets', route: 'HelpCenter' },
];

const DASH_STATS = [
  { icon: 'receipt-long' as const, label: 'Orders', value: '0' },
  { icon: 'favorite' as const, label: 'Wishlist', value: '0' },
  { icon: 'shopping-cart' as const, label: 'In Cart', value: '0' },
];

export function ProfileScreen() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const { navigate } = useNavigation();
  const [activeSection, setActiveSection] = useState(0);
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

  const dashStats = DASH_STATS.map((s, i) => ({
    ...s,
    value: i === 2 ? String(itemCount) : '0',
  }));

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.root}>
        <AppHeader
          right={<HeaderCartButton count={itemCount} onPress={() => {}} />}
        />
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

  return (
    <View style={styles.root}>
      <AppHeader
        right={<HeaderCartButton count={itemCount} onPress={() => {}} />}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarFilled}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
            <View style={styles.roleChip}>
              <Icon name="verified" size={14} color={colors.secondary} />
              <Text style={styles.roleText}>{user.role === 'vendor' ? 'Vendor' : 'Customer'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {dashStats.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Icon name={s.icon} size={24} color={colors.secondary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Credits */}
        {creditBalance != null ? (
          <Pressable style={styles.creditCard} onPress={() => navigate('CreditHistory')}>
            <View style={styles.creditIcon}>
              <Icon name="local-atm" size={26} color={colors.onSecondary} />
            </View>
            <View style={styles.creditBody}>
              <Text style={styles.creditLabel}>JEMINA Credits</Text>
              <Text style={styles.creditValue}>{formatUGX(creditBalance)}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.onPrimaryContainer} style={styles.creditChevron} />
          </Pressable>
        ) : null}

        {/* Default Address */}
        {defaultAddress ? (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Icon name="location-on" size={18} color={colors.primary} />
              <Text style={styles.infoCardTitle}>Default Address</Text>
            </View>
            <Text style={styles.infoCardName}>{defaultAddress.full_name || defaultAddress.name}</Text>
            <Text style={styles.infoCardDetail}>{defaultAddress.street_address}</Text>
            {[defaultAddress.city, defaultAddress.region, defaultAddress.zip_code].filter(Boolean).length > 0 ? (
              <Text style={styles.infoCardDetail}>
                {[defaultAddress.city, defaultAddress.region, defaultAddress.zip_code].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {defaultAddress.phone ? <Text style={styles.infoCardDetail}>{defaultAddress.phone}</Text> : null}
            <Text style={[styles.infoCardType, { color: colors.primary }]}>
              {defaultAddress.type === 'home' ? 'Home' : defaultAddress.type === 'work' ? 'Work' : defaultAddress.type}
            </Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Icon name="location-on" size={18} color={colors.outline} />
              <Text style={styles.infoCardTitle}>Default Address</Text>
            </View>
            <Text style={styles.infoCardEmpty}>No address saved yet</Text>
          </View>
        )}

        {/* Quick menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Account</Text>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuItem, i === activeSection && styles.menuItemActive]}
              onPress={() =>
                item.route
                  ? navigate(item.route as 'Orders' | 'Wishlist' | 'MyReviews' | 'AccountSettings' | 'Surveys' | 'OrderTracking' | 'Messages' | 'HelpCenter')
                  : setActiveSection(i)
              }
            >
              <View style={styles.menuIcon}>
                <Icon name={item.icon} size={22} color={i === activeSection ? colors.secondary : colors.onSurfaceVariant} />
              </View>
              <View style={styles.menuBody}>
                <Text style={[styles.menuLabel, i === activeSection && styles.menuLabelActive]}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.outline} style={styles.chevron} />
            </Pressable>
          ))}
        </View>

        {/* Section placeholder */}
        {activeSection === 0 ? (
          <View style={styles.sectionPlaceholder}>
            <Icon name="receipt-long" size={40} color={colors.outlineVariant} />
            <Text style={styles.placeholderTitle}>No orders yet</Text>
            <Text style={styles.placeholderSub}>When you place an order, it will show up here.</Text>
            <Button label="Browse Marketplace" variant="primary" onPress={() => navigate('Marketplace')} style={styles.placeholderBtn} />
          </View>
        ) : null}

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Icon name="logout" size={20} color={colors.statusFlash} />
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  avatarFilled: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.headlineLg,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    ...typography.headlineLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  email: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    marginTop: 2,
  },
  phone: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    marginTop: 2,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,152,23,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  roleText: {
    ...typography.labelMd,
    color: colors.secondaryContainer,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
  },
  statValue: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  creditIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditBody: {
    flex: 1,
  },
  creditLabel: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
  },
  creditValue: {
    ...typography.headlineLg,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  creditChevron: {
    transform: [{ rotate: '180deg' }],
  },
  infoCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoCardTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  infoCardName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  infoCardDetail: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoCardType: {
    ...typography.labelSm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  infoCardEmpty: {
    ...typography.bodyMd,
    color: colors.outline,
    fontStyle: 'italic',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  menuItemActive: {
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: {
    flex: 1,
  },
  menuLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  menuLabelActive: {
    color: colors.secondary,
  },
  menuSub: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
  },
  sectionPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.sm,
  },
  placeholderTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  placeholderSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  placeholderBtn: {
    marginTop: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.3)',
    borderRadius: radius.xl,
    backgroundColor: 'rgba(186,26,26,0.05)',
  },
  logoutText: {
    ...typography.labelMd,
    color: colors.statusFlash,
    fontWeight: '700',
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
