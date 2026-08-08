---
name: check
description: Run typecheck and lint without modifying files. Use when validating changes, before commits, or when the user asks to check code quality.
allowed-tools: Bash
effort: high
argument-hint: [project or path]
---

# Check Skill

## Usage

- `/check` — typecheck + lint web and api (matches CI scope)
- `/check web` — web project only
- `/check api` — api project only

## Instructions

When invoked, always use NX with daemon/plugin isolation disabled:

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false
```

1. **TypeScript type check** (always run first):
   - `web`: `yarn nx run web:typecheck`
   - `api`: `yarn nx run api:typecheck`
   - No argument: run both `web:typecheck` and `api:typecheck`

2. **ESLint:**
   - With `web` argument: `yarn nx run web:lint`
   - With `api` argument: skip (no dedicated lint target; use workspace `yarn lint` scoped if needed)
   - Without arguments: `web:lint` then workspace `yarn lint`

3. **Report results:**
   - All pass → confirm ready for commit/PR
   - Failures → list errors with file paths; stop on first failure when running full suite

## CI Parity

For PR-ready validation, also run:

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:build
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:build
```

## Optional Tests

When changes touch libs with test targets:

```bash
yarn test:supabase              # Supabase RLS integration tests
yarn test:document-agent        # document-agent unit tests
yarn nx run api-application:test
yarn nx run api-routes:test
```
