import { notFound } from 'next/navigation';
import { listDirectorySummaries } from '@/lib/data/directory-summaries';
import { getDocumentById, getDocumentHtmlById } from '@/lib/data/documents';
import { listQuizzesByDocumentId } from '@/lib/data/quizzes';
import { DocumentDetailClient } from './DocumentDetailClient';

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

  return (
    <DocumentDetailClient
      document={document}
      quizzes={quizzes}
      htmlContent={htmlContent}
      allFolders={allFolders}
    />
  );
}
