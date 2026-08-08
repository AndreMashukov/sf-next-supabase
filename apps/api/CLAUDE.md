# apps/api — sf-next-supabase

Thin Fastify entrypoint. Domain logic lives in `@sf/api-*` libraries. Dev: `:3001`.

## Commands

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:build
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:serve
```

Docker:

```bash
docker build -f apps/api/Dockerfile -t sf-api .
docker run --env-file .env.local -p 3001:3001 sf-api
```

## Layout

```
apps/api/
├── src/main.ts       # entrypoint only — createApiContext + createApiServer
├── build.mjs         # esbuild bundle for production
└── Dockerfile

libs/api-routes/      # Fastify route registration, auth middleware
libs/api-application/ # use cases (create-document, generate-quiz, directory-agent, …)
libs/api-domain/      # domain types and pure logic
libs/api-infra-supabase/  # Supabase client, RLS-aware queries
libs/api-infra-storage/   # S3-compatible Storage access
libs/api-infra-ai/        # LiteLLM chat + Together embeddings
```

## Must Follow

- Keep `apps/api/src/main.ts` thin — no business logic in the entrypoint
- Use cases in `@sf/api-application` delegate to infra libs, not inline DB/LLM calls
- Auth: validate Supabase JWT from `Authorization: Bearer` header
- Env via `.env.local` (loaded by `tsx --env-file=.env.local` in serve target)
- Shared contracts from `@sf/shared-types`

## Never

- Never import from `apps/web` into API or libs
- Never hardcode Supabase keys or LLM API keys — use env vars from `.env.example`
- Never expose service-role operations without auth checks

## Reference

- Path rule: `.claude/rules/api-fastify.md`
- Agent: `api-reviewer`
- Full architecture: `README.md`
