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

export async function createDocument(title: string, text: string, ruleIds: string[] = []) {
  const body = parseRequest(createDocumentSchema, { title, text, ruleIds });
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-document`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as CreateDocumentResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to create document');
  }

  return payload.document;
}

export async function generateQuiz(documentId: string, title?: string, questionCount = 5) {
  const body = parseRequest(generateQuizSchema, { documentId, title, questionCount });
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-quiz`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as GenerateQuizResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to generate quiz');
  }

  return payload.quiz;
}

export async function createRule(input: {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(createRuleSchema, input);
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-rule`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as CreateRuleResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to create rule');
  }

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
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-rule`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as UpdateRuleResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to update rule');
  }

  return payload.rule;
}

export async function deleteRule(ruleId: string) {
  const body = parseRequest(deleteRuleSchema, { ruleId });
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-rule`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as DeleteRuleResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to delete rule');
  }

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
