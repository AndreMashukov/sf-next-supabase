import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Rule } from '@sf/shared-types';

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

export async function listRules(): Promise<Rule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('rules')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (data ?? []).map(mapRule);
}

export async function getDefaultRuleIds(): Promise<string[]> {
  const rules = await listRules();
  return rules.filter((rule) => rule.isDefault).map((rule) => rule.id);
}
