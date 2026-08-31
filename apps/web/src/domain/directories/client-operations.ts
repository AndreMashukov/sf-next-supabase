import type { Database } from '@sf/shared-types';
import type { Directory } from '@sf/shared-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildDirectoryPath, MAX_DIRECTORY_DEPTH } from './path';

type DirectoryRow = Database['public']['Tables']['directories']['Row'];
type TypedSupabaseClient = SupabaseClient<Database>;

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

function parseDirectoryRpcResult(data: unknown): Directory {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid directory response');
  }

  return mapDirectory(data as DirectoryRow);
}

async function listDirectoriesForUser(
  supabase: TypedSupabaseClient,
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

  return (data ?? []).map(mapDirectory);
}

async function getDirectoryOrThrow(
  supabase: TypedSupabaseClient,
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

  return mapDirectory(data);
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

export async function createDirectoryForUser(
  supabase: TypedSupabaseClient,
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

  return mapDirectory(data);
}

export async function updateDirectoryForUser(
  supabase: TypedSupabaseClient,
  userId: string,
  input: {
    directoryId: string;
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  },
): Promise<Directory> {
  if (input.name) {
    const { data, error } = await supabase.rpc('rename_directory', {
      p_directory_id: input.directoryId,
      p_name: input.name,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Directory not found');
    }

    if (input.description === undefined && input.color === undefined && input.icon === undefined) {
      return parseDirectoryRpcResult(data);
    }
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
  supabase: TypedSupabaseClient,
  userId: string,
  input: {
    directoryId: string;
    parentId?: string;
  },
): Promise<Directory> {
  const { data, error } = await supabase.rpc('move_directory', {
    p_directory_id: input.directoryId,
    p_parent_id: input.parentId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Directory not found');
  }

  return parseDirectoryRpcResult(data);
}

export async function verifyDirectoryOwnership(
  supabase: TypedSupabaseClient,
  directoryId: string,
  userId: string,
): Promise<void> {
  await getDirectoryOrThrow(supabase, directoryId, userId);
}
