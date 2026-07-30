import type { DirectoryRepository, UpdateDirectoryInput } from '@sf/api-domain';
import {
  assertSiblingNameAvailable,
  getDirectoryOrThrow,
  updateDirectorySubtreePaths,
} from './directory.helpers';

export class UpdateDirectoryUseCase {
  constructor(private readonly directoryRepository: DirectoryRepository) {}

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

    return getDirectoryOrThrow(this.directoryRepository, input.directoryId, input.userId);
  }
}
