import 'server-only';

import { createClient } from '@/supabase/server';
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

type NavigationRpcDirectory = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  path: string;
  level: number;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type NavigationRpcDocument = {
  id: string;
  title: string;
  directory_id: string | null;
};

type NavigationRpcQuiz = {
  id: string;
  title: string;
  document_id: string;
};

type NavigationRpcDirectoryRule = {
  directory_id: string;
  rule_id: string;
};

type NavigationRpcPayload = {
  directories: NavigationRpcDirectory[] | null;
  documents: NavigationRpcDocument[] | null;
  quizzes: NavigationRpcQuiz[] | null;
  directory_rules: NavigationRpcDirectoryRule[] | null;
};

function buildDirectoryTree(
  directories: NavigationRpcDirectory[],
  ruleIdsByDirectory: Map<string, string[]>,
): DirectoryTreeNode[] {
  const nodes = new Map<string, DirectoryTreeNode>();

  for (const row of directories) {
    nodes.set(row.id, {
      id: row.id,
      userId: row.user_id,
      parentId: row.parent_id,
      name: row.name,
      description: row.description,
      path: row.path,
      level: row.level,
      color: row.color ?? '#8b5cf6',
      icon: row.icon ?? 'Folder',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      children: [],
      ruleIds: ruleIdsByDirectory.get(row.id) ?? [],
    });
  }

  const roots: DirectoryTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: DirectoryTreeNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export async function listNavigationTree(): Promise<NavigationTree> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_navigation_tree');

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data ?? {
    directories: [],
    documents: [],
    quizzes: [],
    directory_rules: [],
  }) as NavigationRpcPayload;

  const directories = payload.directories ?? [];
  const documents = payload.documents ?? [];
  const quizzes = payload.quizzes ?? [];
  const directoryRules = payload.directory_rules ?? [];

  const ruleIdsByDirectory = new Map<string, string[]>();
  for (const row of directoryRules) {
    const existing = ruleIdsByDirectory.get(row.directory_id) ?? [];
    existing.push(row.rule_id);
    ruleIdsByDirectory.set(row.directory_id, existing);
  }

  const summaries = buildDirectorySummaries(
    directories.map((row) => ({
      id: row.id,
      userId: row.user_id,
      parentId: row.parent_id,
      name: row.name,
      description: row.description,
      path: row.path,
      level: row.level,
      color: row.color ?? '#8b5cf6',
      icon: row.icon ?? 'Folder',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    documents.map((row) => ({ directory_id: row.directory_id })),
    ruleIdsByDirectory,
  );

  const directoryCounts = Object.fromEntries(
    summaries.map((summary) => [
      summary.id,
      { documentCount: summary.documentCount, childCount: summary.childCount },
    ]),
  );

  const quizzesByDocument = new Map<string, NavQuiz[]>();
  for (const row of quizzes) {
    const quiz: NavQuiz = {
      id: row.id,
      title: row.title,
      documentId: row.document_id,
    };
    const existing = quizzesByDocument.get(row.document_id) ?? [];
    existing.push(quiz);
    quizzesByDocument.set(row.document_id, existing);
  }

  const navDocuments: NavDocument[] = documents.map((document) => ({
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
    directories: buildDirectoryTree(directories, ruleIdsByDirectory),
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
