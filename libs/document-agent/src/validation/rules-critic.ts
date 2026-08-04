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

PLATFORM CONTRACT (overrides conflicting rule text):
- The output is an HTML fragment only. Do NOT require <html>, <head>, or <body>.
- Do NOT require KaTeX, MathJax, or Plotly CDN <script>/<link>/<style> tags. The StudyForge viewer renders LaTeX ($...$, $$...$$, \\(...\\), \\[...\\]) and language-plotly / language-mermaid blocks client-side.
- Script/style/link tags are forbidden. Prefer language-plotly JSON blocks for graphs and LaTeX delimiters for formulas.
- When selected rules prescribe incompatible document structures or length targets, prefer the most specific domain/format rule that matches the user request (for example Linear Algebra Learning Document Format over generic Doc HTML Format section names/length, and over Brief How-To Format for explanatory learning docs). Still enforce compatible HTML purity constraints from Doc HTML Format (fragment-only, no conversational filler).

User request:
${userPrompt}

Selected rules:
${formatRulesForCritic(rules)}

HTML fragment to evaluate:
${htmlFragment}

Instructions:
- Judge semantic adherence, not just keyword presence.
- Examples of failures: missing required Mermaid/Plotly blocks when clearly required, wrong tone, missing required sections/topics for the winning structure rule, using forbidden phrasing/style, ignoring formatting instructions in the rules.
- Do NOT fail Web Math Formula Rendering merely because KaTeX/MathJax CDN tags are absent when LaTeX delimiters are present.
- Do NOT fail Web Graph Rendering merely because Plotly CDN tags are absent when a language-plotly block is present.
- Short pedagogical framing in learning docs is allowed (for example a one-sentence purpose statement). Only fail Doc HTML Format for clear non-document chatter such as "Sure, here is your document" or assistant meta-commentary about the generation process.
- If a rule is satisfied, mark satisfied=true.
- If a rule is violated, mark satisfied=false with a concrete message, evidence snippet, and repairHint.
- If a rule exception applies and the document is acceptable, mark satisfied=true. Never set satisfied=false with wording like "this is satisfied" or "no fix needed".
- For Doc HTML Format code-language defaults: Python is the default only when the topic does not require another language. Topics such as Next.js, React, Zustand, TypeScript, or JavaScript require language-typescript/language-javascript — mark those as satisfied=true.
- Use severity "error" for hard requirements; "warning" only for soft preferences (including mild tone/filler nits).
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

function hasSpecificFormatRule(rules: DocumentRule[]): boolean {
  return rules.some((rule) => {
    const name = rule.name.toLowerCase();
    return name.includes('learning document format') || name.includes('how-to format');
  });
}

function shouldSoftenDocHtmlFinding(
  rules: DocumentRule[],
  ruleName: string,
  message: string,
): boolean {
  if (ruleName.trim().toLowerCase() !== 'doc html format') {
    return false;
  }

  const text = message.toLowerCase();
  const softStyleNit =
    text.includes('filler') ||
    text.includes('meta-commentary') ||
    text.includes('meta-text') ||
    text.includes('conversational') ||
    text.includes('meta commentary');

  if (softStyleNit) {
    return true;
  }

  // Language default nits are soft when the critic itself acknowledges a topic exception.
  const languageNit =
    text.includes('python') ||
    text.includes('language-typescript') ||
    text.includes('language-javascript') ||
    text.includes('code examples in');
  if (languageNit && (text.includes('required by the topic') || text.includes('appropriate'))) {
    return true;
  }

  if (!hasSpecificFormatRule(rules)) {
    return false;
  }

  // Specific format rules win over Doc HTML length/structure/table quotas.
  return (
    text.includes('table') ||
    text.includes('1000') ||
    text.includes('word count') ||
    text.includes('glossary') ||
    text.includes('core concepts') ||
    text.includes('structure')
  );
}

function isSelfContradictoryUnsatisfiedFinding(finding: {
  message: string;
  repairHint?: string;
}): boolean {
  const text = `${finding.message} ${finding.repairHint ?? ''}`.toLowerCase();
  return (
    text.includes('this is satisfied') ||
    text.includes('no fix needed') ||
    text.includes('already satisfied') ||
    text.includes('correctly satisfied')
  );
}

export function criticResponseToFindings(
  response: RulesCriticResponse,
  rules: DocumentRule[] = [],
): ValidationFinding[] {
  return response.findings
    .filter((finding) => !finding.satisfied)
    .filter((finding) => !isSelfContradictoryUnsatisfiedFinding(finding))
    .map((finding) => {
      const softFinding = shouldSoftenDocHtmlFinding(rules, finding.ruleName, finding.message);
      return {
        severity: softFinding ? ('warning' as const) : finding.severity,
        code: 'RULE_SEMANTIC_VIOLATION',
        category: 'rules' as const,
        message: `[${finding.ruleName}] ${finding.message}`,
        pathOrSnippet: finding.evidence,
        repairHint: finding.repairHint,
      };
    });
}

export function mergeValidationReports(
  deterministic: ValidationReport,
  criticFindings: ValidationFinding[],
): ValidationReport {
  return createValidationReport([...deterministic.findings, ...criticFindings]);
}

export function extractCriticJson(text: string): unknown {
  const trimmed = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Rules critic response did not contain JSON');
  }
}

function criticInfrastructureWarning(code: string, message: string): ValidationFinding[] {
  // Critic infra failures must not block publish when deterministic validation passed.
  return [
    {
      severity: 'warning',
      code,
      category: 'rules',
      message,
      repairHint: 'Semantic rule verification was skipped due to a critic response error.',
    },
  ];
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

  const prompt = buildCriticPrompt(userPrompt, rules, htmlFragment);
  let lastInfraCode = 'RULE_CRITIC_INVALID_JSON';
  let lastInfraMessage = 'Rules critic returned non-JSON output';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await callTogetherChat(prompt, 0.1);

    let parsed: unknown;
    try {
      parsed = extractCriticJson(text);
    } catch {
      lastInfraCode = 'RULE_CRITIC_INVALID_JSON';
      lastInfraMessage = 'Rules critic returned non-JSON output';
      continue;
    }

    const result = criticResponseSchema.safeParse(parsed);
    if (!result.success) {
      lastInfraCode = 'RULE_CRITIC_INVALID_SHAPE';
      lastInfraMessage = 'Rules critic returned an invalid JSON shape';
      continue;
    }

    const findings = criticResponseToFindings(result.data, rules);
    // Trust concrete findings over the boolean. A bare passed:false with no
    // unsatisfied findings is critic inconsistency, not a publish blocker.
    if (!result.data.passed && findings.length === 0) {
      lastInfraCode = 'RULE_CRITIC_EMPTY_FAILURE';
      lastInfraMessage =
        'Rules critic marked the document as failing without detailed findings';
      continue;
    }

    return findings;
  }

  return criticInfrastructureWarning(lastInfraCode, lastInfraMessage);
}
