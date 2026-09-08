# m_jemina — Roadmap to PlayStore

Goal: ship the app as "fully functional like the website" and publish to the Play Store.
Epic (core loop): **sign in → browse → cart → checkout → pay → track orders**, with **JEMINA credits**
earned at surveys and spendable at checkout.

**Status (2026-09-08):** Core shopping loop fully wired to live Sanctum API
(`https://jemi-na.com/api/v1`). **App working tree COMMITTED + pushed (`3df19c1`, 52 files).**
Login/session bug fixed server-side: Apache mod_php vhost now forwards the `Authorization` header
via `SetEnvIf` (see MEMORY.md deployed change #11); app stays signed in. Cart screen redesigned
(vendor sections, smaller type, per-product delivery fees) and uniform styling rolled out across
all screens (shared `EmptyState`/`SurfaceCard`; 12 screens refactored, −725 lines). Checkout uses
a **Pickup Point & Delivery** model — shipping form removed, delivery address auto-sourced from the
address book, default "Jemina Point" pickup at Jemina Official's **Gulu** address, "Add a delivery
address" link → `AddressBook` when none exists. **Checkout payment methods reworked (2026-09-08):**
only the default saved method + Cash on Delivery + Bitcoin + JEMINA Credits (no generic
MTN/Stripe/Flutterwave rows); COD/credit orders go straight to Orders, gateway orders route to
`PaymentScreen` with the correct gateway. **Promo popup (2026-09-08):** auto-opens on launch and
cycles a different promotion per launch (AsyncStorage index); promo-data-only modal (no action
buttons) with centered, uncropped full-width image. **Push notifications + promo/ad popup DONE
(app + server, 2026-09-07)** — **live FCM round-trip VERIFIED END-TO-END (2026-09-08):** VPS
`/etc/jemina/firebase-m-jemina.json` holds the m-jemina service account, `.env` points to it
(`FIREBASE_PROJECT_ID=m-jemina`, `FIREBASE_CREDENTIALS_PATH=/etc/jemina/firebase-m-jemina.json`),
`PushNotificationService::isConfigured()` = true, and a `sendToUser` push delivered to the
emulator's real token for `bits.bytes.loko@gmail.com` — **in-app banner fired on-device
(confirmed)**. ✅ Deploy drift resolved (2026-09-08): the 4 site files (push channels + controller
hooks) deployed to VPS via `scp` — no git commit (site repo stays uncommitted), `php -l` clean,
caches cleared. **All 4 trigger paths verified live on the phone (2026-09-08 eve):** order_status,
promo broadcast, admin message, 2FA (see MEMORY "Verified 2026-09-08 evening"). **Notification
badge + cart on ALL screens (2026-09-08 eve):** self-contained `HeaderActions` bell/cart default in
`AppHeader`, `unreadCount` persisted via AsyncStorage — verified surviving restart on both devices.
**Release** keystore + signing configured; **versionCode 3 / versionName 1.1.1** release APK built
+ installed on phone + emulator. Remaining:
PlayStore listing/config, 3 website-parity gaps (admin promo banner, homepage dedupe, promo info
modal), the **website pickup-point system**, survey reward copy, and VPS gateway keys for live
payments.

Legend: `[x]` done · `[ ]` pending.

---

## Core Epic — Shopping Loop

- [x] Live auth (register/login/logout via Sanctum) with demo fallback — `AuthContext`
- [x] **Server-side login/session fix (2026-09-07):** Apache vhost `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` — mod_php was stripping the header causing every Sanctum call to 401 and the app's self-heal to expire sessions instantly. Verified from public internet; no app change needed.
- [x] Server-synced cart — `CartContext` (`cartSource: 'server'`) — vendor-grouped with per-vendor delivery fees
- [x] **Cart screen redesign (2026-09-07)** — `CartScreen.tsx`: per-vendor sections (dark header + store badge), item cards with 80×80 image + reduced detail type, per-item `Delivery: {formatUGX(fee×qty)}` tag, qty stepper, line totals + separators, Order Summary card (subtotal, per-vendor delivery rows, total, checkout). Smaller, professional fonts.
- [x] Checkout screen — **pickup-point redesign (2026-09-07)** — `CheckoutScreen`
  (removed shipping form; "Pickup Point & Delivery" section with default "Jemina Point" pickup at
  Jemina Official's Gulu address (`789 Commerce Street, Building A`); delivery address auto-sourced
  from address book; "Add a delivery address" link → `AddressBook` when none; `apiCreateOrder`
  sends `pickup_point`/`fulfilment`; Total label reduced to `bodyLg`)
- [x] **Checkout payment options rework (2026-09-08)** — `PaymentOption` whitelist: default saved
  method + COD + Bitcoin + JEMINA Credits; defaults `'cod'`, auto-selects `'saved'` when a default
  saved method exists; `handlePlaceOrder` submits `option.method` and routes COD/credit → `Orders`,
  gateway → `PaymentScreen` (custom `gatewayForSavedMethod`: card→`stripe`, mtn→`mtn_mobile_money`,
  else→`flutterwave`); "X saved · tap to manage" label; old `PAYMENT_METHODS` const deleted
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
- [x] **Admin-managed promo surface on Home (2026-09-08)** — the auto promo popup AND the
  "Seasonal & Promotional" section now consume `GET /api/v1/promotions` (all active placements);
  popup cycles one per launch; cards render via `PromoFlashCard` (crop-free aspect-ratio images,
  "View Promo" action) with seasonal-product-flag fallback when the feed is empty. See Website
  Parity Gaps for what's still open (info-modal parity, banner).

## Pickup Point / Delivery (app-side shipped, site pending)

- [x] **Checkout pickup-point redesign (2026-09-07)** — `CheckoutScreen.tsx`: removed the
  shipping-details form + `FIELDS`/`form`/`setField`; new `PICKUP_POINTS` const (default "Jemina
  Point · Jemina Official · **789 Commerce Street, Building A, Gulu**"); "Pickup Point & Delivery"
  section with radio-select cards (pickup is default). Delivery address auto-sourced via
  `apiGetAddresses()` (default address shown under the "Deliver to my address" option); no default
  → tap redirects to `AddressBook` + a persistent "Add a delivery address" link. Order notes kept
  as a small section. `buildShippingAddress()` mints the `ApiShippingAddress` from pickup point or
  saved address; `validate()` errors when delivery is chosen with no address. `apiCreateOrder`
  payload extended with `pickup_point` + `fulfilment`. Total label `headlineMd` → `bodyLg` (16px,
  matches Cart). `tsc`/`eslint` green.
- [x] **Checkout payment options (2026-09-08)** — resolved app-side to saved-default + COD +
  Bitcoin + credits; see Core Epic row above.
- [ ] **Website pickup-point system (NEXT PHASE)** — backend pickup-point CRUD + admin UI, and
  make `ApiOrderController` accept/map the `pickup_point`/`fulfilment` fields the app already
  sends (still ignores them today). Decide the pickup-vs-delivery fee model. When live, replace
  the app's hardcoded `PICKUP_POINTS` with a fetch from `GET /api/v1/pickup-points`.

## Push notifications + promo/ad popup (DONE app+server, 2026-09-07)

- [x] **App payload contract** — `src/lib/notifications.ts`: `PushEvent` union
  (`two_factor` | `promo` | `order_status` | `message`), `parsePushEvent`, permission,
  `subscribeToPushEvents`/`subscribeToPushOpened`, `getInitialPush`, `subscribeToSecurityCode`
  (kept). FCM deps `^26.4.0` + `google-services.json` present.
- [x] **Notification badge on all screens (2026-09-08 eve)** — `AppHeader.tsx` rebuilt:
  `HeaderNotificationButton` + `HeaderCartButton` self-contained (context-driven) with new
  `HeaderActions` (bell + cart) as the `AppHeader` default `right`; explicit-right screens
  (Home, Marketplace, Wishlist, VendorProfile, ProductDetails, Profile both states, Cart) all
  updated to include the bell. `NotificationContext` gained `unreadCount`/
  `markUnread()`/`clearUnread()` **persisted to AsyncStorage** (`@jemina/notifications/unread/v1`,
  `unreadLoaded` hydration gate); `PushBridge` calls `markUnread()` on every `order_status`/
  `message` push (fg/opened/initial). Badge survives force-quit + relaunch (verified both devices).
- [x] **Global notification UI** — `src/state/NotificationContext.tsx`: `NotificationProvider`
  renders the promo popup Modal + top floating in-app banner (5s auto-dismiss, tap navigates);
  `useNotification` (`showPromo`/`showNotice`). **2026-09-08:** popup is promo-data only
  (header/image/title/vendor/description — `promoVisit` + "Visit Store"/"View Offer" button +
  "Maybe later" removed); image is aspect-ratio-aware + centered (`popupImageSized`,
  `resizeMode="cover"`, `maxHeight: 300`) so it fills the card width without cropping.
  `src/lib/promo.ts` (`promoImageUrl`, base `https://jemi-na.com`).
- [x] **App wiring** — `App.tsx`: `NotificationProvider` (inside `NavigationProvider`) + `PushBridge`
  (foreground/opened/initial → promo popup, order_status/message banner → `Orders`/`Messages`).
- [x] **Auto-open promo popup on launch — now CYCLES (2026-09-08)** — `HomeScreen.tsx`:
  `promoPopupShownThisLaunch` module flag + `PROMO_POPUP_INDEX_KEY` (`@jemina/promoPopupIndex` in
  AsyncStorage) → shows a different promotion each launch (`(lastIndex + 1) % length`, starts at
  index 0); centered popup with top-right close X. Root fix: fetches ALL active promos
  (`apiGetPromotions()` — DB has no `seasonal` placement). Tap still tracks `apiTrackPromotionClick`.
- [x] **Server push channels (site repo, deployed-ready)** — `PushNotificationService`:
  `sendOrderUpdate`/`sendPromotion` (broadcast to all active `user_device_tokens`)/`notifyNewMessage`;
  hooks in `OrderController::updateStatus` (customer), `PromotionController` store/update/
  toggleStatus/approve (`broadcastIfActive` — only when live), `MessagingController::sendDirectMessage`
  (admin→recipient) + `vendorSendMessage` (vendor→customer-by-email). `php -l` clean; tinker
  smoke-tested. Payload `data.type` matches the app's `PushEvent` union; promotions also carry
  `promo_id`/`title`/`description`/`image_url`/`placement`/`link_url`/`target_url`/`has_shop`/
  `vendor_id`/`vendor_name`.
- [x] **Verify live FCM round-trip (VERIFIED END-TO-END 2026-09-08)** — VPS credential previously
  believed missing was already deployed: `/etc/jemina/firebase-m-jemina.json` is the m-jemina service
  account (`firebase-adminsdk-fbsvc@m-jemina`) and `.env` already has `FIREBASE_PROJECT_ID=m-jemina` +
  `FIREBASE_CREDENTIALS_PATH=/etc/jemina/firebase-m-jemina.json`; `isConfigured()` returns true.
  Emulator (signed in `bits.bytes.loko@gmail.com`, user id 7) refreshed its device token (id 1,
  19:25:12); `sendToUser` push delivered with no exception / no FCM error log → **in-app banner
  fired on-device (confirmed)**. Note: documented test accounts (`mjemina.test.*`,
  `mjemina.credit.*`) do NOT exist in the VPS `users` table — they are local-DB accounts, which is
  why their logins returned `Invalid credentials`. ✅ Deploy drift resolved (2026-09-08): the 4 site
  files (`PushNotificationService` + 3 controller hooks) were deployed to the VPS via `scp` (no git
  commit — site repo stays uncommitted); methods confirmed loaded (`sendOrderUpdate`/
  `sendPromotion`/`notifyNewMessage`/`sendBroadcast`), `php -l` clean, config/route/cache cleared.
  Remaining: verify the real trigger paths (order status change, promo broadcast, admin/vendor
  message) + 2FA (`two_factor`) code push + background system notification. **✅ ALL FOUR TRIGGER PATHS +
  2FA VERIFIED LIVE (2026-09-08 eve):** order_status (`JEM-FINAL-001` paid / `-002` shipped /
  `-003` processing), promo broadcast (promo id 5), admin message, 2FA code `135792` all delivered
  to the phone (`bits.bytes.loko@gmail.com`, user id 7); emulator delivery unreliable → phone is
  the test device. Unread badge persistence verified after force-quit+relaunch.

## Website Parity Gaps (2026-09-06 audit — verified against web repo `f5e2a53`)

- [ ] **Admin-managed promo surface on Home — mostly DONE (2026-09-08)** — web manages promos with
  `placement` enum (`sidebar`, `banner`, `inline`, `popup`, `seasonal`); public API exists
  (`GET /api/v1/promotions`, `GET /promotions/{id}`, `POST /promotions/{id}/view`,
  `POST /promotions/{id}/click`). **Done:** auto popup (cycles all active promos per launch, view/
  click tracking) + the "Seasonal & Promotional" section renders the Promotions API
  (`PromoFlashCard`, "View Promo"). **Still open:** web-style full info-modal parity for card taps
  and the homepage admin-promo banner treatment.
- [ ] **Homepage product dedupe across carousels** — web dedupes featured/seasonal/new/flash across homepage blocks (`5868f4c`). App `CatalogContext.derive()` buckets the same array without cross-block dedupe — a product can appear in multiple carousels.
- [ ] **Promo card Reserve → info modal parity** — web "Reserve" opens a full info modal (`3e9e3cf`, all viewers). App promo cards are read-only product cards. Blocked on promo banner item above.
- [x] **Vendor subscription visibility — AUDITED:** web `ApiVendorController::show` exposes `package` (e.g. `starter`) in the vendor payload; app `VendorActionsScreen`/`VendorProfileScreen` do NOT surface package/billing status. No app change needed unless we want to show plan badge.
- [x] **Email-OTP 2FA impact — AUDITED:** web enforces 2FA for privileged roles (`91774af`); app `ApiAuthController.login()` is customer-role-only (403 others) → no impact on app logins. No change needed unless app later supports vendor/admin login.

## JEMINA Credits — remaining

- [x] In-app credit purchase flow (`POST /api/v1/payments/initiate` with `metadata.type=credit_purchase`) — `BuyCreditsScreen`
- [x] Credit transaction history screen in app (`GET /api/v1/credits/history`) — `CreditHistoryScreen`
- [x] Survey-credit rewards endpoint confirmed — `GET/POST /api/v1/surveys*` (see **Surveys & Vendor Journey** for reward copy caveat)

## Release / PlayStore

- [x] **Fill app version in `android/app/build.gradle`** — **versionCode 3 / versionName 1.1.1**
  (bumped 2026-09-08 eve; previous 2 / 1.1.0). `app.json` still lacks an `icon` entry (icon asset
  remains pending).
- [x] **Configure release keystore + signing** — `android/app/jemina-keystore.properties` + `jemina-release.keystore` exist; `build.gradle` release signingConfig wired (falls back to debug keystore if props missing)
- [x] `./gradlew bundleRelease` — AAB pending; `assembleRelease` APK built + smoke-tested on both devices (1.1.1)
- [ ] Privacy Policy URL (store requires it — auth collects email/name)
- [ ] App screenshots (portrait, 5–8) + feature graphic
- [ ] Content rating questionnaire (IARC)
- [ ] Data safety form (email, purchase history, etc.)
- [ ] Play Console listing (description, category Shopping, contact)
- [ ] Internal testing → closed testing → production rollout

## Housekeeping

- [x] `tsc --noEmit`, `eslint`, `jest` green
- [x] **Uniform styles roll-out (2026-09-07)** — added shared `src/components/EmptyState.tsx` + `SurfaceCard.tsx`; refactored 12 screens (Orders, OrderTracking, Messages, Wishlist, CreditHistory, MyReviews, BuyCredits, CollectionProducts, AddressBook, PaymentMethods, HelpCenter, EditProfile) off duplicated inline empty/error/signed-out blocks (−725 net lines). Sections + cards verified uniform (`headlineMd` titles, `SurfaceCard` recipe). `tsc`, `eslint` green.
- [x] Release APK built + installed on phone `0794415254003308` + emulator `emulator-5554`
  (2026-09-08 eve, **1.1.1 / versionCode 3**; `assembleRelease` successful, installed + launched
  on both devices)
- [x] **Commit app working tree (2026-09-08)** — committed + pushed to `main` as `3df19c1`
  (52 files; everything since `2032ccf` incl. CartScreen redesign, EmptyState/SurfaceCard refactor,
  push layer, checkout + promo work). Site repo must NOT be committed.
- [x] Verify checkout/payment/popup/build with `tsc --noEmit` + `eslint` green (0 errors)
- [ ] Verify full checkout/order/cart loop with real payment against live API on device
  (emulator + phone) — gateway UX can't be fully exercised until VPS gateway keys are set
- [x] **Update `docs/DESIGN.md` endpoint map (2026-09-08)** — orders/credits/payments/vendors/
  search/promotions/surveys/help/messages/chat/payment-methods