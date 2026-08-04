import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import {
  getDirectoryAncestors,
  getDirectoryById,
  listDirectoryRuleIds,
} from '@/data/directories';
import {
  getDeleteImpactsForFolders,
  getDirectoryDeleteImpact,
  listDirectorySummaries,
  listInheritedRuleIds,
} from '@/data/directory-summaries';
import { listDocuments } from '@/data/documents';
import { listRules } from '@/data/rules';
import { listQuizzesForDocuments } from '@/data/quizzes';
import { partitionDirectAndInheritedRules } from '@/domain/directories/rules';
import { DirectoryDetailClient } from './_components/DirectoryDetailClient';

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

  const [ancestors, allFolders, documents, rules, attachedRuleIds, deleteImpact] =
    await Promise.all([
      getDirectoryAncestors(id),
      listDirectorySummaries(),
      listDocuments(id),
      listRules(),
      listDirectoryRuleIds(id),
      getDirectoryDeleteImpact(id),
    ]);
  const quizzes = await listQuizzesForDocuments(
    documents.map((document) => ({ id: document.id, title: document.title })),
  );

  const childFolders = allFolders.filter((item) => item.parentId === id);
  const childDeleteImpacts = await getDeleteImpactsForFolders(childFolders.map((folder) => folder.id));
  const inheritedRuleIds = await listInheritedRuleIds(
    id,
    ancestors.map((ancestor) => ancestor.id),
  );
  const { directRules, inheritedRules } = partitionDirectAndInheritedRules(
    rules,
    attachedRuleIds,
    inheritedRuleIds,
  );

  return (
    <Suspense fallback={<div className="muted">Loading directory...</div>}>
      <DirectoryDetailClient
        directory={directory}
        ancestors={ancestors}
        childFolders={childFolders}
        documents={documents}
        rules={rules}
        attachedRuleIds={attachedRuleIds}
        inheritedRules={inheritedRules}
        directRules={directRules}
        allFolders={allFolders}
        deleteImpact={deleteImpact}
        childDeleteImpacts={childDeleteImpacts}
        quizzes={quizzes}
      />
    </Suspense>
  );
}
