import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: configDir,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(configDir, '../shared-types/src/index.ts'),
      '@sf/api-domain': path.resolve(configDir, '../api-domain/src/index.ts'),
      '@sf/api-application': path.resolve(configDir, '../api-application/src/index.ts'),
      '@sf/api-infra-supabase': path.resolve(configDir, '../api-infra-supabase/src/index.ts'),
      '@sf/api-infra-storage': path.resolve(configDir, '../api-infra-storage/src/index.ts'),
      '@sf/api-infra-ai': path.resolve(configDir, '../api-infra-ai/src/index.ts'),
      '@sf/api-routes': path.resolve(configDir, './src/index.ts'),
      '@sf/storage-paths': path.resolve(configDir, '../storage-paths/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
