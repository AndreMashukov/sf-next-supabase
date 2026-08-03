'use client';

import { createClient } from '@/lib/supabase/client';

export async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in');
  }

  return session.access_token;
}

export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}/api/v1`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:3001/api/v1';
  }

  throw new Error('Missing NEXT_PUBLIC_API_URL environment variable');
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/${path}`, {
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
