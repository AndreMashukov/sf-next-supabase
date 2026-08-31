---
description: Supabase migrations, RLS, generated types, and local dev
paths:
  - "supabase/**/*.sql"
  - "supabase/**/*.toml"
  - "libs/shared-types/src/database.types.ts"
---

# Supabase — sf-next-supabase

## Stack

- Supabase CLI project in `supabase/`
- Migrations in `supabase/migrations/`
- Local dev via `yarn supabase:start`
- Generated types: `libs/shared-types/src/database.types.ts`

## MUST Follow

1. **MUST create migrations** for schema changes — never edit production DB directly.
2. **MUST enable RLS** on user-facing tables with policies scoped to `auth.uid()`.
3. **MUST regenerate types** after schema changes: `yarn supabase:gen-types`.
4. **MUST test locally** with `yarn supabase:reset` before pushing migrations.
5. **MUST use local push** for dev: `yarn supabase:push` (applies to local DB only).

## Migration Workflow

```bash
# Create migration
supabase migration new <description>

# Apply locally
yarn supabase:push

# Reset and reapply all
yarn supabase:reset

# Regenerate TypeScript types
yarn supabase:gen-types
```

## NEVER Do

- NEVER push to remote/linked DB without explicit user request (`supabase db push --linked` is blocked)
- NEVER hand-edit `database.types.ts` — regenerate instead
- NEVER disable RLS on user data tables
- NEVER commit service-role keys or anon keys in source files

## Local Dev

```bash
yarn supabase:start    # starts Postgres, Auth, Storage, Realtime
yarn supabase:stop     # stops local stack
```

Copy anon/service_role/S3 keys from CLI output into `.env.local`.

## Read vs Write Split

| Layer | Use for |
|-------|---------|
| **RSC + RPC** | Navigation trees, complex reads (`get_navigation_tree`) |
| **Browser `.from()` / RPC** | Rules CRUD, directory create/update/move, attach/detach rules, move document metadata |
| **Fastify (service role)** | AI generation jobs, agent, deletes with S3/embeddings, update document/quiz with storage/indexing |

## RPC Conventions

- Use `SECURITY DEFINER` + `auth.uid()` checks for cross-table reads
- Grant `EXECUTE` to `authenticated` only (not `anon`) for new RPCs
- Regenerate types after adding RPCs

## Realtime

Publish user-owned tables to `supabase_realtime`; client hooks call `router.refresh()` for RSC pages.

## Reference

- [libs/shared-types/CLAUDE.md](../../libs/shared-types/CLAUDE.md)
- [.env.example](../../.env.example)
