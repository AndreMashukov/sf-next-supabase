import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Document, Quiz, QuizQuestion } from '@sf/shared-types';
import { DocumentDetailClient } from './DocumentDetailClient';

function mapDocument(row: {
  id: string;
  user_id: string;
  title: string;
  description: string;
  word_count: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
}): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    wordCount: row.word_count,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuiz(row: {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  questions: unknown;
  created_at: string;
  updated_at: string;
}): Quiz {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    title: row.title,
    questions: row.questions as QuizQuestion[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: documentRow }, { data: quizRows }] = await Promise.all([
    supabase.from('documents').select('*').eq('id', id).single(),
    supabase
      .from('quizzes')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!documentRow) {
    notFound();
  }

  return (
    <DocumentDetailClient
      document={mapDocument(documentRow)}
      quizzes={(quizRows ?? []).map(mapQuiz)}
    />
  );
}
