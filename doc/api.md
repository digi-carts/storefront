# HTTP API (via api-gateway)

These Next.js apps call the platform through **api-gateway** (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000/api` in some apps or port **3000**).

Canonical endpoint lists:

- Platform catalog: [digi-carts/doc api](https://github.com/digi-carts/doc/blob/main/api/README.md)
- Per-service `doc/api.md` in each Java repository

Protected routes require `Authorization: Bearer <jwt>`.
