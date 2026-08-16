import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { EditProfileScreen } from './EditProfileScreen';
import { PaymentMethodsScreen } from './PaymentMethodsScreen';
import { AddressBookScreen } from './AddressBookScreen';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type SettingsTab = 'profile' | 'payments' | 'address';

const TABS: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'payments', label: 'Payments', icon: 'credit-card' },
  { id: 'address', label: 'Address Book', icon: 'home' },
];

export function AccountSettingsScreen({ initialTab = 'profile' }: { initialTab?: SettingsTab }) {
  const { goBack } = useNavigation();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

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
              <Icon name={t.icon} size={18} color={active ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>
        <View style={[styles.pane, tab !== 'profile' && styles.hidden]}>
          <EditProfileScreen embedded />
        </View>
        <View style={[styles.pane, tab !== 'payments' && styles.hidden]}>
          <PaymentMethodsScreen embedded />
        </View>
        <View style={[styles.pane, tab !== 'address' && styles.hidden]}>
          <AddressBookScreen embedded />
        </View>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  tabActive: {
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.secondaryContainer,
  },
  tabText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.onSecondary,
  },
  body: {
    flex: 1,
  },
  pane: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
