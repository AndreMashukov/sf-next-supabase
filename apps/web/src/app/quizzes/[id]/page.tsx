import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Quiz, QuizQuestion } from '@sf/shared-types';
import { QuizPageClient } from './QuizPageClient';

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

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('quizzes').select('*').eq('id', id).single();

  if (!data) {
    notFound();
  }

  return <QuizPageClient quiz={mapQuiz(data)} />;
}
