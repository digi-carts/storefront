# storefront

Customer-facing multi-tenant shop. Next.js 16 with host-based rewrite to `/s/[store]/…`.

Platform design: [System design](https://github.com/digi-carts/doc/blob/main/architecture/system-design.md)

## Purpose

Shoppers browse products, cart, checkout, orders, profile, and CMS pages. Custom domains and `{store}.digi-carts.com` rewrite onto the tenant route. PWA via Serwist. Optional Firebase for social login domain helpers.

## Tech stack

| Item | Version / lib |
|------|----------------|
| Next.js | 16.3.0 |
| React | 19.2.8 |
| State | Zustand (`cart-store`, `storefront-store`, `theme-store`) |
| API | axios (`lib/api.ts`) |
| PWA | `@serwist/next` |
| Auth extras | firebase |
| E2E | Playwright (`e2e/`, `playwright.config.ts`) |

## Multi-tenancy

`middleware.ts`:

1. Paths under `/s/`, `/api/`, `/_next/`, `/uploads/` pass through.
2. Bare platform hosts (`NEXT_PUBLIC_MAIN_HOST`, localhost, `*.run.app`) use `app/(shop)/…` and `app/(auth)/…`.
3. Other hosts map via `canonicalStoreSlug(host)` and **rewrite** to `/s/{slug}{pathname}`.

Image uploads proxy: `next.config.ts` rewrites `/uploads/:path*` → `CATALOG_SERVICE_URL` (default `http://localhost:3004`).

## Routes

| Kind | Examples |
|------|----------|
| Tenant | `/s/[store]`, products, product `[id]`, cart, checkout, order-confirmation, orders, login, register, profile, about, `p/[slug]` |
| Main host shop | `app/(shop)/products`, cart, checkout, confirmation |
| Main host auth | `/login`, `/register`, `/profile` |
| Other | `/`, `/about`, `/orders` |

## Auth

Per-store localStorage keys (`sfKey`). Bearer token + `x-store-id`. Refresh: `POST ${API_BASE}/auth/refresh`. Default API: `http://localhost:4000/api`.

Public catalog/storefront gateway paths should not require JWT; checkout/orders do.

## Env

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Gateway `/api` |
| `NEXT_PUBLIC_MAIN_HOST` | Host that is not a store domain |
| `CATALOG_SERVICE_URL` | Upload rewrite (server) |

## Local run

```bash
export NEXT_PUBLIC_API_URL=http://localhost:3000/api
npm ci
npm run dev
```

Docker: Node 20, port **8080**. Playwright: `npm run test:e2e`.

## CI/CD

`digi-cart-storefront-dev` / `digi-cart-storefront`.

## Related

- [storefront-service](https://github.com/digi-carts/storefront-service/blob/stage/doc/README.md)
- [catalog-service](https://github.com/digi-carts/catalog-service/blob/stage/doc/README.md)
- [order-service](https://github.com/digi-carts/order-service/blob/stage/doc/README.md)
- [auth-service](https://github.com/digi-carts/auth-service/blob/stage/doc/README.md)
- AI map: [docs/ai/KNOWLEDGE_GRAPH.md](../docs/ai/KNOWLEDGE_GRAPH.md)

## REST API reference

See [api.md](api.md) for every HTTP endpoint generated from Spring controllers.
