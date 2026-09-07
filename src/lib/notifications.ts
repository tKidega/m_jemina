import { Platform } from 'react-native';
import {
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { apiRegisterDeviceToken, apiRemoveDeviceToken } from '../data/api';
import type { ApiPromotion } from '../data/api';

const messaging = getMessaging();

let currentFcmToken: string | null = null;
let unsubscribeRefresh: (() => void) | null = null;

export async function requestNotificationPermission(): Promise<void> {
  try {
    await messaging.requestPermission();
  } catch {
    // Permission request unsupported (older Android) — ignore.
  }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const token = await getToken(messaging);
    if (token) {
      currentFcmToken = token;
    }
    return token;
  } catch {
    return null;
  }
}

export async function syncDeviceToken(apiToken: string): Promise<void> {
  try {
    const fcmToken = await getFcmToken();
    if (!fcmToken) {
      return;
    }
    try {
      await apiRegisterDeviceToken(fcmToken, Platform.OS, apiToken);
    } catch {
      return;
    }
    unsubscribeRefresh?.();
    unsubscribeRefresh = onTokenRefresh(messaging, async newToken => {
      if (!newToken || newToken === currentFcmToken) {
        return;
      }
      currentFcmToken = newToken;
      try {
        await apiRegisterDeviceToken(newToken, Platform.OS, apiToken);
      } catch {
        // Best-effort; the token will be retried on the next session.
      }
    });
  } catch {
    // FCM not available (e.g. emulator without Google Play services).
  }
}

export async function removeDeviceTokenFromServer(apiToken: string): Promise<void> {
  const fcmToken = currentFcmToken ?? (await getFcmToken());
  if (!fcmToken) {
    return;
  }
  try {
    await apiRemoveDeviceToken(fcmToken, apiToken);
  } catch {
    // Best-effort; stale tokens are deactivated server-side on send.
  }
}

export async function clearDeviceToken(): Promise<void> {
  unsubscribeRefresh?.();
  unsubscribeRefresh = null;
  currentFcmToken = null;
  try {
    await deleteToken(messaging, undefined);
  } catch {
    // Ignore; the local token is cleared on the next getToken().
  }
}

export type PushEvent =
  | { type: 'two_factor'; code: string }
  | { type: 'promo'; promo: ApiPromotion }
  | { type: 'order_status'; title: string; body: string }
  | { type: 'message'; title: string; body: string };

function parsePushEvent(data: Record<string, string>): PushEvent | null {
  const type = data.type;
  if (typeof type !== 'string') {
    return null;
  }
  if (type === 'two_factor') {
    const code = data.code;
    return typeof code === 'string' && code.length > 0 ? { type: 'two_factor', code } : null;
  }
  if (type === 'promo') {
    return {
      type: 'promo',
      promo: {
        id: parseInt(data.promo_id ?? '0', 10) || 0,
        title: data.title ?? 'Special Offer',
        description: data.description ?? null,
        image_url: data.image_url ?? null,
        placement: (data.placement ?? 'seasonal') as ApiPromotion['placement'],
        link_url: data.link_url ?? null,
        target_url: data.target_url ?? null,
        has_shop: data.has_shop === '1',
        vendor:
          data.vendor_name || data.vendor_id
            ? { id: parseInt(data.vendor_id ?? '0', 10) || 0, name: data.vendor_name ?? '' }
            : null,
      },
    };
  }
  if (type === 'order_status') {
    return { type: 'order_status', title: data.title ?? 'JEMINA', body: data.body ?? '' };
  }
  if (type === 'message') {
    return { type: 'message', title: data.title ?? 'JEMINA', body: data.body ?? '' };
  }
  return null;
}

function remoteData(remoteMessage: {
  data?: Record<string, string | object> | null;
}): Record<string, string> {
  const raw = remoteMessage?.data ?? {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

export function subscribeToPushEvents(callback: (event: PushEvent) => void): () => void {
  try {
    return onMessage(messaging, remoteMessage => {
      const event = parsePushEvent(remoteData(remoteMessage));
      if (event) {
        callback(event);
      }
    });
  } catch {
    return () => {};
  }
}

export function subscribeToSecurityCode(callback: (code: string) => void): () => void {
  try {
    return onMessage(messaging, remoteMessage => {
      const code = remoteMessage?.data?.code;
      if (typeof code === 'string' && code.length > 0) {
        callback(code);
      }
    });
  } catch {
    return () => {};
  }
}

export function subscribeToPushOpened(callback: (event: PushEvent) => void): () => void {
  try {
    const unsub = onNotificationOpenedApp(messaging, remoteMessage => {
      const event = parsePushEvent(remoteData(remoteMessage));
      if (event) {
        callback(event);
      }
    });
    return unsub;
  } catch {
    return () => {};
  }
}

export async function getInitialPush(): Promise<PushEvent | null> {
  try {
    const remoteMessage = await getInitialNotification(messaging);
    if (!remoteMessage) {
      return null;
    }
    return parsePushEvent(remoteData(remoteMessage));
  } catch {
    return null;
  }
}