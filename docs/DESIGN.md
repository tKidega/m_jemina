# Design & Architecture

Design system and application architecture for the **Jemi-na Shopping App**.

## 1. Design System

The design system was generated from Google Stitch wireframes for the Jemi-na marketplace brand and lives in `src/theme/`.

### 1.1 Typography

Family: **Hanken Grotesk** (bundled TTF weights 400/500/600/700 in `src/assets/fonts/`).

| Token | Size | Line Height | Weight | Used for |
|-------|------|-------------|--------|----------|
| `displayLg` | 32 | 40 | 700 | Screen titles |
| `displayLgMobile` | 28 | 36 | 700 | Mobile hero titles |
| `headlineLg` | 24 | 32 | 600 | Section headers |
| `headlineMd` | 20 | 28 | 600 | Card titles |
| `bodyLg` | 16 | 24 | 400 | Body copy |
| `bodyMd` | 14 | 20 | 400 | Secondary text |
| `labelMd` | 12 | 16 | 600 | Buttons / labels (uppercase, +0.6 tracking) |
| `labelSm` | 10 | 14 | 500 | Badges / micro-labels |

### 1.2 Color Tokens

Material 3-style semantic tokens in `src/theme/colors.ts`. Key values:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1d2832` | Dark ink — headers, primary buttons |
| `onPrimary` | `#ffffff` | Text on primary |
| `secondaryContainer` | `#ff9817` | Jemi-na accent (orange) — price highlights, CTA badges |
| `onSecondaryContainer` | `#663800` | Text on accent |
| `background` / `surface` | `#f6faff` | App background |
| `onSurface` | `#141d23` | Primary text |
| `surfaceVariant` | `#dae4ec` | Muted surfaces |
| `onSurfaceVariant` | `#44474b` | Secondary text |
| `outline` | `#74777c` | Borders / dividers |
| `error` | `#ba1a1a` | Errors |
| `statusFeatured` | `#007BFF` | "Featured" badge |
| `statusFlash` | `#DC3545` | "Flash" badge |
| `statusSuccess` | `#28A745` | Success / in-stock |

### 1.3 Spacing & Radius

Spacing scale (`src/theme/spacing.ts`): `4 / 8 / 12 / 16 / 24 / 32` (xs → xxl). Screen gutter = 16, section gap = 32.

Radius scale: `2 / 4 / 8 / 12 / 999` (sm → full).

## 2. Application Architecture

### 2.1 Navigation

Custom router in `src/navigation/NavigationContext.tsx` — a React Context + state-based router (no `react-navigation` dependency). `App.tsx` wraps the app in `NavigationProvider` and renders a `Router` that switches on the current route.

Current route map (31 routes):

| Route | Screen | Source file |
|-------|--------|-------------|
| Home | HomeScreen | `src/screens/HomeScreen.tsx` |
| Marketplace | MarketplaceScreen | `src/screens/MarketplaceScreen.tsx` |
| ProductDetails | ProductDetailsScreen | `src/screens/ProductDetailsScreen.tsx` |
| VendorProfile | VendorProfileScreen | `src/screens/VendorProfileScreen.tsx` |
| Cart | CartScreen | `src/screens/CartScreen.tsx` |
| Profile | ProfileScreen | `src/screens/ProfileScreen.tsx` |
| Login | LoginScreen | `src/screens/LoginScreen.tsx` |
| Register | RegisterScreen | `src/screens/RegisterScreen.tsx` |
| Checkout | CheckoutScreen | `src/screens/CheckoutScreen.tsx` |
| Orders | OrdersScreen | `src/screens/OrdersScreen.tsx` |
| OrderTracking | OrderTrackingScreen | `src/screens/OrderTrackingScreen.tsx` |
| Payment | PaymentScreen | `src/screens/PaymentScreen.tsx` |
| Payments → PaymentMethods | PaymentMethodsScreen | `src/screens/PaymentMethodsScreen.tsx` |
| AddressBook | AddressBookScreen | `src/screens/AddressBookScreen.tsx` |
| AccountSettings | AccountSettingsScreen | `src/screens/AccountSettingsScreen.tsx` |
| EditProfile | EditProfileScreen | `src/screens/EditProfileScreen.tsx` |
| Messages | MessagesScreen | `src/screens/MessagesScreen.tsx` |
| HelpCenter | HelpCenterScreen | `src/screens/HelpCenterScreen.tsx` |
| Wishlist | WishlistScreen | `src/screens/WishlistScreen.tsx` |
| MyReviews | MyReviewsScreen | `src/screens/MyReviewsScreen.tsx` |
| CreditHistory | CreditHistoryScreen | `src/screens/CreditHistoryScreen.tsx` |
| BuyCredits | BuyCreditsScreen | `src/screens/BuyCreditsScreen.tsx` |
| SearchResults | SearchResultsScreen | `src/screens/SearchResultsScreen.tsx` |
| Search | SearchScreen | `src/screens/SearchScreen.tsx` |
| ProductInquiry | ProductInquiryScreen | `src/screens/ProductInquiryScreen.tsx` |
| Surveys | SurveysScreen | `src/screens/SurveysScreen.tsx` |
| VendorActions | VendorActionsScreen | `src/screens/VendorActionsScreen.tsx` |
| AllProducts | CollectionProductsScreen | `src/screens/CollectionProductsScreen.tsx` |
| About | AboutScreen | `src/screens/AboutScreen.tsx` |
| Services | ServicesScreen | `src/screens/ServicesScreen.tsx` |
| TermsOfService | TermsOfServiceScreen | `src/screens/TermsOfServiceScreen.tsx` |
| PrivacyPolicy | PrivacyPolicyScreen | `src/screens/PrivacyPolicyScreen.tsx` |
| Contact | ContactScreen | `src/screens/ContactScreen.tsx` |

Bottom navigation is rendered by `src/components/BottomNav.tsx` (Home / Marketplace / Cart / Profile tabs).

A **sidebar drawer** (`src/components/Sidebar.tsx`) slides in from the left when the menu (hamburger) icon next to the JEMINA title in `AppHeader` is tapped. It groups navigation into Shop (Home / Marketplace / Cart), Account (Profile / My Orders), Company (About Us / Services / Contact Us) and Legal (Terms of Service / Privacy Policy), and is rendered once at the app root in `App.tsx` on top of the router. `AppHeader` opens it by default when no custom `onMenu` handler is provided.

### 2.2 Component Model

Reusable components in `src/components/`:

- `AppHeader` — screen header (title, back, menu/actions); menu button opens the sidebar by default
- `Sidebar` — slide-in navigation drawer (Shop / Account / Company / Legal links)
- `InfoPage` — shared layout for the company/legal screens (hero + pill, sections, feature cards, bullet lists)
- `BottomNav` — tab bar
- `Button` — primary/secondary buttons
- `Icon` — Material Symbols via `react-native-vector-icons`
- `ProductCard` — product tile (image, name, price, badges)
- `Badge` — status/label pill (Featured, Flash, discount)
- `SectionHeader` — titled section row

### 2.3 Screens

- **HomeScreen** — search bar, hero carousel, admin-managed promo row (live `GET /promotions`,
  cards via `PromoFlashCard` with crop-free aspect-ratio images and a "View Promo" action), browse
  collections, featured brands, smart picks, top rated, **seasonal & promotional** (Promotions API
  with seasonal product-flag fallback), featured stores, trust indicators, flash & deals, and extra
  B2B/lifestyle sections. On launch it also auto-opens the **promo popup** — cycles a different
  promotion per launch (AsyncStorage index), promo-data-only modal (see `NotificationContext`).
- **MarketplaceScreen** — hero, search/filters, corporate/B2B section, flash-sale carousel, featured stores.
- **ProductDetailsScreen** — image gallery, price/discount, vendor row, tabbed specs/description/reviews, add-to-cart.
- **VendorProfileScreen** — vendor header, stats, services, product grid.
- **CartScreen** — line items with quantity steppers, subtotal/total, empty state, per-vendor sections.
- **LoginScreen / RegisterScreen** — email/password forms with validation, show/hide password, demo account hint.
- **ProfileScreen** — signed-out prompt or user dashboard (account header, stats, account menu, logout).
- **CheckoutScreen** — **Pickup Point & Delivery**: pickup (default "Jemina Point · Jemina Official ·
  789 Commerce Street, Building A, Gulu) or delivery to the address book's default address; "Add a
  delivery address" link when none; coupon/promo-code input with live validation; vendor-grouped
  order summary + platform fee. **Payment options** resolve to the default saved method + Cash on
  Delivery + Bitcoin + JEMINA Credits (COD/credit orders go straight to Orders; gateway methods
  route to `PaymentScreen` with the mapped gateway). Submits the order with `pickup_point`/
  `fulfilment`, then routes to Orders or the payment gateway.
- **OrdersScreen** — order list with expandable details and pull-to-refresh.
- **PaymentScreen** — gateway handoff: calls `POST /payments/initiate` for the chosen gateway, shows the transaction reference and payment link (openable), and polls `GET /payments/{transactionId}/status` every 5s.
- **AboutScreen / ServicesScreen / TermsOfServiceScreen / PrivacyPolicyScreen / ContactScreen** — company & legal pages whose content mirrors the website (`resources/views/home/about|services|terms-of-service|privacy-policy|contact.blade.php` + partials). ContactScreen includes the contact info, business hours, and a mailto-based message form.
- **WishlistScreen / MyReviewsScreen** — wishlist (server-backed via `/profile/wishlist`) and the user's product reviews (`/profile/reviews`), both auth-gated from the Profile menu.
- **CreditHistoryScreen / BuyCreditsScreen** — credit transactions feed (`GET /credits/history`) and a credit purchase flow (`POST /payments/initiate` with `metadata.type=credit_purchase`, opens a gateway link).
- **SearchScreen / SearchResultsScreen** — recent-searches picker plus dense single-column results from `GET /products/search?q=`.
- **ProductInquiryScreen** — B2B inquiry form posting to `/inquiries` (inquiry-only products show a gated INQUIRE instead of add-to-cart).
- **SurveysScreen** — lists surveys (`GET /surveys`), records answers (`POST /surveys/{id}/submit`). Server returns `credit_awarded: 0` (rewards disabled) so the UI copy avoids promising a specific credit amount.
- **VendorActionsScreen** — vendor journey gating (user survey → vendor survey → agreement) and store creation (`POST /vendor/agreement/accept`, `POST /vendor/store`).
- **AccountSettingsScreen / EditProfileScreen / AddressBookScreen / PaymentMethodsScreen** — account hub with profile edits (`PUT /profile`), address CRUD (`/addresses*`), and saved payment methods CRUD (`/payment-methods*`), each with modal add/edit forms and default flags.
- **MessagesScreen / HelpCenterScreen** — in-app admin messages (`GET /messages`, mark-read) and support tickets (`/help/tickets` CRUD).
- **OrderTrackingScreen** — order/tracking-number lookup rendering the dispatch-to-delivery timeline from `/orders` + `/orders/{id}`.
- **ChatView (component)** — JVA assistant (`POST /chat/ask`) and vendor shop chat (`POST /vendor-chat/ask`, `/vendor-chat/notify`).

### 2.4 Data Layer (current)

Product data is fetched live from the website REST API, with a bundled offline fallback:

- `src/data/api.ts` — typed API client for `https://jemi-na.com/api/v1`. Catalog: `fetchProducts`, `fetchProductDetail`, `fetchCategories` plus `apiProductToProduct()`, which maps the server's product shape (price, `discounted_price`, flat discount amount, min-order, stock, category, vendor, images, `delivery_fee`) to the app's `Product` type. 50+ authenticated helpers built on a `request<T>()` wrapper (attaches bearer token, parses the `{ success, message, errors? }` envelope, throws on non-2xx): auth, cart, orders, payments, credits, wishlist, reviews, search, vendors, addresses, payment methods, vouchers, surveys + vendor journey/agreement/store, help tickets, messages, inquiries, chat (JVA + vendor), promotions (`apiGetPromotions` + view/click tracking), and profile updates.
- `src/data/products.ts` — the hardcoded fallback catalog (15 products) used only when the API is unreachable.
- `src/data/images.ts` — image URL constants.
- `src/state/CatalogContext.tsx` — fetches products + categories on mount, exposes derived lists (`flashSale`, `featured`, `wholesale`, `topRated`, `seasonal`), `getProductById` / `findProductByQuery`, plus `loading` / `error` / `refresh`. Derived buckets are deduped across the overlapping homepage sections (featured → topRated → flash → seasonal priority). On failure it falls back to `products.ts` and screens show a tap-to-retry banner.
- `src/state/CartContext.tsx` — cart state (items, add/remove/update quantity, subtotal, item count) via React Context, mirroring the `NavigationContext` pattern. When a user token is present it loads the server cart (`apiGetCart`) and mirrors every mutation to the API optimistically (`cartSource: 'server'`); otherwise it operates as a local cart (`cartSource: 'local'`). Exposes `vendorGroups` (items grouped per vendor with each vendor's delivery fee).
- `src/state/AuthContext.tsx` — auth (register/login/logout) wired to the Sanctum API first (`authMode: 'live'`, keeps the bearer token in context); falls back to the in-memory seeded mock (`authMode: 'demo'`) only when the API is unreachable or the credentials aren't a live account. Demo account: `user@email.com` / `customer@420`.
- `src/state/NotificationContext.tsx` — `NotificationProvider` renders the global **promo popup**
  Modal + top floating in-app notice banner (5s auto-dismiss, tap navigates); `useNotification`
  exposes `showPromo(promo)` / `showNotice(...)`. The popup is promo-data only (image, title,
  vendor, description) with a centered, aspect-ratio-aware, uncropped image; promotion pushes and
  `promo` in-app events surface here. `App.tsx` `PushBridge` wires FCM events (foreground/opened/
  initial) into it via `src/lib/notifications.ts`.

Persistence is via the server cart/account when signed in, and AsyncStorage for client-side
preferences (promo-popup cycle index, recent searches) and session restore.

1. **Live catalog** — Home, Marketplace and ProductDetails render products from the production API (real UGX prices/discounts/min-orders/stock), fetched at startup with an offline fallback catalog.
2. **Cart** — add-to-cart from ProductDetails, ProductCard, Home and Marketplace; Cart screen with quantity steppers and totals; live cart badge on every header. Signed-in carts persist to the server; items are grouped by vendor with per-vendor delivery fees (10k UGX minimum).
3. **Auth + User Dashboard** — register/login/logout wired to the Sanctum API (live accounts), Profile/Dashboard screen showing account info, stats and account menu; demo fallback when offline.
4. **Orders + Checkout** — vendor-grouped checkout with saved default address, coupon/promo redemption (`apiApplyVoucher`), platform fee, JEMINA credit payment, then order list/detail and dispatch-to-delivery tracking.
5. **JEMINA Credits** — balance + history in Profile, spendable at checkout, and a credit-purchase flow through the payment gateway.
6. **Addresses & payment methods** — full CRUD with set-default via the account settings hub.
7. **Wishlist, reviews, search, product inquiry** — server-backed wishlist heart, review form, search results + recent searches, and B2B inquiries.
8. **Surveys & vendor journey** — user/vendor surveys with completion gating, vendor agreement acceptance, and vendor store creation.
9. **Promotions** — Home consumes the public `GET /promotions` feed (all active placements) for
   the Seasonal & Promotional row AND the launch popup, which **cycles one promotion per launch**
   (AsyncStorage `@jemina/promoPopupIndex`) with view/click analytics; falls back to the
   product-flag seasonal list when the feed is empty.
10. **Messages, help tickets, chat** — in-app admin messages, support tickets, JVA assistant chat, and vendor shop chat.

## 4. Backend Integration

The Laravel website (deployed to the VPS at `https://jemi-na.com`, local repo `C:\xampp\htdocs\dev\jemina`) exposes the REST API the app consumes.

**Base URL:** `https://jemi-na.com/api/v1/` (constant `API_BASE_URL` in `src/data/api.ts`)

| Feature | Endpoints | App status |
|---------|-----------|-----------|
| Products | `GET /products`, `GET /products/{id}`, `GET /products/search` | **Wired** (live catalog) |
| Categories | `GET /categories` | **Wired** (fetched on mount) |
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` | **Wired** (live-first with demo fallback) |
| Cart | `GET /cart`, `POST /cart`, `PUT /cart/{item_id}`, `DELETE /cart/{item_id}`, `DELETE /cart` (clear) | **Wired** (server-synced when signed in) |
| Orders | `GET /orders`, `POST /orders`, `GET /orders/{id}`, `PUT /orders/{id}/cancel` | **Wired** (checkout + order list/detail/tracking; order store accepts `voucher_id`/`voucher_code`/`discount_amount`) |
| JEMINA Credits | `GET /credits/balance`, `GET /credits/history` | **Wired** (balance in Profile + Checkout; credit payment) |
| Payments | `POST /payments/initiate`, `GET /payments/{transactionId}/status` | **Wired** (gateway handoff screen; also credit-purchase) |
| Payment methods | `GET/POST /payment-methods`, `PUT/DELETE /payment-methods/{id}`, `PUT /payment-methods/{id}/default` | **Wired** (`PaymentMethodsScreen` + checkout selection) |
| Addresses | `GET/POST /addresses`, `PUT/DELETE /addresses/{id}`, `PUT /addresses/{id}/default` | **Wired** (`AddressBookScreen` + checkout auto-fill) |
| Profile | `GET /profile`, `PUT /profile`, `GET /profile/wishlist`, `POST /profile/wishlist`, `DELETE /profile/wishlist/{product_id}` | **Wired** (wishlist screen + product-detail heart; edit profile; auth-gated) |
| Reviews | `GET /profile/reviews`, `POST /products/{id}/reviews` | **Wired** (My Reviews screen + review form on product details) |
| Vendors | `GET /vendors`, `GET /vendors/{id}` | **Wired** (live vendor storefront in `VendorProfileScreen`) |
| Vouchers | `POST /vouchers/validate`, `POST /vouchers/apply` | **Wired** (coupon field at checkout with live discount) |
| Search | `GET /products/search?q=` | **Wired** (`SearchResultsScreen` from the Marketplace search bar + `SearchScreen`) |
| Promotions | `GET /promotions`, `GET /promotions/{id}`, `POST /promotions/{id}/view`, `POST /promotions/{id}/click` | **Wired** (Seasonal & Promotional row + launch popup cycling all active promos; view/click analytics) |
| Surveys | `GET /surveys`, `GET /surveys/{id}`, `POST /surveys/{id}/submit` | **Wired** (`SurveysScreen`; server awards 0 credits) |
| Vendor journey | `GET /vendor/actions`, `GET /vendor/agreement`, `POST /vendor/agreement/accept`, `POST /vendor/store` | **Wired** (`VendorActionsScreen`) |
| Help tickets | `GET/POST /help/tickets`, `GET /help/tickets/{id}` | **Wired** (`HelpCenterScreen`) |
| Messages | `GET /messages`, `GET /messages/{id}`, `PUT /messages/{id}/read` | **Wired** (`MessagesScreen`) |
| Inquiries | `POST /inquiries` | **Wired** (`ProductInquiryScreen`) |
| Chat | `POST /chat/ask`, `POST /chat/clear`, `POST /vendor-chat/ask`, `POST /vendor-chat/notify` | **Wired** (`ChatView` component) |

Authentication uses **Laravel Sanctum bearer tokens** (`Authorization: Bearer {token}`) with a standard error envelope (`{ success, message, errors? }`) and pagination wrapper.

**Server-side fixes applied on the VPS (`/var/www/jemina`):**
- `ApiProductController` / `ApiCategoryController` filtered `where('status', 'active')` but the DB stores `enum('true','false')` → changed to `'true'` (this was why the API returned 0 products).
- `discounted_price` was computed as `price - price * discount / 100`, but `discount` is a **flat UGX amount** → now `price - discount` when `0 < discount < price`, matching the web app's `ProductController`.
- `images` referenced a nonexistent `image_path` column → now uses `image_url` (only absolute http(s) URLs; relative upload paths are dropped).
- Added `discount`, `discount_percentage`, `min_order_quantity`, `stock_status`, `sale_type`, `is_wholesale`, `bulk_order`, `corporate_ready`, `enterprise_solution`, `slug`, `sku`, `product_type`, `quality`, `origin_country` to list/detail payloads; `stock_status` now uses the model accessor (`in`/`low`/`out`).
- Detail endpoint's `specifications` decode now tolerates both array (model cast) and JSON-string values.
- Added `ApiCartController` (`app/Http/Controllers/Api/ApiCartController.php`) with `index` / `store` / `update` / `destroy` / `clear` for the user's `carts` table (`user_id`, `product_id`, `quantity`, `size`, `color`, `status='pending'`, `price`, `notes`). `store` upserts (increments quantity on duplicate product) and both `store`/`update` enforce stock. Routes registered under `Route::prefix('cart')` before the payment routes.
- **Sanctum 401 fix:** Apache stripped the `Authorization` header before it reached PHP, so every protected route returned `Unauthenticated.` even with a valid token. Added the standard re-export rule to `public/.htaccess` (`RewriteCond %{HTTP:Authorization} .` / `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]`). Verified with a temporary header-dump script; all Sanctum routes now authenticate.
- **Order schema fix:** `ApiOrderController::store` wrote non-existent columns (`orders.shipping_amount`/`tax_amount`, `order_items.unit_price`/`product_name`) → any order attempt 500'd. Now writes the real schema (`subtotal`, `shipping_cost`, `transaction_fee`, `total_amount` on orders; `price`, `total` on items) and computes total as subtotal + delivery fee (product `delivery_fee`, falling back to a fixed 10) + a 1500 platform fee. Order number is `ORD-YYYYMMDD-XXXXX`.
- **JEMINA credits:** new `ApiCreditController` (`GET /credits/balance`, `GET /credits/history`). API register now awards the signup bonus (`config('credit.signup_bonus')`, default 1,000,000) via `UserCredit::getOrCreateForUser`, mirroring the web `RegisterController`. `ApiOrderController::store` accepts `payment_method: 'credit'`, which locks the user's `UserCredit`, deducts the total, writes a `spend` `CreditTransaction`, and flips the order to `payment_status='paid'` / `status='processing'`. Live-verified: user 10 received 1,000,000 credits on register and paid 46,510 for an order via credits.
- **Vendor storefront API:** new `ApiVendorController` — `GET /vendors` (index: active vendors + business card + `product_count`) and `GET /vendors/{id}` (vendor + business card, rating from approved reviews, active products). `ApiProductController::formatProduct` was made `public` so the vendor controller reuses the exact product shape. Both controllers filter products by `where('status','true')` (matching the product/category controllers). Note: the `vendors` table has no `is_featured` column (it's on `vendor_business_cards`); the VPS working copy carries the `'true'` status fix while git HEAD has the stale `'active'` — see MEMORY.md deploy warning.
- Known server quirk: login/profile return `name` null for accounts registered via the API because `ApiAuthController` reads `first_name` while register writes `name`. The app falls back to `JEMINA Customer` for display.
- **Additional server APIs added for app parity:** `ApiAddressController` (`/addresses*` CRUD + set-default), `ApiVoucherController` (`/vouchers/validate`, `/vouchers/apply`), `ApiPaymentMethodController` (`/payment-methods*`), `ApiPromotionController` (`/promotions*` incl. view/click analytics — public routes), `ApiSurveyController` (`/surveys`, `/surveys/{id}/submit` — currently returns `credit_awarded: 0`), `ApiHelpController` (`/help/tickets*`), `ApiMessageController` (`/messages*`), `ApiInquiryController` (`/inquiries`), chatbot routes (`/chat/*`, `/vendor-chat/*`). All registered in `routes/api.php`.

## 5. Design System Files

| File | Contents |
|------|----------|
| `src/theme/colors.ts` | Color tokens |
| `src/theme/typography.ts` | Type scale |
| `src/theme/spacing.ts` | Spacing + radius |
| `src/theme/index.ts` | Aggregated `theme` export + `Theme` type |
