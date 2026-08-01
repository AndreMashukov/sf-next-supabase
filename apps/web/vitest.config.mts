import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: configDir,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(configDir, '../../libs/shared-types/src/index.ts'),
      '@/lib/agent-stream': path.resolve(configDir, './src/lib/agent-stream.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/**/*.spec.ts'],
  },
});
