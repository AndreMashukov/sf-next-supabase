import type { DirectoryRepository, UpdateDirectoryInput } from '@sf/api-domain';
import {
  assertSiblingNameAvailable,
  getDirectoryOrThrow,
  updateDirectorySubtreePaths,
} from './directory.helpers';
import type { KnowledgeIndexerService } from './knowledge-indexer.service';

export class UpdateDirectoryUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly knowledgeIndexer?: KnowledgeIndexerService,
  ) {}

  async execute(input: UpdateDirectoryInput) {
    const directory = await getDirectoryOrThrow(
      this.directoryRepository,
      input.directoryId,
      input.userId,
    );

    if (input.name && input.name !== directory.name) {
      await assertSiblingNameAvailable(
        this.directoryRepository,
        input.userId,
        input.name,
        directory.parentId ?? undefined,
        directory.id,
      );
      await updateDirectorySubtreePaths(
        this.directoryRepository,
        input.userId,
        directory,
        input.name,
      );
    }

    if (input.description !== undefined) {
      await this.directoryRepository.update({
        userId: input.userId,
        directoryId: input.directoryId,
        description: input.description,
      });
    }

    if (input.color !== undefined || input.icon !== undefined) {
      await this.directoryRepository.update({
        userId: input.userId,
        directoryId: input.directoryId,
        color: input.color,
        icon: input.icon,
      });
    }

    return getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId).then(
      async (directory) => {
        if (this.knowledgeIndexer) {
          await this.knowledgeIndexer.indexDirectory(directory);
        }
        return directory;
      },
    );
  }
}
