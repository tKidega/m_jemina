import type { Product, ProductSpecifications } from '../components/ProductCard';
import { images } from './images';
import { getDeviceModel } from '../lib/device';

export const API_BASE_URL = 'https://jemi-na.com/api/v1';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export interface ApiCategory {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  product_count?: number;
  subcategories?: ApiCategory[];
}

export interface ApiVendor {
  id: number;
  name: string | null;
  rating: number;
  delivery_fee?: number;
}

export interface ApiProduct {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  sku?: string | null;
  price: number;
  discounted_price: number | null;
  discount: number;
  discount_percentage: number;
  category: { id: number; name: string } | null;
  vendor: ApiVendor | null;
  images: string[];
  photo: string | null;
  rating: number;
  review_count: number;
  stock_quantity: number;
  stock_status: 'in' | 'low' | 'out' | string;
  min_order_quantity: number;
  sale_type: 'flash' | 'normal' | string;
  is_featured: boolean;
  is_wholesale: boolean;
  bulk_order: boolean;
  corporate_ready: boolean;
  enterprise_solution: boolean;
  seasonal?: boolean;
  holiday_special?: boolean;
  seasonal_theme?: string | null;
  is_local?: boolean;
  handmade?: boolean;
  product_type?: string;
  quality?: string;
  origin_country?: string | null;
  delivery_fee?: number;
  shipping_fee?: number;
  specifications?: ProductSpecifications | null;
  created_at: string;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: ApiProduct[];
    pagination: { current_page: number; per_page: number; total: number; last_page: number };
  };
}

interface ProductDetailResponse {
  success: boolean;
  data: { product: ApiProduct };
}

interface CategoriesResponse {
  success: boolean;
  data: { categories: ApiCategory[] };
}

const FALLBACK_VENDOR_NAME = 'Jemina Official';
const VENDOR_LOCATION = 'Gulu, Uganda';

const SLUG_TO_LOCAL_IMAGE: Record<string, string> = {
  'dlight-solar-lantern-reading-light-s30': images.solarProduct,
  'dlight-solar-lantern': images.solarLantern,
  'kids-backpack-school': images.kidsBackpack,
  'bulk-electrical-cables': images.cables,
  'android-phone-elite': images.phoneElite,
  'hp-laptop': images.laptop,
  'lenovo-computer': images.laptop,
  'server-computer': images.warehouse,
  'smartphone-standard': images.phone,
  'phone-mount': images.phoneStanding,
  'pro-camera': images.cameraThumb,
  'noise-cancelling-headset': images.headphones,
  'classic-cotton-backpack': images.backpack,
  'premium-leather-timepiece': images.watch,
  'office-pen-holder': images.officePen,
  'bulk-electrical-cables-grade-a': images.cableCoil,
};

export function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

function resolveImage(api: ApiProduct): string | undefined {
  if (api.images && api.images.length > 0 && api.images[0]) {
    return absoluteUrl(api.images[0]);
  }
  if (api.photo) {
    return absoluteUrl(api.photo);
  }
  const slug = (api.slug || '').toLowerCase();
  for (const [key, url] of Object.entries(SLUG_TO_LOCAL_IMAGE)) {
    if (slug.includes(key) || (api.name || '').toLowerCase().includes(key)) {
      return url;
    }
  }
  return undefined;
}

function resolveStock(status: string): string {
  if (status === 'out' || status === 'out_of_stock') {
    return 'OUT OF STOCK';
  }
  if (status === 'pre_order' || status === 'pre-order') {
    return 'PRE-ORDER';
  }
  return 'IN STOCK';
}

function computeDiscountLabel(api: ApiProduct): string | undefined {
  if (api.discounted_price != null && api.discounted_price < api.price && api.price > 0) {
    const pct = Math.round((1 - api.discounted_price / api.price) * 1000) / 10;
    return `${pct}% OFF`;
  }
  return undefined;
}

export function apiProductToProduct(api: ApiProduct): Product {
  const hasDiscount = api.discounted_price != null && api.discounted_price < api.price;
  const effective = hasDiscount ? api.discounted_price as number : api.price;
  const originalValue = hasDiscount ? api.price : undefined;
  const vendorName = api.vendor?.name || FALLBACK_VENDOR_NAME;

  let badge: Product['badge'];
  if (api.sale_type === 'flash' || api.is_featured) {
    badge = { label: api.sale_type === 'flash' ? 'Flash Sale' : 'Featured', variant: api.sale_type === 'flash' ? 'flash' : 'featured' };
  } else if (api.corporate_ready) {
    badge = { label: 'Corporate Ready', variant: 'corporate' };
  } else if (api.is_wholesale) {
    badge = { label: 'Wholesale', variant: 'wholesale' };
  }

  let badgeBottom: Product['badgeBottom'];
  if (api.handmade) {
    badgeBottom = { label: 'Handmade', variant: 'secondary' };
  } else if (api.seasonal) {
    badgeBottom = { label: 'Seasonal', variant: 'flash' };
  } else if (api.holiday_special) {
    badgeBottom = { label: 'Holiday Special', variant: 'flash' };
  } else if (api.is_local) {
    badgeBottom = { label: 'Local', variant: 'new' };
  }

  const image = resolveImage(api);
  return {
    id: String(api.id),
    image,
    gallery: api.images.length > 0 ? api.images.map(absoluteUrl).filter(Boolean) as string[] : image ? [image] : undefined,
    category: api.category?.name ?? 'General',
    title: api.name,
    price: `UGX ${Math.round(effective).toLocaleString()}`,
    priceValue: effective,
    originalPrice: originalValue != null ? `UGX ${Math.round(originalValue).toLocaleString()}` : undefined,
    originalPriceValue: originalValue,
    discount: computeDiscountLabel(api),
    createdAt: api.created_at,
    minOrder: `Min. Order: ${api.min_order_quantity ?? 1} units`,
    minOrderValue: api.min_order_quantity ?? 1,
    rating: api.rating,
    reviews: api.review_count,
    stock: resolveStock(api.stock_status),
    description: api.description ?? undefined,
    specifications: api.specifications ?? null,
    vendor: {
      id: api.vendor?.id ?? undefined,
      name: vendorName,
      location: VENDOR_LOCATION,
      verified: api.vendor ? api.vendor.rating > 0 : true,
    },
    isWholesale: Boolean(api.is_wholesale),
    bulkOrder: Boolean(api.bulk_order),
    corporateReady: Boolean(api.corporate_ready),
    enterpriseSolution: Boolean(api.enterprise_solution),
    seasonal: Boolean(api.seasonal),
    holidaySpecial: Boolean(api.holiday_special),
    seasonalTheme: api.seasonal_theme ?? undefined,
    isLocal: Boolean(api.is_local),
    handmade: Boolean(api.handmade),
    deliveryFee: api.delivery_fee ?? 0,
    shippingFee: api.shipping_fee ?? 0,
    sku: api.sku ?? undefined,
    quality: api.quality ?? undefined,
    productType: api.product_type ?? undefined,
    originCountry: api.origin_country ?? undefined,
    badge,
    badgeBottom,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  const all: ApiProduct[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const data = await getJson<ProductsResponse>(`/products?per_page=50&page=${page}`);
    all.push(...data.data.products);
    lastPage = data.data.pagination.last_page;
    page += 1;
  } while (page <= lastPage && page <= 20);
  return all;
}

export async function fetchProductDetail(id: number | string): Promise<ApiProduct> {
  const data = await getJson<ProductDetailResponse>(`/products/${id}`);
  return data.data.product;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const data = await getJson<CategoriesResponse>('/categories');
  return data.data.categories;
}

// ---------------------------------------------------------------------------
// Auth + Cart API
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: number | string;
  name: string | null;
  email: string;
  role?: string;
  phone?: string | null;
  bio?: string | null;
  photo?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  language?: string | null;
  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  marketing_emails?: boolean;
  security_notifications?: boolean;
  preferences?: Record<string, unknown> | null;
  timezone?: string | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  password_changed_at?: string | null;
  pin_gate_enabled?: boolean;
  jemina_pin_set?: boolean;
}

export interface ApiCartItem {
  id: number;
  product: ApiProduct;
  quantity: number;
  price: number;
  added_at?: string | null;
}

export interface AuthUserResult {
  user: ApiUser;
  token: string;
}

export interface TwoFactorChallenge {
  two_factor_required: true;
  email: string;
  resendAfter: number;
  message: string;
}

/** Server says the account exists but is not active yet (or was deactivated). */
export interface AccountPendingResult {
  account_pending: true;
  account_deactivated?: boolean;
  user: ApiUser;
  token: string;
  message?: string;
}

export type LoginResult = AuthUserResult | TwoFactorChallenge | AccountPendingResult;

export function isAccountPending(result: LoginResult): result is AccountPendingResult {
  return 'account_pending' in result && result.account_pending === true;
}

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return 'two_factor_required' in result && result.two_factor_required === true;
}

export class TwoFactorRequiredError extends Error {
  readonly email: string;
  readonly resendAfter: number;

  constructor(email: string, resendAfter: number, message: string) {
    super(message || 'A verification code has been sent to your email.');
    this.name = 'TwoFactorRequiredError';
    this.email = email || '';
    this.resendAfter = resendAfter || 0;
  }
}

/** Thrown after auth state is set when the account is pending activation. */
export class AccountPendingError extends Error {
  readonly email: string;
  readonly deactivated: boolean;

  constructor(email: string, message?: string, deactivated = false) {
    super(
      message ||
        (deactivated
          ? 'Your account has been deactivated. Please contact support.'
          : 'Your account is pending activation. Please check your email.'),
    );
    this.name = 'AccountPendingError';
    this.email = email || '';
    this.deactivated = deactivated;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

type UnauthorizedListener = () => void;

let unauthorizedListeners: UnauthorizedListener[] = [];

export function subscribeUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.push(listener);
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter(l => l !== listener);
  };
}

function emitUnauthorized() {
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // A failing listener must not break the request flow.
    }
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
  two_factor_required?: boolean;
  two_factor_email?: string;
  resend_after?: number;
  account_pending?: boolean;
  account_deactivated?: boolean;
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: ApiMethod;
  token?: string | null;
  body?: unknown;
  allowFailed?: boolean;
}

async function request<T = unknown>(
  path: string,
  { method = 'GET', token, body, allowFailed = false }: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401 && token) {
    emitUnauthorized();
    throw new UnauthorizedError();
  }
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  const isChallenge = allowFailed && json?.two_factor_required === true;
  if (!response.ok || !json || (json.success === false && !isChallenge)) {
    const detail =
      json?.message ||
      (json?.errors ? Object.values(json.errors).flat().join(' ') : undefined) ||
      `API error ${response.status}`;
    throw new Error(detail);
  }
  return json;
}

function toLoginResult(
  json: ApiEnvelope<AuthUserResult>,
): LoginResult {
  if (json.two_factor_required === true) {
    return {
      two_factor_required: true,
      email: json.two_factor_email ?? '',
      resendAfter: json.resend_after ?? 0,
      message: json.message ?? 'A verification code has been sent to your email.',
    };
  }
  if (json.account_pending === true) {
    const payload = json.data as AuthUserResult | undefined;
    return {
      account_pending: true,
      account_deactivated: json.account_deactivated === true,
      user: payload?.user as ApiUser,
      token: payload?.token ?? '',
      message: json.message,
    };
  }
  return json.data as AuthUserResult;
}

export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  const deviceName = await getDeviceModel();
  const json = await request<AuthUserResult>('/auth/login', {
    method: 'POST',
    body: { email, password, device_name: deviceName },
    allowFailed: true,
  });
  return toLoginResult(json);
}

/**
 * Sign in with the account's 4-digit Trader PIN.
 * `email` identifies the account (taken from the last email sign-in on device).
 */
export async function apiLoginWithPin(email: string, pin: string): Promise<LoginResult> {
  const deviceName = await getDeviceModel();
  const json = await request<AuthUserResult>('/auth/login', {
    method: 'POST',
    body: { email, pin, login_type: 'pin', device_name: deviceName },
    allowFailed: true,
  });
  return toLoginResult(json);
}

export async function apiGoogleLogin(idToken: string): Promise<LoginResult> {
  const deviceName = await getDeviceModel();
  const json = await request<AuthUserResult>('/auth/google', {
    method: 'POST',
    body: { id_token: idToken, device_name: deviceName },
    allowFailed: true,
  });
  return toLoginResult(json);
}

export async function apiVerifyTwoFactor(
  email: string,
  code: string,
): Promise<LoginResult> {
  const deviceName = await getDeviceModel();
  const json = await request<AuthUserResult>('/auth/two-factor/verify', {
    method: 'POST',
    body: { email, code, device_name: deviceName },
    allowFailed: true,
  });
  return toLoginResult(json);
}

export async function apiResendTwoFactorCode(email: string): Promise<number> {
  const json = await request<{ resend_after?: number }>('/auth/two-factor/resend', {
    method: 'POST',
    body: { email },
  });
  return json.resend_after ?? 30;
}

export interface RegisterResult {
  user: ApiUser;
  token?: string;
  accountPending: boolean;
  message?: string;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
  phone: string,
): Promise<RegisterResult> {
  const json = await request<{ user: ApiUser; token?: string }>('/auth/register', {
    method: 'POST',
    body: {
      name,
      email,
      password,
      password_confirmation: password,
      role: 'customer',
      phone,
      dial_code: '+256',
    },
  });
  const payload = json.data as { user: ApiUser; token?: string } | undefined;
  return {
    user: payload?.user as ApiUser,
    token: payload?.token,
    accountPending: json.account_pending === true,
    message: json.message,
  };
}

/** Resend the account-activation email (requires a pending session token). */
export async function apiResendActivation(token: string): Promise<string> {
  const json = await request<{ message?: string }>('/auth/activation/resend', {
    method: 'POST',
    token,
  });
  return json.message || 'Activation email resent. Please check your inbox.';
}

export async function apiLogout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', token });
}

export async function apiRegisterDeviceToken(
  fcmToken: string,
  platform: string,
  token: string,
): Promise<void> {
  await request('/auth/device-token', {
    method: 'POST',
    token,
    body: { token: fcmToken, platform },
  });
}

export async function apiRemoveDeviceToken(fcmToken: string, token: string): Promise<void> {
  await request('/auth/device-token', { method: 'DELETE', token, body: { token: fcmToken } });
}

export async function apiGetUser(token: string): Promise<ApiUser> {
  const json = await request<{ user: ApiUser }>('/auth/user', { token });
  return (json.data as { user: ApiUser }).user;
}

/* ─── Security: 2FA Management ──────────────────────── */

export interface ApiTwoFactorStatus {
  enabled: boolean;
  confirmed_at: string | null;
  has_recovery_codes: boolean;
}

export interface ApiTwoFactorSetup {
  method: string;
  email?: string;
  delivered?: boolean;
  resend_after?: number;
  secret?: string;
  qr_url?: string;
}

export interface ApiSession {
  id: number;
  name: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string | null;
}

export async function apiGetTwoFactorStatus(token: string): Promise<ApiTwoFactorStatus> {
  const json = await request<{ enabled: boolean; confirmed_at: string | null; has_recovery_codes: boolean }>(
    '/security/2fa/status',
    { token },
  );
  return json.data as ApiTwoFactorStatus;
}

export async function apiEnableTwoFactor(token: string): Promise<ApiTwoFactorSetup> {
  const json = await request<ApiTwoFactorSetup>(
    '/security/2fa/enable',
    { method: 'POST', token },
  );
  return json.data as ApiTwoFactorSetup;
}

export async function apiConfirmTwoFactor(token: string, code: string): Promise<string[]> {
  const json = await request<{ recovery_codes: string[] }>(
    '/security/2fa/confirm',
    { method: 'POST', token, body: { code } },
  );
  return (json.data as { recovery_codes: string[] }).recovery_codes ?? [];
}

export async function apiDisableTwoFactor(token: string, password: string): Promise<void> {
  await request('/security/2fa/disable', {
    method: 'POST',
    token,
    body: { password },
  });
}

/** Change the current password; requires current-password confirmation. */
export async function apiChangePassword(token: string, currentPassword: string, newPassword: string): Promise<string> {
  const json = await request<{ message?: string }>('/security/change-password', {
    method: 'POST',
    token,
    body: { current_password: currentPassword, new_password: newPassword, new_password_confirmation: newPassword },
  });
  return json?.message ?? 'Password updated successfully.';
}

/* ─── Security: Session Management ──────────────────── */

export async function apiGetSessions(token: string): Promise<ApiSession[]> {
  const json = await request<{ sessions: ApiSession[] }>('/security/sessions', { token });
  return (json.data as { sessions: ApiSession[] }).sessions ?? [];
}

export async function apiRevokeSession(token: string, sessionId: number): Promise<void> {
  await request(`/security/sessions/${sessionId}`, { method: 'DELETE', token });
}

export async function apiRevokeOtherSessions(token: string): Promise<void> {
  await request('/security/sessions/revoke-others', { method: 'POST', token });
}

export async function apiGetCart(token: string): Promise<ApiCartItem[]> {
  const json = await request<{ items: ApiCartItem[] }>('/cart', { token });
  return (json.data as { items: ApiCartItem[] }).items ?? [];
}

export async function apiAddToCart(
  token: string,
  productId: number | string,
  quantity: number,
): Promise<void> {
  await request('/cart', {
    method: 'POST',
    token,
    body: { product_id: Number(productId), quantity },
  });
}

export async function apiUpdateCartItem(
  token: string,
  itemId: number,
  quantity: number,
): Promise<void> {
  await request(`/cart/${itemId}`, { method: 'PUT', token, body: { quantity } });
}

export async function apiRemoveCartItem(token: string, itemId: number): Promise<void> {
  await request(`/cart/${itemId}`, { method: 'DELETE', token });
}

export async function apiClearCart(token: string): Promise<void> {
  await request('/cart', { method: 'DELETE', token });
}

// ---------------------------------------------------------------------------
// Orders + Payments API
// ---------------------------------------------------------------------------

export interface ApiShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

export interface ApiTrackingEventRow {
  status: string;
  location?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
}

export interface ApiTrackingInfo {
  status?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  dispatch_location?: string | null;
  destination_location?: string | null;
  transit_points?: Array<{ name?: string; location?: string; latitude?: number; longitude?: number }>;
  customer_received_at?: string | null;
  timeline?: ApiTrackingEventRow[];
}

export interface ApiOrderItem {
  id?: number;
  product_id: number;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  product_image?: string | null;
  tracking?: ApiTrackingInfo;
  vendor_id?: number | null;
  vendor_name?: string | null;
  shop_name?: string | null;
  shipping_fee?: number | null;
  delivery_fee?: number | null;
}

export interface ApiOrderPickupPoint {
  id: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  name: string;
  location: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  hours?: string | null;
  is_default?: boolean;
}

export interface ApiOrder {
  id: number;
  order_number: string;
  status: string;
  payment_status?: string;
  total_amount: number;
  shipping_amount: number;
  tax_amount: number;
  created_at: string;
  delivered_at?: string | null;
  shipping_address?: ApiShippingAddress | null;
  payment_method?: string;
  notes?: string | null;
  items?: ApiOrderItem[];
  items_count?: number;
  fulfilment?: 'pickup' | 'delivery';
  pickup_point?: ApiOrderPickupPoint | null;
}

interface OrdersResponse {
  orders: ApiOrder[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export async function apiCreateOrder(
  token: string,
  payload: {
    items: { product_id: number; quantity: number }[];
    shipping_address: ApiShippingAddress;
    payment_method: string;
    notes?: string;
    voucher_id?: number;
    voucher_code?: string;
    discount_amount?: number;
    pickup_point_id?: number;
    pickup_point?: { name: string; location: string } | null;
    fulfilment?: 'pickup' | 'delivery';
  },
): Promise<ApiOrder> {
  const json = await request<{ order: ApiOrder }>('/orders', {
    method: 'POST',
    token,
    body: payload,
  });
  return (json.data as { order: ApiOrder }).order;
}

export async function apiGetOrders(token: string): Promise<ApiOrder[]> {
  const json = await request<OrdersResponse>('/orders', { token });
  return (json.data as OrdersResponse).orders ?? [];
}

export async function apiGetOrder(token: string, id: number): Promise<ApiOrder> {
  const json = await request<{ order: ApiOrder }>(`/orders/${id}`, { token });
  return (json.data as { order: ApiOrder }).order;
}

export interface ApiPaymentResult {
  transaction_id: string;
  gateway_data: Record<string, unknown>;
}

export async function apiInitiatePayment(
  token: string,
  payload: {
    gateway: string;
    amount: number;
    currency: string;
    order_id?: number;
    description?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ApiPaymentResult> {
  const json = await request<ApiPaymentResult>('/payments/initiate', {
    method: 'POST',
    token,
    body: payload,
  });
  return json.data as ApiPaymentResult;
}

export interface ApiPaymentStatus {
  transaction_id: string;
  status: string;
  gateway_status: string;
  amount: number;
  currency: string;
}

export async function apiGetPaymentStatus(token: string, transactionId: string): Promise<ApiPaymentStatus> {
  const json = await request<ApiPaymentStatus>(`/payments/${transactionId}/status`, { token });
  return json.data as ApiPaymentStatus;
}

export interface ApiAcceptedPaymentMethod {
  key: string;
  label: string;
  icon?: string;
  currencies?: string[];
  gateways?: string[];
}

// Accepted payment METHODS served by the platform (mobile_money / card / bitcoin).
// Gateways (stripe, flutterwave, ...) are processors, not user-facing methods.
export async function apiGetAcceptedPaymentMethods(token?: string | null): Promise<ApiAcceptedPaymentMethod[]> {
  const json = await request<{ methods: ApiAcceptedPaymentMethod[] }>('/payments/methods', { token });
  return json.data?.methods ?? [];
}

// ---------------------------------------------------------------------------
// Saved Payment Methods API
// ---------------------------------------------------------------------------

export type ApiPaymentMethodType = 'card' | 'mobile_money' | 'cloud_pay';

export interface ApiPaymentMethod {
  id: number;
  user_id: number;
  type: ApiPaymentMethodType;
  provider: string;
  account_number: string;
  expiry_date?: string | null;
  account_name?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at?: string | null;
}

export async function apiGetPaymentMethods(token: string): Promise<ApiPaymentMethod[]> {
  const json = await request<{ payment_methods: ApiPaymentMethod[] }>('/payment-methods', { token });
  return (json.data as { payment_methods: ApiPaymentMethod[] }).payment_methods ?? [];
}

export async function apiSavePaymentMethod(
  token: string,
  payload: {
    type: ApiPaymentMethodType;
    provider: string;
    account_number: string;
    expiry_date?: string;
    account_name?: string;
    is_default?: boolean;
  },
): Promise<ApiPaymentMethod> {
  const json = await request<{ payment_method: ApiPaymentMethod }>('/payment-methods', {
    method: 'POST',
    token,
    body: payload,
  });
  return (json.data as { payment_method: ApiPaymentMethod }).payment_method;
}

export async function apiUpdatePaymentMethod(
  token: string,
  id: number,
  payload: Partial<{
    type: ApiPaymentMethodType;
    provider: string;
    account_number: string;
    expiry_date?: string;
    account_name?: string;
    is_default?: boolean;
    is_active?: boolean;
  }>,
): Promise<ApiPaymentMethod> {
  const json = await request<{ payment_method: ApiPaymentMethod }>(`/payment-methods/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  return (json.data as { payment_method: ApiPaymentMethod }).payment_method;
}

export async function apiDeletePaymentMethod(token: string, id: number): Promise<void> {
  await request(`/payment-methods/${id}`, { method: 'DELETE', token });
}

export async function apiSetDefaultPaymentMethod(token: string, id: number): Promise<void> {
  await request(`/payment-methods/${id}/default`, { method: 'PUT', token });
}

// ---------------------------------------------------------------------------
// JEMINA Credits API
// ---------------------------------------------------------------------------

export interface ApiCreditBalance {
  balance: number;
  total_purchased: number;
  total_spent: number;
  is_active: boolean;
  formatted: string;
  currency: string;
}

export interface ApiCreditTransaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
}

export async function apiGetCreditBalance(token: string): Promise<ApiCreditBalance> {
  const json = await request<ApiCreditBalance>('/credits/balance', { token });
  return json.data as ApiCreditBalance;
}

export async function apiGetCreditHistory(
  token: string,
): Promise<{ balance: number; transactions: ApiCreditTransaction[] }> {
  const json = await request<{ balance: number; transactions: ApiCreditTransaction[] }>(
    '/credits/history',
    { token },
  );
  return json.data as { balance: number; transactions: ApiCreditTransaction[] };
}

// ---------------------------------------------------------------------------
// Wishlist + Reviews API
// ---------------------------------------------------------------------------

export interface ApiWishlistItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    discounted_price: number | null;
    images: string[];
    rating: number;
    stock_quantity: number;
  };
  added_at: string;
}

export async function apiGetWishlist(token: string): Promise<ApiWishlistItem[]> {
  const json = await request<{ wishlist: ApiWishlistItem[] }>('/profile/wishlist', { token });
  return (json.data as { wishlist: ApiWishlistItem[] }).wishlist ?? [];
}

export async function apiAddToWishlist(token: string, productId: number | string): Promise<void> {
  await request('/profile/wishlist', { method: 'POST', token, body: { product_id: Number(productId) } });
}

export async function apiRemoveFromWishlist(token: string, productId: number | string): Promise<void> {
  await request(`/profile/wishlist/${productId}`, { method: 'DELETE', token });
}

export interface ApiMyReview {
  id: number;
  product: { id: number; name: string; images: string[] };
  rating: number;
  comment: string;
  title: string | null;
  created_at: string;
}

export async function apiGetMyReviews(token: string): Promise<ApiMyReview[]> {
  const json = await request<{ reviews: ApiMyReview[] }>('/profile/reviews', { token });
  return (json.data as { reviews: ApiMyReview[] }).reviews ?? [];
}

export async function apiAddReview(
  token: string,
  productId: number | string,
  payload: { rating: number; comment: string; title?: string },
): Promise<void> {
  await request(`/profile/products/${productId}/reviews`, {
    method: 'POST',
    token,
    body: payload,
  });
}

// ---------------------------------------------------------------------------
// Search + Vendor API
// ---------------------------------------------------------------------------

export async function apiSearchProducts(query: string): Promise<ApiProduct[]> {
  const json = await getJson<ProductsResponse>(`/products/search?q=${encodeURIComponent(query)}`);
  return json.data.products;
}

export interface ApiVendorDetail {
  id: number;
  name: string;
  owner: string | null;
  email: string | null;
  phone: string | null;
  package: string | null;
  vendor_type: string | null;
  rating: number;
  review_count: number;
  product_count: number;
  description: string | null;
  location: string | null;
  logo: string | null;
  banner: string | null;
  services_offered: string | null;
  created_at: string;
}

export async function apiGetVendor(id: number | string): Promise<{
  vendor: ApiVendorDetail;
  products: ApiProduct[];
}> {
  const json = await getJson<{
    success: boolean;
    data: { vendor: ApiVendorDetail; products: ApiProduct[] };
  }>(`/vendors/${id}`);
  return json.data;
}

export interface ApiVendorReview {
  id: number;
  name: string;
  user_img?: string | null;
  rating: number;
  content: string;
  created_at: string;
}

export async function apiGetVendorReviews(vendorId: number | string): Promise<ApiVendorReview[]> {
  const data = await getJson<{ success: boolean; data: { reviews: ApiVendorReview[] } }>(
    `/vendors/${vendorId}/reviews`,
  );
  return data.data.reviews ?? [];
}

export async function apiSubmitVendorReview(
  token: string,
  vendorId: number | string,
  payload: { rating: number; content: string; name?: string },
): Promise<string> {
  const json = await request<{ review: ApiVendorReview }>(`/vendors/${vendorId}/reviews`, {
    method: 'POST',
    token,
    body: payload,
  });
  return json.message ?? 'Review submitted.';
}

export interface ApiVendorSummary {
  id: number;
  name: string;
  owner: string | null;
  rating: number;
  product_count: number;
  is_featured: boolean;
  description: string | null;
  location: string | null;
  logo: string | null;
  banner: string | null;
}

export async function apiGetVendors(): Promise<ApiVendorSummary[]> {
  const json = await getJson<{ success: boolean; data: { vendors: ApiVendorSummary[] } }>('/vendors');
  return json.data.vendors;
}

// ---------------------------------------------------------------------------
// Address API
// ---------------------------------------------------------------------------

export interface ApiAddress {
  id: number;
  user_id: number;
  type: string;
  name: string;
  full_name?: string | null;
  email?: string | null;
  street_address: string;
  region?: string | null;
  city?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  is_default: boolean;
}

export async function apiGetAddresses(token: string): Promise<ApiAddress[]> {
  const json = await request<{ addresses: ApiAddress[] }>('/addresses', { token });
  return (json.data as { addresses: ApiAddress[] }).addresses ?? [];
}

export async function apiSaveAddress(
  token: string,
  payload: Partial<ApiAddress> & { name: string; street_address: string },
): Promise<ApiAddress> {
  const json = await request<{ address: ApiAddress }>('/addresses', {
    method: 'POST',
    token,
    body: payload,
  });
  return (json.data as { address: ApiAddress }).address;
}

export async function apiUpdateAddress(
  token: string,
  id: number,
  payload: Partial<ApiAddress>,
): Promise<ApiAddress> {
  const json = await request<{ address: ApiAddress }>(`/addresses/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  return (json.data as { address: ApiAddress }).address;
}

export async function apiDeleteAddress(token: string, id: number): Promise<void> {
  await request(`/addresses/${id}`, { method: 'DELETE', token });
}

export async function apiSetDefaultAddress(token: string, id: number): Promise<void> {
  await request(`/addresses/${id}/default`, { method: 'PUT', token });
}

// ---------------------------------------------------------------------------
// Voucher API
// ---------------------------------------------------------------------------

export interface ApiVoucherResult {
  voucher_id: number;
  code: string;
  description?: string;
  discount: number;
  discount_type: string;
  formatted_discount: string;
}

export async function apiValidateVoucher(
  token: string,
  code: string,
): Promise<ApiVoucherResult & { discount_value: number; max_discount?: number | null; min_order_amount?: number | null }> {
  const json = await request<{
    voucher: {
      id: number;
      code: string;
      description?: string;
      discount_type: string;
      discount_value: number;
      max_discount?: number | null;
      min_order_amount?: number | null;
      discount_display?: string;
    };
  }>('/vouchers/validate', { method: 'POST', token, body: { code } });
  const v = (json.data as { voucher: any }).voucher;
  return {
    voucher_id: v.id,
    code: v.code,
    description: v.description,
    discount: 0,
    discount_type: v.discount_type,
    formatted_discount: '',
    discount_value: v.discount_value,
    max_discount: v.max_discount,
    min_order_amount: v.min_order_amount,
  };
}

export async function apiApplyVoucher(
  token: string,
  code: string,
  subtotal: number,
): Promise<ApiVoucherResult> {
  const json = await request<ApiVoucherResult>('/vouchers/apply', {
    method: 'POST',
    token,
    body: { code, subtotal },
  });
  return json.data as ApiVoucherResult;
}

// ---------------------------------------------------------------------------
// Profile Update API
// ---------------------------------------------------------------------------

export async function apiUpdateProfile(
  token: string,
  payload: Partial<ApiUser>,
): Promise<ApiUser> {
  const json = await request<{ user: ApiUser }>('/profile', {
    method: 'PUT',
    token,
    body: payload,
  });
  return (json.data as { user: ApiUser }).user;
}

// ---------------------------------------------------------------------------
// Profile Get API
// ---------------------------------------------------------------------------

export async function apiGetProfile(token: string): Promise<ApiUser | null> {
  try {
    const json = await request<{ user: ApiUser }>('/profile', { token });
    return (json.data as { user: ApiUser }).user ?? null;
  } catch {
    return null;
  }
}

export interface ProfilePhotoInput {
  uri: string;
  name?: string;
  type?: string;
}

// Uploads a picked image (multipart) and returns the updated user with the new photo.
export async function apiUploadProfilePhoto(token: string, photo: ProfilePhotoInput): Promise<ApiUser> {
  const form = new FormData();
  form.append('photo', {
    uri: photo.uri,
    name: photo.name ?? 'photo.jpg',
    type: photo.type ?? 'image/jpeg',
  } as unknown as Blob);
  const response = await fetch(`${API_BASE_URL}/profile/photo`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: { user?: ApiUser };
  } | null;
  if (!response.ok || !json || json.success === false) {
    throw new Error(json?.message || `Photo upload failed (${response.status}).`);
  }
  return (json.data?.user) as ApiUser;
}

// ---------------------------------------------------------------------------
// Surveys API
// ---------------------------------------------------------------------------

export interface ApiSurveyQuestion {
  id: number;
  question: string;
  type: string;
  options: string[];
  is_required: boolean;
  order: number;
  answer?: string | string[] | null;
}

export interface ApiSurvey {
  id: number;
  survey_name: string;
  survey_description?: string | null;
  type?: string;
  credit_reward: number;
  is_required: boolean;
  questions_count?: number;
  completed?: boolean;
  locked?: boolean;
  questions?: ApiSurveyQuestion[];
}

export interface ApiVendorJourney {
  user_survey_completed: boolean;
  vendor_survey_completed: boolean;
  both_completed: boolean;
  unlocked: boolean;
  has_vendor: boolean;
  account_active: boolean;
  agreement_accepted: boolean;
}

export interface ApiVendorActionsStatus {
  journey: ApiVendorJourney;
  vendor: {
    id: number;
    shop_name: string;
    shop_slug: string;
    shop_owner?: string | null;
    shop_email?: string | null;
    shop_phone?: string | null;
    vendor_type?: string | null;
    pay_method?: string | null;
    package?: string | null;
    is_active: boolean;
  } | null;
}

export interface ApiAgreementSection {
  heading: string;
  blocks: (
    | { type: 'paragraph'; text: string }
    | { type: 'subheading'; text: string }
    | { type: 'list'; items: string[] }
  )[];
}

export interface ApiVendorAgreement {
  title: string;
  last_updated: string;
  notice: string;
  sections: ApiAgreementSection[];
  acceptance: string;
}

export async function apiGetSurveys(
  token: string,
): Promise<{ surveys: ApiSurvey[]; vendorJourney?: ApiVendorJourney }> {
  const json = await request<{ surveys: ApiSurvey[]; vendor_journey?: ApiVendorJourney }>('/surveys', {
    token,
  });
  const data = json.data as { surveys: ApiSurvey[]; vendor_journey?: ApiVendorJourney };
  return { surveys: data.surveys ?? [], vendorJourney: data.vendor_journey };
}

export async function apiGetVendorActionsStatus(token: string): Promise<ApiVendorActionsStatus> {
  const json = await request<ApiVendorActionsStatus>('/vendor/actions', { token });
  return json.data as ApiVendorActionsStatus;
}

export async function apiGetVendorAgreement(token: string): Promise<ApiVendorAgreement> {
  const json = await request<{ agreement: ApiVendorAgreement }>('/vendor/agreement', { token });
  return (json.data as { agreement: ApiVendorAgreement }).agreement;
}

export async function apiAcceptVendorAgreement(token: string): Promise<void> {
  await request('/vendor/agreement/accept', { method: 'POST', token });
}

export async function apiCheckVendorAgreementAccepted(token: string): Promise<boolean> {
  const json = await request<{ accepted: boolean }>('/vendor/agreement/accept', {
    method: 'POST',
    token,
    body: { check: true },
  });
  return (json.data as { accepted: boolean })?.accepted ?? false;
}

export async function apiCreateVendorStore(
  token: string,
  payload: {
    shop_name: string;
    shop_owner: string;
    shop_email: string;
    shop_phone: string;
    vendor_type?: string;
    pay_method?: string;
    terms: boolean;
  },
): Promise<{ id: number; shop_name: string; shop_slug: string }> {
  const json = await request<{ vendor: { id: number; shop_name: string; shop_slug: string } }>(
    '/vendor/store',
    { method: 'POST', token, body: payload },
  );
  return (json.data as { vendor: { id: number; shop_name: string; shop_slug: string } }).vendor;
}

export async function apiGetSurvey(token: string, id: number): Promise<ApiSurvey> {
  const json = await request<{ survey: ApiSurvey }>(`/surveys/${id}`, { token });
  return (json.data as { survey: ApiSurvey }).survey;
}

export async function apiSubmitSurvey(
  token: string,
  id: number,
  answers: { question_id: number; answer: string | string[] }[],
): Promise<number> {
  const json = await request<{ credit_awarded: number }>(`/surveys/${id}/submit`, {
    method: 'POST',
    token,
    body: { answers },
  });
  return (json.data as { credit_awarded?: number })?.credit_awarded ?? 0;
}

// ---------------------------------------------------------------------------
// Help / Support Ticket API
// ---------------------------------------------------------------------------

export interface ApiHelpTicket {
  id: number;
  ticket_number: string;
  type: string;
  type_label?: string;
  priority: string;
  priority_label?: string;
  subject: string;
  description: string;
  status: string;
  status_label?: string;
  response?: string | null;
  admin_summary?: string | null;
  assigned_to?: number | null;
  attachments?: string[];
  created_at?: string | null;
  responded_at?: string | null;
  resolved_at?: string | null;
}

export async function apiGetTickets(token: string): Promise<ApiHelpTicket[]> {
  const json = await request<{ tickets: ApiHelpTicket[] }>('/help/tickets', { token });
  return (json.data as { tickets: ApiHelpTicket[] }).tickets ?? [];
}

export async function apiGetTicket(token: string, id: number): Promise<ApiHelpTicket> {
  const json = await request<{ ticket: ApiHelpTicket }>(`/help/tickets/${id}`, { token });
  return (json.data as { ticket: ApiHelpTicket }).ticket;
}

export async function apiCreateTicket(
  token: string,
  payload: {
    type: string;
    priority: string;
    subject: string;
    description: string;
  },
): Promise<ApiHelpTicket> {
  const json = await request<{ ticket: ApiHelpTicket }>('/help/tickets', {
    method: 'POST',
    token,
    body: payload,
  });
  return (json.data as { ticket: ApiHelpTicket }).ticket;
}

// ---------------------------------------------------------------------------
// In-App Messages API
// ---------------------------------------------------------------------------

export interface ApiMessage {
  id: number;
  name?: string | null;
  subject: string;
  message: string;
  type?: string;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function apiGetMessages(
  token: string,
): Promise<{ messages: ApiMessage[]; new_count: number }> {
  const json = await request<{ messages: ApiMessage[]; new_count: number }>('/messages', { token });
  const data = json.data as { messages: ApiMessage[]; new_count?: number };
  return { messages: data.messages ?? [], new_count: data.new_count ?? 0 };
}

export async function apiGetMessage(token: string, id: number): Promise<ApiMessage> {
  const json = await request<{ message: ApiMessage }>(`/messages/${id}`, { token });
  return (json.data as { message: ApiMessage }).message;
}

export async function apiMarkMessageRead(token: string, id: number): Promise<void> {
  await request(`/messages/${id}/read`, { method: 'PUT', token });
}

// ---------------------------------------------------------------------------
// Chatbot / Chat API
// ---------------------------------------------------------------------------

export interface ApiInquiryResult {
  id: number;
  inquiry_reference: string;
  formatted_reference: string;
  status: string;
  status_name: string;
  product_name: string;
  quantity_required: number;
  submitted_at: string;
  product_id?: number;
  product_image?: string | null;
  vendor_id?: number;
  vendor_name?: string;
  estimated_total?: number;
  delivery_progress?: number;
  status_badge?: { bg: string; fg: string } | null;
  delivery_location?: string;
  inquiry_subject?: string;
  inquiry_message?: string;
  replies_count?: number;
  latest_reply?: {
    vendor_name: string;
    message: string;
    offered_price?: number;
    quoted_unit_price?: number;
    timestamp: string;
    is_recommended?: boolean;
  } | null;
  budget_target?: number;
  destination?: string;
  is_draft?: boolean;
  expires_at?: string;
}

export interface ApiInquiryInput {
  product_id: number | string;
  vendor_id: number | string;
  user_name: string;
  user_email: string;
  user_phone: string;
  company_name?: string;
  quantity_required: number;
  expected_delivery?: string;
  delivery_location?: string;
  inquiry_subject: 'bulk_order' | 'wholesale_pricing' | 'custom_order' | 'partnership' | 'other';
  inquiry_message: string;
}

export async function apiSubmitInquiry(
  token: string,
  payload: ApiInquiryInput,
): Promise<ApiInquiryResult> {
  const json = await request<{ inquiry: ApiInquiryResult }>('/inquiries', {
    method: 'POST',
    token,
    body: payload,
  });
  return (json.data as { inquiry: ApiInquiryResult }).inquiry;
}

export async function apiGetMyInquiries(token: string): Promise<ApiInquiryResult[]> {
  const json = await request<{ inquiries: ApiInquiryResult[] }>('/inquiries', {
    method: 'GET',
    token,
  });
  return (json.data as { inquiries: ApiInquiryResult[] }).inquiries;
}

export interface ApiChatReply {
  success: boolean;
  response: string | null;
  answered: boolean;
  needs_vendor?: boolean;
  suggestions: string[];
}

/** Stable-ish per-screen conversation id so order-status state survives app restarts. */
export function makeConversationId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `app_${Date.now().toString(36)}_${rand}`;
}

export async function apiChatAsk(
  token: string,
  message: string,
  conversationId: string,
): Promise<ApiChatReply> {
  const json = await request<ApiChatReply>('/chat/ask', {
    method: 'POST',
    token,
    body: { message, conversation_id: conversationId },
  });
  return json as unknown as ApiChatReply;
}

export async function apiChatClear(token: string, conversationId: string): Promise<void> {
  await request('/chat/clear', { method: 'POST', token, body: { conversation_id: conversationId } });
}

export async function apiVendorChatAsk(
  token: string,
  vendorId: number | string,
  message: string,
  conversationId: string,
): Promise<ApiChatReply> {
  const json = await request<ApiChatReply>('/vendor-chat/ask', {
    method: 'POST',
    token,
    body: { vendor_id: Number(vendorId), message, conversation_id: conversationId },
  });
  return json as unknown as ApiChatReply;
}

export async function apiVendorChatNotify(
  token: string,
  vendorId: number | string,
  message: string,
): Promise<ApiChatReply> {
  const json = await request<ApiChatReply>('/vendor-chat/notify', {
    method: 'POST',
    token,
    body: { vendor_id: Number(vendorId), message },
  });
  return json as unknown as ApiChatReply;
}

// ---------------------------------------------------------------------------
// Promotions API (public — admin-managed seasonal banner on Home)
// ---------------------------------------------------------------------------

export type ApiPromotionPlacement =
  | 'banner'
  | 'seasonal'
  | 'popular'
  | 'new_arrivals'
  | 'flash'
  | 'homepage'
  | string;

export interface ApiPromotion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  placement: ApiPromotionPlacement;
  type?: string | null;
  link_url?: string | null;
  target_url?: string | null;
  has_shop: boolean;
  vendor?: { id: number; name: string } | null;
  starts_at?: string | null;
  ends_at?: string | null;
  stats?: {
    views: number;
    clicks: number;
    unique_views: number;
    unique_clicks: number;
    engagement_rate: number;
  };
}

interface PromotionsResponse {
  success: boolean;
  data: {
    promotions: ApiPromotion[];
    pagination: { current_page: number; per_page: number; total: number; last_page: number };
  };
}

/** Public POST with JSON body (no auth) for promo view/click tracking. */
async function publicPost<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json().catch(() => null)) as { success?: boolean; data?: T } | null;
  if (!response.ok || !json || json.success === false) {
    throw new Error(`API error ${response.status}`);
  }
  return json.data as T;
}

/** Fetch active promotions, optionally filtered by placement (e.g. 'seasonal'). */
export async function apiGetPromotions(
  placement?: ApiPromotionPlacement,
): Promise<ApiPromotion[]> {
  const qs = placement ? `?placement=${encodeURIComponent(placement)}` : '';
  const data = await getJson<PromotionsResponse>(`/promotions${qs}`);
  return data.data.promotions ?? [];
}

/** Record a promo view (fire-and-forget). Source = 'app'. */
export function apiTrackPromotionView(id: number | string): void {
  publicPost<{ views: number }>(`/promotions/${id}/view`, { source: 'app' }).catch(() => {});
}

/** Record a promo click; resolves to (clicks, target_url). */
export async function apiTrackPromotionClick(
  id: number | string,
): Promise<{ clicks: number; target_url?: string | null }> {
  const data = await publicPost<{ clicks: number; target_url?: string | null }>(
    `/promotions/${id}/click`,
    { source: 'app' },
  );
  return data;
}

// ---------------------------------------------------------------------------
// JEMINA PIN & Auto-Reload API
// ---------------------------------------------------------------------------

export interface ApiPinStatus {
  pin_set: boolean;
  pin_set_at: string | null;
  pin_failed_attempts: number;
  pin_lockout: boolean;
  pin_lockout_remaining_seconds: number;
  pin_gate_enabled: boolean;
  password_changed_at: string | null;
  auto_reload_enabled: boolean;
  auto_reload_paused_due_to_lockout: boolean;
  auto_reload_settings: {
    threshold: number;
    topup_amount: number;
    payment_rail: string;
    mandate_reference: string | null;
    activated_at: string | null;
    restored_at: string | null;
  } | null;
}

export interface ApiPinVerifyResult {
  verified: boolean;
  attempts_remaining: number;
  pin_lockout: boolean;
  pin_lockout_remaining_seconds: number;
  message?: string;
}

export interface ApiPinResetResult {
  restored: boolean;
  restored_at: string | null;
}

export async function apiGetPinStatus(token: string): Promise<ApiPinStatus> {
  const json = await request<ApiPinStatus>('/pin/status', { token });
  return (json?.data ?? json) as ApiPinStatus;
}

export async function apiSetPin(token: string, pin: string, currentPin?: string): Promise<void> {
  await request('/pin/set', {
    method: 'POST',
    token,
    body: { pin, current_pin: currentPin },
  });
}

export async function apiVerifyPin(token: string, pin: string): Promise<boolean> {
  const json = await request<{ success: boolean }>('/pin/verify', {
    method: 'POST',
    token,
    body: { pin },
  });
  return json?.data?.success === true || (json as any)?.success === true;
}

/**
 * Verify the trade PIN and surface attempt / lockout detail on failure.
 */
export async function apiVerifyPinDetailed(token: string, pin: string): Promise<ApiPinVerifyResult> {
  const response = await fetch(`${API_BASE_URL}/pin/verify`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pin }),
  });
  const json = (await response.json().catch(() => null)) as any;
  if (!json) {
    throw new Error('Could not reach the JEMINA server.');
  }
  return {
    verified: json.success === true,
    attempts_remaining: typeof json.attempts_remaining === 'number' ? json.attempts_remaining : 3,
    pin_lockout: json.pin_lockout === true,
    pin_lockout_remaining_seconds: typeof json.pin_lockout_remaining_seconds === 'number' ? json.pin_lockout_remaining_seconds : 0,
    message: json.message,
  };
}

export async function apiSendOtp(token: string, method: 'pin' | 'mtn' | 'sms', purpose: string): Promise<{ method: string; expires_in?: number }> {
  const json = await request<{ method: string; expires_in?: number }>('/pin/otp/send', {
    method: 'POST',
    token,
    body: { method, purpose },
  });
  return (json?.data ?? json) as { method: string; expires_in?: number };
}

export async function apiVerifyOtp(token: string, otp: string, purpose: string): Promise<boolean> {
  const json = await request<{ success: boolean }>('/pin/otp/verify', {
    method: 'POST',
    token,
    body: { otp, purpose },
  });
  return json?.data?.success === true || (json as any)?.success === true;
}

/**
 * Reset the trade PIN after verifying a registered MTN MoMo SIM OTP.
 * Clears escrow lockout and restores the auto-reload mandate.
 */
export async function apiResetPin(token: string, otp: string, newPin: string): Promise<ApiPinResetResult> {
  const json = await request<ApiEnvelope<ApiPinResetResult>>('/pin/reset', {
    method: 'POST',
    token,
    body: { otp, new_pin: newPin },
  });
  return ((json?.data ?? json) as unknown) as ApiPinResetResult;
}

/** Toggle extra PIN security — require the JEMINA PIN to open Cart / Account screens. */
export async function apiSetPinGate(token: string, enabled: boolean): Promise<{ pin_gate_enabled: boolean }> {
  const json = await request<ApiEnvelope<{ pin_gate_enabled: boolean }>>('/pin/gate', {
    method: 'POST',
    token,
    body: { enabled },
  });
  return ((json?.data ?? json) as unknown) as { pin_gate_enabled: boolean };
}

export async function apiActivateAutoReload(token: string, payload: {
  pin?: string;
  otp?: string;
  threshold: number;
  topup_amount: number;
  payment_rail: string;
}): Promise<{ mandate_reference: string }> {
  const json = await request<{ mandate_reference: string }>('/pin/auto-reload/activate', {
    method: 'POST',
    token,
    body: payload,
  });
  const d = (json?.data ?? json) as { mandate_reference?: string };
  return { mandate_reference: d.mandate_reference ?? '' };
}

export async function apiDeactivateAutoReload(token: string): Promise<void> {
  await request('/pin/auto-reload/deactivate', {
    method: 'POST',
    token,
  });
}

// ---------------------------------------------------------------------------
// Pickup Points API
// ---------------------------------------------------------------------------

export interface ApiPickupPoint {
  id: string;
  name: string;
  vendor_name?: string | null;
  location: string;
  city: string;
  state: string;
  phone?: string | null;
  hours?: string | null;
  is_default: boolean;
}

export async function apiGetPickupPoints(): Promise<ApiPickupPoint[]> {
  const data = await getJson<{ data: { pickup_points: ApiPickupPoint[] } }>('/pickup-points');
  return data?.data?.pickup_points ?? [];
}
