import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: configDir,
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(configDir, '../../libs/shared-types/src/index.ts'),
      '@/lib/api/agent-stream': path.resolve(configDir, './src/lib/api/agent-stream.ts'),
      '@': path.resolve(configDir, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/**/*.spec.ts', 'src/hooks/**/*.spec.ts'],
  },
});
