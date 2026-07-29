import type { DocumentRule } from './types';

export function classifyRuleRisk(rules: DocumentRule[]): 'low' | 'medium' | 'high' {
  if (rules.length === 0) {
    return 'low';
  }

  const combined = rules.map((rule) => rule.content.toLowerCase()).join('\n');
  const highRiskTerms = ['legal', 'compliance', 'medical', 'financial', 'contract', 'regulatory'];
  const mediumRiskTerms = ['brand', 'tone', 'marketing', 'citation', 'source'];

  if (highRiskTerms.some((term) => combined.includes(term))) {
    return 'high';
  }

  if (mediumRiskTerms.some((term) => combined.includes(term))) {
    return 'medium';
  }

  return 'low';
}
