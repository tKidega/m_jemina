import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { formatUGX } from '../components/ProductCard';
import { apiGetMyInquiries, ApiInquiryResult } from '../data/api';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type FilterKey = 'all' | 'replies' | 'awaiting' | 'negotiation' | 'drafts';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Submitted' },
  { key: 'replies', label: 'Replies Received' },
  { key: 'awaiting', label: 'Awaiting Replies' },
  { key: 'negotiation', label: 'Under Negotiation' },
  { key: 'drafts', label: 'Drafts' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  pending: { label: 'AWAITING RESPONSES', icon: 'pending', color: colors.outline, bg: colors.surfaceContainer },
  submitted: { label: 'AWAITING RESPONSES', icon: 'pending', color: colors.outline, bg: colors.surfaceContainer },
  replied: { label: 'REPLIES RECEIVED', icon: 'mark_chat_unread', color: colors.onSecondaryFixed, bg: colors.secondaryFixed },
  negotiation: { label: 'UNDER NEGOTIATION', icon: 'compare-arrows', color: colors.onSecondaryFixed, bg: colors.secondaryFixed },
  accepted: { label: 'READY TO ESCROW', icon: 'lock', color: colors.onSecondary, bg: colors.secondary },
  completed: { label: 'COMPLETED', icon: 'check-circle', color: colors.statusSuccess, bg: '#e8f5e9' },
  draft: { label: 'DRAFT INQUIRY', icon: 'edit-note', color: colors.outline, bg: colors.surfaceContainer },
  expired: { label: 'EXPIRED', icon: 'schedule', color: colors.error, bg: colors.errorContainer },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatSubmittedTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
  } catch {
    return dateStr;
  }
}

export function MyInquiriesScreen() {
  const { token, isAuthenticated } = useAuth();
  const { navigate, switchTab } = useNavigation();
  const [inquiries, setInquiries] = useState<ApiInquiryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const loadInquiries = useCallback(async () => {
    if (!token) return;
    try {
      const items = await apiGetMyInquiries(token);
      setInquiries(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadInquiries();
    }
  }, [isAuthenticated, token, loadInquiries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInquiries();
  }, [loadInquiries]);

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'replies':
        return inquiries.filter(i => (i.replies_count ?? 0) > 0 && !i.is_draft);
      case 'awaiting':
        return inquiries.filter(i => (i.replies_count ?? 0) === 0 && i.status !== 'draft' && !i.is_draft);
      case 'negotiation':
        return inquiries.filter(i => i.status === 'negotiation' || i.status === 'accepted');
      case 'drafts':
        return inquiries.filter(i => i.status === 'draft' || i.is_draft);
      default:
        return inquiries;
    }
  }, [inquiries, activeFilter]);

  const stats = useMemo(() => {
    const submitted = inquiries.filter(i => !i.is_draft && i.status !== 'draft').length;
    const replies = inquiries.reduce((sum, i) => sum + (i.replies_count ?? 0), 0);
    const pending = inquiries.filter(i => (i.replies_count ?? 0) === 0 && !i.is_draft && i.status !== 'draft').length;
    return { submitted, replies, pending };
  }, [inquiries]);

  const filterCounts = useMemo(() => ({
    all: inquiries.length,
    replies: inquiries.filter(i => (i.replies_count ?? 0) > 0 && !i.is_draft).length,
    awaiting: inquiries.filter(i => (i.replies_count ?? 0) === 0 && i.status !== 'draft' && !i.is_draft).length,
    negotiation: inquiries.filter(i => i.status === 'negotiation' || i.status === 'accepted').length,
    drafts: inquiries.filter(i => i.status === 'draft' || i.is_draft).length,
  }), [inquiries]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Inquiries" showBack onBack={() => switchTab('Profile')} />
        <SectionLoader text="Loading your inquiries..." icon="request-quote" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Inquiries" showBack onBack={() => switchTab('Profile')} />

      {/* Status Strip */}
      <View style={styles.statusStrip}>
        <View style={styles.statusStripLeft}>
          <View style={styles.statusPulse} />
          <Text style={styles.statusStripText}>
            Submitted Inquiries: <Text style={styles.statusStripBold}>{stats.submitted}</Text> • {stats.replies} Supplier Replies • Verified Trade Corridor
          </Text>
        </View>
        <Icon name="mark-chat-read" size={16} color={colors.primaryFixedDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Retry" onPress={loadInquiries} style={styles.retryBtn} />
          </View>
        ) : inquiries.length === 0 ? (
          <View style={styles.center}>
            <Icon name="request-quote" size={56} color={colors.outline} />
            <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
            <Text style={styles.muted}>Wholesale inquiries and RFQs you submit will appear here.</Text>
            <Button
              label="Submit an Inquiry"
              onPress={() => navigate('ProductInquiry')}
              style={styles.emptyCta}
            />
          </View>
        ) : (
          <>
            {/* Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Submitted</Text>
                <Text style={styles.metricValue}>{stats.submitted}</Text>
                <View style={styles.metricSub}>
                  <View style={[styles.metricDot, { backgroundColor: colors.secondary }]} />
                  <Text style={styles.metricSubText}>Active Inquiries</Text>
                </View>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: colors.secondary }]}>Replies Recv.</Text>
                <Text style={[styles.metricValue, { color: colors.secondary }]}>{stats.replies}</Text>
                <View style={styles.metricSub}>
                  <Icon name="forum" size={12} color={colors.secondary} />
                  <Text style={styles.metricSubText}>From Suppliers</Text>
                </View>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pending Resp.</Text>
                <Text style={styles.metricValue}>{stats.pending}</Text>
                <Text style={styles.metricSubText}>Awaiting Quotes</Text>
              </View>
            </View>

            {/* New Inquiry CTA */}
            <View style={styles.newInquiryCta}>
              <View style={styles.newInquiryLeft}>
                <View style={styles.newInquiryIcon}>
                  <Icon name="post-add" size={18} color={colors.onPrimary} />
                </View>
                <View style={styles.newInquiryTextWrap}>
                  <Text style={styles.newInquiryTitle}>Submit New Bulk Inquiry</Text>
                  <Text style={styles.newInquirySubtitle}>Broadcast request to verified distributors across Acholi & Lango</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.newInquiryBtn, pressed && styles.pressed]}
                onPress={() => navigate('ProductInquiry')}
              >
                <Icon name="add" size={16} color={colors.onPrimary} />
                <Text style={styles.newInquiryBtnText}>New Inquiry</Text>
              </Pressable>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              {FILTERS.map(f => {
                const count = filterCounts[f.key];
                const isActive = activeFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    style={[
                      styles.filterChip,
                      isActive ? styles.filterChipActive : styles.filterChipInactive,
                    ]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                      ]}
                    >
                      {f.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.filterChipBadge, isActive ? styles.filterChipBadgeActive : styles.filterChipBadgeInactive]}>
                        <Text style={[styles.filterChipBadgeText, isActive && styles.filterChipBadgeTextActive]}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Inquiry Cards */}
            <View style={styles.inquiryList}>
              {filtered.map(inquiry => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} navigate={navigate} />
              ))}
              {filtered.length === 0 && (
                <View style={styles.emptyFilter}>
                  <Icon name="filter-list" size={40} color={colors.outline} />
                  <Text style={styles.muted}>No inquiries match this filter.</Text>
                </View>
              )}
            </View>

            {/* Escrow Assurance Banner */}
            <View style={styles.escrowBanner}>
              <View style={styles.escrowHeader}>
                <View style={styles.escrowIcon}>
                  <Icon name="gavel" size={18} color={colors.onSecondary} />
                </View>
                <View style={styles.escrowTextWrap}>
                  <Text style={styles.escrowTitle}>JEMINA Northern Escrow Assurance</Text>
                  <Text style={styles.escrowSubtitle}>Institutional Protection for Gulu, Lira & Kitgum Trade</Text>
                </View>
              </View>
              <Text style={styles.escrowBody}>
                All RFQ deposits are securely held in MTN MoMo / Bank Escrow trust. Disbursals occur strictly after physical receipt and UNBS quality seal sign-off at your selected delivery depot.
              </Text>
              <View style={styles.escrowChecks}>
                <View style={styles.escrowCheck}>
                  <Icon name="check-circle" size={14} color={colors.primaryFixed} />
                  <Text style={styles.escrowCheckText}>Inspection Protected</Text>
                </View>
                <View style={styles.escrowCheck}>
                  <Icon name="check-circle" size={14} color={colors.primaryFixed} />
                  <Text style={styles.escrowCheckText}>Zero Advance Risk</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InquiryCard({ inquiry, navigate }: { inquiry: ApiInquiryResult; navigate: (screen: any, params?: Record<string, unknown>) => void }) {
  const [showChat, setShowChat] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const cfg = STATUS_CONFIG[inquiry.status] ?? STATUS_CONFIG.submitted;
  const isNegotiation = inquiry.status === 'negotiation' || inquiry.status === 'accepted';
  const isDraft = inquiry.status === 'draft' || inquiry.is_draft;
  const hasReplies = (inquiry.replies_count ?? 0) > 0;
  const replyCount = inquiry.replies_count ?? 0;

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText('');
    setTimeout(() => setReplySent(false), 2000);
  };

  const handleCloseInquiry = () => {
    setShowChat(false);
  };

  return (
    <View
      style={[
        styles.inquiryCard,
        isNegotiation && styles.inquiryCardNegotiation,
        isDraft && styles.inquiryCardDraft,
      ]}
    >
      {/* Negotiation ribbon */}
      {isNegotiation && (
        <View style={styles.negotiationRibbon}>
          <Text style={styles.negotiationRibbonText}>NEGOTIATION / READY</Text>
        </View>
      )}

      {/* Card Header: Status Badge + Reference */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Icon name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.refNumber}>#{inquiry.formatted_reference || inquiry.inquiry_reference}</Text>
        </View>
      </View>

      {/* Product Name */}
      <Text style={styles.productName}>{inquiry.product_name}</Text>

      {/* Quantity + Budget */}
      <View style={styles.detailsRow}>
        <Text style={styles.detailItem}>
          <Text style={styles.detailBold}>Target Qty: </Text>
          {inquiry.quantity_required} units
          {inquiry.budget_target ? ` • Budget Target: ${formatUGX(inquiry.budget_target)}` : ''}
        </Text>
      </View>

      {/* Destination */}
      {(inquiry.destination || inquiry.delivery_location) && (
        <View style={styles.destinationRow}>
          <Icon name="location-on" size={16} color={colors.outline} />
          <Text style={styles.destinationText} numberOfLines={1}>
            Destination: {inquiry.destination || inquiry.delivery_location}
          </Text>
        </View>
      )}

      {/* Supplier Replies Section */}
      {hasReplies && inquiry.latest_reply && (
        <View style={styles.repliesSection}>
          <View style={styles.repliesHeader}>
            <Text style={styles.repliesHeaderLabel}>
              <Icon name="forum" size={14} color={colors.secondary} /> Supplier Replies & Messages ({replyCount})
            </Text>
            <Text style={styles.repliesHeaderTime}>Latest {formatDate(inquiry.latest_reply.timestamp)}</Text>
          </View>

          {/* Latest Reply Highlighted */}
          <View style={styles.latestReply}>
            <View style={styles.latestReplyTop}>
              <View style={styles.latestReplyVendor}>
                <Text style={styles.latestReplyVendorName}>{inquiry.latest_reply.vendor_name}</Text>
                <Icon name="verified" size={14} color={colors.secondary} />
              </View>
              {inquiry.latest_reply.offered_price != null && (
                <Text style={styles.latestReplyPrice}>{formatUGX(inquiry.latest_reply.offered_price)}</Text>
              )}
            </View>
            <View style={styles.latestReplyMessage}>
              <Text style={styles.latestReplyMessageText} numberOfLines={3}>
                "{inquiry.latest_reply.message}"
              </Text>
            </View>
            <View style={styles.latestReplyFooter}>
              <Text style={styles.latestReplyFooterText}>
                {inquiry.latest_reply.quoted_unit_price != null
                  ? `Quoted: ${formatUGX(inquiry.latest_reply.quoted_unit_price)}/unit`
                  : 'Supplier response received'}
              </Text>
              {inquiry.latest_reply.is_recommended && (
                <Text style={styles.recommendedLabel}>Recommended Offer</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Awaiting State */}
      {!hasReplies && !isDraft && (
        <View style={styles.awaitingSection}>
          <View style={styles.awaitingRow}>
            <Text style={styles.awaitingLabel}>
              <Icon name="broadcast-on-personal" size={16} color={colors.secondary} /> Suppliers notified
            </Text>
            {inquiry.expires_at && (
              <Text style={styles.awaitingExpiry}>Expires {formatDate(inquiry.expires_at)}</Text>
            )}
          </View>
          <Text style={styles.awaitingHint}>
            No replies yet. Inquiries usually receive first quote within 4 hours.
          </Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>
      )}

      {/* Draft State */}
      {isDraft && (
        <View style={styles.draftSection}>
          <Text style={styles.draftHint}>
            {inquiry.inquiry_message || 'Missing delivery warehouse selection & payment terms.'}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {isDraft ? (
          <Pressable
            style={styles.draftActionBtn}
            onPress={() => navigate('ProductInquiry', { product: { id: inquiry.product_id } })}
          >
            <Icon name="edit-note" size={16} color={colors.primaryContainer} />
            <Text style={styles.draftActionText}>Complete & Submit Inquiry</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.pressed]}
              onPress={() => setShowChat(true)}
            >
              <Icon name="chat" size={16} color={colors.primaryContainer} />
              <Text style={styles.secondaryActionText}>Chat / Reply</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
              onPress={() => setShowDetails(true)}
            >
              {isNegotiation ? <Icon name="lock" size={16} color={colors.onSecondary} /> : null}
              <Text style={styles.primaryActionText}>
                {hasReplies ? `View ${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Inquiry Details'}
              </Text>
              {!isNegotiation && <Icon name="chevron-right" size={16} color={colors.onSecondary} />}
            </Pressable>
          </>
        )}
      </View>

      {/* Chat / Reply Modal */}
      {showChat && (
        <Modal visible={showChat} animationType="slide" transparent onRequestClose={() => setShowChat(false)}>
          <KeyboardAvoidingView style={styles.chatOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.chatSheet}>
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderLeft}>
                  <Icon name="chat" size={20} color={colors.primary} />
                  <View>
                    <Text style={styles.chatTitle}>Inquiry Chat</Text>
                    <Text style={styles.chatSubtitle}>#{inquiry.formatted_reference || inquiry.inquiry_reference}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setShowChat(false)} hitSlop={8} style={styles.chatCloseBtn}>
                  <Icon name="close" size={20} color={colors.outline} />
                </Pressable>
              </View>

              <ScrollView style={styles.chatBody} contentContainerStyle={styles.chatBodyContent}>
                {/* Original inquiry message */}
                <View style={styles.chatMsgRow}>
                  <View style={styles.chatMsgUser}>
                    <Text style={styles.chatMsgUserLabel}>You</Text>
                    <Text style={styles.chatMsgTime}>{formatSubmittedTime(inquiry.submitted_at)}</Text>
                  </View>
                  <View style={styles.chatMsgBubbleUser}>
                    <Text style={styles.chatMsgText}>{inquiry.inquiry_message || `Bulk inquiry for ${inquiry.product_name} — ${inquiry.quantity_required} units`}</Text>
                  </View>
                </View>

                {/* Latest reply */}
                {inquiry.latest_reply && (
                  <View style={styles.chatMsgRow}>
                    <View style={styles.chatMsgVendor}>
                      <Text style={styles.chatMsgVendorLabel}>{inquiry.latest_reply.vendor_name}</Text>
                      {inquiry.latest_reply.is_recommended && (
                        <Text style={styles.chatRecommendedBadge}>Recommended</Text>
                      )}
                    </View>
                    <View style={styles.chatMsgBubbleVendor}>
                      <Text style={styles.chatMsgText}>{inquiry.latest_reply.message}</Text>
                      {inquiry.latest_reply.offered_price != null && (
                        <View style={styles.chatPriceTag}>
                          <Text style={styles.chatPriceTagText}>Offered: {formatUGX(inquiry.latest_reply.offered_price)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.chatMsgTimeVendor}>{formatDate(inquiry.latest_reply.timestamp)}</Text>
                  </View>
                )}

                {replySent && (
                  <View style={styles.chatSentConfirm}>
                    <Icon name="check-circle" size={16} color={colors.statusSuccess} />
                    <Text style={styles.chatSentText}>Reply sent</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Type your reply..."
                  placeholderTextColor={colors.outline}
                  multiline
                />
                <Pressable
                  style={[styles.chatSendBtn, !replyText.trim() && styles.chatSendBtnDisabled]}
                  onPress={handleSendReply}
                  disabled={!replyText.trim()}
                >
                  <Icon name="send" size={18} color={replyText.trim() ? colors.onPrimary : colors.outline} />
                </Pressable>
              </View>

              <Pressable style={styles.chatCompleteBtn} onPress={handleCloseInquiry}>
                <Icon name="check-circle" size={16} color={colors.statusSuccess} />
                <Text style={styles.chatCompleteBtnText}>Mark as Complete & Close</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Inquiry Details Modal */}
      {showDetails && (
        <Modal visible={showDetails} animationType="slide" transparent onRequestClose={() => setShowDetails(false)}>
          <Pressable style={styles.detailsOverlay} onPress={() => setShowDetails(false)}>
            <Pressable style={styles.detailsSheet} onPress={() => {}}>
              <View style={styles.detailsHeader}>
                <View style={styles.detailsHeaderLeft}>
                  <Icon name="info" size={20} color={colors.primary} />
                  <Text style={styles.detailsTitle}>Inquiry Details</Text>
                </View>
                <Pressable onPress={() => setShowDetails(false)} hitSlop={8} style={styles.detailsCloseBtn}>
                  <Icon name="close" size={20} color={colors.outline} />
                </Pressable>
              </View>

              <ScrollView style={styles.detailsBody} contentContainerStyle={styles.detailsBodyContent}>
                {/* Status */}
                <View style={[styles.detailsStatusRow, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon as any} size={18} color={cfg.color} />
                  <Text style={[styles.detailsStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>

                {/* Reference + Date */}
                <View style={styles.detailsInfoRow}>
                  <Text style={styles.detailsInfoLabel}>Reference</Text>
                  <Text style={styles.detailsInfoValue}>#{inquiry.formatted_reference || inquiry.inquiry_reference}</Text>
                </View>
                <View style={styles.detailsInfoRow}>
                  <Text style={styles.detailsInfoLabel}>Submitted</Text>
                  <Text style={styles.detailsInfoValue}>{formatSubmittedTime(inquiry.submitted_at)}</Text>
                </View>

                {/* Product */}
                <View style={styles.detailsInfoRow}>
                  <Text style={styles.detailsInfoLabel}>Product</Text>
                  <Text style={styles.detailsInfoValue}>{inquiry.product_name}</Text>
                </View>
                <View style={styles.detailsInfoRow}>
                  <Text style={styles.detailsInfoLabel}>Quantity Required</Text>
                  <Text style={styles.detailsInfoValue}>{inquiry.quantity_required} units</Text>
                </View>

                {inquiry.budget_target != null && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Budget Target</Text>
                    <Text style={styles.detailsInfoValue}>{formatUGX(inquiry.budget_target)}</Text>
                  </View>
                )}

                {inquiry.destination && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Destination</Text>
                    <Text style={styles.detailsInfoValue}>{inquiry.destination}</Text>
                  </View>
                )}

                {inquiry.vendor_name && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Vendor</Text>
                    <Text style={styles.detailsInfoValue}>{inquiry.vendor_name}</Text>
                  </View>
                )}

                {inquiry.inquiry_subject && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Subject</Text>
                    <Text style={styles.detailsInfoValue}>{inquiry.inquiry_subject.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                  </View>
                )}

                {inquiry.inquiry_message && (
                  <View style={styles.detailsMessageBox}>
                    <Text style={styles.detailsMessageLabel}>Message</Text>
                    <Text style={styles.detailsMessageText}>{inquiry.inquiry_message}</Text>
                  </View>
                )}

                {inquiry.expires_at && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Expires</Text>
                    <Text style={styles.detailsInfoValue}>{formatSubmittedTime(inquiry.expires_at)}</Text>
                  </View>
                )}

                {hasReplies && (
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsInfoLabel}>Replies</Text>
                    <Text style={styles.detailsInfoValue}>{replyCount} supplier {replyCount === 1 ? 'reply' : 'replies'}</Text>
                  </View>
                )}
              </ScrollView>

              <Pressable style={styles.detailsCloseBtnBottom} onPress={() => setShowDetails(false)}>
                <Text style={styles.detailsCloseBtnBottomText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  muted: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  emptyCta: {
    marginTop: spacing.lg,
  },

  // Status Strip
  statusStrip: {
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(224,226,232,0.1)',
  },
  statusStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  statusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: spacing.sm,
  },
  statusStripText: {
    ...typography.labelSm,
    color: colors.primaryFixed,
    flex: 1,
  },
  statusStripBold: {
    fontWeight: '700',
    color: colors.onPrimary,
  },

  // Content
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: 2,
  },
  metricValue: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  metricSub: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricSubText: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },

  // New Inquiry CTA
  newInquiryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  newInquiryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.sm + 2,
  },
  newInquiryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newInquiryTextWrap: {
    flex: 1,
  },
  newInquiryTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  newInquirySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  newInquiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm + 2,
    height: 32,
    borderRadius: radius.lg,
    gap: 4,
  },
  newInquiryBtnText: {
    ...typography.labelSm,
    color: colors.onSecondary,
    fontWeight: '700',
  },

  // Filter Chips
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.full,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  filterChipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  filterChipText: {
    ...typography.labelMd,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  filterChipTextInactive: {
    color: colors.onSurface,
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterChipBadgeInactive: {
    backgroundColor: colors.secondaryFixed,
  },
  filterChipBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  filterChipBadgeTextActive: {
    color: colors.onPrimary,
  },

  // Inquiry Cards
  inquiryList: {
    gap: spacing.lg,
  },
  inquiryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inquiryCardNegotiation: {
    borderWidth: 2,
    borderColor: `${colors.secondary}66`,
    overflow: 'hidden',
  },
  inquiryCardDraft: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    opacity: 0.9,
  },
  negotiationRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderBottomLeftRadius: radius.lg,
  },
  negotiationRibbonText: {
    ...typography.labelSm,
    color: colors.onSecondary,
    fontWeight: '700',
    fontSize: 10,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: 3,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
    fontSize: 10,
  },
  refNumber: {
    ...typography.bodySm,
    color: colors.outline,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  dateText: {
    ...typography.labelSm,
    color: colors.outline,
  },

  // Product
  productName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    lineHeight: 22,
  },
  detailsRow: {
    marginTop: 2,
  },
  detailItem: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  detailBold: {
    fontWeight: '600',
    color: colors.onSurface,
  },

  // Destination
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  destinationText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  // Replies Section
  repliesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  repliesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repliesHeaderLabel: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repliesHeaderTime: {
    ...typography.labelSm,
    color: colors.outline,
  },
  latestReply: {
    backgroundColor: colors.surfaceContainerLow,
    borderLeftWidth: 2,
    borderLeftColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  latestReplyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  latestReplyVendor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  latestReplyVendorName: {
    ...typography.labelLg,
    fontWeight: '700',
    color: colors.onSurface,
  },
  latestReplyPrice: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  latestReplyMessage: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceContainer,
  },
  latestReplyMessageText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  latestReplyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  latestReplyFooterText: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 11,
  },
  recommendedLabel: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 11,
  },

  // Awaiting
  awaitingSection: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceContainer,
    gap: spacing.sm,
  },
  awaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  awaitingLabel: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  awaitingExpiry: {
    ...typography.labelSm,
    color: colors.outline,
  },
  awaitingHint: {
    ...typography.bodySm,
    color: colors.outline,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: colors.outline,
    borderRadius: 3,
  },

  // Draft
  draftSection: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceContainer,
  },
  draftHint: {
    ...typography.bodySm,
    color: colors.outline,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: 2,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryActionText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
  },
  primaryActionBtn: {
    flex: 1,
    height: 40,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  primaryActionText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  draftActionBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  draftActionText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  /* Chat / Reply Modal */
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatSheet: {
    maxHeight: '85%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  chatTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  chatSubtitle: {
    ...typography.labelSm,
    color: colors.outline,
  },
  chatCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBody: {
    flex: 1,
  },
  chatBodyContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  chatMsgRow: {
    gap: spacing.xs,
  },
  chatMsgUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  chatMsgUserLabel: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  chatMsgTime: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
  chatMsgBubbleUser: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    padding: spacing.sm + 2,
    maxWidth: '85%',
    alignSelf: 'flex-end',
  },
  chatMsgVendor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  chatMsgVendorLabel: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  chatRecommendedBadge: {
    ...typography.labelSm,
    color: colors.onSecondary,
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 9,
  },
  chatMsgBubbleVendor: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    padding: spacing.sm + 2,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    gap: spacing.sm,
  },
  chatMsgText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  chatPriceTag: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chatPriceTagText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  chatMsgTimeVendor: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
  chatSentConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  chatSentText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '600',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainerHigh,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  chatCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceContainerHigh,
  },
  chatCompleteBtnText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '600',
  },

  /* Inquiry Details Modal */
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    maxHeight: '80%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  detailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  detailsTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  detailsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBody: {
    flex: 1,
  },
  detailsBodyContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  detailsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  detailsStatusText: {
    ...typography.labelMd,
    fontWeight: '700',
  },
  detailsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  detailsInfoLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  detailsInfoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  detailsMessageBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  detailsMessageLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
  },
  detailsMessageText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  detailsCloseBtnBottom: {
    margin: spacing.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
  },
  detailsCloseBtnBottomText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Empty filter
  emptyFilter: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },

  // Escrow Banner
  escrowBanner: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  escrowIcon: {
    width: 32,
    height: 32,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowTextWrap: {
    flex: 1,
  },
  escrowTitle: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  escrowSubtitle: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
    marginTop: 1,
  },
  escrowBody: {
    ...typography.bodySm,
    color: `${colors.onPrimary}cc`,
    lineHeight: 18,
  },
  escrowChecks: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  escrowCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  escrowCheckText: {
    ...typography.labelSm,
    color: colors.primaryFixed,
  },
});
