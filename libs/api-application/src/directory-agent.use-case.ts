import { NotFoundError, type DirectoryRepository } from '@sf/api-domain';
import type { AgentMessageInput, AgentMessageResponse } from '@sf/shared-types';
import { runDirectoryAgent, type DirectoryAgentDependencies } from '@sf/directory-agent';

export class DirectoryAgentUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly deps: DirectoryAgentDependencies,
  ) {}

  async execute(input: AgentMessageInput & { userId: string }): Promise<AgentMessageResponse> {
    const directory = await this.directoryRepository.findByIdForUser(
      input.directoryId,
      input.userId,
    );

    if (!directory) {
      throw new NotFoundError('Directory not found');
    }

    return runDirectoryAgent({
      userId: input.userId,
      directoryId: input.directoryId,
      message: input.message,
      threadId: input.threadId,
      deps: this.deps,
    });
  }
}
