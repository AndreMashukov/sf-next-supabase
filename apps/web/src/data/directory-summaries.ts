import 'server-only';

import type { Directory } from '@sf/shared-types';
import {
  buildDirectorySummaries as buildSummaries,
  computeDeleteImpact as computeImpact,
} from '@/domain/directories/utils';
import { createClient } from '@/supabase/server';
import { listDirectoryRuleIds } from '@/data/directories';

export type DirectorySummary = Directory & {
  documentCount: number;
  childCount: number;
  ruleIds: string[];
};

export type DirectoryDeleteImpact = {
  directoryCount: number;
  documentCount: number;
};

type DirectoryRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  path: string;
  level: number;
  created_at: string;
  updated_at: string;
};

function mapDirectory(row: DirectoryRow): Directory {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description,
    path: row.path,
    level: row.level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDirectorySummaries(parentId?: string | null): Promise<DirectorySummary[]> {
  const supabase = await createClient();
  const [{ data: directories }, { data: documents }, { data: directoryRules }] = await Promise.all([
    supabase.from('directories').select('*').order('path', { ascending: true }),
    supabase.from('documents').select('directory_id'),
    supabase.from('directory_rules').select('directory_id, rule_id'),
  ]);

  const ruleIdsByDirectory = new Map<string, string[]>();
  for (const row of directoryRules ?? []) {
    const existing = ruleIdsByDirectory.get(row.directory_id) ?? [];
    existing.push(row.rule_id);
    ruleIdsByDirectory.set(row.directory_id, existing);
  }

  const summaries = buildSummaries(
    ((directories ?? []) as DirectoryRow[]).map(mapDirectory),
    documents ?? [],
    ruleIdsByDirectory,
  );

  if (parentId === undefined) {
    return summaries;
  }

  return summaries.filter((summary) => summary.parentId === parentId);
}

export async function getDirectorySummary(directoryId: string): Promise<DirectorySummary | null> {
  const summaries = await listDirectorySummaries();
  return summaries.find((summary) => summary.id === directoryId) ?? null;
}

export async function getDirectoryDeleteImpact(directoryId: string): Promise<DirectoryDeleteImpact> {
  const supabase = await createClient();
  const [{ data: directories }, { data: documents }] = await Promise.all([
    supabase.from('directories').select('*'),
    supabase.from('documents').select('directory_id'),
  ]);

  return computeImpact(
    ((directories ?? []) as DirectoryRow[]).map(mapDirectory),
    documents ?? [],
    directoryId,
  );
}

export async function listInheritedRuleIds(
  directoryId: string,
  ancestorDirectoryIds: string[],
): Promise<string[]> {
  const orderedIds = [...ancestorDirectoryIds, directoryId];
  const ruleIds: string[] = [];

  for (const id of orderedIds) {
    for (const ruleId of await listDirectoryRuleIds(id)) {
      if (!ruleIds.includes(ruleId)) {
        ruleIds.push(ruleId);
      }
    }
  }

  return ruleIds;
}

export async function getDeleteImpactsForFolders(
  folderIds: string[],
): Promise<Record<string, DirectoryDeleteImpact>> {
  const supabase = await createClient();
  const [{ data: directories }, { data: documents }] = await Promise.all([
    supabase.from('directories').select('*'),
    supabase.from('documents').select('directory_id'),
  ]);

  const mappedDirectories = ((directories ?? []) as DirectoryRow[]).map(mapDirectory);
  const mappedDocuments = documents ?? [];

  return Object.fromEntries(
    folderIds.map((folderId) => [
      folderId,
      computeImpact(mappedDirectories, mappedDocuments, folderId),
    ]),
  );
}
