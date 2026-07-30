# sf-next-supabase

Nx monorepo for creating documents and generating quizzes from them.

- `apps/web` — Next.js frontend
- `apps/api` — Dockerized Fastify backend (replaces Deno Edge Functions)
- `supabase/` — Supabase CLI project (migrations, RLS, local stack)
- `libs/shared-types` — shared TypeScript contracts and Zod schemas
- `libs/validation` — Zod re-exports and text-to-HTML helpers
- `libs/gcs` — Supabase Storage path helpers
- `libs/api-*` — layered Fastify backend libraries (domain, application, infra, routes)

## Prerequisites

- Node.js 20+
- Yarn 1.x
- Docker (for local Supabase and production API image)
- Supabase CLI (`yarn supabase` or global install)
- Together AI API key

## Setup

```bash
yarn install
cp .env.example .env.local
```

Start Supabase locally:

```bash
yarn supabase:start
```

Copy the `anon`, `service_role`, and **Storage (S3)** credentials from the CLI output into `.env.local`.

Set your Together AI API key (`TOGETHER_AI_API_KEY`) in `.env.local`.

Start the Fastify API:

```bash
yarn dev:api
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
yarn dev:web              # Start Next.js app
yarn dev:api              # Start Fastify API on port 3001
yarn nx run supabase:start       # Start local Supabase
yarn nx run supabase:push        # Apply pending migrations to local DB
yarn nx run supabase:reset       # Reset local DB and reapply all migrations
yarn nx run supabase:push-remote # Push migrations to linked remote project
yarn test:supabase               # Run Supabase RLS integration tests
yarn nx run api:build     # Bundle Fastify API for production
yarn test                 # Run unit tests
yarn lint                 # Lint all projects
yarn build                # Build all projects
```

## Architecture

- Document metadata lives in Supabase Postgres (`documents`, `quizzes`, `rules`)
- Document HTML content lives in Supabase Storage (S3-compatible API)
- Fastify API handles authenticated create/generate workflows at `/functions/v1/*`
- Supabase remains the database, auth, and storage provider
- Row Level Security ensures users only access their own records on read paths

## Environment Variables

See [`.env.example`](.env.example) for the full list.

The web client uses `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:3001`) and calls `${NEXT_PUBLIC_API_URL}/functions/v1/*` for mutations.

## Docker

Build and run the API container:

```bash
docker build -f apps/api/Dockerfile -t sf-api .
docker run --env-file .env.local -p 3001:3001 sf-api
```
