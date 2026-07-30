import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { listDirectoryTree } from '@/lib/data/directories';
import type { DirectoryTreeNode } from '@sf/shared-types';

export interface NavQuiz {
  id: string;
  title: string;
  documentId: string;
}

export interface NavDocument {
  id: string;
  title: string;
  directoryId: string | null;
  quizzes: NavQuiz[];
}

export interface NavigationTree {
  directories: DirectoryTreeNode[];
  documentsByDirectoryId: Record<string, NavDocument[]>;
  rootDocuments: NavDocument[];
}

type DocumentRow = {
  id: string;
  title: string;
  directory_id: string | null;
};

type QuizRow = {
  id: string;
  title: string;
  document_id: string;
};

export async function listNavigationTree(): Promise<NavigationTree> {
  const supabase = await createClient();

  const [{ data: documents }, { data: quizzes }, directories] = await Promise.all([
    supabase.from('documents').select('id, title, directory_id').order('created_at', { ascending: false }),
    supabase.from('quizzes').select('id, title, document_id').order('created_at', { ascending: false }),
    listDirectoryTree(),
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

  const navDocuments: NavDocument[] = ((documents ?? []) as DocumentRow[]).map((document) => ({
    id: document.id,
    title: document.title,
    directoryId: document.directory_id,
    quizzes: quizzesByDocument.get(document.id) ?? [],
  }));

  const documentsByDirectoryId: Record<string, NavDocument[]> = {};
  const rootDocuments: NavDocument[] = [];

  for (const document of navDocuments) {
    if (!document.directoryId) {
      rootDocuments.push(document);
      continue;
    }

    const bucket = documentsByDirectoryId[document.directoryId] ?? [];
    bucket.push(document);
    documentsByDirectoryId[document.directoryId] = bucket;
  }

  return {
    directories,
    documentsByDirectoryId,
    rootDocuments,
  };
}

export async function getAuthenticatedUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? null;
}
