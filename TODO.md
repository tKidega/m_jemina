# m_jemina — Roadmap to PlayStore

Goal: ship the app as "fully functional like the website" and publish to the Play Store.
Epic (core loop): **sign in → browse → cart → checkout → pay → track orders**, with **JEMINA credits**
earned at surveys and spendable at checkout.

**Status (2026-09-06):** Core shopping loop fully wired to live Sanctum API (`https://jemi-na.com/api/v1`).
Clean tree @ `f304f90`, remote `origin/main`. APK rebuilt; surveys + vendor journey wired. Server
drops are handled gracefully (gateways return "not configured"; surveys submit returns
`credit_awarded: 0`). Next up: PlayStore release config, then website parity gaps below.

Legend: `[x]` done · `[ ]` pending.

---

## Core Epic — Shopping Loop

- [x] Live auth (register/login/logout via Sanctum) with demo fallback — `AuthContext`
- [x] Server-synced cart — `CartContext` (`cartSource: 'server'`)
- [x] Checkout screen — shipping form + payment method + `POST /api/v1/orders` — `CheckoutScreen`
- [x] Orders list + order detail — `GET /api/v1/orders`, `GET /api/v1/orders/{id}` — `OrdersScreen`
- [x] Server-side `ApiOrderController` fixed to real schema (was writing `shipping_amount`/`tax_amount`/`unit_price` → SQL 500)
- [x] JEMINA credits balance + history API (`GET /api/v1/credits/balance`, `GET /api/v1/credits/history`) — `ApiCreditController`
- [ ] ~~Signup bonus~~ — **Server removed signup credit award** (`fb22f1c`); current `ApiAuthController.register()` returns no bonus. App no longer shows or relies on a registration bonus.
- [x] Credit payment in order store (`payment_method: 'credit'` → deducts balance, marks order `processing`/`paid`)
- [x] App shows credits balance in Profile and at Checkout; credit payment option
- [x] Checkout/payment gateway handoff UX (MTN / Stripe / Flutterwave / Bitcoin via `POST /api/v1/payments/initiate`) — `PaymentScreen` initiates + polls status; checkout routes non-credit payments to it
- [x] Wishlist + reviews wiring from Profile (`profile/wishlist`, `profile/reviews`) — `WishlistScreen`, `MyReviewsScreen`, auth-gated
- [x] Add-to-wishlist heart + review form on product detail (`apiAddToWishlist`, `apiRemoveFromWishlist`, `apiAddReview`, wishlist preload)
- [ ] Verify gateway UX against live API (gateways not configured on VPS .env yet → initiate returns gateway-availability error gracefully)

## Surveys & Vendor Journey

- [x] Surveys API wired — `GET /api/v1/surveys`, `GET /surveys/{id}`, `POST /surveys/{id}/submit` — `SurveysScreen`
- [x] Vendor actions / journey gating — user survey must complete before vendor survey; vendor registration flow — `VendorActionsScreen`
- [x] Profile menu entry "Surveys" → `SurveysScreen` (wired in navigation)
- [ ] ⚠ Survey reward copy needs alignment: server `POST /surveys/{id}/submit` hardcodes `credit_awarded: 0` (rewards disabled in `fb22f1c`); app SurveysScreen still shows "Reward: {formatUGX}" and "You earned X in credit" toast. Fix copy to reflect no-award state, or confirm intent to re-enable rewards server-side.

## Company / Legal pages

- [x] Sidebar drawer (from the JEMINA header menu icon) grouping Shop / Account / Company / Legal links
- [x] About Us screen (`AboutScreen`) — mission/vision, core values, why-us, story, contact
- [x] Services screen (`ServicesScreen`) — capabilities, solutions, impact stats, features, how-it-works
- [x] Terms of Service + Privacy Policy screens (`TermsOfServiceScreen`, `PrivacyPolicyScreen`)
- [x] Contact Us screen (`ContactScreen`) — contact info, business hours, mailto message form

## Home / Browse polish

- [x] Home hero carousel (5 slides) + Smart Picks carousel + section carousels
- [x] Product-carousel dots removed on Home; hero dots visibility + image fit fixed
- [x] Deep-link product search (`GET /api/v1/products/search`) — `SearchResultsScreen`, Marketplace search bar
- [x] Vendor storefront from vendor tap (`VendorProfileScreen` loads live data via `GET /api/v1/vendors/{id}`; Marketplace/ProductDetails wire vendor nav)
- [x] **Home restructure (2026-09-02)**: search bar pinned to top of Home (above hero); trust badges moved below Featured Stores + redesigned as flat cards with icon chips; hero = manual swipe (no dots/autoplay); category carousel no-autoplay; all product carousels `loop` + `autoPlay` + `autoPlayInterval={10000}`
- [x] **Browse Collections reworked with custom icons (2026-09-02)**: "Home & Living" added (icon `'home'`), "Auto & Machinery" removed
- [x] **SearchResultsScreen rewritten to dense single-column thumbnail list (2026-09-02)**: 64x64 thumb, 2-line title, price + strikethrough compare, rating + star, 36px circular add button, "N results found" header, empty-state "No results found"
- [x] B2B product inquiry flow — `ProductInquiryScreen`, inquiry-only cards in Marketplace/VendorProfile, gated INQUIRE on ProductDetails (`14daddf`)

## Website Parity Gaps (2026-09-06 — derived from website changes)

These items close gaps between the app and the current live website (VPS `f5e2a53`).

- [ ] **Admin-managed seasonal promo banner on Home** — website now manages promos with `placement` enum (`seasonal`, `popular`, `new_arrivals`, etc.) via `PromotionController`; the public API exists (`GET /api/v1/promotions`, `GET /promotions/{id}`, `POST /promotions/{id}/view`, `POST /promotions/{id}/click`) but the app does not consume it. App "Seasonal & Promotional" section currently derives from product `seasonal`/`holiday_special` flags. Consider switching Home to pull from the Promotions API (matching the admin-managed model) and adding promo slide layout + tap-through.
- [ ] **Homepage product dedupe across carousels** — website deduplicates featured/seasonal/new/flash products across homepage blocks (`5868f4c`). App `CatalogContext` splits the same catalog into `flashSale`/`featured`/`topRated`/`seasonal` buckets without cross-block dedupe; a product can appear in multiple carousels.
- [ ] **Promo card Reserve → info modal parity** — website promo card "Reserve" opens a full info modal (large image, headline, badge, full description, vendor link). App promo cards are currently read-only product cards.
- [ ] **Vendor subscription visibility** — web `VendorController` + `vendor/subscribe` route handles 90-day Starter plans (`2699b14`). Check whether the API (`ApiVendorController`) exposes subscription status; if so, surface on VendorActions/VendorProfile.
- [ ] **Audit email-OTP 2FA impact** — web enforces email-OTP 2FA for privileged roles (`super`/`admin`/`accounts`/`finance`/`vendor`/`blogger`) via `91774af`. App `ApiAuthController.login()` is customer-role-only (returns 403 for other roles), so no impact on current app logins. If the app ever supports vendor/admin login, the OTP challenge must be handled.

## JEMINA Credits — remaining

- [x] In-app credit purchase flow (`POST /api/v1/payments/initiate` with `metadata.type=credit_purchase`) — `BuyCreditsScreen`
- [x] Credit transaction history screen in app (`GET /api/v1/credits/history`) — `CreditHistoryScreen`
- [x] Survey-credit rewards endpoint confirmed — `GET/POST /api/v1/surveys*` (see **Surveys & Vendor Journey** above for screens + reward copy caveat)

## Release / PlayStore

- [ ] Fill Android app icon/name/version in `app.json` + `android/app/build.gradle` (versionCode/versionName)
- [ ] Configure release keystore + signing (`android/app/build.gradle`, gradle.properties)
- [ ] `npx react-native bundle` release build; `./gradlew bundleRelease` → AAB
- [ ] Privacy Policy URL (store requires it — auth collects email/name)
- [ ] App screenshots (portrait, 5–8) + feature graphic
- [ ] Content rating questionnaire (IARC)
- [ ] Data safety form (email, purchase history, etc.)
- [ ] Play Console listing (description, category Shopping, contact)
- [ ] Internal testing → closed testing → production rollout

## Housekeeping

- [x] `tsc --noEmit`, `eslint`, `jest` green
- [x] Release APK rebuilt + installed on phone `0794415254003308` + emulator `emulator-5554` (2026-09-02) — `app-release.apk` at `D:\mApps\m_jemina\app-release.apk`; Home layout + search flow verified on-device via uiautomator dumps
- [ ] Verify checkout/order/cart flows against live API on device (emulator) after release config
- [ ] Update `docs/DESIGN.md` endpoint map with orders/credits/payments + vendors/search + promotions/surveys
