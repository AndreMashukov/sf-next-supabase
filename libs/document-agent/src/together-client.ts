import {
  buildDocumentPrompt,
  createLlmChatConfigFromEnv,
  LLM_CHAT_MAX_TOKENS,
  type LlmChatConfig,
} from '@sf/shared-types';
import { ChatOpenAI } from '@langchain/openai';
import { formatValidationFindings } from './validation/types';
import type { DocumentPlan, DocumentRule } from './validation/types';

const EMPTY_RESPONSE_RETRIES = 2;

function stripRedactedThinking(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<mm:think>[\s\S]*?<\/mm:think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:html|markdown|json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      if (typeof part === 'object' && part !== null && 'text' in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .join('');
}

function resolveChatConfig(config?: LlmChatConfig): LlmChatConfig {
  return config ?? createLlmChatConfigFromEnv();
}

export function createTogetherModel(temperature = 0.7, config?: LlmChatConfig): ChatOpenAI {
  const chatConfig = resolveChatConfig(config);

  return new ChatOpenAI({
    apiKey: chatConfig.apiKey,
    model: chatConfig.model,
    temperature,
    maxTokens: LLM_CHAT_MAX_TOKENS,
    // MiniMax reasoning can consume the entire completion budget and leave content empty.
    modelKwargs: {
      reasoning: { enabled: false },
    },
    configuration: {
      baseURL: chatConfig.baseUrl,
    },
  });
}

export async function callTogetherChat(
  prompt: string,
  temperature = 0.7,
  config?: LlmChatConfig,
): Promise<string> {
  const model = createTogetherModel(temperature, config);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= EMPTY_RESPONSE_RETRIES; attempt += 1) {
    const response = await model.invoke([{ role: 'user', content: prompt }]);
    const raw = extractMessageContent(response.content);
    const text = stripCodeFences(stripRedactedThinking(raw));

    if (text) {
      return text;
    }

    lastError = new Error(
      `LLM returned an empty response (attempt ${attempt + 1}/${EMPTY_RESPONSE_RETRIES + 1})`,
    );
  }

  throw lastError ?? new Error('LLM returned an empty response');
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
