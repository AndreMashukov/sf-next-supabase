'use client';

import { createClient } from '@/supabase/client';

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
