import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { EditProfileScreen } from './EditProfileScreen';
import { PaymentMethodsScreen } from './PaymentMethodsScreen';
import { AddressBookScreen } from './AddressBookScreen';
import { apiGetProfile, absoluteUrl } from '../data/api';
import type { ApiUser } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type SettingsTab = 'profile' | 'payments' | 'address';

const TABS: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'payments', label: 'Payments', icon: 'credit-card' },
  { id: 'address', label: 'Address Book', icon: 'home' },
];

interface SettingRow {
  icon: IconName;
  label: string;
  sub?: string;
  route?: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: () => void;
}

export function AccountSettingsScreen({ initialTab = 'profile' }: { initialTab?: SettingsTab }) {
  const { goBack, navigate } = useNavigation();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  useEffect(() => {
    if (token) {
      apiGetProfile(token).then(p => setProfile(p)).catch(() => {});
    }
  }, [token]);

  const photoUrl = profile?.photo ? absoluteUrl(profile.photo) ?? profile.photo : undefined;
  const displayName = profile?.name ?? user?.name ?? 'JEMINA Customer';
  const initials = displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const SECURITY_SETTINGS: SettingRow[] = [
    { icon: 'lock', label: 'Change Password', sub: 'Update your account password', route: 'ChangePassword' },
    { icon: 'verified-user', label: 'Two-Factor Authentication', sub: 'Add an extra layer of security' },
    { icon: 'delete-outline', label: 'Delete Account', sub: 'Permanently remove your account' },
  ];

  const NOTIF_SETTINGS: SettingRow[] = [
    { icon: 'email', label: 'Email Notifications', sub: 'Order updates, promotions, and news', toggle: true, value: emailNotif, onToggle: () => setEmailNotif(v => !v) },
    { icon: 'chat', label: 'SMS Notifications', sub: 'Delivery alerts via text message', toggle: true, value: smsNotif, onToggle: () => setSmsNotif(v => !v) },
    { icon: 'local-shipping', label: 'Shipping Updates', sub: 'Track your orders in real-time' },
    { icon: 'sell', label: 'Promotional Offers', sub: 'Deals, flash sales, and seasonal discounts' },
  ];

  return (
    <View style={styles.root}>
      <AppHeader title="Account Settings" showBack onBack={goBack} />
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={16} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>
        {tab === 'profile' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
                {user?.role ? (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{user.role === 'vendor' ? 'Vendor' : 'Customer'}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <EditProfileScreen embedded />

            {/* Security Settings */}
            <Text style={styles.sectionTitle}>Security Settings</Text>
            {SECURITY_SETTINGS.map((s, i) => (
              <Pressable
                key={s.label}
                style={[styles.settingCard, i > 0 && styles.settingCardDivider]}
                onPress={() => s.route ? navigate(s.route as never) : Alert.alert(s.label, 'Coming soon.')}
              >
                <View style={styles.settingIcon}>
                  <Icon name={s.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>{s.label}</Text>
                  {s.sub ? <Text style={styles.settingSub}>{s.sub}</Text> : null}
                </View>
                <Icon name="chevron-right" size={20} color={colors.outline} />
              </Pressable>
            ))}

            {/* Notification Preferences */}
            <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
            {NOTIF_SETTINGS.map((s, i) => (
              <Pressable
                key={s.label}
                style={[styles.settingCard, i > 0 && styles.settingCardDivider]}
                onPress={s.onToggle}
              >
                <View style={styles.settingIcon}>
                  <Icon name={s.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>{s.label}</Text>
                  {s.sub ? <Text style={styles.settingSub}>{s.sub}</Text> : null}
                </View>
                {s.toggle ? (
                  <View style={[styles.toggle, s.value && styles.toggleOn]}>
                    <View style={[styles.toggleDot, s.value && styles.toggleDotOn]} />
                  </View>
                ) : (
                  <Icon name="chevron-right" size={20} color={colors.outline} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : tab === 'payments' ? (
          <PaymentMethodsScreen embedded />
        ) : (
          <AddressBookScreen embedded />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.surfaceContainerLowest,
  },
  tabActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.primaryContainer,
  },
  tabText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  profileAvatarFallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  profileEmail: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  roleBadgeText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  settingCardDivider: {
    marginTop: spacing.sm,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingBody: {
    flex: 1,
  },
  settingLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  settingSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: colors.secondary,
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.outline,
  },
  toggleDotOn: {
    backgroundColor: colors.onPrimary,
    alignSelf: 'flex-end',
  },
});
