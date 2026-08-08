# libs — sf-next-supabase

Shared libraries imported via `@sf/*` path aliases (see [tsconfig.base.json](../tsconfig.base.json)).

## Library Map

| Package | Purpose |
|---------|---------|
| `@sf/shared-types` | DB types, Zod schemas, domain contracts |
| `@sf/validation` | Zod re-exports, text-to-HTML helpers |
| `@sf/storage-paths` | Supabase Storage path helpers |
| `@sf/document-agent` | LangGraph document generation agent |
| `@sf/directory-agent` | LangGraph directory agent (RAG + CRUD tools) |
| `@sf/api-domain` | API domain types and pure logic |
| `@sf/api-application` | Use cases (documents, directories, quizzes, rules, knowledge) |
| `@sf/api-routes` | Fastify route registration and server factory |
| `@sf/api-infra-supabase` | Supabase client and queries |
| `@sf/api-infra-storage` | S3-compatible Storage access |
| `@sf/api-infra-ai` | LiteLLM chat + Together embeddings |

## Import Boundaries

```
apps/web  ──reads──>  @sf/shared-types, @sf/validation
apps/api  ──uses───>  @sf/api-routes (which pulls application + infra)
@sf/api-application  ──>  @sf/api-domain, @sf/api-infra-*, @sf/*-agent
@sf/*-agent          ──>  @sf/shared-types, @sf/api-infra-ai
```

- `apps/web` must NOT import `@sf/api-*` or agent libs directly
- Agent libs must NOT import from `apps/web` or `apps/api`

## Commands

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run <lib>:build
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run <lib>:test    # where test target exists
```

## Reference

- Scoped memory: [shared-types/CLAUDE.md](shared-types/CLAUDE.md)
- Path rules: `.claude/rules/typescript.md`, `api-fastify.md`
