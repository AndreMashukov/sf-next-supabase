import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Document } from '@sf/shared-types';

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  word_count: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    wordCount: row.word_count,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDocuments(): Promise<Document[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  return (data ?? []).map(mapDocument);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('documents').select('*').eq('id', id).single();

  if (!data) {
    return null;
  }

  return mapDocument(data);
}
