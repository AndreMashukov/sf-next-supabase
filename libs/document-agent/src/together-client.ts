import { buildDocumentPrompt } from '@sf/shared-types';
import { ChatOpenAI } from '@langchain/openai';
import { formatValidationFindings } from './validation/types';
import type { DocumentPlan, DocumentRule } from './validation/types';

const TOGETHER_BASE_URL = 'https://api.together.ai/v1';
const TOGETHER_MODEL = 'MiniMaxAI/MiniMax-M3';

function stripRedactedThinking(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<mm:think>[\s\S]*?<\/mm:think>/gi, '')
    .trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:html|markdown|json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function getTogetherApiKey(): string {
  const apiKey = process.env['TOGETHER_AI_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing TOGETHER_AI_API_KEY environment variable');
  }
  return apiKey;
}

export function createTogetherModel(temperature = 0.7): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: getTogetherApiKey(),
    model: TOGETHER_MODEL,
    temperature,
    configuration: {
      baseURL: TOGETHER_BASE_URL,
    },
  });
}

export async function callTogetherChat(prompt: string, temperature = 0.7): Promise<string> {
  const model = createTogetherModel(temperature);
  const response = await model.invoke([{ role: 'user', content: prompt }]);
  const raw =
    typeof response.content === 'string'
      ? response.content
      : response.content
          .map((part) => (typeof part === 'string' ? part : 'text' in part ? part.text : ''))
          .join('');

  const text = stripCodeFences(stripRedactedThinking(raw));
  if (!text) {
    throw new Error('Together returned an empty response');
  }

  return text;
}

export async function planDocument(
  userPrompt: string,
  rules: DocumentRule[],
): Promise<DocumentPlan> {
  const rulesSummary =
    rules.length > 0
      ? rules.map((rule, index) => `${index + 1}. ${rule.name}: ${rule.content}`).join('\n')
      : 'No additional rules selected.';

  const prompt = `Create a concise document plan for the following request.

User request:
${userPrompt}

Selected rules:
${rulesSummary}

Return ONLY valid JSON with this shape:
{
  "outline": ["Section 1", "Section 2"],
  "ruleChecklist": ["Rule item 1", "Rule item 2"]
}`;

  const text = await callTogetherChat(prompt, 0.2);
  const parsed = JSON.parse(text) as DocumentPlan;

  if (!Array.isArray(parsed.outline) || !Array.isArray(parsed.ruleChecklist)) {
    throw new Error('Planner returned invalid JSON shape');
  }

  return parsed;
}

export async function draftDocumentHtml(
  userPrompt: string,
  rulesText: string,
  plan?: DocumentPlan,
): Promise<string> {
  const planSection = plan
    ? `**Document Plan:**
Outline:
${plan.outline.map((item) => `- ${item}`).join('\n')}

Rule checklist:
${plan.ruleChecklist.map((item) => `- ${item}`).join('\n')}`
    : '';

  const prompt = [buildDocumentPrompt(userPrompt, rulesText), planSection].filter(Boolean).join('\n\n');
  return callTogetherChat(prompt, 0.7);
}

export async function repairDocumentHtml(
  userPrompt: string,
  rulesText: string,
  htmlFragment: string,
  validationErrors: string,
  plan?: DocumentPlan,
): Promise<string> {
  const planSection = plan
    ? `Plan outline:\n${plan.outline.map((item) => `- ${item}`).join('\n')}`
    : '';

  const prompt = `${buildDocumentPrompt(userPrompt, rulesText)}

${planSection}

The previous HTML fragment failed validation. Repair it so it passes all checks.

Validation errors:
${validationErrors}

Previous HTML fragment:
${htmlFragment}

Return ONLY the repaired HTML fragment.`;

  return callTogetherChat(prompt, 0.3);
}

export function formatValidationErrorsForRepair(
  findings: Array<{
    severity: string;
    code: string;
    message: string;
    pathOrSnippet?: string;
    repairHint?: string;
  }>,
): string {
  return formatValidationFindings(
    findings.map((finding) => ({
      severity: finding.severity === 'warning' ? 'warning' : 'error',
      code: finding.code,
      category: 'format',
      message: finding.message,
      pathOrSnippet: finding.pathOrSnippet,
      repairHint: finding.repairHint,
    })),
  );
}
