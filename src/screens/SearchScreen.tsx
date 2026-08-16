import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const RECENT_KEY = '@jemina_recent_searches';

export function SearchScreen() {
  const { params, goBack, navigate } = useNavigation();
  const [query, setQuery] = useState(String(params?.initialQuery ?? ''));
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then(raw => {
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              setRecent(list.slice(0, 8));
            }
          } catch {
            // ignore corrupt data
          }
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((list: string[]) => {
    setRecent(list);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list)).catch(() => {});
  }, []);

  const runSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recent.filter(r => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      persist(next);
      navigate('SearchResults', { query: trimmed });
    },
    [recent, persist, navigate],
  );

  const clearRecent = useCallback(() => {
    persist([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  }, [persist]);

  return (
    <View style={styles.root}>
      <AppHeader title="Search" showBack onBack={goBack} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.searchBtn} onPress={() => runSearch(query)}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="history" size={18} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>
            {recent.length > 0 ? (
              <Pressable onPress={clearRecent} hitSlop={8}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {recent.length === 0 ? (
            <Text style={styles.emptyText}>
              Your recent searches will appear here so you can quickly find them again.
            </Text>
          ) : (
            <View style={styles.chips}>
              {recent.map(term => (
                <Pressable key={term} style={styles.chip} onPress={() => runSearch(term)}>
                  <Icon name="history" size={15} color={colors.onSurfaceVariant} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBtnText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  clearText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurface,
    flexShrink: 1,
  },
});