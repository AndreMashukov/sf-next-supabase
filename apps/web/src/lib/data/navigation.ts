import 'server-only';

import { createClient } from '@/lib/supabase/server';

export interface NavQuiz {
  id: string;
  title: string;
  documentId: string;
}

export interface NavDocument {
  id: string;
  title: string;
  quizzes: NavQuiz[];
}

type DocumentRow = {
  id: string;
  title: string;
};

type QuizRow = {
  id: string;
  title: string;
  document_id: string;
};

export async function listDocumentsWithQuizzes(): Promise<NavDocument[]> {
  const supabase = await createClient();

  const [{ data: documents }, { data: quizzes }] = await Promise.all([
    supabase.from('documents').select('id, title').order('created_at', { ascending: false }),
    supabase.from('quizzes').select('id, title, document_id').order('created_at', { ascending: false }),
  ]);

  const quizzesByDocument = new Map<string, NavQuiz[]>();

  for (const row of (quizzes ?? []) as QuizRow[]) {
    const quiz: NavQuiz = {
      id: row.id,
      title: row.title,
      documentId: row.document_id,
    };
    const existing = quizzesByDocument.get(row.document_id) ?? [];
    existing.push(quiz);
    quizzesByDocument.set(row.document_id, existing);
  }

  return ((documents ?? []) as DocumentRow[]).map((document) => ({
    id: document.id,
    title: document.title,
    quizzes: quizzesByDocument.get(document.id) ?? [],
  }));
}

export async function getAuthenticatedUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? null;
}
