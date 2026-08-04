# `apps/web/src` — organization

Purpose folders replace a catch-all `lib/`. Routing stays in `app/`; shared UI in `components/`.

```text
src/
├── app/                 # App Router only
├── components/          # Reusable UI by domain
├── hooks/               # Client React hooks
├── data/                # Server-only DAL (import 'server-only')
├── mutations/           # Browser → Fastify API helpers
├── supabase/            # Clients per runtime (browser / RSC / middleware)
├── utils/               # Tiny pure helpers (cn, formatDate)
├── content/             # Presentation parsers (plotly, math, HTML)
├── jobs/                # Generation job helpers + events
└── domain/              # Pure domain logic (no I/O)
    ├── directories/
    └── quizzes/
```

## Placement rule

| If the code… | Put it in… |
|---|---|
| Queries Postgres / Storage on the server | `data/` |
| Calls Fastify from the browser | `mutations/` |
| Creates a Supabase client | `supabase/` |
| Is pure UI formatting | `utils/` |
| Parses HTML / math / Plotly | `content/` |
| Tracks generation jobs | `jobs/` |
| Encodes domain rules with no I/O | `domain/<name>/` |
| Is React UI | `components/<domain>/` |
| Is a route-only client | `app/(app)/…/_components/` |

## Dependency direction

```text
app → components / hooks → mutations | domain | content | utils | jobs
app → data → supabase | data/storage
```

Do not import `data/` from Client Components. Do not import `mutations/` from Server Components unless you intentionally add a server path.
