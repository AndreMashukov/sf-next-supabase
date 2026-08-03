# `apps/web/src/lib` — organization

This folder is the **non-UI support layer** for the Next.js web app. Route pages and client components stay thin; data access, auth session plumbing, and mutation clients live here.

## Layout

```text
lib/
├── api/                   # Client-side mutation helpers (Fastify API)
│   ├── index.ts           # Barrel re-exports
│   ├── client.ts          # Auth token + postJson
│   ├── documents.ts
│   ├── directories.ts
│   ├── quizzes.ts
│   ├── rules.ts
│   ├── agent.ts
│   ├── auth.ts
│   └── agent-stream.ts    # SSE parser for agent streaming
├── content/               # Presentation parsers (plotly, math, HTML)
├── data/                  # Server-only read models (Postgres via RLS)
├── supabase/              # Supabase client factories per runtime
├── utils.ts               # Shared UI helpers (classNames, dates)
├── folder-constants.ts
├── directory-utils.ts
├── directory-rules.ts
├── quiz-utils.ts
├── generation-jobs.ts
├── generation-job-events.ts
└── storage.ts
```

Related top-level folders:

```text
hooks/                     # Client hooks (e.g. realtime generation jobs)
components/
├── layout/                # AppShell, Sidebar, TopAppBar
├── ui/                    # Primitives
├── documents|directories|quizzes|rules|content|agent/
app/
├── (auth)/                # login, signup
└── (app)/                 # AppShell layout + feature routes
```

## Design goals

1. **Separate routing from data access (reads).**  
   `app/**/page.tsx` resolves params, calls `notFound()`, and composes UI. Queries and snake_case → camelCase mapping live in `lib/data`.

2. **Keep writes out of the page layer.**  
   Mutations run in the Fastify API. The browser calls them through `lib/api`.

3. **One Supabase client per runtime.**  
   Cookie/session handling differs between browser, RSC, and middleware. Those factories stay under `lib/supabase/`.

4. **Fail closed for server modules.**  
   `lib/data/*` starts with `import 'server-only'` so those modules cannot be bundled into Client Components by mistake.

## Request flows

```text
READ (Server Component)
  page.tsx
    → lib/data/{documents,quizzes,...}.ts
      → lib/supabase/server.ts
        → Postgres (RLS as the signed-in user)

WRITE (Client Component)
  *Client.tsx
    → lib/api
      → lib/supabase/client.ts  (access token)
      → Fastify API
        → service role + Storage + Together AI (server-side)

AUTH GATE (every matched request)
  src/middleware.ts
    → lib/supabase/middleware.ts (updateSession)
```

## How pages should use this layer

**Good (read page):**

```tsx
import { getDocumentById } from '@/lib/data/documents';
import { listQuizzesByDocumentId } from '@/lib/data/quizzes';

export default async function DocumentDetailPage({ params }) {
  const { id } = await params;
  const [document, quizzes] = await Promise.all([
    getDocumentById(id),
    listQuizzesByDocumentId(id),
  ]);
  if (!document) notFound();
  return <DocumentDetailClient document={document} quizzes={quizzes} />;
}
```

**Good (mutation in a client component):**

```tsx
'use client';
import { generateQuiz } from '@/lib/api';
```

**Avoid:**

- Importing `@/lib/data/*` from a Client Component (`server-only` will fail the build)
- Importing `@/lib/api` from a Server Component to call the Fastify API without a deliberate server path
- Duplicating row mappers or raw Supabase queries inside `page.tsx`

## Adding new code

| If you need to… | Put it in… |
|-----------------|------------|
| Load rows for an RSC page | `lib/data/` |
| Call a new API endpoint from the UI | New export under `lib/api/` (and re-export from `index.ts`) |
| Touch cookies / session in a new runtime | Extend `lib/supabase/` |
| Presentation parsing (HTML/math/charts) | `lib/content/` |
| Client-only React hooks | `hooks/` |
| Format display values | `lib/utils.ts` or a focused helper next to it |
| Route-specific client UI | `app/(app)/…/_components/` |
| Reusable domain UI | `components/<domain>/` |

Keep route files as composition: params, loading/error boundaries, and which data/API helpers to call.
