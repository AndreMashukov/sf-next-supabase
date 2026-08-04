import 'server-only';

import { createClient } from '@/supabase/server';
import type { Quiz, QuizQuestion } from '@sf/shared-types';

type QuizRow = {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  questions: unknown;
  created_at: string;
  updated_at: string;
};

function mapQuiz(row: QuizRow): Quiz {
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

export async function listQuizzesByDocumentId(documentId: string): Promise<Quiz[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quizzes')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(mapQuiz);
}

export type QuizWithDocumentTitle = Quiz & {
  documentTitle: string;
};

export async function listQuizzesForDocuments(
  documents: Array<{ id: string; title: string }>,
): Promise<QuizWithDocumentTitle[]> {
  if (documents.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const documentIds = documents.map((document) => document.id);
  const titleById = new Map(documents.map((document) => [document.id, document.title]));

  const { data } = await supabase
    .from('quizzes')
    .select('*')
    .in('document_id', documentIds)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => ({
    ...mapQuiz(row),
    documentTitle: titleById.get(row.document_id) ?? 'Unknown source',
  }));
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('quizzes').select('*').eq('id', id).single();

  if (!data) {
    return null;
  }

  return mapQuiz(data);
}
