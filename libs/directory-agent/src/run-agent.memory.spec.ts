import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';

const { invokeMock, createDirectoryAgentGraphMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  createDirectoryAgentGraphMock: vi.fn(() => ({
    invoke: invokeMock,
  })),
}));

vi.mock('./workflow/graph', () => ({
  createDirectoryAgentGraph: createDirectoryAgentGraphMock,
}));

import { runDirectoryAgent } from './run-agent';

function createDeps() {
  return {
    directoryRepository: {
      listForUser: vi.fn(async () => []),
      listDescendantIds: vi.fn(async () => ['dir-1']),
    },
    documentRepository: {} as never,
    quizRepository: {} as never,
    ruleRepository: {} as never,
    vectorIndexRepository: {} as never,
    embeddingService: {} as never,
    createDirectoryUseCase: {} as never,
    updateDirectoryUseCase: {} as never,
    moveDirectoryUseCase: {} as never,
    createDocumentUseCase: {} as never,
    updateDocumentUseCase: {} as never,
    moveDocumentUseCase: {} as never,
    generateQuizUseCase: {} as never,
    updateQuizUseCase: {} as never,
    createRuleUseCase: {} as never,
    updateRuleUseCase: {} as never,
    attachRuleToDirectoryUseCase: {} as never,
    detachRuleFromDirectoryUseCase: {} as never,
  };
}

describe('runDirectoryAgent memory wiring', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    createDirectoryAgentGraphMock.mockClear();
    invokeMock.mockResolvedValue({
      messages: [new HumanMessage('Question'), { type: 'ai', content: 'Answer' }],
      toolRoundCount: 0,
    });
  });

  it('passes thread_id to LangGraph when memory is enabled', async () => {
    const onTurnComplete = vi.fn(async () => undefined);
    const checkpointer = { setup: vi.fn() } as never;

    await runDirectoryAgent({
      userId: 'user-1',
      scope: 'workspace',
      message: 'Follow-up question',
      deps: createDeps(),
      memory: {
        enabled: true,
        threadId: 'thread-123',
        checkpointer,
        memorySnippets: ['[entity] Conversation codeword: PURPLE-ZEBRA-42'],
        onTurnComplete,
      },
    });

    expect(createDirectoryAgentGraphMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        checkpointer,
        memorySnippets: ['[entity] Conversation codeword: PURPLE-ZEBRA-42'],
      }),
    );

    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [expect.any(HumanMessage)],
      }),
      expect.objectContaining({
        configurable: { thread_id: 'thread-123' },
      }),
    );
    expect(onTurnComplete).toHaveBeenCalled();
  });

  it('does not pass thread_id when memory is disabled', async () => {
    await runDirectoryAgent({
      userId: 'user-1',
      scope: 'workspace',
      message: 'One-off question',
      deps: createDeps(),
    });

    expect(createDirectoryAgentGraphMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        checkpointer: undefined,
      }),
    );

    expect(invokeMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({
        configurable: expect.anything(),
      }),
    );
  });

  it('returns the completed turn when memory capture fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onTurnComplete = vi.fn(async () => {
      throw new Error('memory capture failed');
    });

    const result = await runDirectoryAgent({
      userId: 'user-1',
      scope: 'workspace',
      message: 'Follow-up question',
      deps: createDeps(),
      memory: {
        enabled: true,
        threadId: 'thread-123',
        checkpointer: { setup: vi.fn() } as never,
        onTurnComplete,
      },
    });

    expect(result).toEqual({
      reply: 'Answer',
      threadId: 'thread-123',
      executedActions: [],
      proposedDeletes: [],
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to capture agent turn memories',
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
