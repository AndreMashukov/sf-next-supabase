import type { EmbeddingService } from '@sf/api-domain';

// Embeddings bypass LiteLLM and call Together directly to keep vector dimensions stable.
const TOGETHER_BASE_URL = 'https://api.together.ai/v1';
export const TOGETHER_EMBEDDING_MODEL = 'intfloat/multilingual-e5-large-instruct';
export const TOGETHER_EMBEDDING_DIMENSIONS = 1024;

export interface TogetherEmbeddingConfig {
  apiKey: string;
  model?: string;
}

export class TogetherEmbeddingService implements EmbeddingService {
  constructor(private readonly config: TogetherEmbeddingConfig) {}

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await fetch(`${TOGETHER_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model ?? TOGETHER_EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together embeddings request failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };

    const rows = payload.data ?? [];
    const sorted = [...rows].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));

    return sorted.map((row) => {
      if (!row.embedding || row.embedding.length === 0) {
        throw new Error('Together returned an empty embedding');
      }
      return row.embedding;
    });
  }
}

export function createTogetherEmbeddingConfigFromEnv(env: NodeJS.ProcessEnv): TogetherEmbeddingConfig {
  const apiKey = env['TOGETHER_AI_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing TOGETHER_AI_API_KEY environment variable');
  }

  return {
    apiKey,
    model: env['TOGETHER_EMBEDDING_MODEL'] ?? TOGETHER_EMBEDDING_MODEL,
  };
}
