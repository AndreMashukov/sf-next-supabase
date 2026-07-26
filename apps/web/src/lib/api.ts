'use client';

import { createClient } from '@/lib/supabase/client';
import type { CreateDocumentResponse, GenerateQuizResponse } from '@sf/shared-types';

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

export async function createDocument(title: string, text: string) {
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-document`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, text }),
    },
  );

  const payload = (await response.json()) as CreateDocumentResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to create document');
  }

  return payload.document;
}

export async function generateQuiz(documentId: string, title?: string, questionCount = 5) {
  const token = await getAccessToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-quiz`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId, title, questionCount }),
    },
  );

  const payload = (await response.json()) as GenerateQuizResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to generate quiz');
  }

  return payload.quiz;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
