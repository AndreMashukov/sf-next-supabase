'use client';

import {
  attachRuleToDirectorySchema,
  createDirectorySchema,
  createDocumentSchema,
  createRuleSchema,
  deleteDirectorySchema,
  deleteRuleSchema,
  detachRuleFromDirectorySchema,
  generateQuizSchema,
  moveDirectorySchema,
  moveDocumentSchema,
  parseRequest,
  updateDirectorySchema,
  updateRuleSchema,
  type AttachRuleToDirectoryResponse,
  type CreateDirectoryResponse,
  type CreateDocumentResponse,
  type CreateRuleResponse,
  type DeleteDirectoryResponse,
  type DeleteRuleResponse,
  type DetachRuleFromDirectoryResponse,
  type GenerateQuizResponse,
  type MoveDirectoryResponse,
  type MoveDocumentResponse,
  type UpdateDirectoryResponse,
  type UpdateRuleResponse,
  formatValidationError,
} from '@sf/shared-types';
import { createClient } from '@/lib/supabase/client';

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in');
  }

  return session.access_token;
}

function getFunctionsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}/functions/v1`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:3001/functions/v1';
  }

  throw new Error('Missing NEXT_PUBLIC_API_URL environment variable');
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as TResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request to ${path} failed`);
  }

  return payload;
}

export async function createDocument(
  title: string,
  text: string,
  ruleIds: string[] = [],
  directoryId?: string,
) {
  const body = parseRequest(createDocumentSchema, { title, text, ruleIds, directoryId });
  const payload = await postJson<CreateDocumentResponse>('create-document', body);
  return payload.document;
}

export async function generateQuiz(documentId: string, title?: string, questionCount = 5) {
  const body = parseRequest(generateQuizSchema, { documentId, title, questionCount });
  const payload = await postJson<GenerateQuizResponse>('generate-quiz', body);
  return payload.quiz;
}

export async function createRule(input: {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(createRuleSchema, input);
  const payload = await postJson<CreateRuleResponse>('create-rule', body);
  return payload.rule;
}

export async function updateRule(input: {
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(updateRuleSchema, input);
  const payload = await postJson<UpdateRuleResponse>('update-rule', body);
  return payload.rule;
}

export async function deleteRule(ruleId: string) {
  const body = parseRequest(deleteRuleSchema, { ruleId });
  const payload = await postJson<DeleteRuleResponse>('delete-rule', body);
  return payload.success;
}

export async function createDirectory(input: {
  name: string;
  parentId?: string;
  description?: string;
}) {
  const body = parseRequest(createDirectorySchema, input);
  const payload = await postJson<CreateDirectoryResponse>('create-directory', body);
  return payload.directory;
}

export async function updateDirectory(input: {
  directoryId: string;
  name?: string;
  description?: string;
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

export async function moveDocument(documentId: string, directoryId?: string) {
  const body = parseRequest(moveDocumentSchema, { documentId, directoryId });
  const payload = await postJson<MoveDocumentResponse>('move-document', body);
  return payload.document;
}

export async function attachRuleToDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(attachRuleToDirectorySchema, { directoryId, ruleId });
  const payload = await postJson<AttachRuleToDirectoryResponse>('attach-rule-to-directory', body);
  return payload.success;
}

export async function detachRuleFromDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(detachRuleFromDirectorySchema, { directoryId, ruleId });
  const payload = await postJson<DetachRuleFromDirectoryResponse>('detach-rule-from-directory', body);
  return payload.success;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export {
  createDocumentSchema,
  createDirectorySchema,
  createRuleSchema,
  formatValidationError,
  generateQuizSchema,
  parseRequest,
  updateDirectorySchema,
  updateRuleSchema,
};
