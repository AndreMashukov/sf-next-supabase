# shared-types — sf-next-supabase

Cross-boundary TypeScript contracts for `apps/web`, `apps/api`, and all `libs/*`. Import as `@sf/shared-types`.

## Must Follow

- Prefer extending existing types over creating duplicates in `apps/web/src/`
- Re-export public API from `src/index.ts`
- `database.types.ts` is generated — run `yarn supabase:gen-types` after schema/migration changes
- Zod schemas and domain types (Document, Rule, Quiz, GenerationJob, Agent) live here
- Breaking changes affect web, API, and libs — update all consumers in the same change

## Commands

```bash
yarn supabase:gen-types   # regenerate database.types.ts from local schema
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run shared-types:build
```

## Never

- Never put React, Fastify, or runtime server code here
- Never hand-edit `database.types.ts` — regenerate instead
- Never import `@sf/api-*` or agent libs into this library
