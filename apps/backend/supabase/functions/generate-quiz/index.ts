import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { downloadHtmlFromStorage, getStorageConfig } from '../_shared/storage.ts';
import { generateQuizFromHtml } from '../_shared/gemini.ts';
import { validateGenerateQuiz } from '../_shared/validation.ts';

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
    const { documentId, title, questionCount } = validateGenerateQuiz(body);

    const supabase = createServiceClient();
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (documentError || !document) {
      return errorResponse('Document not found', 404);
    }

    const storageConfig = getStorageConfig();
    const html = await downloadHtmlFromStorage(storageConfig, document.storage_path);
    const generated = await generateQuizFromHtml(
      html,
      document.title,
      questionCount,
    );

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        document_id: documentId,
        title: title ?? generated.title,
        questions: generated.questions,
      })
      .select('*')
      .single();

    if (quizError || !quiz) {
      throw new Error(quizError?.message ?? 'Failed to save quiz');
    }

    return jsonResponse({
      quiz: {
        id: quiz.id,
        userId: quiz.user_id,
        documentId: quiz.document_id,
        title: quiz.title,
        questions: quiz.questions,
        createdAt: quiz.created_at,
        updatedAt: quiz.updated_at,
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(message, 400);
  }
});
