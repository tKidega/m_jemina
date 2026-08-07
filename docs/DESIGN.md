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

Current route map:

| Route | Screen | Source file |
|-------|--------|-------------|
| home | HomeScreen | `src/screens/HomeScreen.tsx` |
| marketplace | MarketplaceScreen | `src/screens/MarketplaceScreen.tsx` |
| product-details | ProductDetailsScreen | `src/screens/ProductDetailsScreen.tsx` |
| vendor-profile | VendorProfileScreen | `src/screens/VendorProfileScreen.tsx` |
| cart | CartScreen | `src/screens/CartScreen.tsx` |
| profile | ProfileScreen | `src/screens/ProfileScreen.tsx` |
| login | LoginScreen | `src/screens/LoginScreen.tsx` |
| register | RegisterScreen | `src/screens/RegisterScreen.tsx` |
| checkout | CheckoutScreen | `src/screens/CheckoutScreen.tsx` |
| orders | OrdersScreen | `src/screens/OrdersScreen.tsx` |
| payment | PaymentScreen | `src/screens/PaymentScreen.tsx` |
| about | AboutScreen | `src/screens/AboutScreen.tsx` |
| services | ServicesScreen | `src/screens/ServicesScreen.tsx` |
| terms-of-service | TermsOfServiceScreen | `src/screens/TermsOfServiceScreen.tsx` |
| privacy-policy | PrivacyPolicyScreen | `src/screens/PrivacyPolicyScreen.tsx` |
| contact | ContactScreen | `src/screens/ContactScreen.tsx` |

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

- **HomeScreen** — hero, trust indicators, featured product, flash-sale cards, top-rated product grid, newsletter.
- **MarketplaceScreen** — hero, search/filters, corporate/B2B section, flash-sale carousel, featured stores.
- **ProductDetailsScreen** — image gallery, price/discount, vendor row, tabbed specs/description/reviews, add-to-cart.
- **VendorProfileScreen** — vendor header, stats, services, product grid.
- **CartScreen** — line items with quantity steppers, subtotal/total, empty state.
- **LoginScreen / RegisterScreen** — email/password forms with validation, show/hide password, demo account hint.
- **ProfileScreen** — signed-out prompt or user dashboard (account header, stats, account menu, logout).
- **CheckoutScreen** — order summary, shipping form, payment method selection (incl. JEMINA Credits with live balance), submits the order, then routes credits payments to Orders and gateway payments to PaymentScreen.
- **OrdersScreen** — order list with expandable details and pull-to-refresh.
- **PaymentScreen** — gateway handoff: calls `POST /payments/initiate` for the chosen gateway, shows the transaction reference and payment link (openable), and polls `GET /payments/{transactionId}/status` every 5s.
- **AboutScreen / ServicesScreen / TermsOfServiceScreen / PrivacyPolicyScreen / ContactScreen** — company & legal pages whose content mirrors the website (`resources/views/home/about|services|terms-of-service|privacy-policy|contact.blade.php` + partials). ContactScreen includes the contact info, business hours, and a mailto-based message form.

### 2.4 Data Layer (current)

Product data is fetched live from the website REST API, with a bundled offline fallback:

- `src/data/api.ts` — typed API client for `https://jemi-na.com/api/v1`. Catalog: `fetchProducts`, `fetchProductDetail`, `fetchCategories` plus `apiProductToProduct()`, which maps the server's product shape (price, `discounted_price`, flat discount amount, min-order, stock, category, vendor, images) to the app's `Product` type. Broken/relative image paths are filtered out; products without images fall back to a local slug-matched image. Auth + cart: `apiLogin`, `apiRegister`, `apiLogout`, `apiGetUser`, `apiGetCart`, `apiAddToCart`, `apiUpdateCartItem`, `apiRemoveCartItem`, `apiClearCart` — all backed by a small `request<T>()` fetch helper that attaches the bearer token, parses the `{ success, message, errors? }` envelope, and throws on non-2xx.
- `src/data/products.ts` — the hardcoded fallback catalog (15 products) used only when the API is unreachable.
- `src/data/images.ts` — image URL constants.
- `src/state/CatalogContext.tsx` — fetches products + categories on mount, exposes derived lists (`flashSale`, `featured`, `wholesale`, `topRated`), `getProductById` / `findProductByQuery`, plus `loading` / `error` / `refresh`. On failure it falls back to `products.ts` and screens show a tap-to-retry banner.
- `src/state/CartContext.tsx` — cart state (items, add/remove/update quantity, subtotal, item count) via React Context, mirroring the `NavigationContext` pattern. When a user token is present it loads the server cart (`apiGetCart`) and mirrors every mutation to the API optimistically (`cartSource: 'server'`); otherwise it operates as a local cart (`cartSource: 'local'`).
- `src/state/AuthContext.tsx` — auth (register/login/logout) wired to the Sanctum API first (`authMode: 'live'`, keeps the bearer token in context); falls back to the in-memory seeded mock (`authMode: 'demo'`) only when the API is unreachable or the credentials aren't a live account. Demo account: `user@email.com` / `customer@420`.

Persistence is via the server cart/account when signed in; without a token the cart is in-memory only (AsyncStorage not installed).

## 3. Implemented Features & Data Flow

Implemented features:

1. **Live catalog** — Home, Marketplace and ProductDetails render products from the production API (51 products, real UGX prices/discounts/min-orders/stock), fetched at startup with an offline fallback catalog.
2. **Cart** — add-to-cart from ProductDetails, ProductCard, Home and Marketplace; Cart screen with quantity steppers and totals; live cart badge on every header. Signed-in carts persist to the server.
3. **Auth + User Dashboard** — register/login/logout wired to the Sanctum API (live accounts), Profile/Dashboard screen showing account info, stats and account menu; demo fallback when offline.

## 4. Backend Integration

The Laravel website (deployed to the VPS at `https://jemi-na.com`, local repo `C:\xampp\htdocs\dev\jemina`) exposes the REST API the app consumes.

**Base URL:** `https://jemi-na.com/api/v1/` (constant `API_BASE_URL` in `src/data/api.ts`)

| Feature | Endpoints | App status |
|---------|-----------|-----------|
| Products | `GET /products`, `GET /products/{id}`, `GET /products/search` | **Wired** (live catalog) |
| Categories | `GET /categories` | **Wired** (fetched on mount) |
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` | **Wired** (live-first with demo fallback) |
| Cart | `GET /cart`, `POST /cart`, `PUT /cart/{item_id}`, `DELETE /cart/{item_id}`, `DELETE /cart` (clear) | **Wired** (server-synced when signed in) |
| Orders | `GET /orders`, `POST /orders`, `GET /orders/{id}`, `PUT /orders/{id}/cancel` | **Wired** (checkout + order list/detail) |
| JEMINA Credits | `GET /credits/balance`, `GET /credits/history` | **Wired** (balance in Profile + Checkout; credit payment) |
| Payments | `POST /payments/initiate`, `GET /payments/{transactionId}/status` | **Wired** (gateway handoff screen after checkout for non-credit methods) |
| Profile | `GET /profile`, `PUT /profile`, `GET /profile/wishlist`, `POST /profile/wishlist`, `DELETE /profile/wishlist/{product_id}` | **Wired** (wishlist screen + product-detail heart; auth-gated) |
| Reviews | `GET /profile/reviews`, `POST /products/{id}/reviews` | **Wired** (My Reviews screen + review form on product details) |
| Vendors | `GET /vendors`, `GET /vendors/{id}` | **Wired** (live vendor storefront in `VendorProfileScreen`) |
| Search | `GET /products/search?q=` | **Wired** (`SearchResultsScreen` from the Marketplace search bar) |

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

## 5. Design System Files

| File | Contents |
|------|----------|
| `src/theme/colors.ts` | Color tokens |
| `src/theme/typography.ts` | Type scale |
| `src/theme/spacing.ts` | Spacing + radius |
| `src/theme/index.ts` | Aggregated `theme` export + `Theme` type |
