import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import {
  buildDocumentStoragePath,
  deleteFromStorage,
  getStorageConfig,
  uploadHtmlToStorage,
} from '../_shared/storage.ts';
import { countWords, textToHtml, validateCreateDocument } from '../_shared/validation.ts';
import { verifyRuleOwnership } from '../_shared/rules.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await req.json();
    const { title, text, ruleIds } = validateCreateDocument(body);
    const html = textToHtml(text);
    const wordCount = countWords(text);
    const documentId = crypto.randomUUID();
    const storagePath = buildDocumentStoragePath(userId, documentId);

    const supabase = createServiceClient();
    await verifyRuleOwnership(supabase, userId, ruleIds);

    const storageConfig = getStorageConfig();
    await uploadHtmlToStorage(storageConfig, storagePath, html);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        title,
        description: text.slice(0, 500),
        word_count: wordCount,
        storage_path: storagePath,
        applied_rule_ids: ruleIds,
      })
      .select('*')
      .single();

    if (error || !data) {
      await deleteFromStorage(storageConfig, storagePath);
      throw new Error(error?.message ?? 'Failed to create document record');
    }

    return jsonResponse({
      document: {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        wordCount: data.word_count,
        storagePath: data.storage_path,
        appliedRuleIds: data.applied_rule_ids ?? [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(message, 400);
  }
});
