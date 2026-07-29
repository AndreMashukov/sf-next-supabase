import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourcePath = join(rootDir, 'libs/shared-types/src/validation.ts');
const targetPath = join(
  rootDir,
  'apps/backend/supabase/functions/_shared/schemas.ts',
);

const source = readFileSync(sourcePath, 'utf8');
const synced = `// Auto-generated from libs/shared-types/src/validation.ts. Do not edit directly.\n${source.replace(
  "from 'zod'",
  "from 'npm:zod@4.1.9'",
)}`;

writeFileSync(targetPath, synced);

console.log(`Synced validation schemas to ${targetPath}`);
