import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';

const { streamMock, createDirectoryAgentGraphMock } = vi.hoisted(() => ({
  streamMock: vi.fn(),
  createDirectoryAgentGraphMock: vi.fn(() => ({
    invoke: vi.fn(),
    stream: streamMock,
  })),
}));

vi.mock('./workflow/graph', () => ({
  createDirectoryAgentGraph: createDirectoryAgentGraphMock,
}));

import { runDirectoryAgentStream } from './run-agent';

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

describe('runDirectoryAgentStream', () => {
  beforeEach(() => {
    streamMock.mockReset();
    createDirectoryAgentGraphMock.mockClear();
  });

  it('emits thread, delta, and done events from graph stream output', async () => {
    const threadId = '11111111-1111-4111-8111-111111111111';

    streamMock.mockImplementation(async function* mockGraphStream() {
      yield [
        'messages',
        [new AIMessageChunk({ content: 'Hello' }), { langgraph_node: 'agent' }],
      ];
      yield [
        'values',
        {
          messages: [new HumanMessage('Question'), { type: 'ai', content: 'Hello' }],
          toolRoundCount: 0,
        },
      ];
    });

    const events = [];
    for await (const event of runDirectoryAgentStream({
      userId: 'user-1',
      scope: 'workspace',
      message: 'Question',
      threadId,
      deps: createDeps(),
    })) {
      events.push(event);
    }

    expect(events[0]).toEqual({ type: 'thread', threadId });
    expect(events.some((event) => event.type === 'delta' && event.text === 'Hello')).toBe(true);
    expect(events.at(-1)).toEqual({
      type: 'done',
      response: {
        reply: 'Hello',
        threadId,
        executedActions: [],
        proposedDeletes: [],
      },
    });
  });
});
