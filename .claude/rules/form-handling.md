---
description: React Hook Form + Zod validation patterns
paths:
  - "apps/web/src/components/**/*.tsx"
  - "apps/web/src/app/**/*.tsx"
---

# Form Handling

## Approach

- **Simple inputs**: `useState` for controlled fields
- **Complex forms**: React Hook Form + Zod; name the form instance `form`

## MUST Follow

1. **MUST name the form instance `form`** when using React Hook Form.
2. **MUST use `zodResolver`** for schema-driven validation.
3. **MUST check existing Zod schemas** in `@sf/shared-types` and `@sf/validation` before creating new ones.
4. **MUST trigger mutations** via `apps/web/src/mutations/*` after validation passes.
5. **MUST use `z.infer<typeof schema>`** for form data types.

## Schema Pattern

```typescript
import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export type CreateDocumentFormData = z.infer<typeof createDocumentSchema>;
```

## NEVER Do

- NEVER bypass validation with type assertions on form data
- NEVER put form submission side effects in `useEffect` — use event handlers or mutation calls directly

## Reference

- [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)
