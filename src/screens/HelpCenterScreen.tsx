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
  Linking,
} from 'react-native';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ChatView } from '../components/ChatView';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
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

/* ─── Constants ─────────────────────────────────────── */

type Tab = 'tickets' | 'chatbot' | 'faq';

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: colors.statusFlash,
  in_progress: colors.statusFeatured,
  resolved: colors.statusSuccess,
  closed: colors.outline,
  pending: colors.statusFlash,
};

function ticketStatusColor(status?: string): string {
  return TICKET_STATUS_COLORS[status ?? ''] ?? colors.outline;
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTimeAgo(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}

const TICKET_TYPES = [
  { key: 'general', label: 'General Enquiry', icon: 'help-outline' as const },
  { key: 'technical', label: 'Technical Issue', icon: 'build' as const },
  { key: 'billing', label: 'Billing / Payment', icon: 'credit-card' as const },
  { key: 'order', label: 'Order / Delivery', icon: 'receipt-long' as const },
  { key: 'escrow', label: 'Escrow & Payment', icon: 'lock' as const },
  { key: 'other', label: 'Other', icon: 'more-horiz' as const },
];

const PRIORITIES = ['low', 'medium', 'high'];

const QUICK_PROMPTS = [
  'Track my Escrow Refund',
  'Layibi Depot Hours',
  "Supplier Didn't Deliver",
  'B2B Payment Rails',
];

const FAQ_ITEMS = [
  {
    q: 'How do I create an account and start shopping?',
    a: 'Click "Sign In" at the top right, then use the registration link to fill in your details including name, email, and password, then click "Register". All users are automatically assigned the customer role upon registration.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Mobile Money (MTN & Airtel), Visa, MasterCard, Bitcoin, JEMINA Credits, and Cash on Delivery for eligible locations. All online transactions are secured with encryption.',
  },
  {
    q: 'How can I track my order status?',
    a: 'Once your order is shipped, you receive a tracking number via email and SMS. You can also track your order by logging into your account, navigating to "My Orders", and selecting the specific order for real-time updates.',
  },
  {
    q: 'What is your return and refund policy?',
    a: 'We offer a 30-day return policy for most items. You can return within 30 days of delivery for a full refund or exchange, provided the item is unused and in its original packaging with all accessories.',
  },
  {
    q: 'How do I reset my forgotten password?',
    a: 'Click "Login" and then select "Forgot Password". Enter your registered email address, and we will send you a secure link to reset your password within minutes.',
  },
  {
    q: 'Can I modify or cancel my order after placing it?',
    a: 'You can modify or cancel your order within 1 hour of placement, provided it hasn\'t been processed for shipping. Contact customer service or use "My Orders" in your account to request modifications.',
  },
  {
    q: 'How do I leave a product review?',
    a: 'After completing a purchase, go to "My Orders", select the completed order, and click "Write Review" on the product you wish to review. Your feedback helps other customers make informed decisions.',
  },
  {
    q: 'What should I do if I receive a damaged item?',
    a: 'Contact customer service within 24 hours of delivery with photos of the damage. We will arrange for a replacement or full refund at no additional cost to you.',
  },
  {
    q: 'How do I become a vendor and start selling?',
    a: 'Complete the vendor qualification survey to unlock vendor capabilities. Create your shop profile, which undergoes approval within 24-36 hours. Once approved, your account is upgraded to vendor status.',
  },
  {
    q: 'How do I request a wholesale quote?',
    a: 'Open any product, tap "Bulk Inquiry" or "Inquire", fill in your required quantity and delivery details. Suppliers typically respond within 4 hours with a quote.',
  },
];

/* ─── Main Component ────────────────────────────────── */

export function HelpCenterScreen() {
  const { token, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { goBack, navigate, switchTab } = useNavigation();
  const [activeTab, setActiveTab] = useState<Tab>('tickets');

  /* Tickets state */
  const [tickets, setTickets] = useState<ApiHelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'needs_reply' | 'resolved'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Chat state */
  const [conversationId] = useState(() => makeConversationId());

  /* FAQ state */
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const loadTickets = useCallback(
    async (isRefresh = false) => {
      if (!token) { setLoading(false); return; }
      if (isRefresh) setRefreshing(true); else setLoading(true);
      try {
        setTickets(await apiGetTickets(token));
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

  useEffect(() => { loadTickets(); }, [loadTickets]);
  const onRefresh = useCallback(() => loadTickets(true), [loadTickets]);

  const openCreate = () => {
    setShowCreate(true);
    setType('general');
    setPriority('medium');
    setSubject('');
    setDescription('');
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!token) return;
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

  /* Derived ticket counts */
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'pending' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const filteredTickets = ticketFilter === 'resolved'
    ? tickets.filter(t => t.status === 'resolved' || t.status === 'closed')
    : ticketFilter === 'needs_reply'
      ? tickets.filter(t => t.status === 'open' || t.status === 'pending')
      : tickets;

  /* Not authenticated */
  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Help & Support" showBack onBack={goBack} />
        <EmptyState
          icon="support-agent"
          title="Sign in to contact support"
          subtitle="Reach our support team for orders, billing, and technical help."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Help & Support"
        showBack
        onBack={goBack}
        right={
          <>
            <HeaderNotificationButton />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />

      <ScrollView
        style={styles.rootScroll}
        contentContainerStyle={styles.rootScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={activeTab === 'tickets' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} /> : undefined}
      >
        {/* Hero AI Assistant Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroBotAvatar}>
              <Icon name="smart_toy" size={24} color={colors.onPrimary} />
              <View style={styles.heroOnlineDot} />
            </View>
            <View style={styles.heroBotInfo}>
              <Text style={styles.heroBotName}>Jemina Virtual Assistant</Text>
              <View style={styles.heroBotStatus}>
                <View style={styles.heroStatusPulse} />
                <Text style={styles.heroStatusText}>Online - Instant Answers</Text>
              </View>
            </View>
            <View style={styles.heroVersionBadge}>
              <Text style={styles.heroVersionText}>v2.4</Text>
            </View>
          </View>

          <View style={styles.heroCapability}>
            <Icon name="verified-user" size={18} color={colors.secondary} />
            <Text style={styles.heroCapabilityText}>
              Trained on Escrow locks, MTN/Airtel MoMo refunds, UNBS quality grades, and Gulu & Lira depot dispatches.
            </Text>
          </View>

          <View style={styles.heroPreviewBubble}>
            <Icon name="chat-bubble" size={18} color={colors.primary} />
            <Text style={styles.heroPreviewText}>
              <Text style={styles.heroPreviewBold}>Hello! </Text>
              I can check your pending payment for Order{' '}
              <Text style={styles.heroPreviewHighlight}>#JEM-8821</Text> or help submit an Escrow dispute.
            </Text>
          </View>

          <View style={styles.heroPromptsSection}>
            <Text style={styles.heroPromptsLabel}>SUGGESTED QUERIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroPromptsRow}>
              {QUICK_PROMPTS.map(p => (
                <Pressable
                  key={p}
                  style={styles.heroPromptChip}
                  onPress={() => setActiveTab('chatbot')}
                >
                  <Text style={styles.heroPromptChipText}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable
            style={({ pressed }) => [styles.heroActionBtn, pressed && styles.pressed]}
            onPress={openCreate}
          >
            <Icon name="support-agent" size={20} color={colors.onPrimary} />
            <Text style={styles.heroActionText}>New Ticket</Text>
          </Pressable>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.tabsRow}>
          {([
            { key: 'tickets' as Tab, label: 'Support Tickets', count: tickets.length },
            { key: 'chatbot' as Tab, label: 'AI Chatbot', count: null },
            { key: 'faq' as Tab, label: 'FAQ', count: null },
          ]).map(tab => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'tickets' && (
          <View style={styles.tabSection}>
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                <Pressable
                  style={[styles.filterChip, ticketFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('all')}
                >
                  <Text style={[styles.filterChipText, ticketFilter === 'all' && styles.filterChipTextActive]}>
                    All Tickets ({tickets.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, ticketFilter === 'needs_reply' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('needs_reply')}
                >
                  <Text style={[styles.filterChipText, ticketFilter === 'needs_reply' && styles.filterChipTextActive]}>
                    Needs Reply ({openCount})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, ticketFilter === 'resolved' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('resolved')}
                >
                  <Text style={[styles.filterChipText, ticketFilter === 'resolved' && styles.filterChipTextActive]}>
                    Resolved ({resolvedCount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {loading ? (
              <View style={styles.ticketsLoading}>
                <SectionLoader text="Loading tickets..." icon="support-agent" />
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Icon name="error-outline" size={40} color={colors.outline} />
                <Text style={styles.loadingText}>{error}</Text>
                <Button label="Try Again" variant="primary" onPress={() => loadTickets()} style={{ marginTop: spacing.md }} />
              </View>
            ) : filteredTickets.length === 0 ? (
              <View style={styles.center}>
                <Icon name="support-agent" size={48} color={colors.outline} />
                <Text style={[styles.loadingText, { marginTop: spacing.sm, fontWeight: '600' }]}>
                  {tickets.length === 0 ? 'No support requests yet' : 'No tickets match this filter'}
                </Text>
                <Text style={[styles.loadingText, { marginTop: 4 }]}>
                  {tickets.length === 0 ? 'Need help? Send us a request and we will respond promptly.' : 'Try a different filter.'}
                </Text>
                <Button label={tickets.length === 0 ? 'Contact Support' : 'New Ticket'} variant="primary" onPress={openCreate} style={{ marginTop: spacing.md }} />
              </View>
            ) : (
              filteredTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            )}
          </View>
        )}

        {activeTab === 'chatbot' && (
          <View style={styles.tabSection}>
            <View style={styles.chatContainer}>
              <ChatView
                assistantName="JVA"
                greeting="Hi! I'm JVA, your Jemina Virtual Assistant. Ask me anything about orders, returns, payments, or the marketplace."
                onSend={message => apiChatAsk(token, message, conversationId)}
              />
            </View>
          </View>
        )}

        {activeTab === 'faq' && (
          <View style={styles.tabSection}>
            {FAQ_ITEMS.map((item, idx) => (
              <Pressable
                key={idx}
                style={[styles.faqCard, idx === 0 && styles.faqFirst]}
                onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Icon
                    name={expandedFaq === idx ? 'expand-more' : 'chevron-right'}
                    size={20}
                    color={colors.outline}
                  />
                </View>
                {expandedFaq === idx && (
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                )}
              </Pressable>
            ))}

            <View style={styles.emergencyBanner}>
              <View style={styles.emergencyHeader}>
                <View style={styles.emergencyIcon}>
                  <Icon name="crisis-alert" size={24} color={colors.secondaryContainer} />
                </View>
                <View style={styles.emergencyInfo}>
                  <Text style={styles.emergencyTitle}>Urgent Escrow or Dispatch Issue?</Text>
                  <Text style={styles.emergencySubtitle}>
                    Direct hotline for stuck bulk deliveries, border check transit stops, and urgent payment releases.
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.emergencyCallBtn, pressed && styles.pressed]}
                onPress={() => Linking.openURL('tel:0800242800')}
              >
                <Icon name="call" size={18} color={colors.secondary} />
                <Text style={styles.emergencyCallText}>Toll-Free: 0800 242 800 (Airtel & MTN)</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.emergencyWhatsappBtn, pressed && styles.pressed]}
                onPress={() => Linking.openURL('https://wa.me/256700000000')}
              >
                <Icon name="chat" size={18} color={colors.onPrimary} />
                <Text style={styles.emergencyWhatsappText}>WhatsApp Northern Live Desk</Text>
              </Pressable>
            </View>

            <View style={styles.trustFooter}>
              <View style={styles.trustRow}>
                <Icon name="lock" size={16} color={colors.outline} />
                <Text style={styles.trustText}>Bank of Uganda Escrow Compliant</Text>
              </View>
              <Text style={styles.trustSubtext}>
                JEMINA Regional Trade Logistics • Gulu, Lira, Kitgum, Arua
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Ticket Modal */}
      {showCreate && (
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetIcon}>
                  <Icon name="support-agent" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>New Support Request</Text>
                  <Text style={styles.sheetSub}>We typically respond within 2 hours</Text>
                </View>
              </View>
              <Pressable onPress={() => !submitting && setShowCreate(false)} hitSlop={8} style={styles.sheetCloseBtn}>
                <Icon name="close" size={20} color={colors.outline} />
              </Pressable>
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Icon name="error-outline" size={16} color={colors.error} />
                <Text style={styles.formError}>{formError}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Issue Type</Text>
            <View style={styles.typeGrid}>
              {TICKET_TYPES.map(t => (
                <Pressable
                  key={t.key}
                  style={[styles.typeCard, type === t.key && styles.typeCardOn]}
                  onPress={() => setType(t.key)}
                >
                  <Icon name={t.icon} size={16} color={type === t.key ? colors.onSecondary : colors.outline} />
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
                  <Icon name={p === 'high' ? 'flag' : p === 'medium' ? 'schedule' : 'info'} size={14} color={priority === p ? colors.onSecondary : colors.outline} />
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

            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetCancelBtn} onPress={() => !submitting && setShowCreate(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Button
                label={submitting ? 'Submitting...' : 'Submit Request'}
                variant="primary"
                icon="send"
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitBtn}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/* ─── Ticket Card ───────────────────────────────────── */

function TicketCard({ ticket }: { ticket: ApiHelpTicket }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = ticketStatusColor(ticket.status);
  const statusLabel = ticket.status_label ?? ticket.status;

  return (
    <Pressable style={styles.ticketCard} onPress={() => setExpanded(!expanded)}>
      {/* Header: ticket number + time + status */}
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderLeft}>
          <Text style={styles.ticketNumber}>{ticket.ticket_number || `#${ticket.id}`}</Text>
          <Text style={styles.ticketDot}>•</Text>
          <Text style={styles.ticketTime}>{formatTimeAgo(ticket.created_at)}</Text>
        </View>
        <View style={[styles.ticketStatusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.ticketStatusText}>{statusLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Type + Subject */}
      <View style={styles.ticketTypeBadge}>
        <Text style={styles.ticketTypeText}>{ticket.type_label ?? ticket.type}</Text>
      </View>
      <Text style={styles.ticketSubject} numberOfLines={2}>{ticket.subject}</Text>

      {/* Expanded: description + response */}
      {expanded && (
        <View style={styles.ticketExpanded}>
          {ticket.description && (
            <View style={styles.ticketUserMsg}>
              <Text style={styles.ticketUserMsgLabel}>You sent:</Text>
              <Text style={styles.ticketUserMsgText} numberOfLines={4}>{ticket.description}</Text>
            </View>
          )}
          {ticket.response && (
            <View style={styles.ticketAgentReply}>
              <View style={styles.ticketAgentHeader}>
                <View style={styles.ticketAgentAvatar}>
                  <Icon name="support-agent" size={14} color={colors.onPrimary} />
                </View>
                <View>
                  <Text style={styles.ticketAgentName}>Support Agent</Text>
                  <Text style={styles.ticketAgentRole}>JEMINA Support Team</Text>
                </View>
                {ticket.responded_at && (
                  <Text style={styles.ticketAgentTime}>{formatTimeAgo(ticket.responded_at)}</Text>
                )}
              </View>
              <Text style={styles.ticketAgentText}>{ticket.response}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.ticketActions}>
        <Pressable style={styles.ticketActionPrimary}>
          <Icon name="reply" size={16} color={colors.onPrimary} />
          <Text style={styles.ticketActionPrimaryText}>View & Reply</Text>
        </Pressable>
        {(ticket.status === 'resolved' || ticket.status === 'closed') && (
          <View style={styles.ticketResolvedBadge}>
            <Icon name="check-circle" size={14} color={colors.statusSuccess} />
            <Text style={styles.ticketResolvedText}>Resolved</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* ─── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootScroll: {
    flex: 1,
  },
  rootScrollContent: {
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.xxl,
  },
  tabSection: {
    gap: spacing.sm,
  },
  chatContainer: {
    height: 360,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  ticketsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}66`,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm + 2,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  heroBotAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4d`,
  },
  heroOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.statusSuccess,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  heroBotInfo: {
    flex: 1,
  },
  heroBotName: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  heroBotStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroStatusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryContainer,
  },
  heroStatusText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  heroVersionBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  heroVersionText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  heroCapability: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  heroCapabilityText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 17,
  },
  heroPreviewBubble: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceBright,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}66`,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  heroPreviewText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 20,
  },
  heroPreviewBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  heroPreviewHighlight: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  heroPromptsSection: {
    gap: 4,
  },
  heroPromptsLabel: {
    ...typography.labelSm,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  heroPromptsRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  heroPromptChip: {
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}99`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroPromptChipText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  heroActionBtn: {
    height: 48,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroActionText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },

  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}4d`,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.secondary,
  },
  tabText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  tabTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },

  /* Filter Row */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChips: {
    gap: spacing.sm,
    flex: 1,
  },
  filterChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterChipText: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newTicketBtnText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },

  /* Ticket Card */
  ticketCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainer,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketNumber: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
  },
  ticketDot: {
    ...typography.labelSm,
    color: colors.outlineVariant,
  },
  ticketTime: {
    ...typography.labelSm,
    color: colors.outline,
  },
  ticketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  ticketStatusText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  ticketTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  ticketTypeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  ticketSubject: {
    ...typography.headlineSm,
    color: colors.onSurface,
    lineHeight: 22,
  },
  ticketExpanded: {
    gap: spacing.sm,
  },
  ticketUserMsg: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.outlineVariant,
  },
  ticketUserMsgLabel: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 2,
  },
  ticketUserMsgText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  ticketAgentReply: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4d`,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  ticketAgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketAgentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketAgentName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  ticketAgentRole: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
  ticketAgentTime: {
    ...typography.labelSm,
    color: colors.outline,
    marginLeft: 'auto',
  },
  ticketAgentText: {
    ...typography.bodySm,
    color: colors.onSurface,
    lineHeight: 18,
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 4,
  },
  ticketActionPrimary: {
    flex: 1,
    height: 38,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ticketActionPrimaryText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  ticketResolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketResolvedText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },

  /* FAQ */
  faqCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}66`,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqFirst: {
    marginTop: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  faqQuestion: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswer: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainer,
  },

  /* Emergency Banner */
  emergencyBanner: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4d`,
  },
  emergencyHeader: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: `${colors.surfaceContainerLowest}1a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyTitle: {
    ...typography.headlineSm,
    color: colors.onPrimary,
  },
  emergencySubtitle: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: 2,
    lineHeight: 17,
  },
  emergencyCallBtn: {
    height: 44,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emergencyCallText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  emergencyWhatsappBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emergencyWhatsappText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },

  /* Trust Footer */
  trustFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    ...typography.labelSm,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trustSubtext: {
    ...typography.bodySm,
    color: colors.outline,
  },

  /* Create Ticket Modal */
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sheetSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  formError: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  sheetCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sheetCancelText: {
    ...typography.labelMd,
    color: colors.outline,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
  },
});
