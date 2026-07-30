import { listDirectories } from '@/lib/data/directories';
import { listDocuments } from '@/lib/data/documents';
import { listRules } from '@/lib/data/rules';
import { DocumentsPageClient } from './DocumentsPageClient';

export default async function DocumentsPage() {
  const [documents, rules, directories] = await Promise.all([
    listDocuments(null),
    listRules(),
    listDirectories(),
  ]);

  const rootFolders = directories.filter((directory) => !directory.parentId);

  return (
    <DocumentsPageClient
      initialDocuments={documents}
      initialRules={rules}
      initialFolders={rootFolders}
    />
  );
}
