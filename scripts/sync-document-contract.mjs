import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourcePath = join(rootDir, 'libs/shared-types/src/document-contract.ts');
const targetPath = join(
  rootDir,
  'apps/backend/supabase/functions/_shared/document-contract.ts',
);

const source = readFileSync(sourcePath, 'utf8');
const synced = `// Auto-generated from libs/shared-types/src/document-contract.ts. Do not edit directly.\n${source}`;

writeFileSync(targetPath, synced);

console.log(`Synced document contract to ${targetPath}`);
