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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uniqueRuleIds(ruleIds: string[] = []): string[] {
  return ruleIds.filter((id, index, arr) => Boolean(id) && arr.indexOf(id) === index);
}

export function validateRuleIds(ruleIds: unknown): string[] {
  if (ruleIds === undefined || ruleIds === null) {
    return [];
  }

  if (!Array.isArray(ruleIds)) {
    throw new Error('ruleIds must be an array');
  }

  const normalized = uniqueRuleIds(ruleIds.map(String));

  for (const id of normalized) {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid rule ID: ${id}`);
    }
  }

  return normalized;
}

export function validateCreateRule(body: unknown): {
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { name, description, content, isDefault } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    throw new Error('Rule name is required and must be 100 characters or fewer');
  }

  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 100_000) {
    throw new Error('Rule content is required and must be 100,000 characters or fewer');
  }

  const normalizedDescription =
    description === undefined || description === null
      ? ''
      : typeof description === 'string'
        ? description.trim()
        : (() => {
            throw new Error('Rule description must be a string');
          })();

  return {
    name: name.trim(),
    description: normalizedDescription,
    content: content.trim(),
    isDefault: Boolean(isDefault),
  };
}

export function validateUpdateRule(body: unknown): {
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { ruleId, name, description, content, isDefault } = body as Record<string, unknown>;

  if (typeof ruleId !== 'string' || !UUID_REGEX.test(ruleId)) {
    throw new Error('Invalid rule ID');
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      throw new Error('Rule name must be 1-100 characters when provided');
    }
  }

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 100_000) {
      throw new Error('Rule content must be 1-100,000 characters when provided');
    }
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new Error('Rule description must be a string');
  }

  if (isDefault !== undefined && typeof isDefault !== 'boolean') {
    throw new Error('isDefault must be a boolean when provided');
  }

  return {
    ruleId,
    name: typeof name === 'string' ? name.trim() : undefined,
    description:
      description === undefined || description === null
        ? undefined
        : (description as string).trim(),
    content: typeof content === 'string' ? content.trim() : undefined,
    isDefault: isDefault === undefined ? undefined : Boolean(isDefault),
  };
}

export function validateDeleteRule(body: unknown): { ruleId: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { ruleId } = body as Record<string, unknown>;

  if (typeof ruleId !== 'string' || !UUID_REGEX.test(ruleId)) {
    throw new Error('Invalid rule ID');
  }

  return { ruleId };
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
