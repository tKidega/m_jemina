import type { Product, ProductSpecifications } from '../components/ProductCard';
import { images } from './images';

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

function absoluteUrl(url: string | undefined): string | undefined {
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
    badge,
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
  timezone?: string | null;
  email_verified_at?: string | null;
  created_at?: string | null;
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

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: ApiMethod;
  token?: string | null;
  body?: unknown;
}

async function request<T = unknown>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
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
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !json || json.success === false) {
    const detail =
      json?.message ||
      (json?.errors ? Object.values(json.errors).flat().join(' ') : undefined) ||
      `API error ${response.status}`;
    throw new Error(detail);
  }
  return json;
}

export async function apiLogin(email: string, password: string): Promise<AuthUserResult> {
  const json = await request<AuthUserResult>('/auth/login', {
    method: 'POST',
    body: { email, password, device_name: 'm_jemina_app' },
  });
  return json.data as AuthUserResult;
}

export async function apiRegister(name: string, email: string, password: string): Promise<ApiUser> {
  const json = await request<{ user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: { name, email, password, password_confirmation: password, role: 'customer' },
  });
  return (json.data as { user: ApiUser }).user;
}

export async function apiLogout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', token });
}

export async function apiGetUser(token: string): Promise<ApiUser> {
  const json = await request<{ user: ApiUser }>('/auth/user', { token });
  return (json.data as { user: ApiUser }).user;
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
  quantity: number;
  unit_price: number;
  total: number;
  product_image?: string | null;
  tracking?: ApiTrackingInfo;
}

export interface ApiOrder {
  id: number;
  order_number: string;
  status: string;
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

export interface ApiVendorSummary {
  id: number;
  name: string;
  owner: string | null;
  rating: number;
  product_count: number;
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
  vendor: { id: number; shop_name: string; shop_slug: string; is_active: boolean } | null;
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
