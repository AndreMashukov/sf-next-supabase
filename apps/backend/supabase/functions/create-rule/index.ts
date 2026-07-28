import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { mapRuleRow, validateCreateRule } from '../_shared/rules.ts';

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
    const { name, description, content, isDefault } = validateCreateRule(body);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('rules')
      .insert({
        user_id: userId,
        name,
        description,
        content,
        is_default: isDefault,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create rule');
    }

    return jsonResponse({ rule: mapRuleRow(data) }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(message, 400);
  }
});
