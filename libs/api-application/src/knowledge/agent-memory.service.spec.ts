import { describe, expect, it, vi } from 'vitest';
import type { AgentMemoryRepository, AgentThreadRepository } from '@sf/api-domain';
import {
  AgentMemoryService,
  AgentThreadService,
  extractMemoriesFromTurn,
} from './agent-memory.service';

describe('extractMemoriesFromTurn', () => {
  it('captures explicit remember requests and codewords', () => {
    const memories = extractMemoriesFromTurn({
      userMessage:
        'Remember this unique codeword: PURPLE-ZEBRA-42. Reply with only: Codeword saved.',
      assistantReply: 'Codeword saved.',
    });

    expect(memories.some((memory) => memory.memoryType === 'explicit')).toBe(true);
    expect(memories.some((memory) => memory.content.includes('PURPLE-ZEBRA-42'))).toBe(true);
  });

  it('captures instructions separately from preferences', () => {
    const memories = extractMemoriesFromTurn({
      userMessage: 'From now on, keep answers brief.',
      assistantReply: 'Got it.',
    });

    expect(memories.some((memory) => memory.memoryType === 'instruction')).toBe(true);
  });

  it('captures explicit identity facts but not ordinary I am sentences', () => {
    const factMemories = extractMemoriesFromTurn({
      userMessage: 'My name is Ada and I work on quizzes.',
      assistantReply: 'Nice to meet you.',
    });
    expect(factMemories.some((memory) => memory.memoryType === 'fact')).toBe(true);

    const ordinary = extractMemoriesFromTurn({
      userMessage: "I'm heading out for lunch.",
      assistantReply: 'Enjoy!',
    });
    expect(ordinary).toEqual([]);
  });

  it('does not fall back to storing ordinary statements', () => {
    const memories = extractMemoriesFromTurn({
      userMessage: 'Please open the documents folder.',
      assistantReply: 'Opening documents.',
    });

    expect(memories).toEqual([]);
  });
});

describe('AgentThreadService', () => {
  it('reuses an owned thread and rejects unknown thread IDs', async () => {
    const repository: AgentThreadRepository = {
      findByIdForUser: vi.fn(async (threadId, userId) =>
        threadId === 'thread-1' && userId === 'user-1'
          ? {
              id: 'thread-1',
              userId: 'user-1',
              scope: 'workspace',
              directoryId: null,
              title: 'Existing',
              lastMessageAt: '2026-01-01T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            }
          : null,
      ),
      create: vi.fn(),
      touch: vi.fn(async () => ({
        id: 'thread-1',
        userId: 'user-1',
        scope: 'workspace',
        directoryId: null,
        title: 'Updated',
        lastMessageAt: '2026-01-02T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      })),
    };

    const service = new AgentThreadService(repository);
    const resolved = await service.resolveThread({
      userId: 'user-1',
      scope: 'workspace',
      threadId: 'thread-1',
      seedTitle: 'Updated',
    });

    expect(resolved).toBe('thread-1');
    expect(repository.touch).toHaveBeenCalledWith('thread-1', 'user-1', { title: 'Updated' });

    await expect(
      service.resolveThread({
        userId: 'user-1',
        scope: 'workspace',
        threadId: 'missing-thread',
      }),
    ).rejects.toThrow('Agent thread not found');
  });

  it('creates a new thread when none is provided', async () => {
    const repository: AgentThreadRepository = {
      findByIdForUser: vi.fn(),
      create: vi.fn(async () => ({
        id: 'thread-new',
        userId: 'user-1',
        scope: 'workspace',
        directoryId: null,
        title: 'Hello',
        lastMessageAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      touch: vi.fn(),
    };

    const service = new AgentThreadService(repository);
    const resolved = await service.resolveThread({
      userId: 'user-1',
      scope: 'workspace',
      seedTitle: 'Hello',
    });

    expect(resolved).toBe('thread-new');
    expect(repository.create).toHaveBeenCalled();
  });
});

describe('AgentMemoryService', () => {
  it('filters semantic matches by minimum similarity', async () => {
    const repository: AgentMemoryRepository = {
      create: vi.fn(),
      matchMemories: vi.fn(async () => [
        {
          id: 'memory-1',
          threadId: 'thread-1',
          memoryType: 'entity',
          content: 'Conversation codeword: PURPLE-ZEBRA-42',
          priority: 90,
          metadata: {},
          similarity: 0.95,
        },
        {
          id: 'memory-2',
          threadId: 'thread-1',
          memoryType: 'fact',
          content: 'Unrelated fact',
          priority: 10,
          metadata: {},
          similarity: 0.4,
        },
      ]),
    };

    const embeddingService = {
      embedTexts: vi.fn(async () => [[0.1, 0.2, 0.3]]),
    };

    const service = new AgentMemoryService(repository, embeddingService);
    const snippets = await service.retrieveRelevantMemories({
      userId: 'user-1',
      threadId: 'thread-1',
      scope: 'workspace',
      query: 'What was the codeword?',
    });

    expect(snippets).toEqual(['[entity] Conversation codeword: PURPLE-ZEBRA-42']);
  });

  it('stores extracted memories after a turn', async () => {
    const repository: AgentMemoryRepository = {
      create: vi.fn(async (input) => ({
        id: 'memory-1',
        userId: input.userId,
        threadId: input.threadId ?? null,
        scope: input.scope,
        memoryType: input.memoryType,
        content: input.content,
        priority: input.priority ?? 0,
        metadata: input.metadata ?? {},
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      matchMemories: vi.fn(),
    };

    const embeddingService = {
      embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
    };

    const service = new AgentMemoryService(repository, embeddingService);
    const stored = await service.captureTurnMemories({
      userId: 'user-1',
      threadId: 'thread-1',
      scope: 'workspace',
      userMessage: 'Remember this unique codeword: PURPLE-ZEBRA-42.',
      assistantReply: 'Codeword saved.',
    });

    expect(stored).toBeGreaterThan(0);
    expect(repository.create).toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: undefined,
      }),
    );
  });
});
