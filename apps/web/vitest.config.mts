import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: configDir,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(configDir, '../../libs/shared-types/src/index.ts'),
      '@': path.resolve(configDir, './src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/data/**/*.spec.ts',
      'src/mutations/**/*.spec.ts',
      'src/content/**/*.spec.ts',
      'src/jobs/**/*.spec.ts',
      'src/domain/**/*.spec.ts',
      'src/hooks/**/*.spec.ts',
      'src/stores/**/*.spec.ts',
    ],
  },
});
