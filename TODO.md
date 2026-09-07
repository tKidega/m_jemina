# m_jemina — Roadmap to PlayStore

Goal: ship the app as "fully functional like the website" and publish to the Play Store.
Epic (core loop): **sign in → browse → cart → checkout → pay → track orders**, with **JEMINA credits**
earned at surveys and spendable at checkout.

**Status (2026-09-07):** Core shopping loop fully wired to live Sanctum API (`https://jemi-na.com/api/v1`).
Login/session bug fixed server-side: Apache mod_php vhost now forwards the `Authorization` header via
`SetEnvIf` (see MEMORY.md deployed change #11); app stays signed in. Cart screen redesigned (vendor
sections, smaller type, per-product delivery fees) and uniform styling rolled out across all screens
(shared `EmptyState`/`SurfaceCard`; 12 screens refactored, −725 lines). Checkout redesigned to a
**Pickup Point & Delivery** model (2026-09-07): shipping form removed, delivery address auto-sourced
from the address book, default "Jemina Point" pickup option, "Add a delivery address" link →
`AddressBook` when none exists. Working tree UNCOMMITTED at
`2032ccf` (this + prior sessions pending review). Release keystore + signing configured (versionCode
still 1). **Push notifications + promo/ad popup DONE (app + server, 2026-09-07)** — see the section
below; live FCM round-trip pending (VPS creds). Remaining: PlayStore listing/config, 3 website-parity
gaps (admin promo banner, homepage dedupe, promo info modal), the **website pickup-point system**,
survey reward copy, VPS FCM creds, and VPS gateway keys for live payments.

Legend: `[x]` done · `[ ]` pending.

---

## Core Epic — Shopping Loop

- [x] Live auth (register/login/logout via Sanctum) with demo fallback — `AuthContext`
- [x] **Server-side login/session fix (2026-09-07):** Apache vhost `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` — mod_php was stripping the header causing every Sanctum call to 401 and the app's self-heal to expire sessions instantly. Verified from public internet; no app change needed.
- [x] Server-synced cart — `CartContext` (`cartSource: 'server'`) — vendor-grouped with per-vendor delivery fees
- [x] **Cart screen redesign (2026-09-07)** — `CartScreen.tsx`: per-vendor sections (dark header + store badge), item cards with 80×80 image + reduced detail type, per-item `Delivery: {formatUGX(fee×qty)}` tag, qty stepper, line totals + separators, Order Summary card (subtotal, per-vendor delivery rows, total, checkout). Smaller, professional fonts.
- [x] Checkout screen — **pickup-point redesign (2026-09-07)** — `CheckoutScreen`
  (removed shipping form; "Pickup Point & Delivery" section with default "Jemina Point" pickup or
  delivery-to-address; delivery address auto-sourced from address book; "Add a delivery address"
  link → `AddressBook` when none; `apiCreateOrder` sends `pickup_point`/`fulfilment`; Total label
  reduced to `bodyLg`)
- [x] Orders list + order detail — `GET /api/v1/orders`, `GET /api/v1/orders/{id}` — `OrdersScreen`
- [x] Order tracking UI — `OrderTrackingScreen` (dispatch → delivery timeline)
- [x] Server-side `ApiOrderController` fixed to real schema + voucher_id/voucher_code/discount_amount support
- [x] JEMINA credits balance + history API (`GET /api/v1/credits/balance`, `GET /api/v1/credits/history`) — `ApiCreditController`
- [ ] ~~Signup bonus~~ — **Server removed signup credit award** (`fb22f1c`); current `ApiAuthController.register()` returns no bonus. App no longer shows or relies on a registration bonus.
- [x] Credit payment in order store (`payment_method: 'credit'` → deducts balance, marks order `processing`/`paid`)
- [x] App shows credits balance in Profile and at Checkout; credit payment option
- [x] Checkout/payment gateway handoff UX (MTN / Stripe / Flutterwave / Bitcoin via `POST /api/v1/payments/initiate`) — `PaymentScreen` initiates + polls status; checkout routes non-credit payments to it
- [x] Wishlist + reviews wiring from Profile (`profile/wishlist`, `profile/reviews`) — `WishlistScreen`, `MyReviewsScreen`, auth-gated
- [x] Add-to-wishlist heart + review form on product detail (`apiAddToWishlist`, `apiRemoveFromWishlist`, `apiAddReview`, wishlist preload)
- [x] **Address book** — `AddressBookScreen` (full CRUD + set default via `/addresses*`) — `ApiAddressController`
- [x] **Saved payment methods** — `PaymentMethodsScreen` (full CRUD + set default via `/payment-methods*`) — `ApiPaymentMethodController`; Checkout callback
- [x] **Account settings hub** — `AccountSettingsScreen` tabs: Edit Profile (`apiUpdateProfile`), Payments, Addresses
- [ ] Verify gateway UX against live API (gateways not configured on VPS .env yet → initiate returns gateway-availability error gracefully)
- [ ] Verify full checkout/order/cart loop against live API on device (emulator + phone)

## Surveys & Vendor Journey

- [x] Surveys API wired — `GET /api/v1/surveys`, `GET /surveys/{id}`, `POST /surveys/{id}/submit` — `SurveysScreen`
- [x] Vendor actions / journey gating — user survey must complete before vendor survey; vendor registration flow — `VendorActionsScreen`
- [x] Vendor Agreement (structured content + accept) + vendor store creation via API — `ApiVendorController`
- [x] Profile menu entry "Surveys" → `SurveysScreen` (wired in navigation)
- [x] **Help Center + tickets** — `HelpCenterScreen` + `ApiHelpController` (`/help/tickets*`)
- [x] **In-app messages** — `MessagesScreen` + `ApiMessageController` (`/messages*`, mark-read)
- [ ] ⚠ Survey reward copy needs alignment: server `POST /surveys/{id}/submit` hardcodes `credit_awarded: 0` (rewards disabled in `fb22f1c`); `SurveysScreen` still renders `Reward: {formatUGX(credit_reward)}` (server defaults 500000) on list + detail (L165/L310). Fix copy to reflect no-award state, or confirm intent to re-enable rewards server-side.

## Chat / AI assistant

- [x] Chatbot (`apiChatAsk`/`apiChatClear`) — JVA assistant via `/chat/ask`
- [x] Vendor shop chat (`apiVendorChatAsk`/`apiVendorChatNotify`) — `/vendor-chat/*`

## Company / Legal pages

- [x] Sidebar drawer (from the JEMINA header menu icon) grouping Shop / Account / Messages / Help / Company / Legal links
- [x] About Us screen (`AboutScreen`) — mission/vision, core values, why-us, story, contact
- [x] Services screen (`ServicesScreen`) — capabilities, solutions, impact stats, features, how-it-works
- [x] Terms of Service + Privacy Policy screens (`TermsOfServiceScreen`, `PrivacyPolicyScreen`)
- [x] Contact Us screen (`ContactScreen`) — contact info, business hours, mailto message form

## Home / Browse polish

- [x] Home hero carousel (5 slides) + Smart Picks carousel + section carousels
- [x] Product-carousel dots removed on Home; hero dots visibility + image fit fixed; hero manual swipe
- [x] Deep-link product search (`GET /api/v1/products/search`) — `SearchResultsScreen`, Marketplace search bar
- [x] Search screen with recent searches — `SearchScreen`
- [x] Collection drill-down — `CollectionProductsScreen` (category tap → full list)
- [x] Vendor storefront from vendor tap (`VendorProfileScreen` loads live data via `GET /api/v1/vendors/{id}`; Marketplace/ProductDetails wire vendor nav)
- [x] Home restructure (2026-09-02): search bar pinned top, trust badges, hero manual swipe, carousels `loop`+`autoPlay`
- [x] Browse Collections reworked with custom icons; "Home & Living" added, "Auto & Machinery" removed
- [x] SearchResultsScreen dense single-column thumbnail list (64x64 thumb, price + compare, add button, empty state)
- [x] B2B product inquiry flow — `ProductInquiryScreen`, inquiry-only cards, gated INQUIRE on ProductDetails
- [ ] **Admin-managed promo surface on Home (partially DONE)** — the auto promo popup now consumes
  `GET /api/v1/promotions` (seasonal, once per launch, 2026-09-07). Remaining: the "Seasonal &
  Promotional" *section* still derives from product `seasonal`/`holiday_special` flags instead of
  the Promotions API (see Website Parity Gaps).

## Pickup Point / Delivery (app-side shipped, site pending)

- [x] **Checkout pickup-point redesign (2026-09-07)** — `CheckoutScreen.tsx`: removed the
  shipping-details form + `FIELDS`/`form`/`setField`; new `PICKUP_POINTS` const (default "Jemina
  Point · Jemina Official · Kampala"); "Pickup Point & Delivery" section with radio-select
  cards (pickup is default). Delivery address auto-sourced via `apiGetAddresses()` (default
  address shown under the "Deliver to my address" option); no default → tap redirects to
  `AddressBook` + a persistent "Add a delivery address" link. Order notes kept as a small
  section. `buildShippingAddress()` mints the `ApiShippingAddress` from pickup point or saved
  address; `validate()` errors when delivery is chosen with no address. `apiCreateOrder` payload
  extended with `pickup_point` + `fulfilment`. Total label `headlineMd` → `bodyLg` (16px, matches
  Cart). `tsc`/`eslint` green.
- [ ] **Website pickup-point system (NEXT PHASE)** — backend pickup-point CRUD + admin UI, and
  make `ApiOrderController` accept/map the `pickup_point`/`fulfilment` fields the app already
  sends (still ignores them today). Decide the pickup-vs-delivery fee model. When live, replace
  the app's hardcoded `PICKUP_POINTS` with a fetch from `GET /api/v1/pickup-points`.

## Push notifications + promo/ad popup (DONE app+server, 2026-09-07)

- [x] **App payload contract** — `src/lib/notifications.ts`: `PushEvent` union
  (`two_factor` | `promo` | `order_status` | `message`), `parsePushEvent`, permission,
  `subscribeToPushEvents`/`subscribeToPushOpened`, `getInitialPush`, `subscribeToSecurityCode`
  (kept). FCM deps `^26.4.0` + `google-services.json` present.
- [x] **Global notification UI** — `src/state/NotificationContext.tsx`: `NotificationProvider`
  renders the promo popup Modal + top floating in-app banner (5s auto-dismiss, tap navigates);
  `useNotification` (`showPromo`/`showNotice`); `promoVisit` opens `target_url`/`link_url` via
  `Linking` when no vendor shop. `src/lib/promo.ts` (`promoImageUrl`, base `https://jemi-na.com`).
- [x] **App wiring** — `App.tsx`: `NotificationProvider` (inside `NavigationProvider`) + `PushBridge`
  (foreground/opened/initial → promo popup, order_status/message banner → `Orders`/`Messages`).
- [x] **Auto-open promo popup on launch** — `HomeScreen.tsx`: `promoPopupShownThisLaunch` module
  flag → shows the first seasonal promotion once per launch (no tap); centered popup with top-right
   close X + "Maybe later"; tap still tracks `apiTrackPromotionClick`. Replaces the old bottom sheet.
- [x] **Server push channels (site repo, deployed-ready)** — `PushNotificationService`:
  `sendOrderUpdate`/`sendPromotion` (broadcast to all active `user_device_tokens`)/`notifyNewMessage`;
  hooks in `OrderController::updateStatus` (customer), `PromotionController` store/update/
  toggleStatus/approve (`broadcastIfActive` — only when live), `MessagingController::sendDirectMessage`
  (admin→recipient) + `vendorSendMessage` (vendor→customer-by-email). `php -l` clean; tinker
  smoke-tested. Payload `data.type` matches the app's `PushEvent` union; promotions also carry
  `promo_id`/`title`/`description`/`image_url`/`placement`/`link_url`/`target_url`/`has_shop`/
  `vendor_id`/`vendor_name`.
- [ ] **Verify live FCM round-trip (BLOCKED)** — VPS `.env` needs `FIREBASE_CREDENTIALS_JSON` or
  `FIREBASE_CREDENTIALS_PATH` (service account, project `FCM_SERVICE` per `config/services.php`),
  plus at least one registered device token and a working customer login (both test accounts now
  return `Invalid credentials`). Until creds are set, server logs `FCM not configured; skipping …`
  and no-ops gracefully. 2FA push (`two_factor` code delivery) verifies the same path.

## Website Parity Gaps (2026-09-06 audit — verified against web repo `f5e2a53`)

- [ ] **Admin-managed promo surface on Home** — web manages promos with `placement` enum (`sidebar`, `banner`, `inline`, `popup`, `seasonal`); public API exists (`GET /api/v1/promotions`, `GET /promotions/{id}`, `POST /promotions/{id}/view`, `POST /promotions/{id}/click`). **Done (2026-09-07):** the auto promo popup consumes it (log view on open + `apiTrackPromotionClick` on tap). **Still open:** Home's "Seasonal & Promotional" section derives from product flags, not the Promotions API.
- [ ] **Homepage product dedupe across carousels** — web dedupes featured/seasonal/new/flash across homepage blocks (`5868f4c`). App `CatalogContext.derive()` buckets the same array without cross-block dedupe — a product can appear in multiple carousels.
- [ ] **Promo card Reserve → info modal parity** — web "Reserve" opens a full info modal (`3e9e3cf`, all viewers). App promo cards are read-only product cards. Blocked on promo banner item above.
- [x] **Vendor subscription visibility — AUDITED:** web `ApiVendorController::show` exposes `package` (e.g. `starter`) in the vendor payload; app `VendorActionsScreen`/`VendorProfileScreen` do NOT surface package/billing status. No app change needed unless we want to show plan badge.
- [x] **Email-OTP 2FA impact — AUDITED:** web enforces 2FA for privileged roles (`91774af`); app `ApiAuthController.login()` is customer-role-only (403 others) → no impact on app logins. No change needed unless app later supports vendor/admin login.

## JEMINA Credits — remaining

- [x] In-app credit purchase flow (`POST /api/v1/payments/initiate` with `metadata.type=credit_purchase`) — `BuyCreditsScreen`
- [x] Credit transaction history screen in app (`GET /api/v1/credits/history`) — `CreditHistoryScreen`
- [x] Survey-credit rewards endpoint confirmed — `GET/POST /api/v1/surveys*` (see **Surveys & Vendor Journey** for reward copy caveat)

## Release / PlayStore

- [ ] Fill Android app icon/name/version in `app.json` (`name: m_jemina`, `displayName: JEMINA` set; icon entry missing) + bump `versionCode`/`versionName` in `android/app/build.gradle` (currently `1` / `1.0.0`)
- [x] **Configure release keystore + signing** — `android/app/jemina-keystore.properties` + `jemina-release.keystore` exist; `build.gradle` release signingConfig wired (falls back to debug keystore if props missing)
- [ ] `./gradlew bundleRelease` → AAB; smoke test `assembleRelease` APK
- [ ] Privacy Policy URL (store requires it — auth collects email/name)
- [ ] App screenshots (portrait, 5–8) + feature graphic
- [ ] Content rating questionnaire (IARC)
- [ ] Data safety form (email, purchase history, etc.)
- [ ] Play Console listing (description, category Shopping, contact)
- [ ] Internal testing → closed testing → production rollout

## Housekeeping

- [x] `tsc --noEmit`, `eslint`, `jest` green
- [x] **Uniform styles roll-out (2026-09-07)** — added shared `src/components/EmptyState.tsx` + `SurfaceCard.tsx`; refactored 12 screens (Orders, OrderTracking, Messages, Wishlist, CreditHistory, MyReviews, BuyCredits, CollectionProducts, AddressBook, PaymentMethods, HelpCenter, EditProfile) off duplicated inline empty/error/signed-out blocks (−725 net lines). Sections + cards verified uniform (`headlineMd` titles, `SurfaceCard` recipe). `tsc`, `eslint` green.
- [x] Release APK built + installed on phone `0794415254003308` + emulator `emulator-5554` (2026-09-02) — `app-release.apk` at `D:\mApps\m_jemina\app-release.apk`
- [ ] **Commit app working tree** — everything since `2032ccf` (incl. CartScreen redesign, EmptyState/SurfaceCard refactor, and prior sessions' screen/state work) is UNCOMMITTED pending review
- [ ] Rebuild latest `assembleRelease` (many screens/APIs added since last install) + install on both devices
- [ ] Verify checkout/order/cart flows against live API on device (emulator) — still open
- [ ] Update `docs/DESIGN.md` endpoint map with orders/credits/payments/vendors/search/promotions/surveys/help/messages/chat/payment-methods