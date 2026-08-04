import 'server-only';

import { createClient } from '@/supabase/server';
import type { Directory, DirectoryTreeNode } from '@sf/shared-types';

type DirectoryRow = {
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

type DirectoryRuleRow = {
  directory_id: string;
  rule_id: string;
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
    color: row.color ?? '#8b5cf6',
    icon: row.icon ?? 'Folder',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildTree(
  directories: Directory[],
  ruleIdsByDirectory: Map<string, string[]>,
): DirectoryTreeNode[] {
  const nodes = new Map<string, DirectoryTreeNode>();

  for (const directory of directories) {
    nodes.set(directory.id, {
      ...directory,
      children: [],
      ruleIds: ruleIdsByDirectory.get(directory.id) ?? [],
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

export async function listDirectories(): Promise<Directory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('directories')
    .select('*')
    .order('path', { ascending: true });

  return ((data ?? []) as DirectoryRow[]).map(mapDirectory);
}

export async function getDirectoryById(id: string): Promise<Directory | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('directories').select('*').eq('id', id).maybeSingle();

  if (!data) {
    return null;
  }

  return mapDirectory(data as DirectoryRow);
}

export async function listDirectoryTree(): Promise<DirectoryTreeNode[]> {
  const supabase = await createClient();
  const [{ data: directories }, { data: directoryRules }] = await Promise.all([
    supabase.from('directories').select('*').order('path', { ascending: true }),
    supabase.from('directory_rules').select('directory_id, rule_id'),
  ]);

  const ruleIdsByDirectory = new Map<string, string[]>();

  for (const row of (directoryRules ?? []) as DirectoryRuleRow[]) {
    const existing = ruleIdsByDirectory.get(row.directory_id) ?? [];
    existing.push(row.rule_id);
    ruleIdsByDirectory.set(row.directory_id, existing);
  }

  return buildTree(((directories ?? []) as DirectoryRow[]).map(mapDirectory), ruleIdsByDirectory);
}

export async function listDirectoryRuleIds(directoryId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('directory_rules')
    .select('rule_id')
    .eq('directory_id', directoryId);

  return ((data ?? []) as { rule_id: string }[]).map((row) => row.rule_id);
}

export async function getDirectoryAncestors(directoryId: string): Promise<Directory[]> {
  const directories = await listDirectories();
  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  const ancestors: Directory[] = [];
  let current = byId.get(directoryId);

  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) {
      break;
    }

    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}
