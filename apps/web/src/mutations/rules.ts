'use client';

import type { Rule } from '@sf/shared-types';
import {
  attachRuleToDirectorySchema,
  createRuleSchema,
  deleteRuleSchema,
  detachRuleFromDirectorySchema,
  parseRequest,
  updateRuleSchema,
} from '@sf/shared-types';
import { getBrowserSupabase, requireUserId, throwOnError } from './supabase/client';

type RuleRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function mapRule(row: RuleRow): Rule {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    content: row.content,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createRule(input: {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(createRuleSchema, input);
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  const data = throwOnError(
    await supabase
      .from('rules')
      .insert({
        user_id: userId,
        name: body.name,
        description: body.description ?? '',
        content: body.content,
        is_default: body.isDefault ?? false,
      })
      .select('*')
      .single(),
  );

  return mapRule(data as RuleRow);
}

export async function updateRule(input: {
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(updateRuleSchema, input);
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  const updates: {
    name?: string;
    description?: string;
    content?: string;
    is_default?: boolean;
  } = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.content !== undefined) updates.content = body.content;
  if (body.isDefault !== undefined) updates.is_default = body.isDefault;

  const data = throwOnError(
    await supabase
      .from('rules')
      .update(updates)
      .eq('id', body.ruleId)
      .eq('user_id', userId)
      .select('*')
      .single(),
  );

  return mapRule(data as RuleRow);
}

export async function deleteRule(ruleId: string) {
  const body = parseRequest(deleteRuleSchema, { ruleId });
  const supabase = getBrowserSupabase();
  const userId = await requireUserId();

  const { count, error: countError } = await supabase
    .from('directory_rules')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', body.ruleId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error('Rule is attached to one or more directories and cannot be deleted');
  }

  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', body.ruleId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function attachRuleToDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(attachRuleToDirectorySchema, { directoryId, ruleId });
  const supabase = getBrowserSupabase();
  await requireUserId();

  const { error } = await supabase.from('directory_rules').insert({
    directory_id: body.directoryId,
    rule_id: body.ruleId,
  });

  if (error) {
    if (error.message.includes('duplicate key')) {
      return true;
    }

    throw new Error(error.message);
  }

  return true;
}

export async function detachRuleFromDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(detachRuleFromDirectorySchema, { directoryId, ruleId });
  const supabase = getBrowserSupabase();
  await requireUserId();

  const { error, count } = await supabase
    .from('directory_rules')
    .delete({ count: 'exact' })
    .eq('directory_id', body.directoryId)
    .eq('rule_id', body.ruleId);

  if (error) {
    throw new Error(error.message);
  }

  if (!count) {
    throw new Error('Rule attachment not found');
  }

  return true;
}
