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

export class CreateDirectoryUseCase {
  constructor(private readonly directoryRepository: DirectoryRepository) {}

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

    return this.directoryRepository.create({
      userId: input.userId,
      name: input.name,
      parentId: input.parentId,
      description: input.description,
      path: buildDirectoryPath(parent?.path ?? null, input.name),
      level,
    });
  }
}
