---
description: Fastify API route and use-case patterns
paths:
  - "apps/api/**/*.ts"
  - "libs/api-routes/**/*.ts"
  - "libs/api-application/**/*.ts"
  - "libs/api-domain/**/*.ts"
  - "libs/api-infra-*/**/*.ts"
---

# Fastify API — sf-next-supabase

## Stack

- Fastify server in `apps/api` (thin entrypoint)
- Route registration in `@sf/api-routes`
- Use cases in `@sf/api-application`
- Domain logic in `@sf/api-domain`
- Infra: `@sf/api-infra-supabase`, `@sf/api-infra-storage`, `@sf/api-infra-ai`
- LangGraph agents: `@sf/document-agent`, `@sf/directory-agent`

## MUST Follow

1. **MUST keep `apps/api/src/main.ts` thin** — only create context and start server.
2. **MUST validate auth** — check Supabase JWT from `Authorization: Bearer` header before processing.
3. **MUST place business logic in use cases** (`@sf/api-application`), not in route handlers.
4. **MUST use shared types** from `@sf/shared-types` for request/response contracts.
5. **MUST use env vars** for Supabase keys, LLM keys, and storage credentials — never hardcode.
6. **MUST return structured responses** with clear success/error envelopes.

## Layer Boundaries

```
Route handler  →  Use case  →  Infra (Supabase, Storage, AI)
                  ↓
              Domain types
```

- Routes register endpoints and delegate to use cases
- Use cases orchestrate domain logic and infra calls
- Infra libs handle Supabase queries, S3 storage, LiteLLM/Together AI

## NEVER Do

- NEVER import from `apps/web` into API or libs
- NEVER put domain logic inline in route handlers
- NEVER expose service-role operations without auth checks
- NEVER hardcode API keys or connection strings

## Local Dev

```bash
yarn dev:api    # tsx with .env.local
```

## Reference

- [apps/api/CLAUDE.md](../../apps/api/CLAUDE.md)
- [README.md](../../README.md)
