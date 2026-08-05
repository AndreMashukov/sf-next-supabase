import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TogetherAiClient } from './together-ai.client';

describe('TogetherAiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the LiteLLM chat endpoint with the configured model alias', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"title":"Quiz","questions":[]}' } }],
      }),
    });

    const client = new TogetherAiClient({
      baseUrl: 'http://127.0.0.1:4000/v1',
      apiKey: 'litellm-key',
      model: 'minimax-m3',
    });

    await expect(client.generateQuizFromHtml('<p>Doc</p>', 'Doc', 0)).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer litellm-key',
        }),
        body: expect.stringContaining('"model":"minimax-m3"'),
      }),
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      reasoning?: { enabled?: boolean };
      max_tokens?: number;
    };
    expect(requestBody.reasoning).toEqual({ enabled: false });
    expect(requestBody.max_tokens).toBe(16_384);
  });

  it('strips thinking tags from quiz responses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '<think>plan</think>{"title":"Quiz","questions":[{"question":"Q?","options":["A","B","C","D"],"correctAnswer":0,"explanation":"Because"}]}',
            },
          },
        ],
      }),
    });

    const client = new TogetherAiClient({
      baseUrl: 'http://127.0.0.1:4000/v1',
      apiKey: 'litellm-key',
      model: 'minimax-m3',
    });

    await expect(client.generateQuizFromHtml('<p>Doc</p>', 'Doc', 1)).resolves.toEqual({
      title: 'Quiz',
      questions: [
        {
          question: 'Q?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Because',
        },
      ],
    });
  });
});
