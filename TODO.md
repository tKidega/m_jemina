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

## Session (2026-09-17) — UI overhaul + reviews + orders fixes

- [x] Home Promotions: banner uniform side insets (not edge-to-edge); flash cards same width as banner, one per view with snap paging; placement filter trims whitespace
- [x] `SectionHeader`: action link moved inside the row — title left, link right, vertically centered (was dropping below the description)
- [x] Contact Us / Wishlist / Account Settings profile tab (Personal/Address/About) / ProductDetails / VendorProfile restyled to Home–B2B patterns (smaller headers, tighter padding); Wishlist discounted-price bug fixed (rendered original price twice)
- [x] Newsletter subscribe persists per account (`@jemina/newsletter/v1:<userId>`) — survives logout; shared by Profile + vendor screens; white CTA
- [x] VendorProfile: real banner/logo from API with fallbacks (logo in DB is SVG → RN fallback; banner 404s until DB paths fixed — see below); dead Visit Store button removed; stats/services from live datapoints (fake 247/4.8/98 dropped); Featured / All Products / Shop Reviews tabs
- [x] Vendor reviews end-to-end: new API `GET/POST /api/v1/vendors/{id}/reviews` (approved-only list; submit held `pending` until vendor approves, one-per-user, 409 duplicate); review list + form in vendor Reviews tab; already-reviewed alert; product Reviews tab also alerts on duplicate + success notice
- [x] Orders: status badges single-line auto-width; invoice uses fetched detail (was empty) + SKU row; invoice title reduced to `labelSm`; order-list images fall back to placeholder on error
- [x] Server: vendor agreement section 20 contacts corrected; homepage promo banner = images only (no links/clicks), committed + pushed (`77269da`, `a3b8b7d`); "Join our community" promo approved → both banners live in carousel
- [x] Order items API: `sku` added + primary product image via `url` accessor (was broken `asset('storage/' + image_path)`); note `storage/app/public` is empty with no symlink — product webp files live under `public/frontend/img/products/`
- [x] Release APK + AAB rebuilt + installed (emulator; phone disconnected at end of session)
- [ ] UNCOMMITTED on VPS: `ApiOrderController.php` (sku + product_image fix), `ApiVendorController.php` + `routes/api.php` (vendor review endpoints) — commit/push when confirmed
- [ ] Vendor logo is SVG in DB — phones can't render SVG; needs PNG/JPG re-upload via website
- [ ] Confirm order images + invoice items live on device once installed

### Surveys & Feedback — input types + progress save/resume + Stitch redesign (2026-09-17, later)

**Root issue:** the survey form only rendered `radio`/`checkbox`, but the website's surveys also use
`select` (dropdown), `text` (single-line), and `textarea` (multi-line) — questions that required
selection or typing had NO input in the app. Confirmed against the live VPS `survey_questions` table:
- User survey (id 1): 4 optional `textarea` (Q8 "What feature would you like to see added?", Q10, Q18, Q20).
- Vendor survey (id 2): `select` Q22 revenue / Q25 years / Q28 returns / Q29 payout (all required),
  `text` Q23 "What primary category of products do you sell?" (required), `textarea` Q30 "Describe your
  brand values in a few words." (required).

- [x] `SurveysScreen.tsx` now renders `select` (radio-style options + "Select an option" hint),
  `text` (TextInput), and `textarea` (multiline TextInput), matching the web form
  (`survey_card.blade.php`). Submit payload already sends `question_id`/`answer` — works unchanged.
- [x] **Question flow is now index-driven** (`activeIdx` per survey, lifted to the parent): "Save & Next"
  actually advances, required-answered enforced, optional shows Skip/"Save & Continue"; the previous
  "first unanswered question" model is gone (it unmounted text inputs after the first keystroke).
- [x] **Progress save + resume:** drafts persisted per account in AsyncStorage
  `@jemina/surveys/drafts/v1:<userId>` = `{ [surveyId]: { answers, activeIdx } }` (debounced 300ms,
  hydrated on screen mount, cleared on submit/logout-switch). Collapsed card shows
  "In Progress · X/N answered" + "% bar" + "Continue Survey (N Qs)" instead of always "Not Started";
  expanding resumes at the last active question. **Verified on emulator:** answered 3/10, force-stop +
  relaunch → vendor card showed "In Progress · 3/10 answered" + "Continue Survey (10 Qs)", reopened at
  Q4 of 10.
- [x] **Stitch design applied** (screen `48414eec4468416bb00a1c7059f54894`, project
  `15521520191945729458`): header title "Surveys & Feedback"; hero "Northern Uganda Trader Rewards"
  (+ verified chip, Gulu/Lira/Kitgum copy); section groups "Community & Platform UX" (user) and
  "B2B Supplier Compliance" (vendor); card meta "{N} Questions · ~{m} mins"; vendor card reward chip is
  now always "Verified Vendor Badge + Tier 2 Escrow Limit"; progress labels "% completed · X/N answered";
  CTA buttons carry arrow/chevron icons; updated security-card copy.
- [x] `tsc --noEmit` + `eslint` green (1 exhaustive-deps fix); release APK rebuilt + installed on
  emulator `emulator-5554` + phone `0794415254003308`; all verified via uiautomator dumps.
- [ ] User survey shows "Completed" for `bits.bytes.loko@gmail.com` (user 7) — can't expand to see the
  new textarea inputs there; vendor survey flow fully verified instead. Use a fresh account to exercise
  the user survey's textareas.

### Saved Wishlist & Coupons (2026-09-17, Stitch `53c769ddde0d40b7aa515f9658c31af7`) — DONE

- [x] `WishlistScreen.tsx` rewritten to the Stitch **Wishlist & Coupons** design; screen + Profile menu
  renamed to **"Saved Wishlist & Coupons"**. Stats cards, escrow trust strip, Available Promo Coupons
  (GULU-AGRI-50K / FREESHIP-NORTH cards, Copy & Apply → clipboard), Enter Code modal (live
  `apiValidateVoucher`), How-to-Redeem accordion, Wholesale & Agri Wishlist (sort cycling + filter chips),
  Stitch product cards (discount pill, delete, save row, stock/out-of-stock, Details / Move to Cart /
  Notify Stock), freight strip, sticky "Move All to Cart" bottom bar (adds all in-stock → Cart tab).
- [x] Applied coupons persist `@jemina/coupons/applied/v1`; Checkout prefills the voucher input from it.
- [x] New dep `@react-native-clipboard/clipboard` (native, autolinked) + 8 new icons.
- [x] `tsc`/`eslint` green; APK rebuilt + installed both devices; verified on emulator.
- [ ] Real "my vouchers" list API (`GET /api/v1/vouchers/mine`) — coupon cards still use design-driven
  sample codes; web shows customer vouchers in `customer_vouchers.blade.php`.

### Fixes (2026-09-17, same session) — cart image, Account width, survey title/reward

- [x] **Cart product images (server):** `ApiCartController::productImages` used `image_url` filtered to
  absolute-only → empty `images` on `/cart`; rewrote to `$image->url` accessor + photo `asset()` fallback.
  Deployed to VPS via scp (backup `/tmp/ApiCartController.php.bak-cart`), `php -l` clean, caches cleared.
  Verified live: /cart returns `images` for product 1; cart row renders an `ImageView` on emulator.
- [x] **Account & Security / Security & 2FA width:** `SecurityTab` double-applied `scrollContent` padding
  (own wrapper + ScrollView contentContainer) → card inset 84px/side; added `styles.tabContent`
  (gap-only) for the tab wrapper → card now 996px, matching profile card. Verified via dump.
- [x] **Surveys & Feedback:** hero → "Jemina Survey Rewards"; removed `Reward: UGX 500,000` chip
  (no credit is actually awarded — `credit_awarded: 0`); Rewards badge/stat pinned to 0; stats-row
  values `headlineSm` → `labelLg`. Release APK rebuilt + installed both devices; verified.
- [ ] `bits.bytes.loko@gmail.com` live password is no longer `timBOi@admin420` ("Invalid credentials") —
  re-confirm credentials for future live tests (fresh register verified working).

### Product Details redesign (2026-09-17, later session) — DONE + verified on emulator

- [x] `ProductDetailsScreen.tsx` rewritten to the Stitch design (`d6e01214f3f741dc9c923c05d0d27c35`): header = favorite toggle (moved to header, no heart in title row) + `HeaderNotificationButton` + `HeaderCartButton`; breadcrumb `Home / {category}`; hero 1:1 with "VERIFIED WHOLESALE & RETAIL" pill (gated `isWholesale || bulkOrder || corporateReady || minOrder`) + always "ESCROW PROTECTED" + discount pill when `resolved.discount`; 56×56 thumbnails, active border primary; dots `min(gallery.length, 4)`
- [x] Price card: RETAIL PRICE + strikethrough + `Badge` off, BULK MOQ / WHOLESALE RATE block (`secondaryFixed` wholesale pill when `isWholesale`), savings row when `originalPriceValue > priceValue`, corporate row; vendor card (initials avatar, location, "Visit Store" → VendorProfile) + dispatch box (24h, `Hub \u2192 Customer: UGX {shipping|delivery}`, free pickup); share button removed
- [x] "Agronomic Specifications" 2-col bento from `toSpecEntries(specs).slice(0,4)` (cell icons/`SPEC_ICONS` removed); tabs renamed `['Specs & Agronomy','Bulk & Wholesale','Reviews','Escrow & Returns']` — description+moved-to-top, `MIN_ORDER` card + `WHOLESALE_BENEFITS` + "Download Pricing Sheet" (placeholder no-op, preserves existing feature), escrow box; Reviews unchanged
- [x] Qty selector: `LOT_PILLS` 1/10/50 + stepper (`MAX_QTY` 99), `addItem(product, qty)` (confirmed `CartContext` increments existing line qty); bottom bar Bulk Inquiry (disabled unless `corporateReady`) + `Add to Cart · {formatUGX(priceValue*qty)}` → "ADDED!" (1.5s) + escrow microcopy; `useSafeAreaInsets` padding
- [x] `Icon.tsx` — added `savings` to `IconName`; all color tokens verified in `theme/colors.ts`; `tsc --noEmit` + targeted `eslint` green
- [x] Release APK rebuilt + on-emulator VERIFIED via uiautomator dumps (final build, original promo behavior): breadcrumb, pills, price/MOQ card, vendor+dispatch cards, spec bento, all 4 tabs (Bulk card+benefits+Download Pricing Sheet; Reviews form; Escrow+Returns), qty pill 10 → stepper 10 → `Total: UGX 450,000` → Add to Cart → header `Cart, 1 items`
- [ ] Phone install of the Product Details build still pending — `adb connect 192.168.15.34:5555` refused (10061); reconnect WiFi debugging and `adb install -r android\app\build\outputs\apk\release\app-release.apk`

### Account & Security + Payments + Address redesign (2026-09-17, later session) — DONE (tsc+eslint green)

- [x] `AccountSettingsScreen.tsx` rewritten to Stitch design (`f080120b22324d5f93b5544c8ceddb91`): header `AppHeader title="Account & Security"` + `right` (help-outline + notifications w/ dot); profile summary card (avatar initials + green verified check, name, role badge, email/phone, edit button); 4 segmented chips (`Security & 2FA` active orange / `Payment Rails` / `Logistics & Hub` / `Preferences`); tabs now `security | payments | logistics | preferences` (replaces old `profile | payments | address`)
- [x] Security & 2FA tab: `STRICT` badge, 2FA toggle (green ON) + active device sessions (current TECNO Camon 20 + Chrome Windows 11), password card (last changed 45 days ago + Update button), biometric toggle
- [x] Payments tab: `PaymentMethodsScreen embedded` (redesigned separately)
- [x] Logistics tab: `AddressBookScreen embedded` (redesigned separately)
- [x] Preferences tab: Trade Alerts toggles (SMS/WhatsApp + Price Drops), Tax Records & Data (URA EFRIS invoices + Export Activity Log + Deactivate Account)
- [x] `PaymentMethodsScreen.tsx` redesigned: JEMINA Credits Box (UGX 145,000, Top Up, Credit History, Escrow Clearance) + styled payment method cards (colored provider logos: MTN=#ffcc00, Airtel=#ff0000, Visa=#1a1f71, etc.) + dashed "Add Mobile Money / Card" button; all CRUD + modal preserved
- [x] `AddressBookScreen.tsx` redesigned: Delivery & Logistics Hub section (default address card with pin-drop + Default badge + hub card with warehouse icon) + "Saved Addresses" for non-default + dashed "Add Delivery Address" button; all CRUD + modal preserved
- [x] `Icon.tsx` — added 6 icons: `fingerprint`, `laptop-windows`, `pin-drop`, `campaign`, `cloud-download`, `no-accounts`
- [x] `App.tsx` routes updated: `EditProfile/AccountSettings → security`, `AddressBook → logistics`, `PaymentMethods → payments`
- [x] `tsc --noEmit` + `eslint` green on all 4 files

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
- [x] **Order Tracking screen Stitch redesign (2026-09-17)** — rewritten to match Stitch design
  (`b72d405b2c274b2d9c2f2fc932040981`): delivery ETA banner ("ON SCHEDULE" / "DONE" badge), carrier
  row with avatar + call button, transit corridor with progress bar + checkpoint pill, delivery
  timeline with ring-effect active step, delivery verification OTP card, category badges on items
  (ENERGY/IRRIGATION/AGRO derived from SKU/product name), bottom bar "Call Courier" + "Report Issue".
  `tsc --noEmit` + `eslint` green.

### Surveys Redesign + 2FA/Sessions Backend (2026-09-17, latest)

- [x] SurveysScreen redesigned to Stitch design (`48414eec4468416bb00a1c7059f54894`): hero card with "JEMINA Survey" title, credits badge, stats row (Available/Completed/Rewards Claimed), survey cards with icons + reward chips + tags, question preview with progress bar, security notice card
- [x] Backend 2FA + Session API: `GET /security/2fa/status`, `POST /security/2fa/enable`, `POST /security/2fa/confirm`, `POST /security/2fa/disable`, `GET /security/sessions`, `DELETE /security/sessions/{id}`, `POST /security/sessions/revoke-others`
- [x] Frontend API functions: `apiGetTwoFactorStatus`, `apiEnableTwoFactor`, `apiConfirmTwoFactor`, `apiDisableTwoFactor`, `apiGetSessions`, `apiRevokeSession`, `apiRevokeOtherSessions`
- [x] AccountSettingsScreen wired to real APIs: 2FA toggle with QR + password flow, biometric toggle, device sessions from API with revoke
- [x] Device name in login calls updated from hardcoded `'m_jemina_app'` to real device model via `getDeviceModel()`
- [x] New icons added: `quiz`, `assignment`, `payments`, `verified-user`, `monetization-on`, `lock`, `account-balance-wallet`, `insights`, `security`
- [x] Release APK built + installed on both devices

### Session (2026-09-18) — Stitch UI redesigns + VPS fixes + global font reduction

- [x] VPS 500 error diagnosis & fix: `storage/framework/views/` owned by `root:root` — ran `chown -R www-data:www-data` + `view:clear`; confirmed no hack (SSH logs clean, no suspicious code, git status clean)
- [x] Wholesale Inquiries & RFQs screen (`MyInquiriesScreen.tsx`) — full Stitch redesign (`7bf3be2e8d234a65a3fea95021a25e05`): hero status strip, 3-metric cards, new inquiry CTA, filter chips (All/Replies/Awaiting/Negotiation/Drafts), inquiry cards with status badges, supplier reply highlights, action buttons, negotiation ribbon cards, draft cards, escrow assurance banner. Extended `ApiInquiryResult` with `replies_count`, `latest_reply`, `budget_target`, `destination`, `is_draft`, `expires_at`
- [x] Surveys & Feedback screen — reduced hero + survey card title fonts (`headlineMd` → `headlineSm`); renamed "Escrow & Northern Trade Guarantee" → "Jemina Feedback Guarantee"; updated copy to say credits go to JEMINA Credit balance, not MTN/Airtel
- [x] Saved Wishlist & Coupons — replaced fake coupons (`GULU-AGRI-50K`, `FREESHIP-NORTH`) with real system coupon `JEMINA5`; fixed product images (API returned `/public/storage` — added `resolveWishlistImage()` fallback); renamed "Wholesale & Agri Wishlist" → "My Jemina Wishlist"
- [x] Help & Support screen — full Stitch redesign (`24e4532bdc294c65a852fad31d450b49`): entire screen scrollable (hero + tabs + content in single ScrollView), hero AI card with "Jemina Virtual Assistant", 3 segmented tabs (Support Tickets/AI Chatbot/FAQ & Knowledge), ticket cards with filter chips, chat container fixed height, 10 FAQ items matching website, emergency helpline banner, trust footer. Added icons: `smart_toy`, `crisis-alert`, `chat_apps_script`, `reply`
- [x] Product Inquiry screen — when no product passed, shows scrollable product picker list from API; user selects a product then sees inquiry form
- [x] My Inquiries — back button now calls `switchTab('Profile')` instead of `goBack`
- [x] Typography reduced globally — `displayLg/headlineLg` 28→24, `headlineMd` 22→18, `headlineSm` 18→15, `bodyLg` 16→14, `bodyMd` 14→13, `bodySm` 12→11, `labelLg` 14→13, `labelMd` 12→11
- [x] Credits & Wallet screen — full Stitch redesign (`61c09abed5964cf5a9a85cf6d0258acb`): hero balance card with BOU Escrow Protected badge, balance + J-Credits badge, sub-ledger (purchased/spent), quick actions (Top Up/Auto-On/Pay Depot), Buy Trade Credits section with 3 tiered cards (Starter/Merchant/Wholesale), Wallet Privileges 3-column perks, Trade Credit Ledger with filter chips and transaction items, trust footer. Added icons: `add_card`, `qr_code_scanner`, `percent`
- [x] Release APK built + installed on both devices (phone `0794415254003308` + emulator `emulator-5554`)
- [ ] Vendor logo SVG in DB — phones can't render SVG; needs PNG/JPG re-upload
- [ ] VPS gateway keys not configured (MTN/Flutterwave disabled)
- [ ] PlayStore listing/config still pending
- [ ] Uncommitted on VPS: `ApiOrderController.php`, `ApiVendorController.php` + `routes/api.php`