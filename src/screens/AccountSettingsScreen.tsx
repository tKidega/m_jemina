import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { PaymentMethodsScreen } from './PaymentMethodsScreen';
import { AddressBookScreen } from './AddressBookScreen';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { PinManageModal } from '../components/PinManageModal';
import {
  apiGetProfile,
  apiGetTwoFactorStatus,
  apiEnableTwoFactor,
  apiConfirmTwoFactor,
  apiDisableTwoFactor,
  apiGetSessions,
  apiRevokeOtherSessions,
  absoluteUrl,
} from '../data/api';
import type { ApiUser, ApiSession } from '../data/api';
import { getDeviceModel } from '../lib/device';
import { isBiometricAvailable, promptBiometric, biometryLabel } from '../lib/biometric';
import type { BiometryType } from 'react-native-biometrics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

/* ─── Tabs ───────────────────────────────────────────── */

type SettingsTab = 'profile' | 'security' | 'payments' | 'logistics' | 'preferences';

const TABS: { id: SettingsTab; label: string; icon?: IconName }[] = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'security', label: 'Security & 2FA', icon: 'shield' },
  { id: 'payments', label: 'Payment Rails' },
  { id: 'logistics', label: 'Logistics & Hub' },
  { id: 'preferences', label: 'Preferences' },
];

/* ─── Toggle Switch ──────────────────────────────────── */

function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onValueChange}
      disabled={disabled}
      style={[styles.toggle, value && styles.toggleOn]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.toggleDot, value && styles.toggleDotOn]} />
    </Pressable>
  );
}

/* ─── Section Card ───────────────────────────────────── */

function SectionCard({
  title,
  icon,
  headerRight,
  children,
}: {
  title: string;
  icon: IconName;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Icon name={icon} size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

/* ─── Separator ──────────────────────────────────────── */

function Sep() {
  return <View style={styles.sep} />;
}

/* ─── Main Screen ────────────────────────────────────── */

export function AccountSettingsScreen({
  initialTab = 'profile',
}: {
  initialTab?: SettingsTab;
}) {
  const { goBack, navigate } = useNavigation();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [profile, setProfile] = useState<ApiUser | null>(null);

  // Profile image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPinManage, setShowPinManage] = useState(false);

  // Security state
  const [twoFa, setTwoFa] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [deviceName, setDeviceName] = useState('Android Device');
  const [refreshing, setRefreshing] = useState(false);

  // Preferences
  const [smsTracking, setSmsTracking] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);

  const loadProfile = useCallback(async () => {
    if (token) {
      try {
        const p = await apiGetProfile(token);
        setProfile(p);
      } catch { /* ignore */ }
    }
  }, [token]);

  const loadSecurityData = useCallback(async () => {
    if (!token) return;
    try {
      const [status, sessionList] = await Promise.all([
        apiGetTwoFactorStatus(token),
        apiGetSessions(token),
      ]);
      setTwoFa(status.enabled);
      setSessions(sessionList);
    } catch { /* ignore — defaults remain */ }
  }, [token]);

  const loadDeviceInfo = useCallback(async () => {
    const name = await getDeviceModel();
    setDeviceName(name);
  }, []);

  const loadBiometricInfo = useCallback(async () => {
    const { available, type } = await isBiometricAvailable();
    setBiometricSupported(available);
    setBiometricType(type);
  }, []);

  useEffect(() => {
    loadProfile();
    loadSecurityData();
    loadDeviceInfo();
    loadBiometricInfo();
  }, [loadProfile, loadSecurityData, loadDeviceInfo, loadBiometricInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadSecurityData()]);
    setRefreshing(false);
  }, [loadProfile, loadSecurityData]);

  const handleToggle2FA = useCallback(async () => {
    if (!token) return;
    if (twoFa) {
      // Disable 2FA — requires password
      Alert.prompt(
        'Disable 2FA',
        'Enter your password to disable two-factor authentication.',
        async (password) => {
          if (!password) return;
          setTwoFaLoading(true);
          try {
            await apiDisableTwoFactor(token, password);
            setTwoFa(false);
            Alert.alert('2FA Disabled', 'Two-factor authentication has been turned off.');
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to disable 2FA.');
          } finally {
            setTwoFaLoading(false);
          }
        },
        'secure-text',
      );
    } else {
      // Enable 2FA
      setTwoFaLoading(true);
      try {
        const setup = await apiEnableTwoFactor(token);
        Alert.alert(
          'Enable 2FA',
          `Scan this QR code in your authenticator app:\n\n${setup.qr_url}\n\nOr enter the secret manually: ${setup.secret}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'I\'ve scanned it',
              onPress: () => {
                Alert.prompt(
                  'Verify Code',
                  'Enter the 6-digit code from your authenticator app.',
                  async (code) => {
                    if (!code || code.length !== 6) {
                      Alert.alert('Error', 'Please enter a valid 6-digit code.');
                      return;
                    }
                    try {
                      const recoveryCodes = await apiConfirmTwoFactor(token, code);
                      setTwoFa(true);
                      Alert.alert(
                        '2FA Enabled',
                        `Recovery codes (save these):\n${recoveryCodes.join('\n')}`,
                      );
                    } catch (e) {
                      Alert.alert('Error', e instanceof Error ? e.message : 'Invalid code.');
                    }
                  },
                  'plain-text',
                );
              },
            },
          ],
        );
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start 2FA setup.');
      } finally {
        setTwoFaLoading(false);
      }
    }
  }, [token, twoFa]);

  const handleToggleBiometric = useCallback(async () => {
    if (!biometricSupported) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }
    if (biometric) {
      setBiometric(false);
      Alert.alert('Biometric Disabled', `${biometryLabel(biometricType)} sign-in has been turned off.`);
    } else {
      const ok = await promptBiometric(`Authenticate with ${biometryLabel(biometricType)} to enable`);
      if (ok) {
        setBiometric(true);
        Alert.alert('Biometric Enabled', `${biometryLabel(biometricType)} sign-in is now active.`);
      }
    }
  }, [biometric, biometricSupported, biometricType]);

  const handleRevokeOthers = useCallback(async () => {
    if (!token) return;
    Alert.alert('Sign Out Others', 'This will sign out all other devices. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out Others',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRevokeOtherSessions(token);
            setSessions(prev => prev.filter(s => s.is_current));
            Alert.alert('Done', 'Other sessions have been signed out.');
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
          }
        },
      },
    ]);
  }, [token]);

  const photoUrl = profile?.photo
    ? absoluteUrl(profile.photo) ?? profile.photo
    : undefined;
  const displayName =
    profile?.name ?? user?.name ?? 'JEMINA Customer';
  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const phone = user?.phone ?? '+256 772 491 802';
  const email = user?.email ?? '';
  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : 'Customer';

  return (
    <View style={styles.root}>
      <AppHeader
        title="Account & Security"
        showBack
        onBack={goBack}
        right={
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => Alert.alert('Help', 'Support coming soon.')}
            >
              <Icon name="help-outline" size={22} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              style={styles.headerBtn}
              onPress={() => Alert.alert('Notifications', 'Coming soon.')}
            >
              <Icon
                name="notifications"
                size={22}
                color={colors.onPrimary}
              />
              <View style={styles.notifDot} />
            </Pressable>
          </View>
        }
      />

      {/* Profile Summary Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatarWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Icon name="check" size={10} color={colors.white} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>
          <Pressable
            style={styles.editBtn}
            onPress={() => setShowImageModal(true)}
          >
            <Icon name="photo-camera" size={20} color={colors.secondary} />
          </Pressable>
        </View>
        <Sep />
        <View style={styles.profileContacts}>
          {email ? (
            <View style={styles.contactRow}>
              <Icon name="mail" size={16} color={colors.outline} />
              <Text style={styles.contactText}>{email}</Text>
            </View>
          ) : null}
          <View style={styles.contactRow}>
            <Icon name="smartphone" size={16} color={colors.outline} />
            <Text style={styles.contactText}>{phone}</Text>
          </View>
        </View>
      </View>

      {/* Segmented Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setTab(t.id)}
            >
              {t.icon ? (
                <Icon
                  name={t.icon}
                  size={15}
                  color={active ? colors.white : colors.onSurface}
                />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      <View style={styles.body}>
        {tab === 'profile' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          >
            <ProfileTab profile={profile} user={user} />
          </ScrollView>
        ) : tab === 'security' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          >
            <SecurityTab
              twoFa={twoFa}
              twoFaLoading={twoFaLoading}
              onTwoFa={handleToggle2FA}
              biometric={biometric}
              biometricType={biometricType}
              biometricSupported={biometricSupported}
              onBiometric={handleToggleBiometric}
              phone={phone}
              sessions={sessions}
              deviceName={deviceName}
              onRevokeOthers={handleRevokeOthers}
              onChangePassword={() => setShowChangePassword(true)}
              onManagePin={() => setShowPinManage(true)}
            />
          </ScrollView>
        ) : tab === 'payments' ? (
          <PaymentMethodsScreen embedded />
        ) : tab === 'logistics' ? (
          <AddressBookScreen embedded />
        ) : (
          <PreferencesTab
            smsTracking={smsTracking}
            onSmsTracking={() => setSmsTracking(v => !v)}
            priceAlerts={priceAlerts}
            onPriceAlerts={() => setPriceAlerts(v => !v)}
          />
        )}
      </View>

      {/* Profile Image Modal */}
      <Modal visible={showImageModal} transparent animationType="slide" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalSheet}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Profile Photo</Text>
              <Pressable onPress={() => setShowImageModal(false)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.outline} />
              </Pressable>
            </View>
            <View style={styles.imageModalBody}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.imageModalPreview} />
              ) : (
                <View style={[styles.imageModalPreview, styles.imageModalPlaceholder]}>
                  <Text style={styles.imageModalPlaceholderText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.imageModalHint}>Your current profile photo</Text>
            </View>
            <View style={styles.imageModalActions}>
              <Pressable style={styles.imageModalActionBtn} onPress={() => { setShowImageModal(false); navigate('EditProfile'); }}>
                <Icon name="photo-camera" size={20} color={colors.onPrimary} />
                <Text style={styles.imageModalActionText}>Upload New Photo</Text>
              </Pressable>
              <Pressable style={[styles.imageModalActionBtn, styles.imageModalActionSecondary]} onPress={() => setShowImageModal(false)}>
                <Text style={[styles.imageModalActionText, { color: colors.onSurfaceVariant }]}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChanged={loadSecurityData}
      />
      <PinManageModal
        visible={showPinManage}
        onClose={() => setShowPinManage(false)}
      />
    </View>
  );
}

/* ─── Profile Tab ─────────────────────────────────────── */

function ProfileTab({ profile, user }: { profile: ApiUser | null; user: any }) {
  const p = profile ?? user;
  if (!p) return null;

  const fields = [
    { label: 'Full Name', value: p.name ?? '—', icon: 'person' as IconName },
    { label: 'Email', value: p.email ?? '—', icon: 'mail' as IconName },
    { label: 'Phone', value: p.phone ?? '—', icon: 'smartphone' as IconName },
    { label: 'Role', value: (p.role ?? 'customer').charAt(0).toUpperCase() + (p.role ?? 'customer').slice(1), icon: 'badge' as IconName },
    { label: 'Date of Birth', value: p.date_of_birth ?? '—', icon: 'event' as IconName },
    { label: 'Gender', value: p.gender ?? '—', icon: 'person-outline' as IconName },
    { label: 'Language', value: p.language ?? 'English', icon: 'public' as IconName },
    { label: 'Bio', value: p.bio ?? '—', icon: 'info' as IconName },
    { label: 'Street Address', value: p.street_address ?? '—', icon: 'pin-drop' as IconName },
    { label: 'City', value: p.city ?? '—', icon: 'location-city' as IconName },
    { label: 'Region', value: p.region ?? '—', icon: 'map' as IconName },
    { label: 'Postal Code', value: p.postal_code ?? '—', icon: 'markunread-mailbox' as IconName },
    { label: 'Country', value: p.country ?? 'Uganda', icon: 'public' as IconName },
    { label: 'Timezone', value: p.timezone ?? 'Africa/Kampala', icon: 'schedule' as IconName },
    { label: 'Member Since', value: p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—', icon: 'calendar-today' as IconName },
  ];

  return (
    <View style={styles.profileTabContent}>
      <SectionCard title="Personal Information" icon="person">
        {fields.map((field, idx) => (
          <React.Fragment key={field.label}>
            <View style={styles.profileFieldRow}>
              <Icon name={field.icon} size={18} color={colors.outline} />
              <View style={styles.profileFieldInfo}>
                <Text style={styles.profileFieldLabel}>{field.label}</Text>
                <Text style={styles.profileFieldValue}>{field.value}</Text>
              </View>
            </View>
            {idx < fields.length - 1 && <Sep />}
          </React.Fragment>
        ))}
      </SectionCard>

      {/* Social Links */}
      {(p.facebook || p.twitter || p.instagram || p.linkedin) && (
        <SectionCard title="Social Links" icon="share">
          {p.facebook && (
            <>
              <View style={styles.profileFieldRow}>
                <Icon name="public" size={18} color={colors.outline} />
                <View style={styles.profileFieldInfo}>
                  <Text style={styles.profileFieldLabel}>Facebook</Text>
                  <Text style={styles.profileFieldValue}>{p.facebook}</Text>
                </View>
              </View>
              <Sep />
            </>
          )}
          {p.twitter && (
            <>
              <View style={styles.profileFieldRow}>
                <Icon name="public" size={18} color={colors.outline} />
                <View style={styles.profileFieldInfo}>
                  <Text style={styles.profileFieldLabel}>Twitter</Text>
                  <Text style={styles.profileFieldValue}>{p.twitter}</Text>
                </View>
              </View>
              <Sep />
            </>
          )}
          {p.instagram && (
            <>
              <View style={styles.profileFieldRow}>
                <Icon name="public" size={18} color={colors.outline} />
                <View style={styles.profileFieldInfo}>
                  <Text style={styles.profileFieldLabel}>Instagram</Text>
                  <Text style={styles.profileFieldValue}>{p.instagram}</Text>
                </View>
              </View>
              <Sep />
            </>
          )}
          {p.linkedin && (
            <View style={styles.profileFieldRow}>
              <Icon name="public" size={18} color={colors.outline} />
              <View style={styles.profileFieldInfo}>
                <Text style={styles.profileFieldLabel}>LinkedIn</Text>
                <Text style={styles.profileFieldValue}>{p.linkedin}</Text>
              </View>
            </View>
          )}
        </SectionCard>
      )}
    </View>
  );
}

/* ─── Security & 2FA Tab ─────────────────────────────── */

function SecurityTab({
  twoFa,
  twoFaLoading,
  onTwoFa,
  biometric,
  biometricType,
  biometricSupported,
  onBiometric,
  phone,
  sessions,
  deviceName,
  onRevokeOthers,
  onChangePassword,
  onManagePin,
}: {
  twoFa: boolean;
  twoFaLoading: boolean;
  onTwoFa: () => void;
  biometric: boolean;
  biometricType: import('react-native-biometrics').BiometryType | null;
  biometricSupported: boolean;
  onBiometric: () => void;
  phone: string;
  sessions: ApiSession[];
  deviceName: string;
  onRevokeOthers: () => void;
  onChangePassword: () => void;
  onManagePin: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <SectionCard
        title="Security & 2FA"
        icon="verified-user"
        headerRight={
          <View style={twoFa ? styles.strictBadge : styles.strictBadgeOff}>
            <Text style={[styles.strictBadgeText, !twoFa && styles.strictBadgeTextOff]}>
              {twoFa ? 'STRICT' : 'OFF'}
            </Text>
          </View>
        }
      >
        {/* 2FA Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleRowBody}>
            <View style={styles.toggleLabelRow}>
              <Text style={styles.toggleLabel}>
                Two-Factor Authentication (2FA)
              </Text>
              {twoFa ? <View style={styles.greenDot} /> : null}
            </View>
            <Text style={styles.toggleSub}>
              {twoFa
                ? `Active via Email OTP to ${phone}`
                : 'Email OTP code on every sign-in'}
            </Text>
          </View>
          <Toggle value={twoFa} onValueChange={onTwoFa} disabled={twoFaLoading} />
        </View>

        <Sep />

        {/* Change Password */}
        <View style={styles.passwordRow}>
          <View>
            <Text style={styles.toggleLabel}>Account Password</Text>
            <Text style={styles.toggleSub}>Verify your current password to set a new one</Text>
          </View>
          <Pressable
            style={styles.updateBtn}
            onPress={onChangePassword}
          >
            <Text style={styles.updateBtnText}>Update</Text>
          </Pressable>
        </View>

        <Sep />

        {/* JEMINA Trade PIN */}
        <View style={styles.passwordRow}>
          <View>
            <Text style={styles.toggleLabel}>JEMINA Trade PIN</Text>
            <Text style={styles.toggleSub}>Escrow & auto-reload authorizations</Text>
          </View>
          <Pressable
            style={styles.updateBtn}
            onPress={onManagePin}
          >
            <Text style={styles.updateBtnText}>Manage</Text>
          </Pressable>
        </View>

        <Sep />

        {/* Biometric */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleRowBody}>
            <View style={styles.toggleLabelRow}>
              <Icon name="fingerprint" size={18} color={colors.primary} />
              <Text style={styles.toggleLabel}>
                {biometricType === 'FaceID' ? 'Face ID' : biometricType === 'TouchID' ? 'Touch ID' : 'Biometric Sign-in'}
              </Text>
            </View>
            <Text style={styles.toggleSub}>
              {biometricSupported
                ? `Instant authorization via ${biometricType === 'FaceID' ? 'Face ID' : biometricType === 'TouchID' ? 'Touch ID' : 'fingerprint'}`
                : 'Not available on this device'}
            </Text>
          </View>
          <Toggle value={biometric} onValueChange={onBiometric} disabled={!biometricSupported} />
        </View>

        <Sep />

        {/* Device Sessions */}
        <View style={styles.deviceSection}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceHeaderLabel}>
              Active Device Sessions
            </Text>
            {sessions.length > 1 ? (
              <Pressable onPress={onRevokeOthers}>
                <Text style={styles.signOutOthers}>Sign out others</Text>
              </Pressable>
            ) : null}
          </View>

          {sessions.length === 0 ? (
            <View style={styles.deviceRow}>
              <Icon name="smartphone" size={20} color={colors.outline} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{deviceName}</Text>
                <Text style={styles.deviceLocation}>Current session</Text>
              </View>
              <View style={styles.greenDotSmall} />
            </View>
          ) : (
            <>
              {sessions
                .filter(session => session.is_current)
                .map(session => (
                  <View key={session.id} style={styles.deviceRow}>
                    <Icon name="smartphone" size={20} color={colors.outline} />
                    <View style={styles.deviceInfo}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>
                          {session.name || deviceName}
                        </Text>
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      </View>
                      <Text style={styles.deviceLocation}>
                        {session.last_used_at
                          ? `Last active ${new Date(session.last_used_at).toLocaleDateString()}`
                          : 'Session active'}
                      </Text>
                    </View>
                    <View style={styles.greenDotSmall} />
                  </View>
                ))}

              {/* Group all other (computer) sessions into a single entry */}
              {sessions.filter(session => !session.is_current).length > 0 && (
                <View style={styles.deviceRow}>
                  <Icon name="laptop-windows" size={20} color={colors.outline} />
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName}>
                        Other Sessions (Computer)
                      </Text>
                    </View>
                    <Text style={styles.deviceLocation}>
                      {sessions.filter(session => !session.is_current).length} other session
                      {sessions.filter(session => !session.is_current).length === 1 ? '' : 's'} (Computer)
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deviceRemoveBtn}
                    onPress={onRevokeOthers}
                  >
                    <Icon name="logout" size={18} color={colors.outline} />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </SectionCard>
      <View style={styles.bottomPad} />
    </View>
  );
}

/* ─── Preferences Tab ────────────────────────────────── */

function PreferencesTab({
  smsTracking,
  onSmsTracking,
  priceAlerts,
  onPriceAlerts,
}: {
  smsTracking: boolean;
  onSmsTracking: () => void;
  priceAlerts: boolean;
  onPriceAlerts: () => void;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Trade Alerts */}
      <SectionCard title="Trade Alerts & Notifications" icon="campaign">
        <View style={styles.toggleRow}>
          <View style={styles.toggleRowBody}>
            <Text style={styles.toggleLabel}>
              SMS & WhatsApp Order Tracking
            </Text>
            <Text style={styles.toggleSub}>
              Instant alerts for dispatch, waybills, and delivery OTP
            </Text>
          </View>
          <Toggle value={smsTracking} onValueChange={onSmsTracking} />
        </View>

        <Sep />

        <View style={styles.toggleRow}>
          <View style={styles.toggleRowBody}>
            <Text style={styles.toggleLabel}>
              Price Drops & Wholesale Bulk RFQs
            </Text>
            <Text style={styles.toggleSub}>
              Updates on Gulu grain market rates & supplier auctions
            </Text>
          </View>
          <Toggle value={priceAlerts} onValueChange={onPriceAlerts} />
        </View>
      </SectionCard>

      {/* Tax Records & Data */}
      <SectionCard title="Tax Records & Data" icon="shield">
        <Pressable
          style={styles.dataRow}
          onPress={() => Alert.alert('URA EFRIS', 'Coming soon.')}
        >
          <View style={styles.dataRowLeft}>
            <Icon name="description" size={20} color={colors.outline} />
            <View>
              <Text style={styles.dataRowLabel}>URA EFRIS Tax Invoices</Text>
              <Text style={styles.dataRowSub}>
                Download quarterly fiscal trade statements
              </Text>
            </View>
          </View>
          <Icon name="file-download" size={18} color={colors.outline} />
        </Pressable>

        <Sep />

        <Pressable
          style={styles.dataRow}
          onPress={() => Alert.alert('Export', 'Coming soon.')}
        >
          <View style={styles.dataRowLeft}>
            <Icon name="cloud-download" size={20} color={colors.outline} />
            <View>
              <Text style={styles.dataRowLabel}>
                Export Account Activity Log
              </Text>
              <Text style={styles.dataRowSub}>
                Complete audit trail in CSV format
              </Text>
            </View>
          </View>
          <Icon name="file-download" size={18} color={colors.outline} />
        </Pressable>

        <Sep />

        <Pressable
          style={styles.deactivateBtn}
          onPress={() =>
            Alert.alert(
              'Deactivate Account',
              'Are you sure? This action is permanent.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Deactivate',
                  style: 'destructive',
                  onPress: () => {},
                },
              ],
            )
          }
        >
          <Icon name="no-accounts" size={16} color={colors.error} />
          <Text style={styles.deactivateText}>
            Deactivate or Terminate Wholesale Account
          </Text>
        </Pressable>
      </SectionCard>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

/* ─── Styles ─────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header */
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBtn: {
    padding: 8,
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
  },

  /* Profile Card */
  profileCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  avatarFallback: {
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.statusSuccess,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.sm + 4,
  },
  profileName: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#333e48',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  roleBadgeText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 9,
  },
  editBtn: {
    padding: 4,
  },
  profileContacts: {
    marginTop: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },

  /* Chips */
  chipsScroll: {
    maxHeight: 48,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },

  /* Body / Scroll */
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  /* Tab content: no extra horizontal padding (ScrollView contentContainer already provides it) */
  tabContent: {
    gap: spacing.md,
  },
  bottomPad: {
    height: spacing.xxl,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  strictBadge: {
    backgroundColor: '#d4edda',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  strictBadgeOff: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  strictBadgeText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  strictBadgeTextOff: {
    color: colors.outline,
  },

  /* Separator */
  sep: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },

  /* Toggle Row */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleRowBody: {
    flex: 1,
    gap: 2,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  toggleSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  toggleSubBold: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  toggleOn: {
    backgroundColor: colors.statusSuccess,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.outline,
  },
  toggleDotOn: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },

  /* Password Row */
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  updateBtn: {
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  updateBtnText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
    fontWeight: '600',
  },

  /* Device Sessions */
  deviceSection: {
    gap: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceHeaderLabel: {
    ...typography.labelSm,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signOutOthers: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: colors.statusSuccess,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  currentBadgeText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 9,
  },
  deviceLocation: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  greenDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
    marginTop: 4,
  },
  deviceRemoveBtn: {
    padding: 2,
    marginTop: 2,
  },

  /* Credits Box */
  creditsBox: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  creditsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditsLabel: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditsAmount: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  topUpBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topUpBtnText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '600',
  },
  creditsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.sm,
  },
  creditsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsFooterLabel: {
    ...typography.bodySm,
    color: colors.primaryFixedDim,
  },
  creditsFooterValue: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: '600',
  },

  /* Payment Methods */
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: {
    ...typography.labelSm,
    fontWeight: '800',
    color: colors.black,
  },
  paymentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  primaryBadge: {
    backgroundColor: '#333e48',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  primaryBadgeText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 9,
  },
  paymentPhone: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  paymentNote: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '500',
    marginTop: 1,
  },
  manageLink: {
    ...typography.labelMd,
    color: colors.secondary,
  },

  /* Add Payment Button */
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  addPaymentText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
    fontWeight: '600',
  },

  /* Logistics */
  logisticsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  logisticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  logisticsInfo: {
    flex: 1,
  },
  logisticsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logisticsLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: '#333e48',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 9,
  },
  logisticsSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  /* Data Rows */
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dataRowLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  dataRowSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },

  /* Deactivate */
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  deactivateText: {
    ...typography.labelMd,
    color: colors.error,
  },

  /* Image Modal */
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  imageModalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '70%',
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  imageModalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  imageModalBody: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  imageModalPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surfaceContainerLow,
  },
  imageModalPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
  },
  imageModalPlaceholderText: {
    ...typography.headlineLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  imageModalHint: {
    ...typography.bodySm,
    color: colors.outline,
  },
  imageModalActions: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  imageModalActionBtn: {
    height: 48,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  imageModalActionText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  imageModalActionSecondary: {
    backgroundColor: colors.surfaceContainerLow,
  },

  /* Profile Tab */
  profileTabContent: {
    gap: spacing.md,
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  profileFieldInfo: {
    flex: 1,
  },
  profileFieldLabel: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: 2,
  },
  profileFieldValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
