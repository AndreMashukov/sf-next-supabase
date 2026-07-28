import { notFound } from 'next/navigation';
import { getDocumentById } from '@/lib/data/documents';
import { listQuizzesByDocumentId } from '@/lib/data/quizzes';
import { DocumentDetailClient } from './DocumentDetailClient';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, quizzes] = await Promise.all([
    getDocumentById(id),
    listQuizzesByDocumentId(id),
  ]);

  if (!document) {
    notFound();
  }

  return <DocumentDetailClient document={document} quizzes={quizzes} />;
}
