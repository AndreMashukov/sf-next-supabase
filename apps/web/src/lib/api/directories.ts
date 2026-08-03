'use client';

import {
  createDirectorySchema,
  deleteDirectorySchema,
  moveDirectorySchema,
  parseRequest,
  updateDirectorySchema,
  type CreateDirectoryResponse,
  type DeleteDirectoryResponse,
  type MoveDirectoryResponse,
  type UpdateDirectoryResponse,
} from '@sf/shared-types';
import { postJson } from './client';

export async function createDirectory(input: {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const body = parseRequest(createDirectorySchema, input);
  const payload = await postJson<CreateDirectoryResponse>('create-directory', body);
  return payload.directory;
}

export async function updateDirectory(input: {
  directoryId: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const body = parseRequest(updateDirectorySchema, input);
  const payload = await postJson<UpdateDirectoryResponse>('update-directory', body);
  return payload.directory;
}

export async function moveDirectory(directoryId: string, parentId?: string) {
  const body = parseRequest(moveDirectorySchema, { directoryId, parentId });
  const payload = await postJson<MoveDirectoryResponse>('move-directory', body);
  return payload.directory;
}

export async function deleteDirectory(directoryId: string) {
  const body = parseRequest(deleteDirectorySchema, { directoryId });
  const payload = await postJson<DeleteDirectoryResponse>('delete-directory', body);
  return payload;
}
