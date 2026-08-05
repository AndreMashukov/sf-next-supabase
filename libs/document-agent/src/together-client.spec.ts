import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
const chatOpenAiMock = vi.fn(function ChatOpenAI(this: unknown, config: unknown) {
  Object.assign(this as object, { config });
  return { invoke: invokeMock };
});

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: chatOpenAiMock,
}));

describe('callTogetherChat', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    chatOpenAiMock.mockClear();
    process.env['LLM_API_KEY'] = 'litellm-key';
    process.env['LLM_BASE_URL'] = 'http://127.0.0.1:4000/v1';
    process.env['LLM_CHAT_MODEL'] = 'minimax-m3';
    delete process.env['LITELLM_MASTER_KEY'];
  });

  it('uses LiteLLM-backed chat config when creating the model', async () => {
    invokeMock.mockResolvedValue({ content: '<p>Hello</p>' });

    const { callTogetherChat } = await import('./together-client');
    await expect(callTogetherChat('prompt')).resolves.toBe('<p>Hello</p>');

    expect(chatOpenAiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'litellm-key',
        model: 'minimax-m3',
        maxTokens: 16_384,
        modelKwargs: {
          reasoning: { enabled: false },
        },
        configuration: {
          baseURL: 'http://127.0.0.1:4000/v1',
        },
      }),
    );
  });

  it('returns content after stripping thinking tags', async () => {
    invokeMock.mockResolvedValue({
      content: '<think>planning</think><p>Hello</p>',
    });

    const { callTogetherChat } = await import('./together-client');
    await expect(callTogetherChat('prompt')).resolves.toBe('<p>Hello</p>');
  });

  it('retries when MiniMax returns empty content after stripping', async () => {
    invokeMock
      .mockResolvedValueOnce({ content: '<think>only thinking</think>' })
      .mockResolvedValueOnce({ content: '<h2>Tensors</h2>' });

    const { callTogetherChat } = await import('./together-client');
    await expect(callTogetherChat('prompt')).resolves.toBe('<h2>Tensors</h2>');
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
