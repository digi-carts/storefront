<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:digi-carts-ai-nav -->

# digi-carts AI navigation

Read `docs/ai/KNOWLEDGE_GRAPH.md` before editing. It maps tasks to files.

# storefront — AI navigation

Shopper Next.js app. Custom domains rewrite to `/s/[store]/...` via middleware. PWA (serwist).

**Stack:** Next 16, axios, zustand, firebase, serwist

## How to use this knowledge graph

1. Start here (`AGENTS.md`) for purpose, ports, and where to change X.
2. Open `docs/ai/KNOWLEDGE_GRAPH.md` for file-to-file links and task routing.
3. Prefer jumping to listed files over scanning the whole tree.
4. Browser traffic goes through **api-gateway**. Path `/api/<prefix>/...` is stripped to the service path. Downstream services trust `x-user-id`, `x-user-email`, `x-user-role`, `x-store-id` injected by the gateway — they do not re-validate JWTs.
5. Roles: `user` (shopper), `merchant` (store admin), `superadmin` (platform).


## Jump table

| Task | File |
| --- | --- |
| Host → `/s/[store]` rewrite | `middleware.ts` |
| API + tokens | `lib/api.ts` |
| Resolved store | `lib/storefront-store.ts` |
| Cart | `lib/cart-store.ts` |
| Theme | `lib/theme-store.ts` |
| Product data | `lib/use-shop-data.ts` |
| Path helpers | `lib/use-store-path.ts` |
| Templates | `components/templates/*` |
| Header | `components/layout/Header.tsx` |
| Playwright | `e2e/*.spec.ts` |

Dual routes: `app/(shop)/...` (main host) and `app/s/[store]/...` (tenant). Prefer changing both or shared components.
