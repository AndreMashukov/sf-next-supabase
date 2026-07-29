import { z } from 'zod';
import { callTogetherChat } from '../together-client';
import {
  createValidationReport,
  type DocumentRule,
  type ValidationFinding,
  type ValidationReport,
} from './types';

const criticFindingSchema = z.object({
  ruleName: z.string(),
  satisfied: z.boolean(),
  severity: z.enum(['error', 'warning']).default('error'),
  message: z.string(),
  evidence: z.string().optional(),
  repairHint: z.string().optional(),
});

const criticResponseSchema = z.object({
  passed: z.boolean(),
  findings: z.array(criticFindingSchema),
});

export type RulesCriticResponse = z.infer<typeof criticResponseSchema>;

function formatRulesForCritic(rules: DocumentRule[]): string {
  return rules
    .map(
      (rule, index) => `RULE ${index + 1}: ${rule.name}
${rule.content}`,
    )
    .join('\n\n');
}

function buildCriticPrompt(
  userPrompt: string,
  rules: DocumentRule[],
  htmlFragment: string,
): string {
  return `You are a strict document rules critic. Evaluate whether the HTML fragment satisfies EVERY selected rule.

User request:
${userPrompt}

Selected rules:
${formatRulesForCritic(rules)}

HTML fragment to evaluate:
${htmlFragment}

Instructions:
- Judge semantic adherence, not just keyword presence.
- Examples of failures: missing required Mermaid diagrams, wrong tone, missing required sections/topics, using forbidden phrasing/style, ignoring formatting instructions in the rules.
- If a rule is satisfied, mark satisfied=true.
- If a rule is violated, mark satisfied=false with a concrete message, evidence snippet, and repairHint.
- Use severity "error" for hard requirements; "warning" only for soft preferences.
- Return ONLY valid JSON with this shape:
{
  "passed": true,
  "findings": [
    {
      "ruleName": "Rule name",
      "satisfied": true,
      "severity": "error",
      "message": "Why this rule passed or failed",
      "evidence": "Optional short quote/snippet from the HTML",
      "repairHint": "Optional concrete fix"
    }
  ]
}`;
}

export function criticResponseToFindings(
  response: RulesCriticResponse,
): ValidationFinding[] {
  return response.findings
    .filter((finding) => !finding.satisfied)
    .map((finding) => ({
      severity: finding.severity,
      code: 'RULE_SEMANTIC_VIOLATION',
      category: 'rules' as const,
      message: `[${finding.ruleName}] ${finding.message}`,
      pathOrSnippet: finding.evidence,
      repairHint: finding.repairHint,
    }));
}

export function mergeValidationReports(
  deterministic: ValidationReport,
  criticFindings: ValidationFinding[],
): ValidationReport {
  return createValidationReport([...deterministic.findings, ...criticFindings]);
}

/**
 * LLM critic that semantically verifies HTML against selected rules.
 * Returns an empty finding list when there are no rules (skip path).
 */
export async function critiqueRulesAdherence(
  userPrompt: string,
  rules: DocumentRule[],
  htmlFragment: string,
): Promise<ValidationFinding[]> {
  if (rules.length === 0) {
    return [];
  }

  const text = await callTogetherChat(
    buildCriticPrompt(userPrompt, rules, htmlFragment),
    0.1,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [
      {
        severity: 'error',
        code: 'RULE_CRITIC_INVALID_JSON',
        category: 'rules',
        message: 'Rules critic returned non-JSON output',
        repairHint: 'Regenerate the document and retry semantic rule verification.',
      },
    ];
  }

  const result = criticResponseSchema.safeParse(parsed);
  if (!result.success) {
    return [
      {
        severity: 'error',
        code: 'RULE_CRITIC_INVALID_SHAPE',
        category: 'rules',
        message: 'Rules critic returned an invalid JSON shape',
        repairHint: 'Regenerate the document and retry semantic rule verification.',
      },
    ];
  }

  // Prefer explicit finding failures; also fail if model says passed=false with no findings.
  const findings = criticResponseToFindings(result.data);
  if (!result.data.passed && findings.length === 0) {
    return [
      {
        severity: 'error',
        code: 'RULE_SEMANTIC_VIOLATION',
        category: 'rules',
        message: 'Rules critic marked the document as failing without detailed findings',
        repairHint: 'Revise the HTML so it clearly satisfies every selected rule.',
      },
    ];
  }

  return findings;
}
