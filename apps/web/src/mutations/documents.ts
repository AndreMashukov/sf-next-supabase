'use client';

import type { Document } from '@sf/shared-types';
import {
  createDocumentSchema,
  deleteDocumentsSchema,
  moveDocumentSchema,
  parseRequest,
  type CreateDocumentResponse,
  type DeleteDocumentsResponse,
} from '@sf/shared-types';
import { postJson } from './client';
import { verifyDirectoryOwnership } from '@/domain/directories/client-operations';
import { getBrowserSupabase, requireUserId, throwOnError } from './supabase/client';

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

export async function createDocument(
  title: string,
  text: string,
  ruleIds: string[] = [],
  directoryId?: string,
) {
  const body = parseRequest(createDocumentSchema, { title, text, ruleIds, directoryId });
  const payload = await postJson<CreateDocumentResponse>('create-document', body);
  if (!payload.job?.id || !payload.job.status) {
    throw new Error('API did not return a generation job. Restart the API server.');
  }
  return payload.job;
}

export async function deleteDocument(documentId: string) {
  return deleteDocuments([documentId]);
}

export async function deleteDocuments(documentIds: string[]) {
  const body = parseRequest(deleteDocumentsSchema, { documentIds });
  const payload = await postJson<DeleteDocumentsResponse>('delete-documents', body);
  return payload;
}

export async function moveDocument(documentId: string, directoryId?: string) {
  const body = parseRequest(moveDocumentSchema, { documentId, directoryId });
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  if (body.directoryId) {
    await verifyDirectoryOwnership(supabase, body.directoryId, userId);
  }

  const data = throwOnError(
    await supabase
      .from('documents')
      .update({ directory_id: body.directoryId ?? null })
      .eq('id', body.documentId)
      .eq('user_id', userId)
      .select('*')
      .single(),
  );

  return mapDocument(data as DocumentRow);
}
