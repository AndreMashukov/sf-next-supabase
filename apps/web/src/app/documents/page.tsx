import { getDeleteImpactsForFolders, listDirectorySummaries } from '@/lib/data/directory-summaries';
import { listDocuments } from '@/lib/data/documents';
import { listRules } from '@/lib/data/rules';
import { DocumentsPageClient } from './DocumentsPageClient';

export default async function DocumentsPage() {
  const [documents, rules, allFolders] = await Promise.all([
    listDocuments(null),
    listRules(),
    listDirectorySummaries(),
  ]);

  const rootFolders = allFolders.filter((directory) => !directory.parentId);
  const deleteImpacts = await getDeleteImpactsForFolders(rootFolders.map((folder) => folder.id));

  return (
    <DocumentsPageClient
      initialDocuments={documents}
      initialRules={rules}
      initialFolders={rootFolders}
      allFolders={allFolders}
      deleteImpacts={deleteImpacts}
    />
  );
}
