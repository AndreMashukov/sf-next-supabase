import {
  buildDirectoryPath,
  type CreateDirectoryInput,
  type DirectoryRepository,
} from '@sf/api-domain';
import {
  assertDirectoryDepth,
  assertSiblingNameAvailable,
  getParentDirectory,
} from './directory.helpers';
import type { KnowledgeIndexerService } from '../knowledge/knowledge-indexer.service';

export class CreateDirectoryUseCase {
  constructor(
    private readonly directoryRepository: DirectoryRepository,
    private readonly knowledgeIndexer?: KnowledgeIndexerService,
  ) {}

  async execute(input: CreateDirectoryInput) {
    const parent = await getParentDirectory(
      this.directoryRepository,
      input.parentId,
      input.userId,
    );
    const level = assertDirectoryDepth(parent);
    await assertSiblingNameAvailable(
      this.directoryRepository,
      input.userId,
      input.name,
      input.parentId,
    );

    const directory = await this.directoryRepository.create({
      userId: input.userId,
      name: input.name,
      parentId: input.parentId,
      description: input.description,
      path: buildDirectoryPath(parent?.path ?? null, input.name),
      level,
      color: input.color,
      icon: input.icon,
    });

    if (this.knowledgeIndexer) {
      await this.knowledgeIndexer.indexDirectory(directory);
    }

    return directory;
  }
}
