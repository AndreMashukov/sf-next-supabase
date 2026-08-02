import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: class {
    invoke = invokeMock;
  },
}));

describe('callTogetherChat', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    process.env['TOGETHER_AI_API_KEY'] = 'test-key';
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
