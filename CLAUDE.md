# sf-next-supabase — Claude Code

Thin always-on memory. Full architecture in [README.md](README.md). Path-scoped rules in `.claude/rules/` load when matching files are touched. Nested `CLAUDE.md` files under `apps/web/`, `apps/api/`, and `libs/` load when working in those trees.

## Commands (NX from repo root)

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:lint
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:build
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:build
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:serve
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn lint
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn test
```

Before reporting done: `/check` (or the typecheck + lint sequence above). Use `/check web|api` to scope.

## Local Dev Stack

```bash
yarn supabase:start          # local Supabase (Postgres, Auth, Storage, Realtime)
yarn litellm:dev             # LiteLLM proxy on :4000
yarn dev:api                 # Fastify API on :3001
yarn dev:web                 # Next.js on :4200
```

Copy `.env.example` to `.env.local` and fill keys from `supabase start` output.

## Must Follow

- Next.js App Router in `apps/web` — server components for data fetch, `'use client'` only when needed
- Mutations go through Fastify API at `${NEXT_PUBLIC_API_URL}/api/v1/*` — use `apps/web/src/mutations/` helpers, not direct Supabase writes from client components for domain mutations
- Supabase server client in RSC via `apps/web/src/supabase/server.ts`; browser client via `apps/web/src/supabase/client.ts`
- Shared contracts from `@sf/shared-types` — regenerate DB types after schema changes: `yarn supabase:gen-types`
- Layered API: routes in `@sf/api-routes`, use cases in `@sf/api-application`, domain in `@sf/api-domain`, infra in `@sf/api-infra-*`
- No type assertions (`as any`, `@ts-ignore`) — type guards and Zod
- Never push remote DB migrations without explicit user request — use local `yarn supabase:push` / `supabase db reset` for dev

## Git

**Branch naming:** `<type>/<description>/<initials>` (feat, fix, docs, chore, refactor, test, ci). Example: `feat/add-quiz-filter/am`. Set initials in `~/.claude/CLAUDE.md`.

## Skills / Agents

| Kind | Names |
|------|--------|
| Tools | `/check`, `/format`, `/dev-bootstrap` |
| Agents | `verify-changes`, `api-reviewer` |

## Docs (on demand)

| Topic | Path |
|-------|------|
| Claude setup | `.claude/SETUP.md` |
| Architecture | `README.md` |
| Env vars | `.env.example` |

## Hooks

- PreToolUse Bash: block remote DB push / force-push / destructive rm
- PreToolUse Edit\|Write: block obvious secrets
- PostToolUse Edit\|Write: Prettier on touched source files
- Stop: remind to `/check` once when source is dirty

Personal overrides: `CLAUDE.local.md` (gitignored) or `~/.claude/CLAUDE.md`.
