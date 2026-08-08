---
description: Styling — Tailwind CSS, Lucide icons, design tokens
paths:
  - "apps/web/src/**/*.tsx"
  - "apps/web/src/app/**/*.css"
---

# Styling Rules

## MUST Follow

1. **MUST use Lucide React** for icons — no inline `<svg>` when a Lucide icon exists.
2. **MUST use `cn()`** from `apps/web/src/utils/index.ts` for conditional class composition.
3. **MUST use CSS classes** from `apps/web/src/app/global.css` and parity CSS files (`directory-ui-parity.css`, `quiz-ui-parity.css`, `document-ui-parity.css`).
4. **MUST write accessible markup** with proper ARIA labels on interactive elements.
5. **MUST use UI primitives** from `apps/web/src/components/ui/` (Select, DropdownMenu) when available.

## Button Conventions

- Primary action: `.button` class
- Secondary/dismiss: `.button.secondary`
- Destructive: use destructive styling only for irreversible actions
- Icon buttons: Lucide icon child with appropriate size prop

## NEVER Do

- NEVER use arbitrary hex colors when a CSS token/class exists
- NEVER use inline `<svg>` when Lucide has an equivalent icon
- NEVER create one-off UI primitives when existing components cover the need

## Reference

- [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)
