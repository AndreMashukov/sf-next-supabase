import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { validateDeleteRule } from '../_shared/rules.ts';

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
    const { ruleId } = validateDeleteRule(body);

    const supabase = createServiceClient();
    const { error, count } = await supabase
      .from('rules')
      .delete({ count: 'exact' })
      .eq('id', ruleId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    if (!count) {
      return errorResponse('Rule not found', 404);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(message, 400);
  }
});
