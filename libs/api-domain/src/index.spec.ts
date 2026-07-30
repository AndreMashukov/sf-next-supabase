import { formatRulesForPrompt, mapRuleRow } from '@sf/api-domain';

describe('mapRuleRow', () => {
  it('maps snake_case database rows to camelCase API DTOs', () => {
    expect(
      mapRuleRow({
        id: 'rule-1',
        user_id: 'user-1',
        name: 'Tone',
        description: 'Be concise',
        content: 'Use short sentences.',
        is_default: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'rule-1',
      userId: 'user-1',
      name: 'Tone',
      description: 'Be concise',
      content: 'Use short sentences.',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});

describe('formatRulesForPrompt', () => {
  it('returns empty string when no rules are provided', () => {
    expect(formatRulesForPrompt([])).toBe('');
  });

  it('includes rule names and content in prompt text', () => {
    const prompt = formatRulesForPrompt([{ name: 'Tone', content: 'Be concise.' }]);
    expect(prompt).toContain('RULE #1 - Tone');
    expect(prompt).toContain('Be concise.');
  });
});
