import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { mapRuleRow, validateUpdateRule } from '../_shared/rules.ts';

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
    const { ruleId, name, description, content, isDefault } = validateUpdateRule(body);

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (content !== undefined) updates.content = content;
    if (isDefault !== undefined) updates.is_default = isDefault;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', ruleId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Rule not found');
    }

    return jsonResponse({ rule: mapRuleRow(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(message, 400);
  }
});
