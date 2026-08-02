# Document Agent

TypeScript LangGraph workflow for generating and verifying HTML document fragments.

## Integration Path

The document agent runs **in-process inside the API app** (`apps/api`), same as the directory agent:

1. `libs/document-agent` implements the LangGraph workflow in Node.
2. `libs/api-infra-ai` calls `generateVerifiedDocument()` directly from `create-document`.
3. The web app only provides the UI; it is not required for document generation.

This keeps LangGraph out of Deno/Edge runtime while preserving the existing `createDocument` API contract.

## Environment

```bash
TOGETHER_AI_API_KEY=...
```

The API loads env from `.env.local` via `tsx --env-file=.env.local` in development.

## Flow

`load_rules → plan → draft → validate → critique → (repair ×2) → publish | reject`

1. **Deterministic validate** — HTML/security/format/Mermaid/Plotly
2. **LLM critique** — semantic check that the HTML satisfies selected rules (skipped when no rules)
3. Failures feed a bounded repair loop, then full re-validation + critique

Validated documents always `auto_publish`. There is no human-review interrupt.
