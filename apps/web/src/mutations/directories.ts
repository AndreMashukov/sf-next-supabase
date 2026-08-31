'use client';

import {
  createDirectorySchema,
  parseRequest,
  updateDirectorySchema,
  moveDirectorySchema,
} from '@sf/shared-types';
import { postJson } from './client';
import {
  createDirectoryForUser,
  moveDirectoryForUser,
  updateDirectoryForUser,
} from '@/domain/directories/client-operations';
import { getBrowserSupabase, requireUserId } from './supabase/client';
import type { DeleteDirectoryResponse } from '@sf/shared-types';
import { deleteDirectorySchema } from '@sf/shared-types';

export async function createDirectory(input: {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const body = parseRequest(createDirectorySchema, input);
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  return createDirectoryForUser(supabase, userId, {
    name: body.name,
    parentId: body.parentId,
    description: body.description,
    color: body.color,
    icon: body.icon,
  });
}

export async function updateDirectory(input: {
  directoryId: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const body = parseRequest(updateDirectorySchema, input);
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  return updateDirectoryForUser(supabase, userId, {
    directoryId: body.directoryId,
    name: body.name,
    description: body.description,
    color: body.color,
    icon: body.icon,
  });
}

export async function moveDirectory(directoryId: string, parentId?: string) {
  const body = parseRequest(moveDirectorySchema, { directoryId, parentId });
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  return moveDirectoryForUser(supabase, userId, {
    directoryId: body.directoryId,
    parentId: body.parentId,
  });
}

export async function deleteDirectory(directoryId: string) {
  const body = parseRequest(deleteDirectorySchema, { directoryId });
  const payload = await postJson<DeleteDirectoryResponse>('delete-directory', body);
  return payload;
}
