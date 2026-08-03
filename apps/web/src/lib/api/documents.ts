'use client';

import {
  createDocumentSchema,
  deleteDocumentsSchema,
  moveDocumentSchema,
  parseRequest,
  type CreateDocumentResponse,
  type DeleteDocumentsResponse,
  type MoveDocumentResponse,
} from '@sf/shared-types';
import { postJson } from './client';

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
  const payload = await postJson<MoveDocumentResponse>('move-document', body);
  return payload.document;
}
