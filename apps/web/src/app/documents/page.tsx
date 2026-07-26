import { createClient } from '@/lib/supabase/server';
import type { Document } from '@sf/shared-types';
import { DocumentsPageClient } from './DocumentsPageClient';

function mapDocument(row: {
  id: string;
  user_id: string;
  title: string;
  description: string;
  word_count: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
}): Document {
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

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  const documents = (data ?? []).map(mapDocument);

  return <DocumentsPageClient initialDocuments={documents} />;
}
