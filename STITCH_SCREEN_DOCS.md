# JEMINA APK — Screen & UI Documentation for Stitch

> Purpose: describe the JEMINA app (APK), its existing screens, and the current
> design language so the UI can be redesigned/refreshed with Stitch.

---

## 1. What JEMINA Is

**JEMINA** (`jemi-na.com`) is a multi-vendor e‑commerce marketplace based in
**Gulu, Uganda**. It bridges everyday retail and corporate/B2B wholesale:

- **Customers (retail + B2B):** browse products, request **inquiry‑only** quotes for
  wholesale/corporate deals, add to cart, checkout, and pay via **Cash on Delivery,
  MTN Mobile Money, Flutterwave (cards/etc.), Stripe, Bitcoin, or JEMINA Credits**.
- **Vendors:** run stores, set per‑product `delivery_fee` (vendor→customer) and
  `shipping_fee` (supplier→vendor), fulfil orders, arrange delivery, and can publish
  announcements/surveys (n8n‑automated).
- **Charges**: delivery + shipping per product; platform fee (1,500 UGX); coupon codes;
  JEMINA Credits top‑up.

### The app (this APK)
- **Package:** `com.m_jemina` (release build).
- **Framework:** React Native **0.85.2**, **TypeScript**, custom context-based
  router (no react-navigation): `src/navigation/NavigationContext.tsx`.
- **API base URL:** `https://jemi-na.com/api/v1` (Bearer-token auth).
- **State:** context providers — `Auth`, `Cart`, `Wishlist`, `Catalog`,
  `Notification`. Screens: `src/screens/*.tsx`.
- **Theme:** Material-3-inspired token system in `src/theme/` — `colors.ts`,
  `typography.ts`, `spacing.ts`. All text uses **Hanken Grotesk**.
- **Notification:** Firebase push; deep-links to Orders / Messages.
- **Repo:** `github.com/tKidega/m_jemina`.

---

## 2. Design Language (current / as-built)

| Token | Value | Usage |
|---|---|---|
| `primary` | `#1d2832` dark slate | AppHeader bg, primary buttons, key headings |
| `onPrimary` | `#ffffff` | Text on primary |
| `primaryContainer` | `#333e48` | Dark panels, wholesale badge |
| `secondary` | `#8c5000` dark amber | Prices, active tab, links |
| `secondaryContainer` | `#ff9817` orange | CTAs (`secondaryContainer`), active chip, discount accents |
| `background`/`surface` | `#f6faff` | Screen canvas |
| `surfaceContainerLowest` | `#ffffff` | Cards |
| `surfaceContainerLow` | `#ecf5fe` | Subtle panels |
| `borderLight` | `#E9ECEF` | Card borders |
| `statusFeatured` | `#007BFF` blue | Featured vendor/badges |
| `statusFlash` | `#DC3545` red | Discounts, errors, sell-out |
| `statusSuccess` / `statusPaid` | `#28A745` green | Instock / paid / delivered |
| `outline` / `outlineVariant` | `#74777c` / `#c4c7cb` | Secondary text, dividers |

**Typography scale** (`typography.ts`, family `Hanken Grotesk`):
`displayLg` 32/40 w700 · `displayLgMobile` 28/36 w700 · `headlineLg` 24/32 w600 ·
`headlineMd` 20/28 w600 · `bodyLg` 16/24 w400 · `bodyMd` 14/20 w400 ·
`labelMd` 12/16 w600 (uppercase tracking) · `labelSm` 10/14 w500.

**Spacing / radius** (`spacing.ts`): `xs4 sm8 md12 lg16 xl24 xxl32`; radius
`sm2 md4 lg8 xl12 full999`.

**Signature patterns** (consistent across every screen):
- Dark-slate `AppHeader` (`colors.primary`) with back/sidebar button, title, and
  notification (orange dot) + cart (orange count) icons.
- White `radius.lg/xl` cards on `#f6faff` with `#E9ECEF` borders — borderless flat
  structure, no heavy shadows.
- Prices always `secondary` (or `statusFlash` for deals), `headlineMd/Lg` bold, in UGX.
- Bottom-nav bar only on the 4 main tabs (Home / B2B / Cart / Profile); stacked
  screens use back-chevron headers.
- Empty/auth-gated states use a centered `EmptyState` funneling to Sign In / Browse.
- Pull-to-refresh tinted `secondary`.

---

## 3. The 4 Main Screens (Bottom-Nav Tabs)

### 3.1 Home — `HomeScreen.tsx` (tab `Home`)
Consumer storefront, single long scroll.
1. **AppHeader** (menu · notification · cart).
2. **Status banner** (offline/loading, tappable retry).
3. **Search pill** — fake input + orange "Search" → `Search`.
4. **HeroCarousel** — autoplay banners (16:9, dots).
5. **Browse Collections** — 8 category chips w/ icon + label
   (IT & Tech, Fashion, Construction, Agric, Home & Living, Food, Service, Art).
6. **Featured Brands** — horizontal tiles (orange icon circle, name, count).
7. **Smart Picks** — "N DEALS" flash badge; large featured product card + autoplay carousel.
8. **Top Rated** — 2-column compact `ProductCard` grid.
9. **Seasonal & Promotional** — "N OFFERS" badge; promo flash cards (image, PROMO badge).
10. **Featured Stores** — horizontal 220px store cards (logo, name, ⭐ rating · products).
11. **Trust indicators** — 2×2 grid (Shipping / Secure / 24‑7 Care / Easy Returns).
12. **Flash & Deals** — autoplay flash cards (red discount, `statusFlash` price, cart).
13. **Dynamic category sections** — Electronics, Fashion, Local Heroes, Home & Living,
    Best Picks, Corporate & Wholesale, Under 50K — each `SectionHeader` + `ProductCarousel`.
14. **BottomNav.**

### 3.2 B2B / Marketplace — `MarketplaceScreen.tsx` (tab `Marketplace`)
Wholesale & corporate tab.
1. **AppHeader** (notification · search · cart).
2. **B2B HeroCarousel** (2 banners).
3. **Live stats** — Products / B2B Deals / Categories / Vendors.
4. **Search row** — real `TextInput` + "Search Products".
5. **Filter chips** — All / Wholesale / Bulk Orders / Corporate / Enterprise
   (active = `secondaryContainer`).
6. **Browse by Category** — horizontal 132px image cards.
7. **B2B carousels** — Wholesale / Bulk / Corporate / Enterprise, inquiry-style cards.
8. **B2B Assistance** — orange `secondaryContainer` support card ("Contact Expert").
9. **Flash Sales** — horizontal inquiry cards + see-all.
10. **Featured Stores** — vertical rows, 4px orange left border, "Open" green pill.
11. **Newsletter** — `primary` section, white headline, subscribe input.
12. **BottomNav.**

### 3.3 Cart — `CartScreen.tsx` (tab `Cart`)
1. **AppHeader**.
2. **Empty state** — basket icon, "Start Shopping".
3. **Items header** — "N items in cart" + red "Clear All".
4. **Vendor-grouped sections** — dark `primary` vendor bar (store icon, name,
   "N products · Delivery: UGX").
5. **Cart item row** — 80px image, title, category, price, delivery/shipping tag,
   qty `radius.full` stepper (−/+), line total.
6. **Order Summary** — subtotal + per-vendor Delivery rows + Total; full-width
   "Proceed to Checkout".
7. **BottomNav.**

### 3.4 Profile — `ProfileScreen.tsx` (tab `Profile`)
Signed-out: avatar circle, "Sign in", Sign In / Create Account.
Signed-in:
1. **AppHeader**.
2. **Profile card** (`primary` bg) — 72px initials circle, name, email/phone, role pill.
3. **Stats row** — Orders / Wishlist / In Cart.
4. **JEMINA Credits** card (dark `primary`, balance, → CreditHistory).
5. **Default Address** card (or "No address saved yet").
6. **Your Account** — 8 rows (Orders, Wishlist, My Reviews, Account Settings, Surveys,
   Track Order, Messages, Help & Support).
7. **Sign Out** (red pill) · **BottomNav.**

---

## 4. User / Flow Screens (stacked)

- **ProductDetails** — `ProductDetailsScreen.tsx`: 1:1 gallery + thumbnails, breadcrumb,
  title + fav, star rating, price card (strikethrough + discount badge), spec bento
  (2‑col), vendor row + "Visit Store", tabbed sections (Specs / Description / Reviews /
  Shipping & Returns), wholesale benefits card, sticky bar (INQUIRE / ADD TO CART / share).
- **Checkout** — `CheckoutScreen.tsx`: order summary (per vendor, delivery & shipping row),
  coupon input, pickup‑point vs. deliver-to-address radios, order notes, payment methods
  (saved provider / COD / Bitcoin / Credits), "Place Order".
- **Orders** — `OrdersScreen.tsx`: lazy-expanding order cards, status chips
  (pending=red, processing/shipped=blue, delivered/paid/completed=green, cancelled=gray),
  **PAID chip**, per-item rows, "Deliver to" box.
- **OrderTracking** — `OrderTrackingScreen.tsx`: order/tracking search, tracking timeline
  (numbered rail, green last dot, 📍location), per-item status.
- **Login / Register / TwoFactor** — icon hero, form card (underline-label inputs,
  show/hide password eye), Google continue, links.
- **Wishlist** — horizontal item rows, Add to Cart + trash.
- **AccountSettings** — 3-tab container (Profile / Payments / Address Book) hosting
  `EditProfile`, `PaymentMethods`, `AddressBook`.
- **Search / SearchResults / CollectionProducts** — search input + results grid.
- **VendorProfile / VendorActions** — vendor storefront + vendor dashboard actions.
- **Messages / HelpCenter / Surveys / Contact / About / Services / Legal / Privacy /
  Terms / MyReviews / CreditHistory / BuyCredits / Payment / PaymentMethods /
  EditProfile / AddressBook / ProductInquiry / TwoFactor / AllProducts.** — standard
  `AppHeader` pattern styled per content.

---

## 5. Shared Components (reused everywhere)

| Component | Render |
|---|---|
| `AppHeader` | primary-colored top bar; slot-based left (back/sidebar) + right (HeaderActions: notification w/ orange dot, cart w/ orange count) |
| `BottomNav` | 4 tabs Home / B2B / Cart / Profile; active `secondary` bold, white bar |
| `Sidebar` | animated drawer (300px, 250ms) over rgba(0,0,0,.45); brand mark, sectioned links, support card |
| `ProductCard` | white card, image, badges (featured/flash/new), title, rating · min-order, price `secondary` + strikethrough, stock; actions: "Add to Cart" outline + fav square OR "Inquiry Only" orange button |
| `HeroCarousel` | full-width paged carousel, autoplay 4s, dots (active 14px `secondary`) |
| `CategoryCarousel` | horizontal category chips (icon + label) |
| `ProductCarousel` | auto-play compact product rail |
| `Badge` | pill; variants: featured(blue) / flash(red) / secondary(orange) / wholesale / corporate / new |
| `SectionHeader` | bold headline + "View All" action |
| `EmptyState` | centered icon + title + CTA |

---

## 6. Existing Stitch Project (for the redesign)

- **Project:** `projects/7260463423417891322` — "Jemi-na Shopping App" (MOBILE, LIGHT).
- **Design system:** "Corporate Retail Harmony" — charcoal primary `#333e48`, golden‑orange
  secondary `#F08C00`, Hanken Grotesk; 4px radius cards, soft 1px borders, white cards on
  `#F8F9FA`; status colors: flash red `#DC3545`, featured blue `#007BFF`, success green `#28A745`.
- **Screens already in Stitch:** `JEMINA Home`, `Marketplace Explore`, `Shopping Cart`,
  `Shipping Details`, `Payment & Review`, `Order Confirmed`, `Product Details`, `Vendor Profile`
  (+ imported reference images/assets).

> Gap: the APK's as-built palette uses **dark slate `#1d2832` headers + `#ff9817` orange**
> and **`#f6faff`** canvas; the Stitch design system uses charcoal `#333e48` + `#F08C00`. The
> screens in Stitch don't yet cover **Profile (tab 4)**, **Orders**, **Order Tracking**,
> **Checkout (full)**, **Account areas**, or the `#f6faff`/dark-header nuance — these should be
> added/updated in the same design system pass.

---

## 7. Redesign Targets (all screens to update in Stitch)

| # | Screen | Stitch device | Notes |
|---|---|---|---|
| 1 | Home (tab) | MOBILE | 780×4086 pattern already exists ("JEMINA Home") — refresh to final palette |
| 2 | B2B / Marketplace (tab) | MOBILE | "Marketplace Explore" exists — refresh |
| 3 | Cart (tab) | MOBILE | "Shopping Cart" exists — refresh |
| 4 | Profile (tab) | MOBILE | **new screen needed** (signed-in + signed-out states) |
| 5 | Product Details | MOBILE | exists — refresh |
| 6 | Checkout (full) | MOBILE | "Shipping Details" + "Payment & Review" exist — refresh, add coupon/notes/pickup |
| 7 | Orders | MOBILE | **new screen** |
| 8 | Order Tracking | MOBILE | **new screen** |
| 9 | Login / Register | MOBILE | **new screens** |
| 10 | Wishlist | MOBILE | **new screen** |
| 11 | Account Settings (Profile/Payments/Address) | MOBILE | **new screens** |
| 12 | Vendor Profile | MOBILE | exists — refresh |