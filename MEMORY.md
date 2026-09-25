# m_jemina — Project Memory

Ongoing session log. Read this first; it is the authoritative record of what was done,
what the live server looks like, and the current state.

## Objective

Wire the app to the live Jemi-na Sanctum API (`https://jemi-na.com/api/v1`) with graceful
demo fallback, then complete the full app → PlayStore roadmap so the app is "fully
functional like the website" (login → cart → checkout/orders → JEMINA credits).
**Current focus (2026-09-08 evening):** Push notifications are fully wired and verified.
**Live FCM round-trip VERIFIED END-TO-END on VPS (deploy drift resolved):** the 4 site push files
(`PushNotificationService` + `OrderController`/`PromotionController`/`MessagingController` hooks)
were deployed via `scp` (site NOT committed, by rule). All trigger paths tested live against the
VPS and delivered to the user's phone (`bits.bytes.loko@gmail.com`, user id 7): order_status
(`JEM-FINAL-001` paid / `-002` shipped / `-003` processing — user 7 has no real orders, demo
payloads used), promo broadcast (active promo id 5 "Explore Market Place"), admin message
("JEMINA Admin"), and 2FA code push (`135792`). The emulator's FCM delivery proved unreliable, so
per user decision testing now runs on the **phone**; the emulator token stays registered but idle.
**App-side notification badge (this evening):** `AppHeader` bell + cart buttons are now
self-contained (context-driven) and available on ALL screens (default `right = <HeaderActions/>`;
explicit-right screens Home/Marketplace/Wishlist/VendorProfile/ProductDetails/Profile/Cart also include
the bell) with `PushBridge` marking unread on `order_status`/`message`; `unreadCount`
(`markUnread`/`clearUnread`) **persists across restarts** via AsyncStorage
`@jemina/notifications/unread/v1` (verified on both devices). Versions bumped `versionCode 3` /
`versionName 1.1.1`, release APK rebuilt + installed on both devices. **Site repo must NOT be
committed.** Website pickup-point system (backend + admin CRUD) is the NEXT phase.
Remaining: 3 website-parity gaps (admin promo banner, homepage dedupe, promo info modal), site
pickup-point system, survey reward copy, VPS gateway keys (flutterwave/mtn_mobile_money
disabled server-side — saved MTN/Airtel method at checkout hits "gateway not available"),
and the PlayStore listing/gradlew AAB (versionCode bump).

## Live test accounts

- `mjemina.test.20260802140339@example.com` / `TestPassw0rd!42` — user id 9, the main throwaway.
  **⚠ 2026-09-08: these accounts do NOT exist in the VPS `users` table** (queried `%mjemina%`/
  `%test%`/`%credit%` in email → none found) — they are **local-DB-only** accounts. That is why
  `POST /api/v1/auth/login` returns `Invalid credentials` live.
- `mjemina.credit.20260803014602@example.com` / `TestPassw0rd!42` — user id 10, used to verify
  the credits flow (signup bonus + credit payment). Started with 1,000,000 credits, spent 46,510.
- `user@email.com` / `customer@420` — ONLY valid in the app's in-memory seeded mock, not live.

## Server access

- VPS web: `https://jemi-na.com` (always up).
- SSH (needs the user's VPN): `ssh -i "$env:USERPROFILE\.ssh\id_ed25519" -o BatchMode=yes webadmin@162.35.175.85`
  (`whoami`=webadmin, hostname=`lamp`). Root/timeout errors = VPN down.
- MySQL: `mysql -u lampuser -pjAuOxc7j1KiJtOgMamkBL4Sz lampdb < /tmp/file.sql` (scp SQL files;
  inline `-p'pass' -e` breaks over SSH).
- Windows curl rules: use `curl.exe`, `--data-binary "@file.json"` for POST bodies (inline
  `-d` → 422), temp JSON files in `$env:TEMP`.

## Live API quirks (important)

- `Authorization` header re-export lives in `/var/www/jemina/public/.htaccess`
  (`RewriteCond %{HTTP:Authorization} .` / `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]`);
  without it every Sanctum-protected route 401s. **Note: this .htaccess rewrite only helps under
  php-fpm/FastCGI. The live site runs Apache mpm_prefork + mod_php (libphp8.3), which never
  populates `HTTP_AUTHORIZATION` — so all Sanctum calls 401'd. Fixed 2026-09-07 by adding
  `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` in the 443 vhost (see Deployed changes).**
- Login requires `device_name` (`m_jemina_app`).
- Register now uses `$request->name` directly (first_name bug fixed server-side); returns user name correctly.
  **No signup bonus awarded** — `fb22f1c` removed credit rewards from registration entirely.
- `POST /api/v1/orders` previously 500'd: `ApiOrderController` wrote columns that don't exist
  (`orders.shipping_amount`, `orders.tax_amount`, `order_items.unit_price`, `order_items.product_name`).
  Real schema: orders use `subtotal`, `shipping_cost`, `transaction_fee`, `total_amount`; order_items
  use `price`, `total`. **Fixed + deployed; store now computes subtotal + delivery fee (or fixed 10)
  + 1500 platform fee.**
- `php artisan route:cache` fails on VPS (pre-existing duplicate route name
  `admin.credit.user.transactions`) — not our concern; no route cache is present so controller
  changes go live immediately after scp.

## Deployed server changes (this session)

1. `app/Http/Controllers/Api/ApiOrderController.php` — fixed schema bug (see above); added
   credit payment: `payment_method: 'credit'` deducts the JEMINA credits balance, writes a
   `spend` `CreditTransaction`, sets order `payment_status='paid'`, `status='processing'`;
   order number `ORD-YYYYMMDD-XXXXX`. **Also accepts `voucher_id`, `voucher_code`,
   `discount_amount` optional fields.**
2. `app/Http/Controllers/Api/ApiCreditController.php` — NEW: `balance`, `history`.
3. `app/Http/Controllers/Api/ApiAuthController.php` — register **originally** awarded signup bonus
   (`config('credit.signup_bonus')`, default 1,000,000). **Removed in `fb22f1c`** — current
   register returns no credit; also customer-role-only gate (403 for privileged roles).
4. `routes/api.php` — added protected `GET /credits/balance`, `GET /credits/history`.
5. `app/Http/Controllers/Api/ApiVendorController.php` — NEW: `GET /api/v1/vendors` (index:
   active vendors + businessCard + `product_count`) and `GET /api/v1/vendors/{id}` (show:
   vendor + businessCard, rating from approved reviews, active products via
   `ApiProductController::formatProduct`). Both null-safe on businessCard. Vendors have NO
   `is_featured` column (it lives on `vendor_business_cards`), so index orders by name.
6. `app/Http/Controllers/Api/ApiProductController.php` — `formatProduct` made `public` so the
   vendor controller reuses it. **Added `delivery_fee` and `shop_name` (via vendor relationship)
   to both `formatProduct()` and `formatProductDetail()`.**
7. `app/Http/Controllers/Api/ApiCartController.php` — **Added `shop_name` to vendor object in
   cart item responses.**
8. `app/Http/Controllers/Api/ApiAddressController.php` — **NEW: CRUD for AddressBook model.
   `GET /addresses`, `POST /addresses`, `PUT /addresses/{id}`, `DELETE /addresses/{id}`,
   `PUT /addresses/{id}/default`. Supports `type` (home/work/cloud_pay), `full_name`,
   `street_address`, `region`, `city`, `zip_code`, `phone`, `is_default`.**
9. `app/Http/Controllers/Api/ApiVoucherController.php` — **NEW: `POST /vouchers/validate`
   (check code validity, returns discount info) and `POST /vouchers/apply` (compute discount
   against subtotal, checks expiry, max uses, per-user limit, min order amount). Returns
   `voucher_id`, `code`, `discount`, `formatted_discount`.**
10. `routes/api.php` — **Added protected `POST /vouchers/validate`, `POST /vouchers/apply`,
    and `/addresses` route group (GET/POST/PUT/DELETE/{id}/default).**
11. `/etc/apache2/sites-enabled/000-default-le-ssl.conf` — **Added
    `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` inside `<VirtualHost *:443>`**
    (backup `000-default-le-ssl.conf.bak-authfix`; `apachectl configtest` OK + reload). **Root-cause
    fix for the login-session bug:** live site is mpm_prefork + mod_php which strips the
    `Authorization` header before PHP sees it, so every Sanctum call 401'd and the app's self-heal
    expired sessions instantly. Verified from public internet: fresh login then `GET /profile/wishlist`
    (id 4 token), `/credits/balance`, `/addresses`, `/cart` all returned 200 with the existing token;
    DB `last_used_at` now populated on the two most recent `m_jemina_app` tokens (2026-09-07 14:31:09
    and 14:17:33 UTC). User confirmed signed-in on phone. **No app rebuild needed** — the app's
    `request()`/`emitUnauthorized` self-heal stays as a correct guard.

Prior session: `ApiCartController` (GET/POST/PUT/DELETE /cart + clear) + routes deployed;
`.htaccess` Authorization fix; product status-filter/flat-discount/image fixes.

## App state

- **Login fix (3 root causes, verified):** `request()` now sends `Content-Type: application/json`;
  AuthContext fallback only triggers on network errors; LoginScreen password has
  `autoCapitalize="none" autoCorrect={false}`. Verified on emulator — profile shows
  `bits.bytes.loko@gmail.com` / id 3 / CUSTOMER / JEMINA Credits UGX 2,094,516.
- `src/data/api.ts` — `request<T>()` helper + auth, cart, orders, payments (incl. `apiGetPaymentStatus`),
  credits, wishlist, reviews, search, vendor, **address** (`apiGetAddresses`/`apiSaveAddress`/
  `apiUpdateAddress`/`apiDeleteAddress`/`apiSetDefaultAddress`), **payment methods** (`apiGetPaymentMethods`/
  `apiSavePaymentMethod`/`apiUpdatePaymentMethod`/`apiDeletePaymentMethod`/`apiSetDefaultPaymentMethod`),
  **voucher** (`apiValidateVoucher`/`apiApplyVoucher`), **surveys** + **vendor journey** (`apiGetSurveys`,
  `apiGetSurvey`, `apiSubmitSurvey`, `apiGetVendorActionsStatus`, `apiGetVendorAgreement`,
  `apiAcceptVendorAgreement`, `apiCheckVendorAgreementAccepted`, `apiCreateVendorStore`), **help**
  (`apiGetTickets`/`apiGetTicket`/`apiCreateTicket`), **messages** (`apiGetMessages`/`apiGetMessage`/
  `apiMarkMessageRead`), **inquiry** (`apiSubmitInquiry`), **chat** (`apiChatAsk`/`apiChatClear`/
  `apiVendorChatAsk`/`apiVendorChatNotify`), **profile** (`apiUpdateProfile`). `ApiProduct`/`ApiVendor`
  types include `delivery_fee`.   Order creation accepts `voucher_id`, `voucher_code`, `discount_amount`, plus optional
  `pickup_point`/`fulfilment` (pickup-vs-delivery metadata, currently ignored by the web backend).
  **`apiGetPromotions` exists and is consumed by Home (2026-09-07/08):** the auto promo popup
  and the Home "Seasonal & Promotional" section both use `GET /api/v1/promotions` (all active
  placements, no `seasonal` filter — the DB has no `seasonal` placements). Section falls back to
  product `seasonal`/`holiday_special` flags when the feed is empty.
- `src/state/AuthContext.tsx` — live-first (`authMode: 'live'`) with demo fallback; google/logout.
- `src/lib/notifications.ts` — **push layer (2026-09-07)**: `requestNotificationPermission`,
  `PushEvent` typed union (`two_factor` | `promo` | `order_status` | `message`), `parsePushEvent`,
  `subscribeToPushEvents`, `subscribeToPushOpened` (app state active/inactive detection),
  `getInitialPush` (`getInitialNotification(messaging)` kick-off), `subscribeToSecurityCode`
  (2FA code auto-fill). FCM via `@react-native-firebase/app` + `messaging` `^26.4.0`,
  `android/app/google-services.json` (m-jemina project).
- `src/state/NotificationContext.tsx` — **NEW (2026-09-07)**: `NotificationProvider` renders the
  global promo popup Modal + top floating in-app notice banner (5s auto-dismiss, tap navigates);
  `useNotification` exposes `showPromo(promo)` / `showNotice(title, body, navigateTo)`.
  **2026-09-08:** popup is promo-data only — the `promoVisit` callback and the "Visit Store /
  View Offer" button + "Maybe later" dismiss were removed (just header, image, title, vendor,
  description); image is aspect-ratio-aware (`promoImageRatio` from `onLoad`) and centered
  (`popupImage`/`popupImageSized`, `resizeMode="cover"`, `maxHeight: 300`) so it fills the card
  width without cropping or right-side whitespace.
- `src/lib/promo.ts` — **NEW (2026-09-07)**: `promoImageUrl` (base `https://jemi-na.com`).
- `App.tsx` — **NEW (2026-09-07)**: `NotificationProvider` wraps the app (inside
  `NavigationProvider`); `PushBridge` wires foreground/opened/initial push events: `promo` →
  `showPromo`, `order_status`/`message` → notice banner navigating `Orders`/`Messages`,
  `two_factor` ignored (handled by `subscribeToSecurityCode`). **2026-09-08 eve:** PushBridge now
  also calls `markUnread()` on every `order_status`/`message` push (foreground, opened, or
  cold-start via `getInitialPush`).
- `src/state/NotificationContext.tsx` — **unread badge (2026-09-08 eve):** `unreadCount` state +
  `markUnread()`/`clearUnread()` persisted to AsyncStorage key `@jemina/notifications/unread/v1`
  (hydrated on mount via `unreadLoaded` gate so the initial 0 never clobbers a saved count; written
  on every change after load). Background clears → count restores to 0 after restart (verified).
- `src/components/AppHeader.tsx` — **header rebuilt (2026-09-08 eve):** `HeaderNotificationButton`
  (bell w/ unread badge dot+count, `clearUnread` on tap) and `HeaderCartButton` (cart w/ count,
  `switchTab('Cart')`) are now self-contained — they pull `unreadCount`/`clearUnread`/`itemCount`/
  `switchTab` from `useNotification()`/`useCart()`/`useNavigation()` with optional prop overrides.
  New `HeaderActions` = bell + cart composed together, and `AppHeader` renders `right ?
  right : <HeaderActions/>` — so EVERY screen using `AppHeader` gets the bell + cart by default.
  Explicit-right screens all updated to include the bell: Home, Marketplace (bell+search+cart),
  Wishlist, VendorProfile, ProductDetails, Profile (both signed-out and signed-in states), Cart.
- `src/screens/HomeScreen.tsx` — **auto promo popup (2026-09-07/08)**: module flag
  `promoPopupShownThisLaunch` + persisted `PROMO_POPUP_INDEX_KEY` (`@jemina/promoPopupIndex` in
  AsyncStorage) → `autoShowPopup()` opens a DIFFERENT promo each app launch
  (`(lastIndex + 1) % promotions.length`, defaults to index 0 on first run); centered popup with
  a top-right close X; card tap still tracks `apiTrackPromotionClick`. The "Seasonal &
  Promotional" section renders live Promotions-API cards via the `PromoFlashCard` component
  (per-card aspect-ratio image, no crop, "View Promo" action button); falls back to seasonal
  product flags when the feed is empty. Uses `useNotification()` + `promoImageUrl`;
  local popup JSX/styles removed.
- `src/components/ProductCard.tsx` — `Product` interface includes `deliveryFee`.
- `src/state/CartContext.tsx` — token-aware server sync (`cartSource: 'server'|'local'`);
  **groups items by vendor** via `groupByVendor()`, exposes `vendorGroups: VendorGroup[]`,
  `totalDeliveryFees`. Delivery fee per vendor = sum of product delivery fees (min 10k UGX).
- `src/state/CatalogContext.tsx` — derives buckets (flashSale/featured/topRated/seasonal/B2B…)
  from `products`; **no cross-bucket dedupe** (parity gap vs web `5868f4c`).
- `src/screens/CartScreen.tsx` — **redesigned (2026-09-07)**: per-vendor sections (dark primary
  header bar + store icon badge + vendor name + count), item cards with 80×80 image, reduced
  detail type (`bodyMd`/`labelSm`/`bodyLg`), per-item `Delivery: {formatUGX(deliveryFee × qty)}`
  tag, quantity stepper + line totals + item separators + remove button, and an Order Summary card
  (subtotal, per-vendor delivery fee rows, divider, total, checkout button). Smaller fonts
  throughout; icon bug fixed (`delete-sweep` → `delete-outline`, absent from `Icon.tsx`).
- `src/components/EmptyState.tsx` — **NEW shared empty/error/signed-out state** (56px icon in
  `outlineVariant` + `headlineLg` title + `bodyMd` subtitle + full-width primary CTA via
  `<Button>`). Replaced ~40 duplicated inline `center*`/`empty*` blocks across 12 screens:
  Orders, OrderTracking, Messages, Wishlist, CreditHistory, MyReviews, BuyCredits,
  CollectionProducts, AddressBook, PaymentMethods, HelpCenter, EditProfile. Dead style entries
  (`centerTitle`/`centerSub`/`centerBtn`/`emptyTitle`/`emptySubtitle`/`emptyBtn`) and fully
  unused `Button`/`Icon` imports removed where appropriate (net −725 lines).
- `src/components/SurfaceCard.tsx` — **NEW canonical card surface** (white + `borderWidth: 1` +
  `borderLight` + `radius.xl` + `padding: spacing.lg`, with optional `onPress`/pressed state).
  Cards across all screens already use identical tokens; this is the canonical reference going
  forward (not bulk-applied to avoid churn).
- Section titles verified uniform: all screens use `headlineMd`/`primary`; Home and Marketplace use
  the shared `SectionHeader` component. Wishlist's list-header aligned to Cart's muted `bodyMd`
  style. Checkout's compact `radius.lg` / `padding: spacing.md` cards are a deliberate dense-form
  choice for that form-heavy screen.
- `src/screens/CheckoutScreen.tsx` — **vendor-grouped order summary**, delivery fees per vendor,
  **coupon/promo code input** with live validation via `apiApplyVoucher`, discount applied to
  total, **pickup-point redesign (2026-09-07)**: removed the shipping-details form; new
  `PICKUP_POINTS` const (default **Jemina Point · Jemina Official · 789 Commerce Street, Building
  A, Gulu, Northern Region**) with a "Pickup Point & Delivery" selector section
  (`fulfilment: 'pickup' | 'delivery'`, pickup is default).
  Delivery address auto-sourced from `apiGetAddresses()` (default address visualized under the
  option); no default → tap "Deliver to my address" redirects to `AddressBook` plus a persistent
  "Add a delivery address" link. Order notes kept as its own small section.
  `buildShippingAddress()` mints the `ApiShippingAddress` from the pickup point
  (`point.name`/`point.location`/`point.city`/`point.state`, zip 256, Uganda, phone) or the saved
  address; `validate()` errors if delivery is chosen with no address. Order payload sends
  `pickup_point` + `fulfilment` (backend ignores unknown pickup fields for now — web
  `ApiOrderController` still requires `shipping_address`; site pickup support is the next phase).
  **Payment options reworked (2026-09-08):** `PaymentOption` list resolves to just the default
  saved method + Cash on Delivery + Bitcoin + JEMINA Credits (`PaymentMethodKey =
  'saved'|'cod'|'bitcoin'|'credit'`); `paymentMethod` defaults `'cod'`, auto-snaps to `'saved'`
  when a default saved method exists; `handlePlaceOrder` submits `option.method` and for
  `credit`/`cod` navigates straight to `Orders`, otherwise `Payment` with `option.gateway`
  (`gatewayForSavedMethod`: card → `stripe`, mtn mobile_money → `mtn_mobile_money`, else →
  `flutterwave`). Saved-methods card shows "X saved · tap to manage". The old `PAYMENT_METHODS`
  constant (mtn/stripe/flutterwave/bitcoin/credit) was removed. **Total label** reduced
  `headlineMd` → `bodyLg` (16px, matching Cart's canonical `totalLabel`); `totalValue` stays
  `headlineMd` (20px). platform fee 1500, voucher fields sent with order creation.
- `src/screens/MarketplaceScreen.tsx` — **Featured Stores from live `apiGetVendors()`** (falls back
  to DEFAULT_STORES if API fails). Search bar triggers `SearchResults`.
- `src/screens/HomeScreen.tsx` — **restructured (2026-09-02)**: search bar section pinned at top
  (`searchSection` style) above the hero; Browse Collections uses custom `CATEGORIES` (added
  "Home & Living" w/ icon `'home'`, removed "Auto & Machinery"); Featured Stores → trust badges
  (flat cards w/ icon chips: Shipping, Secure Payments, etc.) → Flash & Deals. Hero = manual swipe
  (no dots/autoplay); ProductCarousel everywhere = `loop` + `autoPlay` + `autoPlayInterval={10000}`.
- `src/screens/SearchResultsScreen.tsx` — **rewritten to dense single-column thumbnail list
  (2026-09-02)**: 64x64 thumb, 2-line title, price + strikethrough compare, rating + star,
  36px circular add button, "{N} results found" header, empty state.
- `src/screens/ProfileScreen.tsx` — **shows default address card** (auto-fetched from server),
  JEMINA credits balance, menu items (Orders/Wishlist/Reviews/Surveys/Account Settings/Track Order/
  Messages/Help & Support). Profile menu "Surveys" entry links to `SurveysScreen`.
- `src/screens/AccountSettingsScreen.tsx` — tabbed settings hub: `EditProfileScreen` (`apiUpdateProfile`),
  `PaymentMethodsScreen`, `AddressBookScreen` (all embedded-capable).
- `src/screens/AddressBookScreen.tsx` — full CRUD + set-default via `/api/v1/addresses*`.
- `src/screens/PaymentMethodsScreen.tsx` — full CRUD + set-default via `/api/v1/payment-methods*`.
- `src/screens/OrderTrackingScreen.tsx` — order list + dispatch-to-delivery timeline (`GET /api/v1/orders`).
- `src/screens/MessagesScreen.tsx` — in-app messages via `/api/v1/messages`, mark-read.
- `src/screens/HelpCenterScreen.tsx` — help categories + support tickets via `/api/v1/help/tickets*`.
- `src/screens/SearchScreen.tsx` — recent searches → results; `SearchResultsScreen` dense list.
- `src/screens/CollectionProductsScreen.tsx` — category tap → full product drill-down.
- `src/components/ChatView.tsx` — JVA assistant + vendor shop chat UI (wired to `/chat/*`, `/vendor-chat/*`).
- `src/screens/SurveysScreen.tsx` — loads surveys via `GET /api/v1/surveys`, opens detail via
  `GET /surveys/{id}`, submits via `POST /surveys/{id}/submit`. **Server returns
  `credit_awarded: 0`** (rewards disabled `fb22f1c`); app shows fallback "Thank you for
  your feedback!" toast. Survey cards still display `credit_reward` field from API
  (render `Reward: {formatUGX}` on list + detail — copy NOT yet aligned).
- `src/screens/VendorActionsScreen.tsx` — vendor journey gating: user survey must complete
  before vendor survey; vendor registration form. Entry from `SurveysScreen` completion
  and sidebar.
- `src/screens/PaymentScreen.tsx` — gateway handoff: calls `apiInitiatePayment` (maps `mtn` →
  `mtn_mobile_money`), shows reference + payment link (opens via `Linking`), polls
  `GET /payments/{transactionId}/status` every 5s; `Retry` + `Go to My Orders` actions.
- `src/screens/OrdersScreen.tsx` — lists `GET /api/v1/orders`, expandable detail via
  `GET /api/v1/orders/{id}`, pull-to-refresh, sign-in gate.
- `src/screens/WishlistScreen.tsx` — auth-gated, lists wishlist, add-to-cart, remove.
- `src/screens/MyReviewsScreen.tsx` — auth-gated, lists reviews.
- `src/screens/CreditHistoryScreen.tsx` — auth-gated, balance card + transaction list.
- `src/screens/BuyCreditsScreen.tsx` — amount presets, gateway select, payment link, poll.
- `src/screens/ProductDetailsScreen.tsx` — wishlist heart, review form, vendor row → VendorProfile.
- `src/screens/VendorProfileScreen.tsx` — loads live vendor via `GET /vendors/{id}`.
- Navigation: routes added to `NavigationContext` + `App.tsx` router; `navigate`/`switchTab` close sidebar.
- `src/components/Sidebar.tsx` — slide-in drawer; groups Shop/Account/Company/Legal.
- `src/components/InfoPage.tsx` — shared layout for company/legal screens.
- Info screens: `AboutScreen`, `ServicesScreen`, `TermsOfServiceScreen`, `PrivacyPolicyScreen`, `ContactScreen`.
- Icons added to `Icon.tsx`: `credit-card`, `account-balance-wallet`, `currency-bitcoin`,
  `local-atm`, `smartphone`, `error-outline`, `people`, `lightbulb`, `eco`, `track-changes`,
  `build`, `groups`, `handshake`, `gavel`, `radio-button-unchecked`.

## Verified against live API (2026-08-03)

- Register (user 10) → 201 + 1,000,000 signup credits in `credits/balance` + `signup_bonus` history row.
  **(Pre-`fb22f1c` — bonus removed from server; no longer issued on register.)**
- `POST /api/v1/orders` (user 9, product 51 ×2, `payment_method=mtn`) → 201 order `ORD-20260803-AJ6DE`,
  subtotal 90000, delivery 10, fee 1500, total 91510; list + detail endpoints return it.
- `POST /api/v1/orders` (user 10, `payment_method=credit`) → order `ORD-20260803-LL4O6` status
  `processing`; balance 1,000,000 → 953,490 (spent 46,510 recorded).
- Cart add/clear confirmed.

### Verified (local + live, 2026-08-03)

- Local artisan server: `GET /api/v1/vendors/1` → Jemina Official + 50 products; `GET /api/v1/vendors` → 3 vendors.
- Live: `GET /api/v1/vendors/1` → Jemina Official, product_count 36, 36 products (e.g. id 51 Dlight Solar
  Lantern-Reading Light S30 / UGX 45,000); `GET /api/v1/vendors/2` (Test Shop) → 15 products; `GET /api/v1/vendors`
  → 2 vendors with product_count 36/15. `GET /api/v1/products` total 51 (status filter intact).
- **Careful during deploys:** the VPS working copy of `ApiProductController` uses `where('status','true')`
  (the committed HEAD still has the stale `'active'`). Scp'ing the local copy over it clobbers the fix and empties
  the live product catalog — the local source is now aligned to `'true'`, but re-verify
  `GET /api/v1/products?per_page=1` after every controller deploy.

### Verified (2026-08-08)

- Login: `POST /api/v1/auth/login` with `bits.bytes.loko@gmail.com` + `timBOi@admin420` + `device_name=m_jemina_app` → success, user id 3.
- VPS deployed: `ApiAddressController`, `ApiVoucherController`, `ApiOrderController` (voucher fields),
  `ApiProductController` (delivery_fee + shop_name), `ApiCartController` (shop_name), `routes/api.php`
  (addresses + vouchers routes) — all `php -l` clean, cache cleared.
- APK built + installed on device (`0794415254003308`) and emulator (`emulator-5554`) — all 8 tasks complete.
- TypeScript: `npx tsc --noEmit` clean (0 errors).

### Verified (2026-09-07)

- **Login/session fix confirmed from public internet** after vhost `SetEnvIf` change: fresh login
  with the existing `4|T0pA4lMX2LZkGlJGBx32Po6V4Joi9QQjjFzTh4jr` token → `GET /profile/wishlist`
  (200, id 4), `/credits/balance` (200, UGX 2094516), `/addresses` (200, 1 address), `/cart` (200).
  DB query: `personal_access_tokens` `last_used_at` populated on the two latest `m_jemina_app`
  tokens (`2026-09-07 14:31:09` and `14:17:33` UTC) — older tokens still NULL. User confirmed
  signed-in on their phone; no 401 loop, no auto sign-out.
- **CartScreen + uniform-styling refactor verified:** `npx tsc --noEmit` + `npx eslint src/screens
  src/components` both green (0 errors) at end of session. Icon name fixed during refactor
  (`delete-sweep` not in `Icon.tsx` → `delete-outline`).
- **Checkout pickup-point redesign verified (2026-09-07):** `npx tsc --noEmit` + `npx eslint
  src/screens/CheckoutScreen.tsx src/data/api.ts` both green (0 errors). Shipping-details form
  removed (`FIELDS`/`FieldDef`/`form`/`setField` deleted); `ApiShippingAddress` import added to
  the type import; `buildShippingAddress()`/`validate()`/order-placement updated; new pickup
  styles (`pickupOption`, `pickupIcon`, `addressLink`, `radio*`) added and unused `label`/
  `fieldGroup` styles removed. `bodySm` did NOT exist in `typography.ts` — used `labelMd` for the
  address-link text.
- **Git stash incident (safe):** one subagent ran `git stash`/`git stash pop` mid-task; stash list
  confirmed empty, no file corruption. All prior app working-tree changes intact (MEMORY.md, TODO.md,
  many screen files already modified from prior sessions).
- **Working tree status:** was UNCOMMITTED at `2032ccf` through 2026-09-07; **COMMITTED + pushed
  as `3df19c1` on 2026-09-08** (52 files, incl. this session's checkout/popup/promo work + the new
  shared components `EmptyState.tsx`/`SurfaceCard.tsx` and the push layer `NotificationContext.tsx`,
  `lib/promo.ts`, rewritten `lib/notifications.ts`, `App.tsx`, `HomeScreen.tsx`).
- **Push + promo popup verified (2026-09-07):** `npx tsc --noEmit` green; `npx eslint src App.tsx`
  green (0 errors). Server side (`C:\xampp\htdocs\dev\jemina`): `PushNotificationService` gained
  `sendOrderUpdate`/`sendPromotion`/`notifyNewMessage`/`sendBroadcast`; hooks in `OrderController::updateStatus`,
  `PromotionController::store|update|toggleStatus|approve` (`broadcastIfActive` helper), `MessagingController::sendDirectMessage|
  vendorSendMessage`. All four files `php -l` clean; `sendBroadcast` smoke-tested via tinker (graceful no-op).
  **Live FCM delivery VERIFIED END-TO-END (2026-09-08)** — VPS creds were already in place
  (`/etc/jemina/firebase-m-jemina.json` = m-jemina service account, key_len 1704; `.env` has
  `FIREBASE_PROJECT_ID=m-jemina` + `FIREBASE_CREDENTIALS_PATH`; `isConfigured()`=true). A
  `sendToUser` test to `bits.bytes.loko@gmail.com` (user id 7) hit its real android emulator
  token (id 1, refreshed 19:25:12) with no exception and no FCM error/deactivation log → the
  **in-app banner fired on the emulator** (user confirmed). ⚠ **DEPLOY DRIFT → RESOLVED (2026-09-08):**
  VPS server was at `0254f82` with only `sendOtpCode`/`sendToUser`; the newer
  `sendOrderUpdate`/`sendPromotion`/`notifyNewMessage`/`sendBroadcast` + controller hooks were deployed
  directly via `scp` (no git commit) — `php -l` clean, ownership `webadmin:webadmin`. Site working tree
  still holds those uncommitted changes (site repo stays uncommitted by rule).

### Verified (2026-09-08)

- **Checkout payment methods rework:** payment choices are now only the default saved method,
  Cash on Delivery, Bitcoin, and JEMINA Credits. Server-gateway reality: `stripe` + `bitcoin`
  enabled in `config('payments.gateways')`; `flutterwave` + `mtn_mobile_money` DISABLED (empty
  `enabled`) → saved MTN/Airtel method at checkout will surface "gateway is not available"
  until the VPS `.env` is configured (out of scope; UI-only requirement met).
- **Pickup point:** Jemina Official address confirmed from DB (`street_address` "789 Commerce
  Street, Building A", `city` Gulu — the `Vendor` record's own fields are empty, so the app uses
  hardcoded `PICKUP_POINTS`). Region "Northern Region" (DB store arg typo "Nothern Region").
- **Promo popup cycling:** `@jemina/promoPopupIndex` persisted in AsyncStorage; each force-stop +
  relaunch shows the next promo (index +1 mod count). Root cause of the original "popup never
  fired" was no `seasonal` placement in the DB (all 5 active promos are `sidebar`/`banner`) —
  fixed by `apiGetPromotions()` with no placement filter. `npx tsc --noEmit` + `npx eslint
  src App.tsx` green (0 errors).
- **Popup image fix:** original crop was a fixed `height: 180` overriding `aspectRatio`. Final
  fix: `popupImageSized` has no height (only `width: '100%'`, `maxHeight: 300`, centered),
  `resizeMode="cover"`, ratio from `onLoad`; on-device confirmed full-fill, emulator had a small
  right gap → image centered.
- **Home Seasonal & Promotional cards:** `PromoFlashCard` per-card aspect-ratio (`onLoad`)
  images (no crop), "View Promo" action label (was "View Store"/"View Offer").
- **APK rebuilt + installed** on phone `0794415254003308` and emulator `emulator-5554`
  (force-stop + relaunch); promo popup, cycling, card images confirmed working by the user.
- **Committed + pushed:** `main` `2032ccf..3df19c1` (52 files). Commit message amended
  (typo fix) via `--amend` + `--force-with-lease` after push.

### Verified (2026-09-08 evening — push triggers + notification badge)

- **All 4 live trigger paths VERIFIED on the VPS** via throwaway `/tmp` scripts (scp + ssh, removed
  after run; no FCM errors / no stale-token deactivations in `laravel.log`). Tokens: id 1 emulator
  (`cPzR...`, last_seen 20:41:27) + id 2 phone (`dFnM...`, last_seen 20:36:01), both active.
  1. **order_status** — `sendOrderUpdate` → `JEM-FINAL-001` paid, `JEM-FINAL-002` shipped,
     `JEM-FINAL-003` processing (demo payloads; user 7 has no orders). **Phone confirmed.**
  2. **promo broadcast** — `sendPromotion` to promo id 5 "Explore Market Place" (no `is_active`
     column in `promotions` — uses `status=1` + `approval_status='approved'`; script queried active
     promo directly). **Phone confirmed** (system banner when app backgrounded).
  3. **message** — "JEMINA Admin" push received. **Phone confirmed.**
  4. **2FA** — code `135792` push received. **Phone confirmed.**
- **Emulator unreliable:** first live batch fired only the in-app banner once; force-stop+relaunch
  refreshed emulator token 20:41:27 but subsequent background tests (`JEM-BG-TEST-002`) showed
  nothing on either device. **User decision: phone is the test device; emulator abandoned.**
- **Notification badge feature verified:** unread badge increments on the bell across all screens on
  `order_status`/`message`; tapping clears; force-quit + relaunch → count restored from AsyncStorage
  (`@jemina/notifications/unread/v1`) on BOTH devices. `npx tsc --noEmit` green (0 errors).
- **Release APK 1.1.1 (versionCode 3)** built (`assembleRelease`, signing configured, hermès
  bundle) + installed on phone `0794415254003308` and emulator `emulator-5554`.

### Session (2026-09-17 — UI overhaul, reviews, orders)

- App UI overhaul batch (all `tsc` green; release APK + AAB rebuilt; emulator reinstalled, phone
  disconnected at end so it still needs the latest install): Home Promotions widths (banner uniform
  insets, flash cards = banner width, snap paging, placement trim hardening); `SectionHeader`
  action moved inside the row (title left, See All right, vertically centered); Contact / Wishlist /
  Account-profile-tab (Personal/Address/About) / ProductDetails (incl. dark B2B price card, stock
  pill) / VendorProfile restyled (smaller headers, tighter padding, `borderLight` cards); Wishlist
  discounted-price bug fixed (rendered original price twice); VendorProfile shows real banner/logo
  with fallbacks, dead Visit Store removed, stats/services from live API (fake 247/4.8/98 dropped),
  Featured / All Products / Shop Reviews tabs; newsletter subscribe persists per account
  `@jemina/newsletter/v1:<userId>` shared by Profile + vendor screens, white CTA.
- Vendor reviews end-to-end: `ApiVendorController@reviews` (public, approved-only) +
  `@storeReview` (sanctum, `pending`, one-per-user, 409 duplicate) + routes
  `GET/POST /api/v1/vendors/{id}/reviews` — verified live (GET `[]` 200; POST without token 401
  with `Accept: application/json`; note: probing POST *without* an Accept header returns the
  homepage HTML via login redirect — test with app headers). App: review list + form in vendor
  Reviews tab, already-reviewed `Alert` + pending-approval notice; product Reviews tab also alerts
  on duplicate + success notice. New `ApiVendorReview`/`apiGetVendorReviews`/`apiSubmitVendorReview`
  in `api.ts`.
- Orders: status badges single-line auto-width (`numberOfLines` + `flexShrink: 0`); invoice modal
  uses fetched detail (`detail ?? order`, was empty) + SKU row; invoice title → `labelSm`; order
  images fall back to placeholder on error (`failedImages` map).
- Server changes on VPS: agreement section 20 contacts corrected (`77269da`); homepage promo
  banner = images only, no links/click actions (`a3b8b7d`, view cache cleared); promo id 6
  ("Join our community") approved → both banner promos live in the app carousel. API serves from
  `/var/www/jemina` (live tree); `/var/www/html` is a stale copy — do not edit it.
- Order items API fix: `sku` added + primary image via `$image->url` accessor (was broken
  `asset('storage/' . image_path)` — wrong column, and `storage/app/public` is empty with no
  symlink; product webp files live under `public/frontend/img/products/`). ProductImage `url`
  accessor resolves storage → frontend → default, which is why app product images work.
- Image diagnosis notes: emulator vs phone image question turned out to be backend URLs (both
  fail); device network is fine (same Android 11, DNS + CDN reachability verified via adb).
  Vendor logo in DB is SVG (`1788355969_logo.svg`) — RN `<Image>` cannot render SVG, app falls
  back; needs PNG/JPG re-upload via website for the real logo to show.
- UNCOMMITTED on VPS (pending user confirm): `ApiOrderController.php` (sku + product_image),
  `ApiVendorController.php` + `routes/api.php` (vendor review endpoints). Backups in `/tmp`
  (`ApiVendorController.php.bak-reviews`, `ApiOrderController.php.bak-orders`, etc.).
- Remote-shell lessons (TAKE NOTE): the tool transport strips `'`/`"` chars from ssh remote
  commands — never rely on quoting there (use quoteless commands); file bytes piped over stdin
  keep `"` but the Write tool emits CRLF, so strip CR locally
  (`[IO.File]::ReadAllText(...).Replace([string][char]13, '')`) before piping to `bash -s`;
  in bash, `X=Y()` is a syntax error (looks like a function def) — quote it; prefer numeric enum
  values over string literals in inline SQL.

### Session (2026-09-17 later — Product Details redesign, VERIFIED on emulator)

- `ProductDetailsScreen.tsx` fully rewritten to the Stitch design (`d6e01214f3f741dc9c923c05d0d27c35`
  in project 15521520191945729458) and verified END-TO-END on `emulator-5554` via uiautomator
  dumps (final release APK on device). Details in TODO.md session block.
- Header: favorite toggle moved to header (thought ❤ is a Stitch adornment, not a button), +
  `HeaderNotificationButton` + `HeaderCartButton`; breadcrumb `Home / IT & Technology`; hero 1:1,
  pills "VERIFIED WHOLESALE & RETAIL" (gated `isWholesale || bulkOrder || corporateReady ||
  minOrder`) + always "ESCROW PROTECTED".
- Price card verified live: RETAIL PRICE, BULK MOQ 10+, UGX 45,000, Corporate Ready, "Contact
  vendor for wholesale custom pricing" (product id=1 Dlight Solar Lantern-Reading Light S30,
  `wholesale/bulk/corp` all true). Vendor card "JO | Jemina Official | Gulu, Uganda | Visit Store";
  dispatch box "within 24h", "Hub > Customer: UGX 5,000", "Free Pickup at JEMINA Hub".
- Agronomic Specifications bento (Material Plastic / Color Orange / Power Source Solar / Warranty
  2 Years); tabs `Specs & Agronomy / Bulk & Wholesale / Reviews / Escrow & Returns` all verified;
  Reviews shows 0.0 / "Based on 0 reviews" + Write a review form.
- Qty flow verified: pills Single 1 / 10 Bulk / 50 Commercial → tap "10 Bulk" → stepper 10 →
  `Total: UGX 450,000` → `Add to Cart · UGX 450,000` → cart badge "Cart, 1 items"
  (`addItem` increments existing line qty — confirmed). Bottom bar = +/− stepper,
  Bulk Inquiry (disabled unless `corporateReady`), Add to Cart, escrow microcopy.
- **Catalog reality**: live API has exactly 1 product (id=1, cat 2 "IT & Technology"). Deals/See All
  and VendorProfile grid legitimately show "No products found"; only Home → Tech tile → IT & Solar
  collection surfaces the product card. Not a bug.
- **Promo popup gotcha (do NOT change)**: `HomeScreen` `autoShowPopup` effect re-opens a promo on
  every Home mount (AsyncStorage `PROMO_POPUP_INDEX_KEY` cycle). During verification we temporarily
  disabled it, then FULLY REVERTED (HomeScreen git diff empty). Plain `input tap` on the popup X is
  flaky — a press-hold `adb shell input swipe x y (x+1) (y+1) 400` works; X bounds vary per promo,
  always re-dump first.
- Emulator display: `wm size` 1080x2400, density 420, dumps bounded [0,0][1080,2274]. Read dump XML
  with `[System.IO.File]::ReadAllText(p, [System.Text.Encoding]::UTF8)` (PS 5.1 `Get-Content -Raw`
  garbles UTF-8). Home bottom nav = Home / B2B / Cart / Profile; Home header has no Search button.
- Final state: release APK rebuilt (~1m10s, original promo behavior restored, smoke-tested pid 10358),
  installed on emulator. `tsc --noEmit` + targeted eslint green. Only uncommitted files:
  `ProductDetailsScreen.tsx` (+741/−388) + `Icon.tsx` (+`savings`).
- Phone install STILL BLOCKED: WiFi adb `192.168.15.34:5555` → connection refused (10061); user must
  re-enable WiFi debugging on the Infinix X6816, then `adb connect 192.168.15.34:5555` and
  `adb install -r android\app\build\outputs\apk\release\app-release.apk`.

### Session (2026-09-17 — Saved Wishlist & Coupons screen, Stitch import)

`WishlistScreen.tsx` rewritten to the **"JEMINA Wishlist & Coupons"** Stitch screen
(`53c769ddde0d40b7aa515f9658c31af7`, project `15521520191945729458` — the last generated in the JEMINA
App UI Redesign project; the alternative desktop Wishlist/Vouchers screens live in project
`15080787849175372678`). Renamed from "Wishlist" → **"Saved Wishlist & Coupons"** (Profile menu entry
updated too, now with sub "Saved products & promo codes").
- Layout per design: 2 summary stat cards (Saved Items / Promo Coupons applied), trust strip
  ("JEMINA Escrow Protected · MTN & Airtel MoMo" + "Audit Verified"), **Available Promo Coupons** section
  (coupon cards w/ badge, "UGX 50,000 OFF"/"FREE DISPATCH" title, desc, code, Copy & Apply, meta) +
  **Enter Code** modal that validates via the live `apiValidateVoucher`; collapsible **How to Redeem**
  2-step guide; **Wholesale & Agri Wishlist** with sort ("Date Added / Price High→Low / Price Low→High"
  cycling) + filter chips (All Items / Price Dropped / In Stock at Hub / Solar & Irrigation — keyword
  matched on name since wishlist payload has no category); product cards (discount pill, delete,
  price + strikethrough + Save row, stock/out-of-stock line, Details + Move to Cart / Notify Stock);
  freight strip; sticky bottom bar "Total Available (N items)" + **Move All to Cart** (adds all in-stock
  then switches to Cart tab). Live data from `GET /profile/wishlist`.
- **Coupons data source:** no "list my vouchers" API exists (only `/vouchers/validate` + `/vouchers/apply`),
  so coupon cards use the two design-driven sample codes (`GULU-AGRI-50K`, `FREESHIP-NORTH`). Applied
  codes persist to AsyncStorage `@jemina/coupons/applied/v1` and **Checkout pre-fills the voucher input**
  from the first applied code (already-mounted effect; discount still requires tapping Apply in checkout).
  "Copy & Apply" copies to OS clipboard (added dep `@react-native-clipboard/clipboard@^1.16.3` — native
  module; first build took ~10min).
- New `Icon` names added: `bookmark`, `bookmark-add`, `confirmation-number`, `local-offer`,
  `compare-arrows`, `event-available`, `delete`, `notifications-active`.
- `tsc` + `eslint` green; release APK rebuilt + installed on emulator `emulator-5554` + phone
  `0794415254003308`; verified via uiautomator (stats, trust strip, coupon cards, wishlist card with
  Dlight live data, Move All to Cart bar). Link in source for future coupon listing API:
  `GET /api/v1/vouchers/mine` (web customer vouchers exist in `customer_vouchers.blade.php`).

### Session (2026-09-17 fixes — cart image, Account security width, survey UI cleanup)

Three on-device-reported fixes (APK rebuilt, both devices installed, verified via uiautomator):
- **Cart product images (SERVER fix, deployed):** `ApiCartController::productImages` previously
  `->filter($isAbsolute)` on raw `image_url` (nearly all relative → `images: []` in cart response).
  Rewrote to map `$image->url` (the `ProductImage` accessor, same as `ApiProductController`/order-items
  fix) + photo fallback via `asset('frontend/img/products/'.$photo)`. Deployed to VPS via scp
  (backup `/tmp/ApiCartController.php.bak-cart`, `php -l` clean, config/route/view caches cleared;
  `cache:clear` errored on permissions — harmless). **Verified live:** fresh throwaway user
  (`cartver.20260917230155@example.com`) → login → POST /cart → GET /cart returns 4 product image URLs
  (`/public/frontend/img/products/products/1/...webp`); emulator cart now renders an image `ImageView`
  for the Dlight product. Note: `bits.bytes.loko@gmail.com` / `timBOi@admin420` now returns
  "Invalid credentials" live — password changed or 2FA; use a fresh register for API tests.
- **Account & Security "Security & 2FA" too-narrow card:** `SecurityTab` wrapped its content in
  `<View style={styles.scrollContent}>` INSIDE the tab `ScrollView` whose `contentContainerStyle` was
  also `scrollContent` → double 16dp horizontal padding → card inset 84px per side (density 2.625).
  Added `styles.tabContent` (`gap` only, no padding) for the SecurityTab wrapper; card now spans 996px
  (42px inset) like the profile card. Verified via dump.
- **Surveys & Feedback:** hero title "Northern Uganda Trader Rewards" → **"Jemina Survey Rewards"**;
  removed the `Reward: {formatUGX(credit_reward)} Escrow Credit` chip (server awards no credit —
  `credit_awarded: 0`); `claimedRewards` display pinned to 0 (badge + "Rewards Claimed" stat);
  stats-row values reduced `headlineSm` → `labelLg` (+ tighter statLabel lineHeight). Vendor card still
  shows "Verified Vendor Badge + Tier 2 Escrow Limit". VERIFIED: badge "UGX 0 Credits", no reward chip.
  Note: survey availability shows 0/2 completed for user 7 — the vendor survey `completed` flag flipped
  server-side during testing (no submit happened from this device), i.e. data, not code.

### Session (2026-09-17 latest — Surveys: input types + progress save/resume + Stitch redesign)

**Live survey types confirmed from VPS `survey_questions`:** User (id 1) = radio/checkbox + 4 optional
`textarea`; Vendor (id 2) = radio/checkbox + required `select` (Q22 revenue/Q25 years/Q28 returns/
Q29 payout), `text` Q23 (category), `textarea` Q30 (brand values). The app previously rendered ONLY
radio/checkbox — select/text/textarea showed no input at all.

- `SurveysScreen.tsx` rewritten (Stitch screen `48414eec4468416bb00a1c7059f54894`): renders `select`
  as radio-style options w/ "Select an option" hint, `text` and `textarea` as `TextInput`s. Question
  flow is index-driven: `activeIdx` lifted to the parent; **"Save & Next" actually advances**, required
  enforced; the old "first unanswered question" model was removed because it unmounted text inputs after
  the first keystroke.
- **Progress save/resume:** drafts in AsyncStorage `@jemina/surveys/drafts/v1:<userId>` =
  `{ [surveyId]: { answers, activeIdx } }`, debounced 300ms, hydrated on mount, cleared on submit AND
  on user switch. Collapsed card becomes "In Progress · X/N answered" + "% bar" + "Continue Survey (N Qs)";
  expanding resumes at the saved question. **VERIFIED end-to-end on `emulator-5554`:** answered 3/10
  (radio→Yes, select→"1M - 5M", text→"Agro inputs and solar"), force-stop + relaunch → card showed
  "In Progress · 3/10 answered" + "Continue Survey (10 Qs)", reopened at Q4 of 10.
- **Stitch visuals:** header "Surveys & Feedback"; hero "Northern Uganda Trader Rewards" (+ verified
  chip; Gulu/Lira/Kitgum copy); grouped sections "Community & Platform UX" / "B2B Supplier Compliance";
  card meta "{N} Questions · ~{m} mins"; vendor card reward chip always "Verified Vendor Badge + Tier 2
  Escrow Limit"; "% completed · X/N answered" labels; arrow/chevron CTA icons; updated security copy.
  `Rewards Claimed` stat = sum of completed surveys' `credit_reward`.
- `tsc --noEmit` + `eslint` green (fixed 1 exhaustive-deps: capture `userId`), release APK rebuilt +
  installed on emulator `emulator-5554` + phone `0794415254003308`. Note: `bits.bytes.loko@gmail.com`
  (user 7) has the USER survey completed, so only the vendor survey's flow was exercised on-device.

### Session (2026-09-17 latest — Account & Security + Payments + Address redesign)

- `AccountSettingsScreen.tsx` rewritten to Stitch design (`f080120b22324d5f93b5544c8ceddb91`): 4 tabs
  replaced the old 3 (now `security | payments | logistics | preferences`). Profile summary card
  above tabs (avatar initials + verified check, name, role badge, email/phone, edit). Segmented
  chips (Security & 2FA active orange, Payment Rails, Logistics & Hub, Preferences).
- Security & 2FA tab: STRICT badge, 2FA toggle + phone, password card (45 days, Update), biometric
  toggle, active device sessions (TECNO Camon 20 current + Chrome Windows 11 secondary).
- Payments tab: `PaymentMethodsScreen embedded` — redesigned with JEMINA Credits Box (UGX 145,000,
  Top Up, Credit History, Escrow Clearance), styled payment method cards (colored provider logos:
  MTN=#ffcc00, Airtel=#ff0000, Visa=#1a1f71), dashed "Add Mobile Money / Card" button; all CRUD
  + modal preserved.
- Logistics tab: `AddressBookScreen embedded` — redesigned with Delivery & Logistics Hub section
  (default address + Gulu Central Hub card), saved addresses list, dashed "Add Delivery Address";
  all CRUD + modal preserved.
- Preferences tab: Trade Alerts toggles (SMS/WhatsApp + Price Drops), Tax Records & Data (URA EFRIS
  invoices + Export Activity Log + Deactivate Account).
- `Icon.tsx` — added `fingerprint`, `laptop-windows`, `pin-drop`, `campaign`, `cloud-download`,
  `no-accounts`. `App.tsx` routes updated for new tab names.
- `tsc --noEmit` + `eslint` green on all 4 files. No APK build or device install yet (per user
  request).

### Audit (2026-09-06)

- App code @ `2032ccf` is **ahead** of MEMORY/TODO docs (docs written at `f304f90`, many screens
  added since). Address book, payment methods, account settings, order tracking, messages, help
  center, chat, surveys + vendor journey/agreement/store — all wired and committed.
- Web repo `f5e2a53` exposes `package` in vendor show response; app does NOT surface it.
- Release keystore configured: `android/app/jemina-keystore.properties` + `jemina-release.keystore`
  exist; `build.gradle` release signingConfig wired. `versionCode` still 1, no `app.json` icon.
- Confirm: `GET /api/v1/promotions` public but NOT consumed by app; `CatalogContext` has no dedupe;
  survey reward copy still shows "Reward: UGX 500,000" when submit returns `credit_awarded: 0`.

Note: gateway init on the live server currently fails gracefully — VPS `.env` has NO Stripe/MTN/
Flutterwave keys and Bitcoin is unimplemented server-side, so `initiate` returns
"Payment gateway is not available"/"not fully implemented". App shows the error + Retry + Orders.

### Verified on device (2026-09-02 — Home/browse UI polish)

Model cannot view screenshots, so on-device checks used `uiautomator dump` + regex on
`emulator-5554` (~1080x2274). Confirmed:
- Home order: search bar pinned top (bounds `[42,239][1038,360]`), hero below it (y392), then
  Browse Collections, Featured Stores, trust badge cards (Shipping/Secure), Flash & Deals.
- Browse Collections: "Home & Living" present (`content-desc="?, Home &amp; Living"`), "Auto &
  Machinery" absent.
- Search flow: Home tap search bar → Search screen (Recent Searches + EditText); typed "solar" +
  enter → header `Results for "solar"` + one dense thumbnail row (thumb ImageView, title
  "Dlight Solar Lantern-Reading Light S30", UGX 45,000, rating 0.0, category IT & Technology);
  query "phone" → correct "No results found" empty state.
- **Live catalog has exactly 1 product total** (`/api/v1/products?per_page=50` total=1;
  `/products/search?q=` returns total=1 only for solar/light/lamp/lantern, 0 otherwise) — dense
  multi-row grid could NOT be demonstrated with real data; verified structurally only.
- Gotchas: RN app does not intercept Android back (`input keyevent 4` exits to launcher; use
  on-screen back); Android restores task ScrollView scroll position on relaunch, so dumps showing
  "Account"/"Product detail" were Home scrolled to footer/Featured banner.
  `src/navigation/NavigationContext.tsx` has no persistence (starts `{tab:'Home',route:'Home'}`).
- Build ~1m9s; APK at `D:\mApps\m_jemina\app-release.apk`; installed on phone `0794415254003308`
  + emulator `emulator-5554`.

## Repo checks

`npx tsc --noEmit` — green (0 errors). `npx eslint src/screens src/components src/state` — green
(0 errors). `npx jest` not run this session.

## Website parity audit (2026-09-06)

Read against web repo HEAD `f5e2a53` (all deployed on VPS). App status: clean @ `f304f90`.

- **Promotions API exists + app consumes it (2026-09-07/08).** Public
  `GET /api/v1/promotions`, `GET /promotions/{id}`, `POST /promotions/{id}/view`, `POST /promotions/{id}/click`
  (`routes/api.php` L81–87). Website `5868f4c` added admin-managed promos with `placement`
  enum (`sidebar`, `banner`, `inline`, `popup`, `seasonal`). App Home's auto-popup fetches ALL
  active promos (`apiGetPromotions()` — no `seasonal` placement exists in the DB) and cycles
  through one per launch; the "Seasonal & Promotional" section renders the same Promotions-API
  feed via `PromoFlashCard` (falls back to product `seasonal`/`holiday_special` flags when empty).
- **Homepage feed dedupe** (web `5868f4c`): website dedupes products across homepage blocks;
  app carousels can repeat products. Mirror in `CatalogContext` buckets.
- **Surveys API live + wired in app:** `GET /api/v1/surveys`, `GET /surveys/{id}` (locked/vendor
  gating, `SURVEY_LOCKED` 423), `POST /surveys/{id}/submit`. **But submit hardcodes
  `credit_awarded: 0`** — survey rewards disabled in `fb22f1c`; list/show still advertise
  `credit_reward` (default 500000). App screens exist; reward copy needs alignment.
- **Signup credit bonus removed** (`fb22f1c`): web AND `ApiAuthController.register()` give no
  bonus now. Historical account id 10 started with 1,000,000 (pre-removal).
- **Login is customer-role-only:** `ApiAuthController.login()` returns 403 for non-customer roles
  before any OTP check → web email-OTP 2FA (`91774af`) is unreachable from the app.
- **Vendor subscription billing** on web (`vendor/subscribe`, `VendorSubscriptionController`,
  90-day Starter `2699b14`): check `ApiVendorController` exposure before surfacing in app.
- **Verify after deploys:** `GET /api/v1/products?per_page=1` for the `status='true'` guard
  (VPS copy of `ApiProductController` diverges from committed HEAD).

## Next

**Completed (2026-09-08):** Checkout payment-methods rework (saved-only whitelist + COD/Bitcoin/
credit; gateway mapping; COD/credit order straight to Orders); pickup point → Jemina Official's
real Gulu address; promo popup cycles all active promotions per launch (AsyncStorage index); popup
is promo-data-only with a centered, uncropped full-width image; Seasonal & Promotional cards use
the Promotions API (`PromoFlashCard`, aspect-ratio images, "View Promo"); tsc/eslint green; APK
rebuilt + installed on both devices; **app repo committed + pushed (`3df19c1`)**. Docs updated.
**Completed (2026-09-07):** Server-side login/session fix (Apache `SetEnvIf` Authorization header
forwarding in mod_php vhost); CartScreen redesign (vendor sections, smaller type, per-product
delivery fees, professional card UI); uniform styling roll-out across all screens (shared
`EmptyState`/`SurfaceCard` components; 12 screens refactored, −725 net lines); **Checkout pickup-point
redesign (APP side):** removed shipping-details form, auto-sourced delivery address from the address
book (default address), new "Pickup Point & Delivery" section — "Jemina Point" default pickup or
delivery-to-address, "Add a delivery address" link → `AddressBook` when no default; `apiCreateOrder`
payload extended with `pickup_point`/`fulfilment` (backend ignores for now); Total label reduced to
`bodyLg` (16px, matching Cart).
**Prior completed:** Home/browse UI polish + build (2026-09-02); docs reconciliation (2026-09-06).

**Remaining / next when user returns:**
- **FCM round-trip VERIFIED END-TO-END (2026-09-08):** emulator signed in as `bits.bytes.loko@gmail.com`
  (user id 7) refreshed its device token (id 1, 19:25:12); server `sendToUser` push delivered and the
  **in-app banner fired** (user confirmed). Creds: VPS `.env` already had the m-jemina service-account
  (`FIREBASE_PROJECT_ID=m-jemina`, `FIREBASE_CREDENTIALS_PATH=/etc/jemina/firebase-m-jemina.json`, file
  `/etc/jemina/firebase-m-jemina.json` — matches `D:\mApps\m-jemina-firebase-adminsdk-fbsvc-02967ca629.json`),
  `isConfigured()`=true. The two documented test accounts (`mjemina.test.*`, `mjemina.credit.*`) do NOT
  exist on the VPS, hence their `Invalid credentials` — use `bits.bytes.loko@gmail.com` for live tests.
  **DONE (2026-09-08):** the 4 site files (`PushNotificationService` + `OrderController`/
  `PromotionController`/`MessagingController` hooks) were deployed to the VPS via `scp` (site not
  committed) — methods confirmed loaded, caches cleared. **NEXT:** verify the real trigger paths
  live on-device: order status change → customer push; create a live promotion (toggle) →
  `sendPromotion` broadcast; admin direct message / vendor message → recipient push; 2FA
  (`two_factor`) code push; plus an in-background (app killed / screen off) system-notification test.
- **Website pickup-point system (NEXT PHASE):** backend `GET/POST/PUT/DELETE /api/v1/pickup-points`
  + admin CRUD + `pickup_point` handling in `ApiOrderController` (map the `pickup_point`/
  `fulfilment` fields the app already sends, decide pickup vs delivery fee model). App-side
  `PICKUP_POINTS` is hardcoded for now — wire it to the new endpoint once live.
- App working tree is committed (`3df19c1`); **site repo must NOT be committed**.
- PlayStore release config: bump `versionCode`/`versionName` in `android/app/build.gradle`,
  `./gradlew bundleRelease` → AAB, smoke-test `assembleRelease` APK, install on both devices,
  Play Console listing (description, category Shopping, privacy policy URL, screenshots, IARC
  content-rating, data-safety form), internal → closed → production rollout.
- Website-parity gaps (see TODO.md): Home admin-promo banner from `GET /api/v1/promotions` +
  view/click tracking; homepage feed dedupe across carousels; promo card "Reserve → info modal";
  survey reward copy alignment (`credit_awarded: 0` on submit but list/detail still shows
  `credit_reward: 500000`).
- Vendor subscription status audit (`package` exposed in vendor API; no app surfacing yet).
- VPS gateway keys (Stripe/MTN/Flutterwave) in `.env` for live payment processing — includes
  enabling `flutterwave` + `mtn_mobile_money` so the saved-method checkout path works.
- Optional: address/payment-method editor screens in Profile; vendor-specific delivery fee config
  (currently product-level `delivery_fee`).

### Session: Order Tracking Stitch Redesign (2026-09-17)

**Source:** Stitch project `projects/155215201919457294558`, screen `b72d405b2c274b2d9c2f2fc932040981`
("Track Order #JEM-84920").

**Changes to `OrderTrackingScreen.tsx`:**
- Added `Linking` import for phone call functionality.
- Header now shows `Track Order {order_number}` (dynamic from API data).
- Carrier row redesigned: avatar circle + carrier name + tracking number + call button (phone icon).
- Added **Estimated Delivery ETA banner** after carrier card — green `primaryContainer` background,
  "ON SCHEDULE" / "DONE" badge, shows estimated delivery date or "Pending dispatch".
- Added **Delivery Verification OTP section** after timeline — derives 6-digit code from tracking
  number (last 3 + first 3), displayed in large monospace text with separator; hidden when order
  is delivered.
- **Category badges** on items — derived from SKU pattern or product name (ENERGY, IRRIGATION, AGRO).
- **SKU shown** on items when available.
- **StepNode ring effect** — active step gets an outer ring (tertiary color, 0.4 opacity) for visual
  emphasis matching the Stitch design.
- **Bottom bar** changed from "Refresh Status" → "Call Courier" (opens carrier phone via `Linking`)
  + "Report Issue" (navigates to HelpCenter).

**New styles added:** `carrierAvatar`, `carrierCallBtn`, `etaCard/Row/Icon/Body/Label/Value/Badge`,
`otpCard/Header/Title/Desc/CodeRow/Code/Separator`, `stepNodeOuter/Ring`,
`shipItemNameRow`, `categoryBadge/Text`, `shipItemSku`.

**Verification:** `tsc --noEmit` + `eslint` — 0 errors, 0 warnings.

---

### Session: Surveys Redesign + 2FA/Sessions Backend (2026-09-17)

**Completed this session:**

1. **SurveysScreen redesigned** to match Stitch design (screen `48414eec4468416bb00a1c7059f54894`):
   - Hero card with "JEMINA Survey" title (user updated from "Northern Uganda Trader Rewards")
   - Credits badge, stats row (Available / Completed / Rewards Claimed)
   - Survey cards with icon, reward chips, tags (Payment Rails, Hub Logistics, App Speed), progress
   - Question preview with progress bar, skip option, submit flow
   - Security/encryption notice card at bottom
   - New icons added: `quiz`, `assignment`, `payments`, `verified-user`, `monetization-on`, `lock`, `account-balance-wallet`, `insights`, `security`

2. **Backend 2FA + Session API** (`api.php` + `ApiAuthController.php`):
   - `GET /security/2fa/status` — returns enabled/confirmed_at/has_recovery_codes
   - `POST /security/2fa/enable` — generates TOTP secret + QR URL
   - `POST /security/2fa/confirm` — verifies code, activates 2FA, returns recovery codes
   - `POST /security/2fa/disable` — requires password, disables 2FA
   - `GET /security/sessions` — lists personal_access_tokens with is_current flag
   - `DELETE /security/sessions/{id}` — revokes a specific session
   - `POST /security/sessions/revoke-others` — revokes all sessions except current

3. **Frontend API functions** added to `api.ts`:
   - `apiGetTwoFactorStatus`, `apiEnableTwoFactor`, `apiConfirmTwoFactor`, `apiDisableTwoFactor`
   - `apiGetSessions`, `apiRevokeSession`, `apiRevokeOtherSessions`

4. **AccountSettingsScreen** wired to real APIs:
   - 2FA toggle calls enable/disable flow with QR code + password confirmation
   - Biometric toggle uses `react-native-biometrics`
   - Device sessions loaded from API, revoke/sign-out-others buttons functional
   - Real device name via `getDeviceModel()` instead of hardcoded "TECNO Camon 20"

5. **Device name** in `api.ts` login calls updated from hardcoded `'m_jemina_app'` to real device model via `getDeviceModel()`.

**Verification:** `tsc --noEmit` + `eslint` — 0 errors. APK built + installed on both devices (Infinix phone + emulator).

### Session (2026-09-18) — Stitch UI redesigns, VPS fixes, global font reduction

**VPS 500 Error Fix:**
- Root cause: `storage/framework/views/` files owned by `root:root` — Apache (`www-data`) couldn't recompile Blade views
- Fix: `chown -R www-data:www-data /var/www/jemina/storage` + `php artisan view:clear`
- No signs of hack: SSH logs clean (all `webadmin` from 41.75.x.x), no suspicious cron jobs, no malicious code, git status clean
- PHP files in `/tmp/` are legitimate admin scripts (banner cache purge, vendor link check, etc.)

**Stitch Designs Imported & Implemented:**
- `7bf3be2e8d234a65a3fea95021a25e05` — Wholesale Inquiries & RFQs → `MyInquiriesScreen.tsx`
- `24e4532bdc294c65a852fad31d450b49` — Help & Support → `HelpCenterScreen.tsx`
- `61c09abed5964cf5a9a85cf6d0258acb` — Credits & Wallet → `CreditHistoryScreen.tsx`

**Screens Updated:**
- `MyInquiriesScreen.tsx` — Full Stitch redesign with metric cards, filter chips, inquiry cards, negotiation ribbon, escrow banner. Back button → Profile. Extended `ApiInquiryResult` type.
- `HelpCenterScreen.tsx` — Entire screen scrollable (hero + tabs + content in one ScrollView). "Jemina Virtual Assistant" renamed. 3 tabs: Support Tickets / AI Chatbot / FAQ & Knowledge. 10 FAQ items matching website. Emergency helpline banner.
- `CreditHistoryScreen.tsx` — Full Stitch redesign: hero balance card (BOU Escrow Protected, balance, sub-ledger, quick actions), Buy Trade Credits with 3 tiers, Wallet Privileges perks, Trade Credit Ledger with filters and color-coded transaction items.
- `SurveysScreen.tsx` — Reduced hero + card title fonts. "Jemina Feedback Guarantee" replaces "Escrow & Northern Trade Guarantee". Credits go to Credit balance, not mobile money.
- `WishlistScreen.tsx` — Real system coupon `JEMINA5` replaces fake design coupons. Product images fixed (`resolveWishlistImage()` fallback for `/public/storage` paths). "My Jemina Wishlist" title.
- `ProductInquiryScreen.tsx` — Product picker list when no product passed (fetches from API, user selects then sees inquiry form).

**Typography:** Global font size reduction: `headlineLg/displayLg` 28→24, `headlineMd` 22→18, `headlineSm` 18→15, `bodyLg` 16→14, `bodyMd` 14→13, `bodySm` 12→11, `labelLg` 14→13, `labelMd` 12→11.

**New Icons:** `smart_toy`, `crisis-alert`, `chat_apps_script`, `reply`, `add_card`, `qr_code_scanner`, `percent`.

**Verification:** `tsc --noEmit` + `eslint` — 0 errors. APK built + installed on both devices (phone `0794415254003308` + emulator `emulator-5554`).

### Session (2026-09-26) — Inquiry chat thread, mark-complete, invoice view; backend deployed

**Backend (site repo `C:\xampp\htdocs\dev\jemina`, commit `56eccb7`, pushed + deployed to VPS):**
- New `corporate_inquiry_messages` table (migration `2026_09_26_000000_...`) + `CorporateInquiryMessage` model; `CorporateInquiry` gains `messages()` (hasMany ordered by created_at) and `invoice()` (hasOne latestOfMany).
- `ApiInquiryController::index` enriched: `inquiry_message`, `subject_name`, `delivery_location`, `expected_delivery`, `replies_count`, `latest_reply`, `messages[]` (thread only — original inquiry message excluded), `invoice` summary.
- New endpoints (owner-checked, inside v1 auth group): `POST /inquiries/{id}/replies` (201, returns message), `POST /inquiries/{id}/complete` (sets `status='completed'`, `delivery_completed=true`+at), `GET /inquiries/{id}/invoice` (full invoice for owner).
- `VendorController::vendorRespondToInquiry` now appends a vendor thread row (try/catch + Log::warning).
- VPS: `git pull` + `php artisan migrate --force` (table created, 116ms) + `view:clear`. Verified via route:list + local smoke script (thread create, complete + rollback).

**Mobile (repo `m_jemina`, 4 commits pushed: `21a8c09` returns/reorder, `ef351c7` reviews fixes, `6700561` inquiry chat/invoice, `9b8b4ab` hero/credits style):**
- Cut-off sheet fix: `chatSheet`/`detailsSheet` got definite heights (`85%`/`80%`) + `overflow:hidden` (same pattern as AccountSettings `editProfileSheet`) — inner ScrollView now bounded and scrolls.
- `MyInquiriesScreen`: full thread rendering (customer right / vendor left bubbles with quoted-price tag), real send via `apiReplyToInquiry`, Mark-as-Complete via `apiCompleteInquiry` (flips status locally + closes modals), input locked when `completed|cancelled`; details modal gains Supplier Replies list + invoice card → `InquiryInvoice`; STATUS_CONFIG now covers `quoted/responded/confirmed/in_transit/cancelled`; negotiation filter includes quoted/confirmed; duplicate `pressed:` style key removed; `cancel` icon → `error-outline` (not in IconName).
- New `InquiryInvoiceScreen` (full-screen: AppHeader showBack, loading/error states, hero amount+status badge, parties, line items, payment, notes, escrow footer, pull-to-refresh via `apiGetInquiryInvoice`); route `'InquiryInvoice'` added to NavigationContext + App.tsx; `shield-check` icon → `verified-user`.
- `api.ts`: `ApiInquiryThreadMessage`, `ApiInquiryInvoice`, `messages?`/`invoice?`/`subject_name?`/`expected_delivery?` on `ApiInquiryResult`, + `apiReplyToInquiry`/`apiCompleteInquiry`/`apiGetInquiryInvoice`.

**Note:** DB has only inquiry #1 (user 7, pending); `corporate_invoices` empty → invoice card/empty-state only appears once a vendor creates an invoice.

**Verification:** `npx tsc --noEmit` + eslint on changed files — 0 errors. `php -l` clean. APK `assembleRelease` BUILD SUCCESSFUL (5m29s), installed + relaunched on phone `0794415254003308` and emulator `emulator-5554` (PIDs confirmed running).
