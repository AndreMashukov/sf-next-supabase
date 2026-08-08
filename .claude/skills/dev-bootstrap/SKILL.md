---
name: dev-bootstrap
description: Bring up a complete local dev environment — env setup, Supabase, LiteLLM proxy, API, and web app
effort: high
allowed-tools: Bash
---

# Dev Bootstrap

Bring up the full local dev stack in order: env init → Supabase → LiteLLM → API → web.

## Steps

### 1. Initialize env + deps

Skip if `.env.local` already exists.

```bash
yarn install
cp .env.example .env.local
```

### 2. Start Supabase locally

```bash
yarn supabase:start
```

Wait for the CLI to print connection details (~30 s). Copy the `anon`, `service_role`, and Storage (S3) credentials into `.env.local`.

### 3. Start LiteLLM proxy (background)

Requires `TOGETHER_AI_API_KEY` and `LITELLM_MASTER_KEY` in `.env.local`.

```bash
yarn litellm:dev
```

Serves on http://127.0.0.1:4000.

### 4. Start Fastify API (background)

```bash
yarn dev:api
```

Serves on http://127.0.0.1:3001.

### 5. Start Next.js web app (background)

```bash
yarn dev:web
```

Serves on http://localhost:4200 (or the port shown by Nx).

## Report

When all steps complete, report:

- **Web app:** http://localhost:4200
- **Supabase Studio:** http://127.0.0.1:54323
- **API:** http://127.0.0.1:3001
- **LiteLLM:** http://127.0.0.1:4000
- **Background tasks:** list task IDs so the user can stop them later

## Critical Gotchas

- `NEXT_PUBLIC_SUPABASE_URL` and keys in `.env.local` MUST match the local Supabase instance
- `NEXT_PUBLIC_API_URL` defaults to `http://127.0.0.1:3001` — API must be running before web mutations work
- LiteLLM proxy must be running for AI generation and agent features

## Tear Down

```bash
yarn supabase:stop    # stop local Supabase
pkill -f "litellm"    # stop LiteLLM proxy
pkill -f "dev:api"    # stop API
pkill -f "dev:web"    # stop web
```

## Reference

- [README.md](../../README.md)
- [.env.example](../../.env.example)
