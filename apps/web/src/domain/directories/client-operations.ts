import type { Directory } from '@sf/shared-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildDirectoryPath, MAX_DIRECTORY_DEPTH } from './path';

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

async function listDirectoriesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Directory[]> {
  const { data, error } = await supabase
    .from('directories')
    .select('*')
    .eq('user_id', userId)
    .order('path', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DirectoryRow[]).map(mapDirectory);
}

async function getDirectoryOrThrow(
  supabase: SupabaseClient,
  directoryId: string,
  userId: string,
): Promise<Directory> {
  const { data, error } = await supabase
    .from('directories')
    .select('*')
    .eq('id', directoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Directory not found');
  }

  return mapDirectory(data as DirectoryRow);
}

function assertDirectoryDepth(parent: Directory | null): number {
  const nextLevel = (parent?.level ?? -1) + 1;

  if (nextLevel > MAX_DIRECTORY_DEPTH) {
    throw new Error(`Directory depth cannot exceed ${MAX_DIRECTORY_DEPTH}`);
  }

  return nextLevel;
}

function assertSiblingNameAvailable(
  directories: Directory[],
  name: string,
  parentId: string | undefined,
  excludeDirectoryId?: string,
) {
  const conflict = directories.find(
    (directory) =>
      directory.id !== excludeDirectoryId &&
      directory.parentId === (parentId ?? null) &&
      directory.name.toLowerCase() === name.toLowerCase(),
  );

  if (conflict) {
    throw new Error('A directory with this name already exists in the target location');
  }
}

function assertNotDescendant(
  directories: Directory[],
  directoryId: string,
  targetParentId: string | undefined,
) {
  if (!targetParentId) {
    return;
  }

  if (targetParentId === directoryId) {
    throw new Error('A directory cannot be moved into itself');
  }

  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  let current = byId.get(targetParentId);

  while (current) {
    if (current.id === directoryId) {
      throw new Error('A directory cannot be moved into its own descendant');
    }

    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
}

async function updateDirectorySubtreePaths(
  supabase: SupabaseClient,
  userId: string,
  directories: Directory[],
  directory: Directory,
  nextName?: string,
) {
  const nextPath = buildDirectoryPath(
    directory.parentId
      ? (directories.find((item) => item.id === directory.parentId)?.path ?? null)
      : null,
    nextName ?? directory.name,
  );

  const { error: rootError } = await supabase
    .from('directories')
    .update({
      ...(nextName ? { name: nextName } : {}),
      path: nextPath,
    })
    .eq('id', directory.id)
    .eq('user_id', userId);

  if (rootError) {
    throw new Error(rootError.message);
  }

  const descendants = directories.filter((item) => item.path.startsWith(`${directory.path}/`));
  const pathMap = new Map<string, string>([[directory.path, nextPath]]);

  for (const descendant of descendants.sort(
    (left, right) => left.path.length - right.path.length,
  )) {
    const parentPath = pathMap.get(descendant.path.slice(0, descendant.path.lastIndexOf('/')));

    if (!parentPath) {
      continue;
    }

    const updatedPath = `${parentPath}/${descendant.name}`;
    pathMap.set(descendant.path, updatedPath);

    const { error } = await supabase
      .from('directories')
      .update({
        path: updatedPath,
        level: updatedPath.split('/').filter(Boolean).length - 1,
      })
      .eq('id', descendant.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createDirectoryForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    name: string;
    parentId?: string;
    description?: string;
    color?: string;
    icon?: string;
  },
): Promise<Directory> {
  const parent = input.parentId
    ? await getDirectoryOrThrow(supabase, input.parentId, userId)
    : null;
  const level = assertDirectoryDepth(parent);
  const directories = await listDirectoriesForUser(supabase, userId);
  assertSiblingNameAvailable(directories, input.name, input.parentId);

  const { data, error } = await supabase
    .from('directories')
    .insert({
      user_id: userId,
      parent_id: input.parentId ?? null,
      name: input.name,
      description: input.description ?? '',
      path: buildDirectoryPath(parent?.path ?? null, input.name),
      level,
      color: input.color ?? '#8b5cf6',
      icon: input.icon ?? 'Folder',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create directory');
  }

  return mapDirectory(data as DirectoryRow);
}

export async function updateDirectoryForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    directoryId: string;
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  },
): Promise<Directory> {
  const directory = await getDirectoryOrThrow(supabase, input.directoryId, userId);

  if (input.name && input.name !== directory.name) {
    const directories = await listDirectoriesForUser(supabase, userId);
    assertSiblingNameAvailable(
      directories,
      input.name,
      directory.parentId ?? undefined,
      directory.id,
    );
    await updateDirectorySubtreePaths(supabase, userId, directories, directory, input.name);
  }

  const updates: {
    description?: string;
    color?: string;
    icon?: string;
  } = {};

  if (input.description !== undefined) updates.description = input.description;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('directories')
      .update(updates)
      .eq('id', input.directoryId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  return getDirectoryOrThrow(supabase, input.directoryId, userId);
}

export async function moveDirectoryForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    directoryId: string;
    parentId?: string;
  },
): Promise<Directory> {
  const directory = await getDirectoryOrThrow(supabase, input.directoryId, userId);
  const directories = await listDirectoriesForUser(supabase, userId);

  assertNotDescendant(directories, directory.id, input.parentId);

  const parent = input.parentId
    ? await getDirectoryOrThrow(supabase, input.parentId, userId)
    : null;
  const nextLevel = assertDirectoryDepth(parent);
  const subtreeDepth = Math.max(
    0,
    ...directories
      .filter((item) => item.id === directory.id || item.path.startsWith(`${directory.path}/`))
      .map((item) => item.level - directory.level),
  );

  if (nextLevel + subtreeDepth > MAX_DIRECTORY_DEPTH) {
    throw new Error('Moving this directory would exceed the maximum depth');
  }

  assertSiblingNameAvailable(directories, directory.name, input.parentId, directory.id);

  const { error: moveError } = await supabase
    .from('directories')
    .update({
      parent_id: input.parentId ?? null,
      level: nextLevel,
    })
    .eq('id', directory.id)
    .eq('user_id', userId);

  if (moveError) {
    throw new Error(moveError.message);
  }

  const updatedDirectory = await getDirectoryOrThrow(supabase, directory.id, userId);
  await updateDirectorySubtreePaths(supabase, userId, directories, {
    ...updatedDirectory,
    parentId: input.parentId ?? null,
  });

  return getDirectoryOrThrow(supabase, directory.id, userId);
}

export async function verifyDirectoryOwnership(
  supabase: SupabaseClient,
  directoryId: string,
  userId: string,
): Promise<void> {
  await getDirectoryOrThrow(supabase, directoryId, userId);
}
