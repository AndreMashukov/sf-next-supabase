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
├── mutations/        # client-side Supabase CRUD + Fastify for AI/jobs
├── supabase/         # browser + server Supabase clients, middleware
├── stores/           # Zustand slices (agent, jobs, shell)
├── hooks/            # client hooks (Realtime subscriptions)
├── domain/           # pure domain helpers + client directory operations
├── content/          # HTML/math/plotly rendering
└── utils/            # cn(), formatDate()
```

## Conventions

- **Server Components** fetch data via `apps/web/src/data/*` using `createClient()` from `@/supabase/server`
- **Non-trivial reads** use typed RPCs (e.g. `get_navigation_tree`) where joins/trees are assembled in SQL
- **Simple CRUD mutations** use browser Supabase client + RLS (rules, directories, attach/detach, move document)
- **AI / side-effect mutations** POST to Fastify via `getApiBaseUrl()` (e.g. `${getApiBaseUrl()}/create-document`)
- **Realtime**: `useGenerationJobsRealtime` on `generation_jobs`; `useNavigationRealtime` refreshes RSC on nav table changes
- **Auth**: middleware in `apps/web/src/middleware.ts`; login/signup under `app/(auth)/`
- **Styling**: CSS classes in `app/global.css` and parity CSS files; Lucide icons; `cn()` from `@/utils`
- Import shared types from `@sf/shared-types`

## Never

- Never use service-role keys from the browser
- Never route simple user-owned CRUD through Fastify when RLS already covers it
- Never hardcode API URLs — use `getApiBaseUrl()` from `@/mutations/client` for Fastify calls
- Never skip `'use client'` when using hooks, event handlers, or browser APIs

## Reference

- Path rules: `.claude/rules/web-next.md`, `styling.md`, `form-handling.md`, `supabase.md`
- Full architecture: `README.md`
