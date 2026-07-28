# sf-next-supabase

Nx monorepo for creating documents and generating quizzes from them.

- `apps/web` — Next.js frontend
- `apps/backend` — Supabase CLI project (migrations, RLS, Edge Functions)
- `libs/shared-types` — shared TypeScript contracts
- `libs/validation` — Zod schemas and text-to-HTML helpers
- `libs/gcs` — Supabase Storage path helpers

## Prerequisites

- Node.js 20+
- Yarn 1.x
- Docker (for local Supabase)
- Supabase CLI (`yarn supabase` or global install)
- Together AI API key

## Setup

```bash
yarn install
cp .env.local.example .env.local
```

Start Supabase locally:

```bash
yarn supabase:start
```

Copy the `anon`, `service_role`, and **Storage (S3)** credentials from the CLI output into `.env.local`.

Set your Together AI API key (`TOGETHER_AI_API_KEY`) in `.env.local`.

Serve Edge Functions locally:

```bash
yarn nx run backend:serve-functions
```

Start the web app:

```bash
yarn dev:web
```

Open [http://localhost:4200](http://localhost:4200) (or the port shown by Nx).

## App Flow

1. Sign up or sign in
2. Paste text to create a document (stored as HTML in Supabase Storage)
3. Open a document and generate a quiz synchronously via Together AI (`MiniMaxAI/MiniMax-M3`)
4. Take the quiz and review explanations

There is no dashboard — authenticated users land directly on the documents page.

## Useful Commands

```bash
yarn dev:web                 # Start Next.js app
yarn nx run backend:start    # Start local Supabase
yarn nx run backend:reset    # Reset DB and apply migrations
yarn nx run backend:serve-functions  # Serve Edge Functions
yarn test                    # Run unit tests
yarn lint                    # Lint all projects
yarn build                   # Build all projects
```

## Architecture

- Document metadata lives in Supabase Postgres (`documents`, `quizzes`)
- Document HTML content lives in Supabase Storage (S3-compatible API)
- Edge Functions handle authenticated create/generate workflows
- Row Level Security ensures users only access their own records

## Environment Variables

See [`.env.example`](.env.example) for the full list.

For deployed Edge Functions, set secrets via Supabase:

```bash
cd apps/backend
supabase secrets set TOGETHER_AI_API_KEY=... STORAGE_BUCKET=documents STORAGE_S3_ENDPOINT=... STORAGE_S3_ACCESS_KEY=... STORAGE_S3_SECRET_KEY=... STORAGE_S3_REGION=local
```
