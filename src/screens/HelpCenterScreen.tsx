import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { ChatView } from '../components/ChatView';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetTickets,
  apiCreateTicket,
  apiChatAsk,
  makeConversationId,
  ApiHelpTicket,
} from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: colors.statusFlash,
  in_progress: colors.statusFeatured,
  resolved: colors.statusSuccess,
  closed: colors.outline,
};

function ticketStatusColor(status?: string): string {
  return TICKET_STATUS_COLORS[status ?? ''] ?? colors.outline;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TICKET_TYPES = [
  { key: 'general', label: 'General Enquiry', icon: 'help-outline' as const },
  { key: 'technical', label: 'Technical Issue', icon: 'build' as const },
  { key: 'billing', label: 'Billing / Payment', icon: 'credit-card' as const },
  { key: 'order', label: 'Order / Delivery', icon: 'receipt-long' as const },
  { key: 'other', label: 'Other', icon: 'more-horiz' as const },
];

const PRIORITIES = ['low', 'medium', 'high'];

function TicketCard({ ticket }: { ticket: ApiHelpTicket }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable style={styles.card} onPress={() => setExpanded(!expanded)}>
      <View style={styles.cardTop}>
        <Text style={styles.cardNumber}>{ticket.ticket_number || `#${ticket.id}`}</Text>
        <View style={[styles.statusChip, { backgroundColor: ticketStatusColor(ticket.status) }]}>
          <Text style={styles.statusChipText}>{(ticket.status_label ?? ticket.status).toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardType}>{(ticket.type_label ?? ticket.type ?? '').toUpperCase()}</Text>
        <View style={styles.priorityChip}>
          <Text style={styles.priorityText}>{ticket.priority}</Text>
        </View>
        {ticket.created_at ? <Text style={styles.cardDate}>{formatDate(ticket.created_at)}</Text> : null}
      </View>
      <Text style={styles.cardSubject} numberOfLines={2}>{ticket.subject}</Text>
      {expanded ? (
        <View style={styles.cardExpanded}>
          <Text style={styles.cardDesc}>{ticket.description}</Text>
          {ticket.response ? (
            <View style={styles.responseBox}>
              <Text style={styles.responseLabel}>Support response</Text>
              <Text style={styles.responseText}>{ticket.response}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function HelpCenterScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [mode, setMode] = useState<'chat' | 'tickets'>('chat');
  const [tickets, setTickets] = useState<ApiHelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId] = useState(() => makeConversationId());

  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTickets = useCallback(
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
        const data = await apiGetTickets(token);
        setTickets(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tickets.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = useCallback(() => loadTickets(true), [loadTickets]);

  const openCreate = () => {
    setShowCreate(true);
    setType('general');
    setPriority('medium');
    setSubject('');
    setDescription('');
    setFormError(null);
  };

  const closeCreate = () => {
    if (submitting) {
      return;
    }
    setShowCreate(false);
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setFormError('Please provide a subject and description.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiCreateTicket(token, {
        type,
        priority,
        subject: subject.trim(),
        description: description.trim(),
      });
      setShowCreate(false);
      setSubject('');
      setDescription('');
      loadTickets();
      Alert.alert('Ticket created', 'Our support team has been notified. We will get back to you soon.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Help & Support" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="support-agent" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to contact support</Text>
          <Text style={styles.centerSub}>Reach our support team for orders, billing, and technical help.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => {}} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Help & Support" showBack onBack={goBack} />

      <View style={styles.modeBar}>
        <Pressable style={[styles.modeTab, mode === 'chat' && styles.modeTabOn]} onPress={() => setMode('chat')}>
          <Icon name="chat" size={18} color={mode === 'chat' ? colors.secondary : colors.outline} />
          <Text style={[styles.modeText, mode === 'chat' && styles.modeTextOn]}>Chat with JVA</Text>
        </Pressable>
        <Pressable style={[styles.modeTab, mode === 'tickets' && styles.modeTabOn]} onPress={() => setMode('tickets')}>
          <Icon name="support-agent" size={18} color={mode === 'tickets' ? colors.secondary : colors.outline} />
          <Text style={[styles.modeText, mode === 'tickets' && styles.modeTextOn]}>My Requests</Text>
        </Pressable>
      </View>

      {mode === 'chat' ? (
        <ChatView
          assistantName="JVA"
          greeting="Hi! I'm JVA, your Jemina Virtual Assistant. Ask me anything about orders, returns, payments, or the marketplace."
          onSend={message => apiChatAsk(token, message, conversationId)}
        />
      ) : (
        <View style={styles.root}>
          <View style={styles.topBar}>
            <Button label="+ New Request" variant="secondary" onPress={openCreate} style={styles.newBtn} />
          </View>
          {loading ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Loading tickets...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Icon name="error-outline" size={48} color={colors.outlineVariant} />
              <Text style={styles.centerTitle}>Couldn't load tickets</Text>
              <Text style={styles.centerSub}>{error}</Text>
              <Button label="Try Again" variant="primary" fullWidth onPress={() => loadTickets()} style={styles.centerBtn} />
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.center}>
              <Icon name="support-agent" size={56} color={colors.outlineVariant} />
              <Text style={styles.centerTitle}>No support requests yet</Text>
              <Text style={styles.centerSub}>Need help? Send us a request and we'll respond promptly.</Text>
              <Button label="Contact Support" variant="primary" fullWidth onPress={openCreate} style={styles.centerBtn} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
            >
              {tickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
              <Text style={styles.footerText}>Tap a ticket to view details and responses.</Text>
            </ScrollView>
          )}
        </View>
      )}

      {/* Create ticket modal */}
      {showCreate ? (
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Support Request</Text>
              <Pressable onPress={closeCreate} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {TICKET_TYPES.map(t => (
                <Pressable
                  key={t.key}
                  style={[styles.typeCard, type === t.key && styles.typeCardOn]}
                  onPress={() => setType(t.key)}
                >
                  <Icon name={t.icon} size={20} color={type === t.key ? colors.secondary : colors.outline} />
                  <Text style={[styles.typeText, type === t.key && styles.typeTextOn]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <Pressable
                  key={p}
                  style={[styles.priorityPill, priority === p && styles.priorityPillOn]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityPillText, priority === p && styles.priorityPillTextOn]}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of your issue"
              placeholderTextColor={colors.outline}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Button
              label={submitting ? 'Submitting...' : 'Submit Request'}
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              style={styles.submitBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modeBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  modeTabOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  modeText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  modeTextOn: {
    color: colors.onSecondaryContainer,
  },
  newBtn: {
    alignSelf: 'flex-start',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardNumber: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusChipText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  cardType: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  priorityChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceContainerLow,
  },
  priorityText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardDate: {
    ...typography.labelSm,
    color: colors.outline,
  },
  cardSubject: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  cardExpanded: {
    marginTop: spacing.sm,
  },
  cardDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  responseBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  responseLabel: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  responseText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
  },
  formError: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  typeCardOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  typeText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  typeTextOn: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
  },
  priorityPillOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  priorityPillText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  priorityPillTextOn: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
  },
  textarea: {
    minHeight: 100,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});