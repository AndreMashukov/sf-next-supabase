import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(__dirname, '../../libs/shared-types/src/index.ts'),
      '@sf/api-domain': path.resolve(__dirname, '../../libs/api-domain/src/index.ts'),
      '@sf/api-application': path.resolve(__dirname, '../../libs/api-application/src/index.ts'),
      '@sf/api-infra-supabase': path.resolve(__dirname, '../../libs/api-infra-supabase/src/index.ts'),
      '@sf/api-infra-storage': path.resolve(__dirname, '../../libs/api-infra-storage/src/index.ts'),
      '@sf/api-infra-ai': path.resolve(__dirname, '../../libs/api-infra-ai/src/index.ts'),
      '@sf/api-routes': path.resolve(__dirname, '../../libs/api-routes/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
