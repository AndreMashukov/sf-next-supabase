import { notFound } from 'next/navigation';
import {
  getDirectoryAncestors,
  getDirectoryById,
  listDirectories,
  listDirectoryRuleIds,
} from '@/lib/data/directories';
import { listDocuments } from '@/lib/data/documents';
import { listRules } from '@/lib/data/rules';
import { DirectoryPageClient } from '@/app/documents/DocumentsPageClient';

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directory = await getDirectoryById(id);

  if (!directory) {
    notFound();
  }

  const [ancestors, directories, documents, rules, attachedRuleIds] = await Promise.all([
    getDirectoryAncestors(id),
    listDirectories(),
    listDocuments(id),
    listRules(),
    listDirectoryRuleIds(id),
  ]);

  const childFolders = directories.filter((item) => item.parentId === id);

  return (
    <DirectoryPageClient
      directory={directory}
      ancestors={ancestors}
      childFolders={childFolders}
      documents={documents}
      rules={rules}
      attachedRuleIds={attachedRuleIds}
    />
  );
}
