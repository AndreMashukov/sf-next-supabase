import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['supabase/tests/**/*.spec.ts', 'supabase/tests/**/*.integration.spec.ts'],
  },
});
