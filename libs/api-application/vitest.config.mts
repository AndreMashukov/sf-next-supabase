import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(__dirname, '../shared-types/src/index.ts'),
      '@sf/api-domain': path.resolve(__dirname, '../api-domain/src/index.ts'),
      '@sf/api-infra-supabase': path.resolve(__dirname, '../api-infra-supabase/src/index.ts'),
      '@sf/api-application': path.resolve(__dirname, './src/index.ts'),
      '@sf/directory-agent': path.resolve(__dirname, '../directory-agent/src/index.ts'),
      '@sf/storage-paths': path.resolve(__dirname, '../storage-paths/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
