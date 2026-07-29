# Document Agent

TypeScript LangGraph workflow for generating and verifying HTML document fragments.

## Integration Path

This repo uses a **Node-side agent library + Next.js API route + Edge Function proxy**:

1. `libs/document-agent` runs the LangGraph workflow in Node.
2. `apps/web/src/app/api/documents/generate/route.ts` exposes the workflow over HTTP.
3. `create-document` Edge Function proxies to `DOCUMENT_AGENT_URL` when configured.
4. If `DOCUMENT_AGENT_URL` is not set, Edge Functions fall back to the legacy single-shot Together call.

This keeps LangGraph out of Deno/Edge runtime while preserving the existing `createDocument` API contract.

## Environment

```bash
TOGETHER_AI_API_KEY=...
DOCUMENT_AGENT_URL=http://127.0.0.1:3000
DOCUMENT_AGENT_SECRET=...
```

Run the web app (`yarn dev:web`) before using the agent-backed create-document flow locally.

## Flow

`load_rules → plan → draft → validate → critique → (repair ×2) → publish | reject`

1. **Deterministic validate** — HTML/security/format/Mermaid
2. **LLM critique** — semantic check that the HTML satisfies selected rules (skipped when no rules)
3. Failures feed a bounded repair loop, then full re-validation + critique

Validated documents always `auto_publish`. There is no human-review interrupt.
