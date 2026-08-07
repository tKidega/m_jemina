# Jemi-na Shopping App (m_jemina)

A mobile client for the **Jemi-na multi-vendor e-commerce marketplace** (Uganda). Built with **React Native 0.85** and TypeScript, using the **New Architecture (Fabric) + Hermes**. The app is designed from [Google Stitch](https://stitch.withgoogle.com/) wireframes and mirrors the product catalog, cart and user features of the Laravel website (see the website repo notes below).

The app is a **UI-first prototype**: screens, components and a design system are implemented. Product data, cart and authentication are now wired to the Laravel website's REST API (`https://jemi-na.com/api/v1`): the catalog (51 products) is fetched live with a hardcoded offline fallback; **register/login/logout use the live Sanctum API** (`authMode: 'live'`) and fall back to an in-memory seeded mock (`authMode: 'demo'`) when offline; the **cart syncs to the server when signed in** (`cartSource: 'server'`). Demo login `user@email.com` / `customer@420`.

## Screenshots

| Home (live API) | Marketplace (live API) | Product Details (live API) |
|-----------------|------------------------|----------------------------|
| ![Home](docs/screenshots/home-live-api.png) | ![Marketplace](docs/screenshots/marketplace-live-api.png) | ![Product Details](docs/screenshots/product-details-live-api.png) |

## Features

- Home with featured products, flash sales, category sections and a top-rated product grid — **driven by the live website API**
- Marketplace browsing with category tabs and flash-sale carousel — **live API prices, discounts and stock**
- Product details (gallery, price, vendor info, tabbed specs/reviews, wishlist heart, write-a-review form) — **live API data**
- Vendor profile page — **live storefront** via `GET /api/v1/vendors/{id}` (products, rating, description)
- **Sidebar menu** — slide-in drawer from the JEMINA header menu icon with Shop / Account / Company / Legal links
- **Company & legal pages** — About Us, Services, Terms of Service, Privacy Policy and Contact Us (content mirrored from the website)
- **Shopping cart** — add-to-cart from anywhere, quantity steppers, totals, live cart badge; **persists to the server when signed in**
- **Checkout & orders** — shipping form + payment method + place order against the live API, order list with expandable details and pull-to-refresh
- **Payment gateway handoff** — after checkout, non-credit payments open a gateway screen that initiates `POST /api/v1/payments/initiate`, shows the reference / payment link, and polls `GET /payments/{transactionId}/status`
- **JEMINA credits** — signup bonus credited on registration, balance shown in Profile and at Checkout, **pay for orders with credits**; credit purchase screen + transaction history (`BuyCreditsScreen`, `CreditHistoryScreen`)
- **Wishlist & reviews** — save products from details / browse your wishlist, and review purchased products — wired to `profile/wishlist` + `profile/reviews`
- **Live product search** — Marketplace search bar hits `GET /api/v1/products/search` (`SearchResultsScreen`)
- **User authentication** — register/login/logout wired to the **live Sanctum API**, plus a user dashboard (orders, wishlist, reviews, account); falls back to the seeded demo account when offline
- **Live catalog with offline fallback** — fetches all 51 products + categories from `/api/v1` on startup; if the API is unreachable it falls back to the bundled mock catalog and shows a tap-to-retry banner
- Custom navigation (no react-navigation dependency)
- Material Symbols icon set (via `react-native-vector-icons`)
- Theming with the Stitch-derived Jemi-na design system (Hanken Grotesk type, Material 3-style color tokens)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.85.2 (New Architecture, Fabric) |
| Language | TypeScript 5.8 |
| Runtime | Hermes |
| State | React Context (`CartContext`, `AuthContext`, `CatalogContext`) |
| Data | Live REST API (`https://jemi-na.com/api/v1`) + offline fallback catalog; Sanctum bearer-token auth + server-synced cart |
| Icons | `react-native-vector-icons` 10.3 (MaterialSymbols) |
| Safe Area | `react-native-safe-area-context` 5.5 |
| Build | Gradle 9.3.1, AGP 8.12, Kotlin 2.1.20, JDK 21 |
| Node | >= 22.11.0 |

## Getting Started

### Prerequisites

- Node.js >= 22.11.0 and npm
- JDK 21 (see `docs/CONFIGURATION.md` — this machine uses a JDK 21 toolchain)
- Android SDK (API 36) + platform-tools, NDK 27.1.12297006
- Android emulator (API 30-36) or a physical device

Full environment details and troubleshooting: **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)**

### Install

```sh
npm install
```

### Run (Android)

```sh
# Terminal 1 - start Metro
npm start

# Terminal 2 - build & install on emulator/device
npm run android
```

Alternatively, open the `android/` folder in Android Studio and run the `app` configuration directly.

### Lint & Test

```sh
npm run lint
npm test
```

## Project Structure

```
.
├── App.tsx                      # Entry point: NavigationProvider + Router
├── android/                     # Android native project (Gradle 9.3.1)
├── docs/
│   ├── screenshots/             # Full-resolution app screenshots
│   ├── SYSTEM_REQUIREMENTS.md   # Hardware/software requirements
│   ├── DESIGN.md                # Design system + app architecture
│   └── CONFIGURATION.md         # Build & environment setup
├── ios/                         # iOS native project
├── src/
│   ├── assets/fonts/            # Hanken Grotesk TTF weights
│   ├── components/              # AppHeader, Sidebar, ProductCard, Button, BottomNav, InfoPage, ...
│   ├── data/                    # api.ts (live API client + mapper), products.ts (offline fallback), images.ts
│   ├── navigation/              # Custom NavigationContext router
│   ├── screens/                 # Home, Marketplace, ProductDetails, VendorProfile, Cart, Login, Register, Profile, Checkout, Orders, Payment, Wishlist, MyReviews, CreditHistory, BuyCredits, SearchResults, About, Services, Terms, Privacy, Contact
│   ├── state/                   # CatalogContext + CartContext + AuthContext (React Context)
│   └── theme/                   # colors, typography, spacing tokens
└── react-native.config.js       # Font asset linking config
```

## Documentation

- **[System Requirements](docs/SYSTEM_REQUIREMENTS.md)** — hardware/software/prerequisites matrix
- **[Design & Architecture](docs/DESIGN.md)** — design tokens, screens, component model, planned data flow
- **[Configuration](docs/CONFIGURATION.md)** — JDK/Gradle/NDK/SDK setup, environment variables, troubleshooting

## Related Repositories

The companion Laravel website (source of product data and the REST API) lives at:

```
C:\xampp\htdocs\dev\jemina
```

It provides the REST API (`/api/v1/...`), product catalog and auth (Laravel Sanctum). **The app fetches its live product catalog from `https://jemi-na.com/api/v1/products` and `/categories`, and syncs auth + cart + orders + credits with the Sanctum endpoints.** Server-side fixes applied on the VPS: product status-filter (`'true'`), flat-discount math, image URL filtering, a new `ApiCartController` + cart routes, the Apache `Authorization`-header re-export in `public/.htaccess` (was causing `Unauthenticated.` on every protected route), an order-schema fix in `ApiOrderController` (was 500ing on the real table columns), and a new `ApiCreditController` (credits balance/history + signup bonus on API register + credit payment at checkout). See `docs/DESIGN.md` → *Backend Integration* for the endpoint map.
