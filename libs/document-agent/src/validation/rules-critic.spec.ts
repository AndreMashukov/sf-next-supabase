import { describe, expect, it, vi } from 'vitest';
import {
  criticResponseToFindings,
  critiqueRulesAdherence,
  mergeValidationReports,
} from './rules-critic';
import { createValidationReport } from './types';

vi.mock('../together-client', () => ({
  callTogetherChat: vi.fn(),
}));

import { callTogetherChat } from '../together-client';

const callTogetherChatMock = vi.mocked(callTogetherChat);

describe('rules critic', () => {
  it('skips LLM call when no rules are selected', async () => {
    const findings = await critiqueRulesAdherence('Write about X', [], '<p>Hello</p>');
    expect(findings).toEqual([]);
    expect(callTogetherChatMock).not.toHaveBeenCalled();
  });

  it('converts unsatisfied critic findings into validation findings', () => {
    const findings = criticResponseToFindings({
      passed: false,
      findings: [
        {
          ruleName: 'Diagrams',
          satisfied: false,
          severity: 'error',
          message: 'Missing Mermaid diagram',
          evidence: 'No language-mermaid block',
          repairHint: 'Add a Mermaid flowchart.',
        },
        {
          ruleName: 'Tone',
          satisfied: true,
          severity: 'error',
          message: 'Tone is fine',
        },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'RULE_SEMANTIC_VIOLATION',
      category: 'rules',
      message: '[Diagrams] Missing Mermaid diagram',
    });
  });

  it('returns semantic violations from a valid critic response', async () => {
    callTogetherChatMock.mockResolvedValue(
      JSON.stringify({
        passed: false,
        findings: [
          {
            ruleName: 'Diagrams',
            satisfied: false,
            severity: 'error',
            message: 'Rule requires Mermaid diagrams but none were found',
            evidence: '<p>Intro only</p>',
            repairHint: 'Include a language-mermaid code block.',
          },
        ],
      }),
    );

    const findings = await critiqueRulesAdherence(
      'Explain sorting',
      [{ name: 'Diagrams', content: 'Include Mermaid diagrams' }],
      '<p>Intro only</p>',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('RULE_SEMANTIC_VIOLATION');
  });

  it('returns a critic error finding for invalid JSON', async () => {
    callTogetherChatMock.mockResolvedValue('not json');

    const findings = await critiqueRulesAdherence(
      'Explain sorting',
      [{ name: 'Diagrams', content: 'Include Mermaid diagrams' }],
      '<p>Intro</p>',
    );

    expect(findings[0]?.code).toBe('RULE_CRITIC_INVALID_JSON');
  });

  it('merges deterministic and critic findings into one report', () => {
    const report = mergeValidationReports(
      createValidationReport([]),
      [
        {
          severity: 'error',
          code: 'RULE_SEMANTIC_VIOLATION',
          category: 'rules',
          message: '[Diagrams] Missing Mermaid',
        },
      ],
    );

    expect(report.passed).toBe(false);
    expect(report.errorCount).toBe(1);
  });
});
