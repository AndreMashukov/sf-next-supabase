import 'server-only';

import { createClient } from '@/supabase/server';
import { listDirectoryTree } from '@/data/directories';
import { buildDirectorySummaries } from '@/domain/directories/utils';
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

export interface DirectoryCounts {
  documentCount: number;
  childCount: number;
}

export interface NavigationTree {
  directories: DirectoryTreeNode[];
  documentsByDirectoryId: Record<string, NavDocument[]>;
  rootDocuments: NavDocument[];
  directoryCounts: Record<string, DirectoryCounts>;
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

  const [{ data: documents }, { data: quizzes }, directories, { data: allDirectories }, { data: directoryRules }] =
    await Promise.all([
      supabase.from('documents').select('id, title, directory_id').order('created_at', { ascending: false }),
      supabase.from('quizzes').select('id, title, document_id').order('created_at', { ascending: false }),
      listDirectoryTree(),
      supabase.from('directories').select('id, user_id, parent_id, name, description, path, level, created_at, updated_at'),
      supabase.from('directory_rules').select('directory_id, rule_id'),
    ]);

  const ruleIdsByDirectory = new Map<string, string[]>();
  for (const row of directoryRules ?? []) {
    const existing = ruleIdsByDirectory.get(row.directory_id) ?? [];
    existing.push(row.rule_id);
    ruleIdsByDirectory.set(row.directory_id, existing);
  }

  const summaries = buildDirectorySummaries(
    (allDirectories ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      parentId: row.parent_id,
      name: row.name,
      description: row.description,
      path: row.path,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    (documents ?? []).map((row) => ({ directory_id: row.directory_id })),
    ruleIdsByDirectory,
  );

  const directoryCounts = Object.fromEntries(
    summaries.map((summary) => [
      summary.id,
      { documentCount: summary.documentCount, childCount: summary.childCount },
    ]),
  );

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
    directoryCounts,
  };
}

export async function getAuthenticatedUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? null;
}
