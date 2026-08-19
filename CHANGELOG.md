# Changelog

## [0.1.37] - 2026-08-19

- REST/client notes at `doc/api.md`
- Service overview restored at `doc/README.md`

## [0.1.36] - 2026-08-19

- Cucumber JS component tests (`npm run test:component`)
- GitHub Actions `pr-tests.yml`: pull requests to `stage`/`main` run component tests and fail the check on failure
- Dev deploy (`deploy-dev.yml`) runs component tests before Cloud Run update

## [0.1.35] - 2026-08-18

- fix: narrow cached store before applying template context (#23)

## [0.1.34] - 2026-08-18

- fix: show out of stock only once on the product page (#22)

## [0.1.33] - 2026-08-18

- fix: cart currency, checkout confirmation, and shop currency (#21)

## [0.1.32] - 2026-08-18

- fix: show store currency on the cart page instead of hardcoded dollars (#20)

## [0.1.31] - 2026-08-18

- fix: Google sign-in on *.digi-carts.com storefronts (#19)

## [0.1.30] - 2026-08-18

- fix: load store config on custom-domain homepage (#18)

## [0.1.29] - 2026-08-18

- fix: checkout confirmation, digi-carts store resolution, and INR default (#16)

## [0.1.28] - 2026-08-18

- fix: default storefront currency to INR when none is published (#17)

## [0.1.27] - 2026-08-18

- fix: resolve *.digi-carts.com stores and keep published currency (#15)

## [0.1.26] - 2026-08-18

- Apply a five-step item size scale on the homepage. (#14)

## [0.1.25] - 2026-08-18

- Add AI navigation docs and a file knowledge graph. (#13)

## [0.1.24] - 2026-08-18

- Merge pull request #12 from digi-carts/fix/order-confirmation-suspense

## [0.1.23] - 2026-08-17

- Merge pull request #11 from digi-carts/feat/order-confirmation-page

## [0.1.22] - 2026-08-18

- fix: currency always resolved from API (source of truth) to prevent stale GCS config showing wrong currency on custom domains and checkout
- fix: add `currency` field to `StoreConfig` type so it persists correctly in localStorage

## [0.1.21] - 2026-08-17

- Merge pull request #10 from digi-carts/feat/order-confirmation-page

## [0.1.20] - 2026-08-17

- Merge pull request #9 from digi-carts/fix/products-page-card-stepper

## [0.1.19] - 2026-08-17

- Merge pull request #8 from digi-carts/fix/product-detail-400-and-cart-stock-cap

## [0.1.18] - 2026-08-17

- Merge pull request #7 from digi-carts/fix/store-url-subdomain-display

## [0.1.17] - 2026-08-17

- Merge pull request #6 from digi-carts/fix/cart-counter-stock-limit

## [0.1.16] - 2026-08-17

- Merge pull request #5 from digi-carts/fix/prerender-dynamic-pages

## [0.1.15] - 2026-08-17

- Merge pull request #4 from digi-carts/fix/prerender-dynamic-pages

## [0.1.14] - 2026-08-17

- Merge pull request #3 from digi-carts/feat/store-down-page

## [0.1.13] - 2026-08-17

- Merge pull request #2 from digi-carts/feat/store-down-page

## [0.1.12] - 2026-08-17

- Merge pull request #1 from digi-carts/feat/store-down-page

## [0.1.11] - 2026-08-17

- fix: per-store auth isolation — scope localStorage keys to store slug

## [0.1.10] - 2026-08-17

- fix: read currency from top-level store field, not branding.currency

## [0.1.9] - 2026-08-13

- feat: persist chosen courier at checkout + live tracking link on orders

## [0.1.8] - 2026-08-13

- feat(storefront): request a return on delivered orders (item-level + reason) and see return status

## [0.1.7] - 2026-08-13

- feat: floating WhatsApp button on storefront — opens chat with current item/home link

## [0.1.6] - 2026-08-13

- feat: Cash on Delivery at checkout — take orders with no payment gateway

## [0.1.5] - 2026-08-13

- feat(storefront): show available coupons at checkout — valid colored/clickable, unmet grayed out

## [0.1.4] - 2026-08-13

- feat(storefront): hide footer when branding.footerEnabled is false

## [0.1.3] - 2026-08-13

- feat(storefront): honor navBrandMode (logo/text/both) in nav bar via BrandMark

## [0.1.2] - 2026-08-13

- fix(storefront): format About address object (was [object Object]); render footer (was orphaned); merge guest cart into user cart on login

## [0.1.1] - 2026-08-13

- ci: add version bump and changelog to deploy workflow