import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ApiPromotion } from '../data/api';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { promoImageUrl } from '../lib/promo';

export interface InAppNotice {
  key: number;
  title: string;
  body: string;
  kind: 'order' | 'message';
  onPress: () => void;
}

const PROMO_TYPE_LABELS: Record<string, string> = {
  seasonal: 'Seasonal Offer',
  flash: 'Flash Deal',
  popular: 'Popular Pick',
  homepage: 'Featured Promo',
  banner: 'Featured Promo',
  popup: 'Exclusive Deal',
  sidebar: 'Our Offer',
  inline: 'Special Offer',
  new_arrivals: 'New Arrivals',
  b2b: 'B2B Deal',
};

function promoTypeLabel(placement: ApiPromotion['placement'] | null | undefined): string {
  if (placement && PROMO_TYPE_LABELS[placement]) {
    return PROMO_TYPE_LABELS[placement];
  }
  if (placement) {
    return placement
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'Featured Promo';
}

interface NotificationContextValue {
  activePromo: ApiPromotion | null;
  showPromo: (promo: ApiPromotion) => void;
  closePromo: () => void;
  showNotice: (notice: {
    title: string;
    body: string;
    kind: 'order' | 'message';
    onPress: () => void;
  }) => void;
  unreadCount: number;
  markUnread: () => void;
  clearUnread: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [activePromo, setActivePromo] = useState<ApiPromotion | null>(null);
  const [promoImageRatio, setPromoImageRatio] = useState<number | null>(null);
  const [notice, setNotice] = useState<InAppNotice | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoaded, setUnreadLoaded] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeKey = useRef(0);
  const unreadPersistKey = '@jemina/notifications/unread/v1';

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(unreadPersistKey)
      .then(raw => {
        if (cancelled) {
          return;
        }
        const parsed = raw !== null ? Number(raw) : NaN;
        setUnreadCount(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        setUnreadLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setUnreadLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!unreadLoaded) {
      return;
    }
    AsyncStorage.setItem(unreadPersistKey, String(unreadCount)).catch(() => {});
  }, [unreadCount, unreadLoaded]);

  const closePromo = useCallback(() => setActivePromo(null), []);

  const showPromo = useCallback((promo: ApiPromotion) => {
    setActivePromo(promo);
    setPromoImageRatio(null);
  }, []);

  const markUnread = useCallback(() => setUnreadCount(n => n + 1), []);
  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const dismissNotice = useCallback(() => {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    setNotice(null);
  }, []);

  const showNotice = useCallback(
    (n: { title: string; body: string; kind: 'order' | 'message'; onPress: () => void }) => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
      noticeKey.current += 1;
      setNotice({ ...n, key: noticeKey.current });
      noticeTimer.current = setTimeout(() => setNotice(null), 5000);
    },
    [],
  );

  useEffect(
    () => () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ activePromo, showPromo, closePromo, showNotice, unreadCount, markUnread, clearUnread }),
    [activePromo, showPromo, closePromo, showNotice, unreadCount, markUnread, clearUnread],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {notice ? (
        <Pressable
          style={[styles.banner, { top: insets.top + 8 }]}
          onPress={() => {
            const action = notice.onPress;
            dismissNotice();
            action?.();
          }}
        >
          <View style={styles.bannerIcon}>
            <Icon
              name={notice.kind === 'order' ? 'local-shipping' : 'chat'}
              size={18}
              color={colors.white}
            />
          </View>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {notice.title}
            </Text>
            <Text style={styles.bannerText} numberOfLines={2}>
              {notice.body}
            </Text>
          </View>
          <Pressable onPress={dismissNotice} hitSlop={10} style={styles.bannerDismiss}>
            <Icon name="close" size={18} color={colors.white} />
          </Pressable>
        </Pressable>
      ) : null}

      <Modal
        visible={activePromo !== null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closePromo}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <View style={styles.popupHeaderRow}>
                <Icon name="auto-awesome" size={18} color={colors.secondary} />
                <Text style={styles.popupTitle}>{promoTypeLabel(activePromo?.placement)}</Text>
              </View>
              <Pressable
                onPress={closePromo}
                hitSlop={10}
                style={styles.popupClose}
                accessibilityLabel="Close promo"
              >
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            {activePromo ? (
              <>
                {activePromo.image_url ? (
                  <Image
                    source={{ uri: promoImageUrl(activePromo.image_url) }}
                    style={[
                      promoImageRatio ? styles.popupImageSized : styles.popupImage,
                      promoImageRatio ? { aspectRatio: promoImageRatio } : null,
                    ]}
                    resizeMode="cover"
                    onLoad={e => {
                      const { width, height } = e.nativeEvent.source;
                      if (width && height) {
                        setPromoImageRatio(width / height);
                      }
                    }}
                  />
                ) : null}
                <Text style={styles.popupName}>{activePromo.title}</Text>
                {activePromo.vendor?.name ? (
                  <View style={styles.popupVendor}>
                    <Icon name="storefront" size={14} color={colors.secondary} />
                    <Text style={styles.popupVendorText}>{activePromo.vendor.name}</Text>
                  </View>
                ) : null}
                <Text style={styles.popupDesc}>
                  {activePromo.description ?? 'Limited time promotional offer from JEMINA.'}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '700',
  },
  bannerText: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  bannerDismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  popupCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  popupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  popupTitle: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  popupClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupImage: {
    width: '100%',
    height: 180,
    maxHeight: 300,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  popupImageSized: {
    width: '100%',
    maxHeight: 300,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  popupName: {
    ...typography.headlineLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  popupVendor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  popupVendorText: {
    ...typography.bodyMd,
    color: colors.secondary,
    fontWeight: '600',
  },
  popupDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});