export const DEFAULT_LLM_BASE_URL = 'http://127.0.0.1:4000/v1';
export const DEFAULT_LLM_CHAT_MODEL = 'minimax-m3';
export const LLM_CHAT_MAX_TOKENS = 16_384;

export interface LlmChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function createLlmChatConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LlmChatConfig {
  const apiKey = env['LLM_API_KEY'] ?? env['LITELLM_MASTER_KEY'];
  if (!apiKey) {
    throw new Error('Missing LLM_API_KEY or LITELLM_MASTER_KEY environment variable');
  }

  const baseUrl = trimTrailingSlash(env['LLM_BASE_URL'] ?? DEFAULT_LLM_BASE_URL);
  const model = env['LLM_CHAT_MODEL'] ?? DEFAULT_LLM_CHAT_MODEL;

  return {
    baseUrl,
    apiKey,
    model,
  };
}
