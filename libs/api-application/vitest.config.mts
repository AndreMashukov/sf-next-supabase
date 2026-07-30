import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(__dirname, '../shared-types/src/index.ts'),
      '@sf/api-domain': path.resolve(__dirname, '../api-domain/src/index.ts'),
      '@sf/api-application': path.resolve(__dirname, './src/index.ts'),
      '@sf/gcs': path.resolve(__dirname, '../gcs/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
