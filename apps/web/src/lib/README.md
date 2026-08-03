# `apps/web/src/lib` — organization

This folder is the **non-UI support layer** for the Next.js web app. Route pages and client components stay thin; data access, auth session plumbing, and mutation clients live here.

The read path is intentionally modeled after the study-forge **admin** app: thin `page.tsx` files call named functions in `lib/data/*` instead of embedding Supabase queries and row mappers in the route.

## Layout

```text
lib/
├── api.ts                 # Client-side mutation helpers (Fastify API)
├── utils.ts               # Shared UI helpers (classNames, dates)
├── data/                  # Server-only read models (Postgres via RLS)
│   ├── documents.ts
│   └── quizzes.ts
└── supabase/              # Supabase client factories per runtime
    ├── client.ts          # Browser (Client Components)
    ├── server.ts          # Server Components / Route Handlers
    └── middleware.ts      # Edge middleware session + route guards
```

## Design goals

1. **Separate routing from data access (reads).**  
   `app/**/page.tsx` resolves params, calls `notFound()`, and composes UI. Queries and snake_case → camelCase mapping live in `lib/data`.

2. **Keep writes out of the page layer.**  
   Create-document and generate-quiz run in the Fastify API (Storage + LLM). The browser calls them through `lib/api.ts`.

3. **One Supabase client per runtime.**  
   Cookie/session handling differs between browser, RSC, and middleware. Those factories stay under `lib/supabase/` and are not mixed.

4. **Fail closed for server modules.**  
   `lib/data/*` starts with `import 'server-only'` so those modules cannot be bundled into Client Components by mistake.

## Request flows

```text
READ (Server Component)
  page.tsx
    → lib/data/{documents,quizzes}.ts
      → lib/supabase/server.ts
        → Postgres (RLS as the signed-in user)

WRITE (Client Component)
  *Client.tsx
    → lib/api.ts
      → lib/supabase/client.ts  (access token)
      → Fastify API (`/api/v1/create-document` | `/api/v1/generate-quiz`)
        → service role + Storage + Together AI (server-side)

AUTH GATE (every matched request)
  src/middleware.ts
    → lib/supabase/middleware.ts (updateSession)
      → refresh cookies; redirect unauthenticated users off /documents|/quizzes
```

## Modules in detail

### `supabase/`

| File | Runtime | Role |
|------|---------|------|
| `client.ts` | Browser | `createBrowserClient` for login/signup, `getSession`, `signOut` |
| `server.ts` | Node / RSC | `createServerClient` bound to Next `cookies()` |
| `middleware.ts` | Edge | Same cookie pattern on `NextRequest` / `NextResponse`; also enforces auth redirects |

**Why three clients?**  
`@supabase/ssr` needs different cookie adapters. Sharing one factory would either break session refresh or force the wrong runtime APIs into the bundle.

`middleware.ts` owns the product rules:

- Unauthenticated → `/documents` or `/quizzes` redirects to `/login`
- Authenticated → `/login` or `/signup` redirects to `/documents`

The root [`src/middleware.ts`](../middleware.ts) is only a thin entry that calls `updateSession`.

### `data/` (server-only reads)

Pattern (same idea as study-forge `admin/src/lib/data`):

- Own the Supabase server client inside each function
- Map DB rows (`user_id`, `created_at`, …) to shared domain types (`userId`, `createdAt`, … from `@sf/shared-types`)
- Return `T | null` for single-get helpers; pages decide whether to call `notFound()`

| Module | Exports |
|--------|---------|
| `documents.ts` | `listDocuments()`, `getDocumentById(id)` |
| `quizzes.ts` | `listQuizzesByDocumentId(documentId)`, `getQuizById(id)` |

**What does *not* belong here (today):**

- Mutations / inserts / deletes
- Calling the Fastify API or Together AI
- React components or form state

Authorization for reads is primarily **Postgres RLS** (the anon key + user JWT). These helpers do not re-implement ACL beyond “query as the current session.”

### `api.ts` (client-only writes)

Marked `'use client'`. Used from Client Components such as `DocumentsPageClient` and `DocumentDetailClient`.

| Export | Backend |
|--------|---------|
| `createDocument(title, text)` | `POST …/api/v1/create-document` |
| `generateQuiz(documentId, title?, questionCount?)` | `POST …/api/v1/generate-quiz` |
| `signOut()` | Supabase Auth browser client |

Each mutation helper:

1. Reads the browser session access token
2. Calls the Fastify API with `Authorization: Bearer …`
3. Throws with the function’s `error` message (or a default) on non-OK responses
4. Returns the typed payload from `@sf/shared-types`

Business logic for HTML storage and quiz generation stays in `apps/api` and `libs/api-*`, not in `lib/`.

### `utils.ts`

Small presentation helpers shared by UI:

- `cn(…)` — `clsx` + `tailwind-merge`
- `formatDate(iso)` — locale medium date + short time

No I/O, no Supabase.

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
// await generateQuiz(document.id, quizTitle, 5);
```

**Avoid:**

- Importing `@/lib/data/*` from a Client Component (`server-only` will fail the build)
- Importing `@/lib/api` from a Server Component to call the Fastify API without a deliberate server path (today those helpers assume browser session)
- Duplicating `mapDocument` / `mapQuiz` or raw `.from('documents')` queries inside `page.tsx`

## Deliberate asymmetry: reads vs writes

| Concern | Where it lives |
|---------|----------------|
| List / get documents & quizzes | `lib/data` → Supabase JS (user JWT, RLS) |
| Create document, generate quiz | Fastify API → service role + Storage + LLM |
| Auth session refresh & route guards | `lib/supabase/middleware` |
| Browser auth UI | pages + `lib/supabase/client` |

This matches the product split: **reads are simple RLS-backed queries**; **writes need privileged Storage and LLM credentials** that must not ship to the browser.

## Adding new code

| If you need to… | Put it in… |
|-----------------|------------|
| Load rows for an RSC page | New or existing file under `lib/data/` |
| Call a new API endpoint from the UI | New export on `lib/api.ts` (or a sibling client module) |
| Touch cookies / session in a new runtime | Extend `lib/supabase/`, do not invent a fourth ad-hoc client |
| Format display values | `lib/utils.ts` (or a focused helper next to it) |

Keep route files as composition: params, loading/error boundaries, and which data/API helpers to call.