---
description: Next.js App Router patterns — server/client components, data fetching, mutations
paths:
  - "apps/web/src/**/*.tsx"
  - "apps/web/src/**/*.ts"
---

# Next.js Web — sf-next-supabase

## Architecture

- **App Router** under `apps/web/src/app/` with route groups: `(app)`, `(auth)`
- **Server Components** (default): fetch data via `apps/web/src/data/*` using Supabase server client
- **Client Components** (`'use client'`): interactivity, mutations, Realtime subscriptions
- **Colocated components**: `_components/` folders inside route directories

## MUST Follow

1. **MUST fetch data in Server Components** via `apps/web/src/data/*` helpers — not in client components on mount.
2. **MUST route domain mutations** through `apps/web/src/mutations/*` which POST to Fastify `${NEXT_PUBLIC_API_URL}/api/v1/*`.
3. **MUST use Supabase server client** (`@/supabase/server`) in RSC; browser client (`@/supabase/client`) only in `'use client'` files.
4. **MUST add `'use client'`** when using hooks, event handlers, browser APIs, or Zustand stores.
5. **MUST import shared types** from `@sf/shared-types`.
6. **MUST use `getApiBaseUrl()`** from `@/mutations/client` — never hardcode API URLs.

## Page Pattern

```
apps/web/src/app/(app)/feature/
├── page.tsx              # Server Component — fetch data, pass to client
└── _components/
    └── FeatureClient.tsx # 'use client' — interactivity + mutations
```

## NEVER Do

- NEVER call Supabase `.insert()` / `.update()` / `.delete()` from client components for domain mutations
- NEVER fetch data with `useEffect` + Supabase client when RSC can do it server-side
- NEVER import `@sf/api-*` or agent libs into web app code
- NEVER use class components

## Reference

- [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)
- [README.md](../../README.md)
