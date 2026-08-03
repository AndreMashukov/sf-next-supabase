import type {
  AgentMemoryRepository,
  AgentMemoryType,
  AgentThreadRepository,
  EmbeddingService,
} from '@sf/api-domain';
import type { AgentScope } from '@sf/shared-types';
import { getAgentMemoryMatchCount, getAgentMemoryMinSimilarity } from '@sf/api-infra-supabase';

const EXPLICIT_REMEMBER_PATTERN =
  /\bremember\b(?:\s+(?:this|that|the following|for later|for our conversation|my))?/i;
const PREFERENCE_PATTERN = /\b(i prefer|i like|i want|please always|please never)\b/i;
const FACT_PATTERN =
  /\b(my name is|i work on|i use|codeword is|codeword:|unique codeword)\b/i;
const INSTRUCTION_PATTERN = /\b(always|never|from now on|when you respond|when answering)\b/i;
const LOW_PRIORITY_MEMORY_THRESHOLD = 50;
const LOW_PRIORITY_MEMORY_TTL_DAYS = 30;

export interface CapturedAgentMemory {
  memoryType: AgentMemoryType;
  content: string;
  priority: number;
}

export function extractMemoriesFromTurn(input: {
  userMessage: string;
  assistantReply: string;
}): CapturedAgentMemory[] {
  const memories: CapturedAgentMemory[] = [];
  const trimmedUser = input.userMessage.trim();

  if (!trimmedUser) {
    return memories;
  }

  if (EXPLICIT_REMEMBER_PATTERN.test(trimmedUser)) {
    memories.push({
      memoryType: 'explicit',
      content: trimmedUser,
      priority: 100,
    });
  }

  if (PREFERENCE_PATTERN.test(trimmedUser)) {
    memories.push({
      memoryType: 'preference',
      content: trimmedUser,
      priority: 80,
    });
  }

  if (FACT_PATTERN.test(trimmedUser)) {
    memories.push({
      memoryType: 'fact',
      content: trimmedUser,
      priority: 70,
    });
  }

  if (INSTRUCTION_PATTERN.test(trimmedUser)) {
    memories.push({
      memoryType: 'instruction',
      content: trimmedUser,
      priority: 60,
    });
  }

  const codewordMatch = trimmedUser.match(
    /(?:unique codeword|codeword)[:\s]+([A-Za-z0-9-]+)/i,
  );
  if (codewordMatch?.[1]) {
    memories.push({
      memoryType: 'entity',
      content: `Conversation codeword: ${codewordMatch[1]}`,
      priority: 90,
    });
  }

  return dedupeMemories(memories);
}

function buildExpiresAtForCapturedMemory(priority: number): string | undefined {
  if (priority >= LOW_PRIORITY_MEMORY_THRESHOLD) {
    return undefined;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LOW_PRIORITY_MEMORY_TTL_DAYS);
  return expiresAt.toISOString();
}

function dedupeMemories(memories: CapturedAgentMemory[]): CapturedAgentMemory[] {
  const seen = new Set<string>();
  const result: CapturedAgentMemory[] = [];

  for (const memory of memories.sort((left, right) => right.priority - left.priority)) {
    const key = memory.content.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(memory);
  }

  return result.slice(0, 4);
}

export class AgentMemoryService {
  constructor(
    private readonly agentMemoryRepository: AgentMemoryRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async retrieveRelevantMemories(input: {
    userId: string;
    threadId: string;
    scope: AgentScope;
    query: string;
  }): Promise<string[]> {
    const [embedding] = await this.embeddingService.embedTexts([input.query]);
    if (!embedding || embedding.length === 0) {
      return [];
    }

    const matches = await this.agentMemoryRepository.matchMemories({
      userId: input.userId,
      threadId: input.threadId,
      scope: input.scope,
      queryEmbedding: embedding,
      matchCount: getAgentMemoryMatchCount(),
    });

    return matches
      .filter((match) => match.similarity >= getAgentMemoryMinSimilarity())
      .map((match) => `[${match.memoryType}] ${match.content}`);
  }

  async captureTurnMemories(input: {
    userId: string;
    threadId: string;
    scope: AgentScope;
    userMessage: string;
    assistantReply: string;
  }): Promise<number> {
    const candidates = extractMemoriesFromTurn({
      userMessage: input.userMessage,
      assistantReply: input.assistantReply,
    });

    if (candidates.length === 0) {
      return 0;
    }

    const embeddings = await this.embeddingService.embedTexts(
      candidates.map((candidate) => candidate.content),
    );

    let stored = 0;
    for (const [index, candidate] of candidates.entries()) {
      const embedding = embeddings[index];
      if (!embedding || embedding.length === 0) {
        continue;
      }

      await this.agentMemoryRepository.create({
        userId: input.userId,
        threadId: input.threadId,
        scope: input.scope,
        memoryType: candidate.memoryType,
        content: candidate.content,
        priority: candidate.priority,
        embedding,
        expiresAt: buildExpiresAtForCapturedMemory(candidate.priority),
        metadata: {
          source: 'agent_turn',
        },
      });
      stored += 1;
    }

    return stored;
  }
}

export class AgentThreadService {
  constructor(private readonly agentThreadRepository: AgentThreadRepository) {}

  async resolveThread(input: {
    userId: string;
    scope: AgentScope;
    threadId?: string;
    directoryId?: string;
    seedTitle?: string;
  }): Promise<string> {
    if (input.threadId) {
      const existing = await this.agentThreadRepository.findByIdForUser(
        input.threadId,
        input.userId,
      );

      if (!existing) {
        throw new Error('Agent thread not found');
      }

      if (existing.scope !== input.scope) {
        throw new Error('Agent thread scope mismatch');
      }

      if (input.scope === 'directory' && input.directoryId && existing.directoryId !== input.directoryId) {
        throw new Error('Agent thread directory mismatch');
      }

      await this.agentThreadRepository.touch(input.threadId, input.userId, {
        title: input.seedTitle,
      });
      return existing.id;
    }

    const created = await this.agentThreadRepository.create({
      userId: input.userId,
      scope: input.scope,
      directoryId: input.directoryId ?? null,
      title: input.seedTitle ?? '',
    });

    return created.id;
  }
}
