import { AppError, NotFoundError, type DirectoryRepository } from '@sf/api-domain';
import type { AgentMessageInput, AgentMessageResponse } from '@sf/shared-types';
import {
  runDirectoryAgent,
  type DirectoryAgentDependencies,
  type DirectoryAgentMemoryRuntime,
} from '@sf/directory-agent';
import { AgentMemoryService, AgentThreadService } from './agent-memory.service';

export class DirectoryAgentUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly deps: DirectoryAgentDependencies,
    private readonly memory?: {
      threadService: AgentThreadService;
      memoryService: AgentMemoryService;
      getCheckpointer: () => Promise<NonNullable<DirectoryAgentMemoryRuntime['checkpointer']>>;
    },
  ) {}

  async execute(input: AgentMessageInput & { userId: string }): Promise<AgentMessageResponse> {
    const scope = input.scope ?? 'workspace';

    if (scope === 'directory') {
      if (!input.directoryId) {
        throw new AppError('directoryId is required for directory scope');
      }

      const directory = await this.directoryRepository.findByIdForUser(
        input.directoryId,
        input.userId,
      );

      if (!directory) {
        throw new NotFoundError('Directory not found');
      }
    }

    const memoryEnabled = scope === 'workspace' && Boolean(this.memory);
    let threadId = input.threadId;
    let memorySnippets: string[] = [];

    if (memoryEnabled && this.memory) {
      threadId = await this.memory.threadService.resolveThread({
        userId: input.userId,
        scope,
        threadId: input.threadId,
        seedTitle: input.message.slice(0, 120),
      });

      memorySnippets = await this.memory.memoryService.retrieveRelevantMemories({
        userId: input.userId,
        threadId,
        scope,
        query: input.message,
      });
    }

    const checkpointer =
      memoryEnabled && this.memory ? await this.memory.getCheckpointer() : undefined;

    return runDirectoryAgent({
      userId: input.userId,
      scope,
      directoryId: input.directoryId,
      message: input.message,
      threadId,
      deps: this.deps,
      memory: memoryEnabled && this.memory && checkpointer
        ? {
            enabled: true,
            threadId,
            checkpointer,
            memorySnippets,
            onTurnComplete: async ({ userMessage, assistantReply, threadId: completedThreadId, scope: completedScope }) => {
              await this.memory!.memoryService.captureTurnMemories({
                userId: input.userId,
                threadId: completedThreadId,
                scope: completedScope,
                userMessage,
                assistantReply,
              });
            },
          }
        : undefined,
    });
  }
}
