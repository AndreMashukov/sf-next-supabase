import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/backend/src/**/*.spec.ts', 'apps/backend/src/**/*.integration.spec.ts'],
  },
});
