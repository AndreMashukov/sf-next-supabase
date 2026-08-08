# apps/web — sf-next-supabase

Next.js 16 App Router + Supabase Auth/RLS + Zustand UI store. Dev: `:4200`.

## Commands

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:lint
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:dev
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:build
```

## Layout

```
apps/web/src/
├── app/              # App Router routes + colocated _components
├── components/       # shared UI (ui/ for primitives)
├── data/             # server-side Supabase reads for RSC pages
├── mutations/        # client-side API calls to Fastify /api/v1/*
├── supabase/         # browser + server Supabase clients, middleware
├── stores/           # Zustand slices (agent, jobs, shell)
├── hooks/            # client hooks (e.g. Realtime subscriptions)
├── domain/           # pure domain helpers
├── content/          # HTML/math/plotly rendering
└── utils/            # cn(), formatDate()
```

## Conventions

- **Server Components** fetch data via `apps/web/src/data/*` using `createClient()` from `@/supabase/server`
- **Client Components** (`'use client'`) for interactivity; call mutations via `apps/web/src/mutations/*` which POST to `${NEXT_PUBLIC_API_URL}/api/v1/*`
- **Realtime**: generation job status via `useGenerationJobsRealtime` + Supabase Realtime on `generation_jobs`
- **Auth**: middleware in `apps/web/src/middleware.ts`; login/signup under `app/(auth)/`
- **Styling**: CSS classes in `app/global.css` and parity CSS files; Lucide icons; `cn()` from `@/utils`
- Import shared types from `@sf/shared-types`

## Never

- Never call Supabase `.insert()` / `.update()` / `.delete()` from client components for domain mutations — use Fastify API mutations
- Never hardcode API URLs — use `getApiBaseUrl()` from `@/mutations/client`
- Never skip `'use client'` when using hooks, event handlers, or browser APIs

## Reference

- Path rules: `.claude/rules/web-next.md`, `styling.md`, `form-handling.md`
- Full architecture: `README.md`
