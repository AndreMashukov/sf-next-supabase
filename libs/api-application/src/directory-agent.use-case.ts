import { AppError, NotFoundError, type DirectoryRepository } from '@sf/api-domain';
import type {
  AgentMessageInput,
  AgentMessageResponse,
  AgentMessageStreamEvent,
  AgentScope,
} from '@sf/shared-types';
import {
  runDirectoryAgent,
  runDirectoryAgentStream,
  type DirectoryAgentDependencies,
  type DirectoryAgentMemoryRuntime,
  type RunDirectoryAgentInput,
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

  private async validateScope(input: AgentMessageInput & { userId: string }): Promise<AgentScope> {
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

    return scope;
  }

  private async buildRunInput(
    input: AgentMessageInput & { userId: string },
  ): Promise<RunDirectoryAgentInput> {
    const scope = await this.validateScope(input);
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

    return {
      userId: input.userId,
      scope,
      directoryId: input.directoryId,
      message: input.message,
      threadId,
      deps: this.deps,
      memory:
        memoryEnabled && this.memory && checkpointer
          ? {
              enabled: true,
              threadId,
              checkpointer,
              memorySnippets,
              onTurnComplete: async ({
                userMessage,
                assistantReply,
                threadId: completedThreadId,
                scope: completedScope,
              }) => {
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
    };
  }

  async execute(input: AgentMessageInput & { userId: string }): Promise<AgentMessageResponse> {
    return runDirectoryAgent(await this.buildRunInput(input));
  }

  stream(input: AgentMessageInput & { userId: string }): AsyncGenerator<AgentMessageStreamEvent> {
    const runInputPromise = this.buildRunInput(input);

    return (async function* streamDirectoryAgent() {
      const runInput = await runInputPromise;
      yield* runDirectoryAgentStream(runInput);
    })();
  }
}
