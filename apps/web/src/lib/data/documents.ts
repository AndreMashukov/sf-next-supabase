import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { downloadDocumentHtml, extractBodyHtml } from '@/lib/storage';
import type { Document } from '@sf/shared-types';

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  word_count: number;
  storage_path: string;
  directory_id: string | null;
  applied_rule_ids: string[];
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
    directoryId: row.directory_id,
    appliedRuleIds: row.applied_rule_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDocuments(directoryId?: string | null): Promise<Document[]> {
  const supabase = await createClient();
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false });

  if (directoryId === null) {
    query = query.is('directory_id', null);
  } else if (directoryId) {
    query = query.eq('directory_id', directoryId);
  }

  const { data } = await query;
  return (data ?? []).map((row) => mapDocument(row as DocumentRow));
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('documents').select('*').eq('id', id).single();

  if (!data) {
    return null;
  }

  return mapDocument(data as DocumentRow);
}

export async function getDocumentHtmlById(id: string): Promise<string | null> {
  const document = await getDocumentById(id);

  if (!document) {
    return null;
  }

  try {
    const html = await downloadDocumentHtml(document.storagePath);
    return extractBodyHtml(html);
  } catch {
    return null;
  }
}
