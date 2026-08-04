import { notFound } from 'next/navigation';
import { listDirectorySummaries } from '@/data/directory-summaries';
import { getDocumentById, getDocumentHtmlById } from '@/data/documents';
import { listQuizzesByDocumentId } from '@/data/quizzes';
import { DocumentDetailClient } from './_components/DocumentDetailClient';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, quizzes, htmlContent, allFolders] = await Promise.all([
    getDocumentById(id),
    listQuizzesByDocumentId(id),
    getDocumentHtmlById(id),
    listDirectorySummaries(),
  ]);

  if (!document) {
    notFound();
  }

  const parentDirectory = document.directoryId
    ? allFolders.find((folder) => folder.id === document.directoryId) ?? null
    : null;

  return (
    <DocumentDetailClient
      document={document}
      quizzes={quizzes}
      htmlContent={htmlContent}
      allFolders={allFolders}
      parentDirectory={parentDirectory}
    />
  );
}
