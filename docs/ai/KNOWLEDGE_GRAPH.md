# Knowledge graph — storefront

```mermaid
flowchart LR
  subgraph UIs
    PUI[platform-ui]
    MUI[merchant-ui]
    SF[storefront]
  end
  GW[api-gateway :4000]
  PUI --> GW
  MUI --> GW
  SF --> GW
  GW --> AUTH[auth-service :3001]
  GW --> PLAT[platform-service :3002]
  GW --> STORE[store-service :3003]
  GW --> CAT[catalog-service :3004]
  GW --> ORD[order-service :3005]
  GW --> SFS[storefront-service :3006]
  GW --> NOTIF[notification-service :3007]
  GW --> PAY[payment-service :3008]
  GW --> SHIP[shipping-service :3009]
  GW --> OFF[offer-service :3010]
  GW --> BILL[billing-service :3011]
```


## This repo

```mermaid
flowchart TD
  MW[middleware.ts] -->|rewrite| S[app/s/store pages]
  S --> LIB[lib/storefront-store.ts]
  LIB -->|/storefront/resolve| SFS[storefront-service]
  PAGES[shop pages] --> API[lib/api.ts]
  API --> GW[api-gateway]
  PAGES --> CART[lib/cart-store.ts]
  PAGES --> TPL[components/templates]
```

## Important paths

| Path | File |
| --- | --- |
| `/s/[store]` home | `app/s/[store]/page.tsx` |
| Products | `app/s/[store]/products/page.tsx`, `products/[id]/page.tsx` |
| Cart/checkout | `app/s/[store]/cart/page.tsx`, `checkout/page.tsx` |
| Auth | `app/s/[store]/login/page.tsx`, `register/page.tsx`, `profile/page.tsx` |
| CMS page | `app/s/[store]/p/[slug]/page.tsx` |
| Manifest | `app/api/manifest/route.ts` |

## Task → file

- Domain routing bug: `middleware.ts` then storefront-service `resolve`.
- Cart: `lib/cart-store.ts` plus cart/checkout pages.
- Theme/template: `lib/theme-store.ts`, `components/templates/TemplateWrapper.tsx`.
