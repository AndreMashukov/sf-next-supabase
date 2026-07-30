'use client';

import { createClient } from '@/lib/supabase/client';
import {
  createDocumentSchema,
  createRuleSchema,
  deleteRuleSchema,
  generateQuizSchema,
  parseRequest,
  updateRuleSchema,
  type CreateDocumentResponse,
  type CreateRuleResponse,
  type DeleteRuleResponse,
  type GenerateQuizResponse,
  type UpdateRuleResponse,
} from '@sf/shared-types';

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

export async function createDocument(title: string, text: string, ruleIds: string[] = []) {
  const body = parseRequest(createDocumentSchema, { title, text, ruleIds });
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

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export {
  createDocumentSchema,
  createRuleSchema,
  formatValidationError,
  generateQuizSchema,
  parseRequest,
  updateRuleSchema,
};
