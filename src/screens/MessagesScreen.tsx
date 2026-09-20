import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon, IconName } from '../components/Icon';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetMessages, apiMarkMessageRead, ApiMessage } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatShort(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleString(undefined, opts);
}

function categoryFor(type?: string): { label: string; icon: IconName; bg: string; fg: string } {
  switch (type) {
    case 'vendor':
      return { label: 'Wholesale Vendor', icon: 'storefront', bg: '#fff3e0', fg: '#e65100' };
    case 'blogger':
      return { label: 'Blog & Updates', icon: 'description', bg: '#f3e5f5', fg: '#7b1fa2' };
    case 'contact':
      return { label: 'Support Desk', icon: 'support-agent', bg: '#e3f2fd', fg: '#1565c0' };
    default:
      return { label: 'General / Official', icon: 'mail', bg: colors.surfaceContainer, fg: colors.onSurfaceVariant };
  }
}

type Filter = 'all' | 'unread' | 'vendor' | 'general' | 'contact' | 'blogger';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'vendor', label: 'Wholesale' },
  { key: 'general', label: 'General' },
  { key: 'contact', label: 'Support' },
  { key: 'blogger', label: 'Blog' },
];

export function MessagesScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ApiMessage | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const loadMessages = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await apiGetMessages(token);
        setMessages(data.messages);
        setNewCount(data.new_count);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const onRefresh = useCallback(() => loadMessages(true), [loadMessages]);

  const matches = (m: ApiMessage, f: Filter): boolean => {
    if (f === 'all') return true;
    if (f === 'unread') return m.status !== 'read';
    return (m.type ?? 'general') === f;
  };

  const visible = filter === 'all' ? messages : messages.filter(m => matches(m, filter));
  const unreadIn = (f: Filter) => messages.filter(m => matches(m, f)).length;
  const unreadCount = (f: Filter) =>
    f === 'unread' ? newCount : messages.filter(m => matches(m, f) && m.status !== 'read').length;

  const openMessage = async (message: ApiMessage) => {
    setActive(message);
    if (token && message.status !== 'read') {
      apiMarkMessageRead(token, message.id).catch(() => {});
      setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, status: 'read' } : m)));
      setNewCount(prev => Math.max(0, prev - 1));
    }
  };

  const closeDetail = () => setActive(null);

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Messages" showBack onBack={goBack} />
        <EmptyState
          icon="mail"
          title="Sign in to view messages"
          subtitle="Receive order updates, offers, and support replies here."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  if (active) {
    const cat = categoryFor(active.type);
    return (
      <View style={styles.root}>
        <AppHeader title="Message" showBack onBack={closeDetail} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Pressable onPress={closeDetail} hitSlop={8} style={styles.backRow}>
              <Icon name="arrow-back" size={18} color={colors.secondary} />
              <Text style={styles.backText}>All messages</Text>
            </Pressable>
          </View>
          <View style={[styles.catChip, { backgroundColor: cat.bg }]}>
            <Icon name={cat.icon} size={14} color={cat.fg} />
            <Text style={[styles.catChipText, { color: cat.fg }]}>{cat.label}</Text>
          </View>
          <Text style={styles.detailSubject}>{active.subject}</Text>
          {active.created_at ? <Text style={styles.detailDate}>{formatShort(active.created_at)}</Text> : null}
          {active.name ? (
            <View style={styles.senderRow}>
              <View style={styles.senderAvatar}>
                <Text style={styles.senderAvatarText}>{(active.name || 'S').charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.senderName}>From {active.name}</Text>
                <Text style={styles.senderTag}>{cat.label}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.messageDivider} />
          <Text style={styles.detailBody}>{active.message}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Messages" showBack onBack={goBack} />
      {newCount > 0 ? (
        <View style={styles.newBanner}>
          <Icon name="mail" size={18} color={colors.onPrimary} />
          <Text style={styles.newBannerText}>{newCount} unread message{newCount === 1 ? '' : 's'}</Text>
        </View>
      ) : null}

      {/* Category summary */}
      <View style={styles.metaBar}>
        {[['Inbox', unreadIn('all')], ['Unread', unreadIn('unread')]].map(([label, count]) => (
          <View key={label as string} style={styles.metaItem}>
            <Text style={styles.metaCount}>{count as number}</Text>
            <Text style={styles.metaLabel}>{label as string}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => {
          const selected = filter === f.key;
          return (
            <Pressable key={f.key} style={[styles.filterChip, selected && styles.filterChipOn]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterTxt, selected && styles.filterTxtOn]}>{f.label}</Text>
              {unreadCount(f.key) > 0 ? (
                <View style={[styles.countPill, selected && styles.countPillOn]}>
                  <Text style={[styles.countPillTxt, selected && styles.countPillTxtOn]}>{unreadCount(f.key)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <SectionLoader text="Loading messages..." icon="mail" />
      ) : error ? (
        <EmptyState icon="error-outline" title="Couldn't load messages" subtitle={error} actionLabel="Try Again" onAction={() => loadMessages()} />
      ) : visible.length === 0 ? (
        <EmptyState icon="mail" title="No messages" subtitle="Order confirmations and support replies will appear here." />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {visible.map(message => {
            const isNew = message.status !== 'read';
            const cat = categoryFor(message.type);
            return (
              <Pressable key={message.id} style={[styles.card, isNew && styles.cardNew]} onPress={() => openMessage(message)}>
                <View style={styles.cardIcon}><Icon name={cat.icon} size={20} color={cat.fg} /></View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardFrom, isNew && styles.cardFromNew]} numberOfLines={1}>
                      {message.name && message.name !== 'JEMINA' ? message.name : 'JEMINA Support'}
                    </Text>
                    {isNew ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <View style={styles.cardSubRow}>
                    <Text style={[styles.catTxt, { color: cat.fg }]}>{cat.label}</Text>
                    {message.created_at ? <Text style={styles.cardDate}>{formatShort(message.created_at)}</Text> : null}
                  </View>
                  <Text style={[styles.cardSubject, isNew && styles.cardSubjectNew]} numberOfLines={1}>{message.subject}</Text>
                  <Text style={styles.cardPreview} numberOfLines={2}>{message.message}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  newBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.secondary, paddingVertical: spacing.sm },
  newBannerText: { ...typography.labelMd, color: colors.onPrimary, fontWeight: '700' },
  metaBar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2 },
  metaItem: { alignItems: 'center' },
  metaCount: { ...typography.headlineLg, color: colors.primary, fontWeight: '800' },
  metaLabel: { ...typography.labelSm, color: colors.outline, textTransform: 'uppercase', letterSpacing: 0.6 },
  filterRow: { padding: spacing.md, gap: spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceContainerLowest },
  filterChipOn: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  filterTxt: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  filterTxtOn: { color: colors.onPrimary, fontWeight: '700' },
  countPill: { minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  countPillOn: { backgroundColor: colors.onPrimary },
  countPillTxt: { ...typography.labelSm, color: colors.onSecondary, fontWeight: '700', fontSize: 10 },
  countPillTxtOn: { color: colors.primaryContainer },
  card: { flexDirection: 'row', gap: spacing.sm + 2, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  cardNew: { borderColor: colors.secondary, backgroundColor: colors.surfaceContainerLow },
  cardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLow },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardFrom: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600', flex: 1 },
  cardFromNew: { color: colors.primary, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  catTxt: { ...typography.labelSm, fontWeight: '600', fontSize: 10 },
  cardDate: { ...typography.labelSm, color: colors.outline },
  cardSubject: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '600', marginTop: 2 },
  cardSubjectNew: { color: colors.primary, fontWeight: '700' },
  cardPreview: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { ...typography.labelMd, color: colors.secondary, fontWeight: '600' },
  detailHeader: { marginBottom: spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, marginBottom: spacing.sm },
  catChipText: { ...typography.labelSm, fontWeight: '700' },
  detailSubject: { ...typography.headlineLg, color: colors.primary, fontWeight: '700' },
  detailDate: { ...typography.labelSm, color: colors.outline, marginTop: 2 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  senderAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  senderAvatarText: { ...typography.headlineMd, color: colors.onSecondary, fontWeight: '700' },
  senderName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  senderTag: { ...typography.labelSm, color: colors.outline },
  messageDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.lg },
  detailBody: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 22 },
});
