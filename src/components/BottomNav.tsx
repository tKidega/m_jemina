import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { TabName, useNavigation } from '../navigation/NavigationContext';

const TABS: { tab: TabName; label: string; icon: IconName; filledIcon: IconName }[] = [
  { tab: 'Home', label: 'Home', icon: 'home', filledIcon: 'home' },
  { tab: 'Marketplace', label: 'B2B', icon: 'storefront', filledIcon: 'storefront' },
  { tab: 'Cart', label: 'Cart', icon: 'shopping-basket', filledIcon: 'shopping-basket' },
  { tab: 'Profile', label: 'Profile', icon: 'person', filledIcon: 'person' },
];

export function BottomNav() {
  const insets = useSafeAreaInsets();
  const { tab, switchTab } = useNavigation();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map(t => {
        const active = tab === t.tab;
        return (
          <Pressable
            key={t.tab}
            style={styles.tab}
            onPress={() => switchTab(t.tab)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Icon
              name={t.icon}
              size={24}
              color={active ? colors.secondary : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  label: {
    ...typography.labelSm,
    marginTop: 2,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
});
