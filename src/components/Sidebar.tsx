import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { RouteName, TabName, useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../state/AuthContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface SidebarLink {
  label: string;
  icon: IconName;
  route?: RouteName;
  tab?: TabName;
}

const SHOP_LINKS: SidebarLink[] = [
  { label: 'Home', icon: 'home', tab: 'Home' },
  { label: 'B2B', icon: 'storefront', tab: 'Marketplace' },
  { label: 'Cart', icon: 'shopping-cart', tab: 'Cart' },
];

const MY_ACCOUNT_LINKS: SidebarLink[] = [
  { label: 'Profile', icon: 'person', tab: 'Profile' },
  { label: 'Messages', icon: 'mail', route: 'Messages' },
  { label: 'Track Orders', icon: 'track-changes', route: 'OrderTracking' },
  { label: 'My Orders', icon: 'receipt-long', route: 'Orders' },
  { label: 'Surveys', icon: 'edit-note', route: 'Surveys' },
  { label: 'Address Book', icon: 'home', route: 'AddressBook' },
];

const ACCOUNT_LINKS: SidebarLink[] = [
  { label: 'Help Center', icon: 'support-agent', route: 'HelpCenter' },
];

const COMPANY_LINKS: SidebarLink[] = [
  { label: 'About Us', icon: 'info', route: 'About' },
  { label: 'Services', icon: 'business-center', route: 'Services' },
  { label: 'Contact Us', icon: 'mail', route: 'Contact' },
];

const LEGAL_LINKS: SidebarLink[] = [
  { label: 'Terms of Service', icon: 'description', route: 'TermsOfService' },
  { label: 'Privacy Policy', icon: 'verified-user', route: 'PrivacyPolicy' },
];

const MY_ACCOUNT_SECTION = { title: 'My Account', links: MY_ACCOUNT_LINKS };

const DRAWER_WIDTH = 300;

export function Sidebar() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { sidebarOpen, closeSidebar, navigateFromSidebar, tab, route } = useNavigation();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const sections = useMemo(() => {
    const base: { title: string; links: SidebarLink[] }[] = [];
    base.push({ title: 'Shop', links: SHOP_LINKS });
    if (isAuthenticated) {
      base.push(MY_ACCOUNT_SECTION);
    }
    base.push({ title: 'Account', links: ACCOUNT_LINKS });
    base.push({ title: 'Company', links: COMPANY_LINKS });
    base.push({ title: 'Legal', links: LEGAL_LINKS });
    return base;
  }, [isAuthenticated]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: sidebarOpen ? 0 : -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: sidebarOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sidebarOpen, translateX, backdropOpacity]);

  const handlePress = (link: SidebarLink) => {
    if (link.tab) {
      navigateFromSidebar(link.route ?? 'Home', link.tab);
    } else if (link.route) {
      navigateFromSidebar(link.route);
    }
  };

  return (
    <Animated.View
      style={[styles.overlay, { opacity: backdropOpacity }]}
      pointerEvents={sidebarOpen ? 'auto' : 'none'}
    >
      <Pressable style={styles.backdrop} onPress={closeSidebar} accessibilityRole="button" accessibilityLabel="Close menu" />
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }], paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>J</Text>
          </View>
          <Text style={styles.brandTitle}>JEMINA</Text>
          <Pressable style={styles.closeBtn} onPress={closeSidebar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close menu">
            <Icon name="close" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={styles.brandTagline}>
          <Text style={styles.taglineText}>Marketplace · Gulu, Uganda</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.links.map(link => {
                const active = link.tab ? tab === link.tab : route === link.route;
                return (
                  <Pressable
                    key={link.label}
                    style={styles.link}
                    onPress={() => handlePress(link)}
                    accessibilityRole="button"
                  >
                    <View style={[styles.linkIcon, active && styles.linkIconActive]}>
                      <Icon name={link.icon} size={20} color={active ? colors.onSecondary : colors.onSurfaceVariant} />
                    </View>
                    <Text style={[styles.linkLabel, active && styles.linkLabelActive]}>{link.label}</Text>
                    <Icon name="chevron-right" size={18} color={colors.outline} />
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.supportCard}>
            <Icon name="support-agent" size={22} color={colors.secondary} />
            <View style={styles.supportBody}>
              <Text style={styles.supportTitle}>Need help?</Text>
              <Text style={styles.supportSub}>support@jemi-na.com</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  brandTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  brandTagline: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  taglineText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMd,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconActive: {
    backgroundColor: colors.secondaryContainer,
  },
  linkLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  linkLabelActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  supportBody: {
    flex: 1,
  },
  supportTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  supportSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
});
