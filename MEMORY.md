# m_jemina — Project Memory

Ongoing session log. Read this first; it is the authoritative record of what was done,
what the live server looks like, and the current state.

## Objective

Wire the app to the live Jemi-na Sanctum API (`https://jemi-na.com/api/v1`) with graceful
demo fallback, then complete the full app → PlayStore roadmap so the app is "fully
functional like the website" (login → cart → checkout/orders → JEMINA credits).
**Current focus:** Home/browse UI polish (2026-09-02: search bar top, trust badges below Featured
Stores, "Home & Living" category, dense search results — done + verified on-device), then marketplace
cart/checkout overhaul (vendor grouping, delivery fees, coupons), profile settings, and PlayStore release.

## Live test accounts

- `mjemina.test.20260802140339@example.com` / `TestPassw0rd!42` — user id 9, the main throwaway.
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
  without it every Sanctum-protected route 401s.
- Login requires `device_name` (`m_jemina_app`).
- Register returns `name: null` (server reads `first_name`, writes `name`) — real server bug;
  app falls back to "JEMINA Customer".
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
3. `app/Http/Controllers/Api/ApiAuthController.php` — register now awards the signup bonus
   (`config('credit.signup_bonus')`, default 1,000,000) via `UserCredit::getOrCreateForUser`.
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

Prior session: `ApiCartController` (GET/POST/PUT/DELETE /cart + clear) + routes deployed;
`.htaccess` Authorization fix; product status-filter/flat-discount/image fixes.

## App state

- **Login fix (3 root causes, verified):** `request()` now sends `Content-Type: application/json`;
  AuthContext fallback only triggers on network errors; LoginScreen password has
  `autoCapitalize="none" autoCorrect={false}`. Verified on emulator — profile shows
  `bits.bytes.loko@gmail.com` / id 3 / CUSTOMER / JEMINA Credits UGX 2,094,516.
- `src/data/api.ts` — `request<T>()` helper + auth, cart, orders, payments (incl. `apiGetPaymentStatus`),
  credits, wishlist, reviews, search, vendor, **address** (`apiGetAddresses`/`apiSaveAddress`/
  `apiUpdateAddress`/`apiDeleteAddress`/`apiSetDefaultAddress`), **voucher**
  (`apiValidateVoucher`/`apiApplyVoucher`). `ApiProduct`/`ApiVendor` types include
  `delivery_fee`. Order creation accepts `voucher_id`, `voucher_code`, `discount_amount`.
- `src/state/AuthContext.tsx` — live-first (`authMode: 'live'`) with demo fallback; google/logout.
- `src/components/ProductCard.tsx` — `Product` interface includes `deliveryFee`.
- `src/state/CartContext.tsx` — token-aware server sync (`cartSource: 'server'|'local'`);
  **groups items by vendor** via `groupByVendor()`, exposes `vendorGroups: VendorGroup[]`,
  `totalDeliveryFees`. Delivery fee per vendor = sum of product delivery fees (min 10k UGX).
- `src/screens/CartScreen.tsx` — **vendor-grouped layout** with "Fulfilled by {vendor}" headers,
  delivery fee per vendor, subtotal + total delivery fees in summary.
- `src/screens/CheckoutScreen.tsx` — **vendor-grouped order summary**, delivery fees per vendor,
  **coupon/promo code input** with live validation via `apiApplyVoucher`, discount applied to
  total, **auto-fills default address** from server on mount, compact UI (smaller fonts/cards),
  platform fee 1500, voucher fields sent with order creation.
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
  JEMINA credits balance, menu items (Orders/Wishlist/Reviews/Settings).
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
  "Account"/"Product detail" were Home scrolled to footer/Featured banner. `NavigationContext` has
  no persistence (starts `{tab:'Home',route:'Home'}`).
- Build ~1m9s; APK at `D:\mApps\m_jemina\app-release.apk`; installed on phone `0794415254003308`
  + emulator `emulator-5554`.

## Repo checks

`npx tsc --noEmit`, `npx eslint src App.tsx` — both green. `npx jest` not run this session.

## Next

**Completed (this session):** Login fix, Featured Stores from live vendors, vendor-grouped cart with
delivery fees, checkout overhaul (vendor grouping + delivery fees + coupon redemption + compact UI),
server-side Address/Voucher APIs, Profile default address card, APK rebuilt + installed on 2 devices.
**UI polish (2026-09-02):** Home restructure (search bar top, trust badges below Featured Stores,
Home & Living category), SearchResultsScreen dense thumbnail list, build + on-device verify.

**Remaining / next when user returns:**
- PlayStore release config (keystore, versionCode, AAB, listing, privacy policy).
- Gateway keys on VPS for live payment processing.
- Optional: address/payment method editors in Profile (currently read-only for address).
- Optional: vendor-specific delivery fee config per vendor (currently product-level delivery_fee).
