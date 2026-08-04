import 'server-only';

import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(url, serviceRoleKey);
}

export async function downloadDocumentHtml(storagePath: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from('documents').download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to download document HTML');
  }

  return data.text();
}

export function extractBodyHtml(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() ?? html;
}
