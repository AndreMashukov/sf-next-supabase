import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['libs/directory-agent/src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@sf/shared-types': path.resolve(__dirname, '../shared-types/src/index.ts'),
      '@sf/api-domain': path.resolve(__dirname, '../api-domain/src/index.ts'),
      '@sf/directory-agent': path.resolve(__dirname, './src/index.ts'),
      '@langchain/langgraph/prebuilt': path.resolve(
        __dirname,
        '../../node_modules/@langchain/langgraph/dist/prebuilt/index.js',
      ),
    },
  },
});
