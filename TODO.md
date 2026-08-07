# m_jemina — Roadmap to PlayStore

Goal: ship the app as "fully functional like the website" and publish to the Play Store.
Epic (core loop): **sign in → browse → cart → checkout → pay → track orders**, with **JEMINA credits**
earned at registration and spendable at checkout.

Legend: `[x]` done · `[ ]` pending.

## Core Epic — Shopping Loop

- [x] Live auth (register/login/logout via Sanctum) with demo fallback — `AuthContext`
- [x] Server-synced cart — `CartContext` (`cartSource: 'server'`)
- [x] Checkout screen — shipping form + payment method + `POST /api/v1/orders` — `CheckoutScreen`
- [x] Orders list + order detail — `GET /api/v1/orders`, `GET /api/v1/orders/{id}` — `OrdersScreen`
- [x] Server-side `ApiOrderController` fixed to real schema (was writing `shipping_amount`/`tax_amount`/`unit_price` → SQL 500)
- [x] JEMINA credits balance + history API (`GET /api/v1/credits/balance`, `GET /api/v1/credits/history`) — `ApiCreditController`
- [x] Signup bonus credited on API register (mirrors web `RegisterController`, `config('credit.signup_bonus')` = 1,000,000)
- [x] Credit payment in order store (`payment_method: 'credit'` → deducts balance, marks order `processing`/`paid`)
- [x] App shows credits balance in Profile and at Checkout; credit payment option
- [x] Checkout/payment gateway handoff UX (MTN / Stripe / Flutterwave / Bitcoin via `POST /api/v1/payments/initiate`) — `PaymentScreen` initiates + polls status; checkout routes non-credit payments to it
- [x] Wishlist + reviews wiring from Profile (`profile/wishlist`, `profile/reviews`) — `WishlistScreen`, `MyReviewsScreen`, auth-gated
- [x] Add-to-wishlist heart + review form on product detail (`apiAddToWishlist`, `apiRemoveFromWishlist`, `apiAddReview`, wishlist preload)
- [ ] Verify gateway UX against live API (gateways not configured on VPS .env yet → initiate returns gateway-availability error gracefully)

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

## JEMINA Credits — remaining

- [x] In-app credit purchase flow (`POST /api/v1/payments/initiate` with `metadata.type=credit_purchase`) — `BuyCreditsScreen`
- [x] Credit transaction history screen in app (`GET /api/v1/credits/history`) — `CreditHistoryScreen`
- [ ] Survey-credit rewards (website awards credits for surveys) — confirm server endpoint

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
- [ ] Verify checkout/order/cart flows against live API on device (emulator) after release config
- [ ] Update `docs/DESIGN.md` endpoint map with orders/credits/payments + vendors/search
