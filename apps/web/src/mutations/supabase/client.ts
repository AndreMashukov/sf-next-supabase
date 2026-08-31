'use client';

import { createClient } from '@/supabase/client';

export async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('You must be signed in');
  }

  return user.id;
}

export function getBrowserSupabase() {
  return createClient();
}

export function throwOnError<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null || result.data === undefined) {
    throw new Error('No data returned');
  }

  return result.data;
}
