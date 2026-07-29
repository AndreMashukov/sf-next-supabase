import { describe, expect, it } from 'vitest';
import { classifyRuleRisk } from './risk';

describe('classifyRuleRisk', () => {
  it('classifies rule risk levels', () => {
    expect(classifyRuleRisk([])).toBe('low');
    expect(classifyRuleRisk([{ name: 'Brand', content: 'Maintain brand tone.' }])).toBe('medium');
    expect(
      classifyRuleRisk([{ name: 'Legal', content: 'Follow legal compliance requirements.' }]),
    ).toBe('high');
  });
});
