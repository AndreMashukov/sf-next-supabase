import { buildDocumentPrompt, parseRequest, quizResponseSchema } from '@sf/shared-types';
import type { Quiz } from '@sf/shared-types';

const TOGETHER_BASE_URL = 'https://api.together.ai/v1';
const TOGETHER_MODEL = 'MiniMaxAI/MiniMax-M3';
const REQUEST_TIMEOUT_MS = 120_000;

export interface TogetherAiConfig {
  apiKey: string;
}

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

function extractMessageContent(content: unknown): string | null {
  if (typeof content === 'string' && content.length > 0) {
    return content;
  }

  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }

  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === 'string' && part.length > 0) {
      parts.push(part);
    } else if (
      typeof part === 'object' &&
      part !== null &&
      typeof (part as { text?: unknown }).text === 'string' &&
      (part as { text: string }).text.length > 0
    ) {
      parts.push((part as { text: string }).text);
    }
  }

  return parts.length > 0 ? parts.join('') : null;
}

function parseTogetherChatContent(payload: unknown): string | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !Array.isArray((payload as { choices?: unknown }).choices) ||
    (payload as { choices: unknown[] }).choices.length === 0
  ) {
    return null;
  }

  const choice = (payload as { choices: unknown[] }).choices[0];
  if (typeof choice !== 'object' || choice === null) {
    return null;
  }

  const message = (choice as { message?: unknown }).message;
  if (typeof message !== 'object' || message === null) {
    return null;
  }

  const raw = extractMessageContent((message as { content?: unknown }).content);
  if (!raw) {
    return null;
  }

  const text = stripCodeFences(stripRedactedThinking(raw));
  return text.length > 0 ? text : null;
}

export class TogetherAiClient {
  constructor(private readonly config: TogetherAiConfig) {}

  async generateDocumentFromPrompt(userPrompt: string, rulesText = ''): Promise<string> {
    const prompt = buildDocumentPrompt(userPrompt, rulesText);
    const content = await this.callTogetherChat(prompt);

    if (!content.trim()) {
      throw new Error('Together returned empty document content');
    }

    return content;
  }

  async generateQuizFromHtml(
    html: string,
    documentTitle: string,
    questionCount: number,
  ): Promise<{ title: string; questions: Quiz['questions'] }> {
    const prompt = `You are an expert quiz creator. Read the following HTML document and create exactly ${questionCount} multiple-choice quiz questions.

Document title: ${documentTitle}

Requirements:
- Each question must have exactly 4 answer options
- correctAnswer must be the zero-based index (0-3) of the correct option
- Include a concise explanation for the correct answer
- Return ONLY valid JSON with this shape:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

HTML document:
${html.slice(0, 100_000)}`;

    const text = await this.callTogetherChat(prompt);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Together returned non-JSON quiz content');
    }

    return parseRequest(quizResponseSchema, parsed);
  }

  private async callTogetherChat(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TOGETHER_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 16384,
          reasoning: { enabled: false },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Together request failed: ${response.status} ${errorText}`);
      }

      const payload = await response.json();
      const text = parseTogetherChatContent(payload);

      if (!text) {
        throw new Error('Together returned an empty response');
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createTogetherAiConfigFromEnv(env: NodeJS.ProcessEnv): TogetherAiConfig {
  const apiKey = env['TOGETHER_AI_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing TOGETHER_AI_API_KEY environment variable');
  }

  return { apiKey };
}
