import {
  createRuleSchema,
  deleteRuleSchema,
  parseRequest,
  updateRuleSchema,
} from './schemas.ts';

export interface RuleRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function mapRuleRow(row: RuleRecord) {
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

export function validateCreateRule(body: unknown) {
  return parseRequest(createRuleSchema, body);
}

export function validateUpdateRule(body: unknown) {
  return parseRequest(updateRuleSchema, body);
}

export function validateDeleteRule(body: unknown) {
  return parseRequest(deleteRuleSchema, body);
}

export async function verifyRuleOwnership(
  supabase: { from: (table: string) => unknown },
  userId: string,
  ruleIds: string[],
): Promise<void> {
  if (ruleIds.length === 0) {
    return;
  }

  const client = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          in: (column: string, values: string[]) => Promise<{
            data: { id: string }[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await client
    .from('rules')
    .select('id')
    .eq('user_id', userId)
    .in('id', ruleIds);

  if (error) {
    throw new Error(error.message);
  }

  const foundIds = new Set((data ?? []).map((row) => row.id));
  const missing = ruleIds.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new Error('One or more selected rules were not found');
  }
}

export async function fetchRulesByIds(
  supabase: { from: (table: string) => unknown },
  userId: string,
  ruleIds: string[],
): Promise<Array<{ name: string; content: string }>> {
  if (ruleIds.length === 0) {
    return [];
  }

  const client = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          in: (column: string, values: string[]) => Promise<{
            data: Array<{ id: string; name: string; content: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const { data, error } = await client
    .from('rules')
    .select('id, name, content')
    .eq('user_id', userId)
    .in('id', ruleIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((data ?? []).map((row) => [row.id, row]));

  return ruleIds
    .map((id) => byId.get(id))
    .filter((row): row is { id: string; name: string; content: string } => Boolean(row))
    .map((row) => ({ name: row.name, content: row.content }));
}

export function formatRulesForPrompt(
  rules: Array<{ name: string; content: string }>,
): string {
  if (rules.length === 0) {
    return '';
  }

  const separator = '─'.repeat(61);
  const ruleBlocks = rules.map((rule, index) => {
    return `${separator}
RULE #${index + 1} - ${rule.name}
${separator}
${rule.content}`;
  });

  return `
${separator}
ADDITIONAL RULES TO FOLLOW:

The user has selected the following rules to guide your response.
Please consider all rules intelligently, prioritizing based on context.

${ruleBlocks.join('\n\n')}

${separator}
END OF RULES

Please generate content that follows these rules while maintaining
coherence and quality.
`;
}
