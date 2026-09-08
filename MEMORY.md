# m_jemina — Project Memory

Ongoing session log. Read this first; it is the authoritative record of what was done,
what the live server looks like, and the current state.

## Objective

Wire the app to the live Jemi-na Sanctum API (`https://jemi-na.com/api/v1`) with graceful
demo fallback, then complete the full app → PlayStore roadmap so the app is "fully
functional like the website" (login → cart → checkout/orders → JEMINA credits).
**Current focus (2026-09-08):** Checkout payment options reworked + promo popup finished.
Shopping loop is fully wired to the live API; the app working tree is COMMITTED and pushed at
`3df19c1` (`main`). This session (2026-09-08): **checkout payment methods** now resolve
app-side to a whitelist — default saved method (only), Cash on Delivery, Bitcoin, JEMINA
Credits — with a gateway mapping for the saved-method provider (card → `stripe`,
`mtn` mobile_money → `mtn_mobile_money`, everything else → `flutterwave`); generic
MTN/Stripe/Flutterwave options removed; **pickup point** fixed to Jemina Official's real
Gulu address (`789 Commerce Street, Building A, Gulu, Northern Region`); **promo popup**
auto-opens on launch and now CYCLES through all active promotions per launch (persisted
index in AsyncStorage), shows the full-width uncropped image (aspect-ratio-aware,
centered) with **promo data only** (Visit Store / Maybe later buttons removed); Seasonal &
Promotional cards use the Promotions API (`PromoFlashCard`, crop-free aspect-ratio
images, "View Promo" action). Server has no new changes this session. **Site repo must
NOT be committed.** Website pickup-point system (backend + admin CRUD) is the NEXT phase.
Remaining: 3 website-parity gaps (admin promo banner, homepage dedupe, promo info modal), site
pickup-point system, survey reward copy, VPS gateway keys (flutterwave/mtn_mobile_money
disabled server-side — saved MTN/Airtel method at checkout hits "gateway not available"),
**deploy the newer push channels to the VPS** (server is at `0254f82` — only
`sendOtpCode`/`sendToUser` live; `sendOrderUpdate`/`sendPromotion`/`notifyNewMessage`/
`sendBroadcast` + controller hooks not deployed yet), and the PlayStore listing/gradlew AAB
(versionCode bump).

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
  `two_factor` ignored (handled by `subscribeToSecurityCode`).
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
