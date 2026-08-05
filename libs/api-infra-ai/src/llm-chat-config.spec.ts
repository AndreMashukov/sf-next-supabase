import { describe, expect, it } from 'vitest';
import {
  createLlmChatConfigFromEnv,
  DEFAULT_LLM_BASE_URL,
  DEFAULT_LLM_CHAT_MODEL,
} from '@sf/shared-types';

describe('createLlmChatConfigFromEnv', () => {
  it('defaults to the local LiteLLM proxy and model alias', () => {
    expect(
      createLlmChatConfigFromEnv({
        LLM_API_KEY: 'litellm-key',
      }),
    ).toEqual({
      baseUrl: DEFAULT_LLM_BASE_URL,
      apiKey: 'litellm-key',
      model: DEFAULT_LLM_CHAT_MODEL,
    });
  });

  it('falls back to LITELLM_MASTER_KEY when LLM_API_KEY is unset', () => {
    expect(
      createLlmChatConfigFromEnv({
        LITELLM_MASTER_KEY: 'master-key',
      }),
    ).toEqual({
      baseUrl: DEFAULT_LLM_BASE_URL,
      apiKey: 'master-key',
      model: DEFAULT_LLM_CHAT_MODEL,
    });
  });

  it('throws when no LiteLLM credentials are configured', () => {
    expect(() => createLlmChatConfigFromEnv({})).toThrow(
      'Missing LLM_API_KEY or LITELLM_MASTER_KEY environment variable',
    );
  });
});
