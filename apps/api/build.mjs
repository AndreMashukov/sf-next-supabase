import * as esbuild from 'esbuild';
import path from 'node:path';

const workspaceRoot = process.cwd();

await esbuild.build({
  entryPoints: [path.join(workspaceRoot, 'apps/api/src/main.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(workspaceRoot, 'dist/apps/api/main.js'),
  sourcemap: true,
  target: 'node20',
  tsconfig: path.join(workspaceRoot, 'apps/api/tsconfig.app.json'),
  external: [
    '@aws-sdk/client-s3',
    '@fastify/cors',
    '@langchain/langgraph-checkpoint-postgres',
    '@supabase/supabase-js',
    'fastify',
    'fastify-plugin',
    'pg',
  ],
  alias: {
    '@sf/api-application': path.join(workspaceRoot, 'libs/api-application/src/index.ts'),
    '@sf/api-domain': path.join(workspaceRoot, 'libs/api-domain/src/index.ts'),
    '@sf/api-infra-ai': path.join(workspaceRoot, 'libs/api-infra-ai/src/index.ts'),
    '@sf/api-infra-storage': path.join(workspaceRoot, 'libs/api-infra-storage/src/index.ts'),
    '@sf/api-infra-supabase': path.join(workspaceRoot, 'libs/api-infra-supabase/src/index.ts'),
    '@sf/api-routes': path.join(workspaceRoot, 'libs/api-routes/src/index.ts'),
    '@sf/document-agent': path.join(workspaceRoot, 'libs/document-agent/src/index.ts'),
    '@sf/directory-agent': path.join(workspaceRoot, 'libs/directory-agent/src/index.ts'),
    '@sf/gcs': path.join(workspaceRoot, 'libs/gcs/src/index.ts'),
    '@sf/shared-types': path.join(workspaceRoot, 'libs/shared-types/src/index.ts'),
  },
});

console.log('Built dist/apps/api/main.js');
