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
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetMessages, apiMarkMessageRead, ApiMessage } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessagesScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ApiMessage | null>(null);
  

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
        <View style={styles.center}>
          <Icon name="mail" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to view messages</Text>
          <Text style={styles.centerSub}>Receive order updates, offers, and support replies here.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => {}} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  if (active) {
    return (
      <View style={styles.root}>
        <AppHeader title="Message" showBack onBack={closeDetail} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Pressable onPress={closeDetail} hitSlop={8} style={styles.backRow}>
              <Icon name="chevron-right" size={22} color={colors.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={styles.backText}>All messages</Text>
            </Pressable>
          </View>
          <Text style={styles.detailSubject}>{active.subject}</Text>
          {active.created_at ? <Text style={styles.detailDate}>{formatDateTime(active.created_at)}</Text> : null}
          {active.name ? (
            <View style={styles.senderRow}>
              <View style={styles.senderAvatar}>
                <Text style={styles.senderAvatarText}>{(active.name || 'S').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.senderName}>From {active.name}</Text>
            </View>
          ) : active.type ? (
            <Text style={styles.senderName}>From JEMINA Support · {active.type}</Text>
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
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load messages</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => loadMessages()} style={styles.centerBtn} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Icon name="mail" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No messages</Text>
          <Text style={styles.centerSub}>Order confirmations and support replies will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {messages.map(message => {
            const isNew = message.status !== 'read';
            return (
              <Pressable key={message.id} style={[styles.card, isNew && styles.cardNew]} onPress={() => openMessage(message)}>
                {isNew ? <View style={styles.unreadDot} /> : null}
                <View style={styles.cardHeader}>
                  <Icon name={message.type === 'order' ? 'receipt-long' : 'support-agent'} size={20} color={isNew ? colors.secondary : colors.outline} />
                  <Text style={[styles.cardFrom, isNew && styles.cardFromNew]} numberOfLines={1}>
                    {message.name && message.name !== 'JEMINA' ? message.name : 'JEMINA Support'}
                  </Text>
                </View>
                <Text style={[styles.cardSubject, isNew && styles.cardSubjectNew]} numberOfLines={1}>{message.subject}</Text>
                <Text style={styles.cardPreview} numberOfLines={2}>{message.message}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>{formatDateTime(message.created_at)}</Text>
                  {!isNew ? <Text style={styles.readText}>Read</Text> : null}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  centerSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  newBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
  },
  newBannerText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardNew: {
    borderColor: colors.secondary,
    backgroundColor: colors.surfaceContainerLow,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardFrom: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  cardFromNew: {
    color: colors.secondary,
    fontWeight: '700',
  },
  cardSubject: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  cardSubjectNew: {
    color: colors.primary,
    fontWeight: '700',
  },
  cardPreview: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardDate: {
    ...typography.labelSm,
    color: colors.outline,
  },
  readText: {
    ...typography.labelSm,
    color: colors.outline,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '600',
  },
  detailHeader: {
    marginBottom: spacing.sm,
  },
  detailSubject: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
  },
  detailDate: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderAvatarText: {
    ...typography.headlineMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  senderName: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  messageDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  detailBody: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
  },
});