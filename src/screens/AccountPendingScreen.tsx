import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiResendActivation } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

/**
 * Mobile equivalent of the website's account_pending blade:
 * inactive users are parked here after register/login until they activate
 * (or see a suspended state if manually deactivated).
 */
export function AccountPendingScreen() {
  const { user, token, logout } = useAuth();
  const { goBack, navigate, params } = useNavigation();
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<'success' | 'error'>('success');
  const [browseOpen, setBrowseOpen] = useState(false);

  const email =
    (typeof params?.email === 'string' && params.email) ||
    user?.email ||
    '';
  const deactivated = params?.deactivated === true;

  const handleResend = useCallback(async () => {
    if (!token || resending) return;
    setResending(true);
    setNotice(null);
    try {
      const msg = await apiResendActivation(token);
      setNoticeKind('success');
      setNotice(msg);
    } catch (e) {
      setNoticeKind('error');
      setNotice(e instanceof Error ? e.message : 'Could not resend the email. Try again later.');
    } finally {
      setResending(false);
    }
  }, [token, resending]);

  const handleSignOut = () => {
    logout();
    navigate('Home');
  };

  if (deactivated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Account" titleStyle={styles.headerTitle} showBack onBack={goBack} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.ring, styles.ringDanger]}>
              <Icon name="person" size={34} color={colors.statusFlash} />
            </View>
            <Text style={styles.pillDanger}>ACCOUNT SUSPENDED</Text>
            <Text style={styles.title}>Account Deactivated</Text>
            <Text style={styles.subtitle}>
              Your account was previously active but has been deactivated. If you believe this was a
              mistake or would like to request reactivation, please contact support.
            </Text>
          </View>

          <View style={[styles.banner, styles.bannerDanger]}>
            <Icon name="info" size={16} color="#842029" />
            <Text style={styles.bannerDangerText}>
              Need help? Our support team typically responds within 24 hours.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>WHAT YOU CAN DO</Text>

          <Pressable style={styles.actionRow} onPress={() => navigate('HelpCenter')}>
            <View style={[styles.actionIcon, { backgroundColor: '#fdf2f2' }]}>
              <Icon name="support-agent" size={18} color={colors.statusFlash} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSub}>Request account reactivation</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.outline} />
          </Pressable>

          <Pressable style={styles.actionRow} onPress={() => navigate('Home')}>
            <View style={[styles.actionIcon, { backgroundColor: '#fdf6ee' }]}>
              <Icon name="home" size={18} color={colors.secondary} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Back to Home</Text>
              <Text style={styles.actionSub}>Browse without signing in</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.outline} />
          </Pressable>

          <Button
            label="Sign Out"
            variant="outline"
            fullWidth
            onPress={handleSignOut}
            style={{ marginTop: spacing.md, borderColor: colors.statusFlash, borderWidth: 1.5 }}
          />
        </ScrollView>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Activate Account" titleStyle={styles.headerTitle} showBack onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.ring}>
            <Icon name="email" size={34} color={colors.secondary} />
          </View>
          <Text style={styles.pill}>CHECK YOUR EMAIL</Text>
          <Text style={styles.title}>Account Created Successfully</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent an activation link to{' '}
            <Text style={styles.emailStrong}>{email}</Text>. Open it to activate your account, then
            sign in here.
          </Text>
        </View>

        <View style={styles.banner}>
          <Icon name="info" size={16} color="#856404" />
          <Text style={styles.bannerText}>
            Didn&apos;t get it? Check your <Text style={styles.bold}>spam/junk</Text> folder and mark
            it as <Text style={styles.bold}>Not spam</Text>.
          </Text>
        </View>

        {notice ? (
          <View style={[styles.banner, noticeKind === 'success' ? styles.bannerOk : styles.bannerErr]}>
            <Icon
              name={noticeKind === 'success' ? 'check-circle' : 'error-outline'}
              size={16}
              color={noticeKind === 'success' ? '#065f46' : colors.statusFlash}
            />
            <Text style={noticeKind === 'success' ? styles.bannerOkText : styles.bannerErrText}>
              {notice}
            </Text>
          </View>
        ) : null}

        <Button
          label={resending ? 'Sending...' : 'Resend Activation Email'}
          variant="primary"
          icon="send"
          fullWidth
          disabled={!token || resending}
          onPress={handleResend}
          style={styles.resendBtn}
        />

        <Text style={styles.sectionLabel}>WHILE YOU WAIT</Text>

        {/* Browse the Marketplace — expandable */}
        <View style={styles.actionCard}>
          <Pressable
            style={styles.actionRowBare}
            onPress={() => setBrowseOpen(o => !o)}
            accessibilityRole="button"
            accessibilityLabel={browseOpen ? 'Collapse marketplace options' : 'Expand marketplace options'}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fdf6ee' }]}>
              <Icon name="storefront" size={18} color={colors.secondary} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Browse the Marketplace</Text>
              <Text style={styles.actionSub}>Explore products while you wait</Text>
            </View>
            <Icon
              name={browseOpen ? 'keyboard-arrow-up' : 'expand-more'}
              size={22}
              color={colors.secondary}
            />
          </Pressable>

          {browseOpen ? (
            <View style={styles.dropdown}>
              <Text style={styles.dropdownHint}>
                While you wait you can: browse products, view product details, make corporate
                inquiries, and add products to your wishlist.
              </Text>
              {[
                {
                  key: 'products',
                  icon: 'shopping-bag' as const,
                  title: 'Browse products',
                  sub: 'Search categories, deals and featured stock',
                  onPress: () => navigate('Marketplace'),
                },
                {
                  key: 'details',
                  icon: 'info' as const,
                  title: 'View product details',
                  sub: 'Specs, pricing, stock and vendor info',
                  onPress: () => navigate('Marketplace'),
                },
                {
                  key: 'inquiry',
                  icon: 'request-quote' as const,
                  title: 'Corporate inquiries',
                  sub: 'Request bulk quotes (B2B RFQs)',
                  onPress: () => navigate('MyInquiries'),
                },
                {
                  key: 'wishlist',
                  icon: 'favorite-border' as const,
                  title: 'Wishlist',
                  sub: 'Save products for after activation',
                  onPress: () => navigate('Wishlist'),
                },
              ].map(item => (
                <Pressable key={item.key} style={styles.dropdownItem} onPress={item.onPress}>
                  <View style={styles.dropdownIcon}>
                    <Icon name={item.icon} size={16} color={colors.secondary} />
                  </View>
                  <View style={styles.actionBody}>
                    <Text style={styles.dropdownTitle}>{item.title}</Text>
                    <Text style={styles.dropdownSub}>{item.sub}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.outline} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable style={styles.actionRow} onPress={() => navigate('HelpCenter')}>
          <View style={[styles.actionIcon, { backgroundColor: '#f0f4f8' }]}>
            <Icon name="help-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Help Center</Text>
            <Text style={styles.actionSub}>FAQ and support</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.outline} />
        </Pressable>

        <Pressable style={styles.actionRow} onPress={() => navigate('Contact')}>
          <View style={[styles.actionIcon, { backgroundColor: '#f0f4f8' }]}>
            <Icon name="mail" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Email Support</Text>
            <Text style={styles.actionSub}>support@jemi-na.com</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.outline} />
        </Pressable>

        <View style={styles.ctaRow}>
          <Pressable style={styles.ctaGhost} onPress={() => navigate('Home')}>
            <Text style={styles.ctaGhostText}>Home</Text>
          </Pressable>
          <Pressable style={styles.ctaPrimary} onPress={() => navigate('Marketplace')}>
            <Text style={styles.ctaPrimaryText}>Continue Browsing</Text>
            <Icon name="arrow-forward" size={16} color={colors.onPrimary} />
          </Pressable>
        </View>

        <Pressable style={styles.signOut} onPress={handleSignOut} hitSlop={6} accessibilityRole="button">
          <Icon name="logout" size={18} color={colors.statusFlash} />
          <Text style={styles.signOutText}>Sign Out</Text>
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
  headerTitle: {
    ...typography.headlineSm,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xs,
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ringDanger: {
    borderColor: colors.statusFlash,
    borderStyle: 'solid',
  },
  pill: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  pillDanger: {
    ...typography.labelSm,
    color: colors.statusFlash,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailStrong: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm + 2,
    backgroundColor: '#fffdf5',
    borderColor: '#ffeaa7',
  },
  bannerText: {
    ...typography.bodySm,
    color: '#856404',
    flex: 1,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
  bannerDanger: {
    backgroundColor: '#fdf2f2',
    borderColor: '#f5c6cb',
  },
  bannerDangerText: {
    ...typography.bodySm,
    color: '#842029',
    flex: 1,
    lineHeight: 18,
  },
  bannerOk: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  bannerOkText: {
    ...typography.bodySm,
    color: '#065f46',
    flex: 1,
    lineHeight: 18,
  },
  bannerErr: {
    backgroundColor: colors.errorContainer,
    borderColor: '#f5c6cb',
  },
  bannerErrText: {
    ...typography.bodySm,
    color: colors.onErrorContainer,
    flex: 1,
    lineHeight: 18,
  },
  resendBtn: {
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: {
    flex: 1,
  },
  actionTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  actionSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ctaGhost: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  ctaGhostText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  ctaPrimary: {
    flex: 1.4,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaPrimaryText: {
    ...typography.labelLg,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.statusFlash,
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: spacing.sm,
  },
  signOutText: {
    ...typography.labelLg,
    color: colors.statusFlash,
    fontWeight: '700',
  },
  actionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionRowBare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
  },
  dropdown: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  dropdownHint: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dropdownIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#fdf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  dropdownSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  spacerBtn: {
    marginTop: spacing.md,
    borderColor: colors.statusFlash,
    borderWidth: 1.5,
  },
});
