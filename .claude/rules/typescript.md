---
description: TypeScript type safety — no assertions, strict typing
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript — sf-next-supabase

## MUST Follow

1. **MUST use interfaces** for props and data structures (prefix with `I` when following existing convention).
2. **MUST use type guards** instead of type assertions when narrowing unknown values.
3. **MUST use `z.infer<typeof schema>`** for form and API payload types derived from Zod.
4. **MUST import shared types** from `@sf/shared-types` for cross-boundary contracts (web ↔ API ↔ libs).
5. **MUST prefix unused variables** with underscore (`_error`, `_result`).
6. **MUST use path aliases** from [tsconfig.base.json](../../tsconfig.base.json): `@sf/shared-types`, `@sf/validation`, `@sf/api-*`, etc.

## NEVER Do

- NEVER: `as any`, `as unknown`, `as Record<string, unknown>`
- NEVER: `@ts-ignore`, `@ts-expect-error`
- NEVER create duplicate types — check `@sf/shared-types` and `@sf/validation` first
- NEVER use empty interfaces — use `Record<string, never>` or omit props

## Project-Specific Allowances

Third-party boundaries may require narrow escapes. If unavoidable, use a single-line disable with a reason:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row boundary
```

Prefer fixing the actual type over adding disables.

## Reference

- [libs/shared-types/CLAUDE.md](../../libs/shared-types/CLAUDE.md)
- [README.md](../../README.md)
