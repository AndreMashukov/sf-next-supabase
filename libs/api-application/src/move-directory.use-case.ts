import { AppError, type DirectoryRepository, type MoveDirectoryInput } from '@sf/api-domain';
import {
  assertDirectoryDepth,
  assertNotDescendant,
  assertSiblingNameAvailable,
  getDirectoryOrThrow,
  getParentDirectory,
  updateDirectorySubtreePaths,
} from './directory.helpers';

export class MoveDirectoryUseCase {
  constructor(private readonly directoryRepository: DirectoryRepository) {}

  async execute(input: MoveDirectoryInput) {
    const directory = await getDirectoryOrThrow(
      this.directoryRepository,
      input.directoryId,
      input.userId,
    );
    const directories = await this.directoryRepository.listForUser(input.userId);

    assertNotDescendant(directories, directory.id, input.parentId);

    const parent = await getParentDirectory(
      this.directoryRepository,
      input.parentId,
      input.userId,
    );
    const nextLevel = assertDirectoryDepth(parent);
    const subtreeDepth = Math.max(
      0,
      ...directories
        .filter((item) => item.id === directory.id || item.path.startsWith(`${directory.path}/`))
        .map((item) => item.level - directory.level),
    );

    if (nextLevel + subtreeDepth > 10) {
      throw new AppError('Moving this directory would exceed the maximum depth');
    }

    await assertSiblingNameAvailable(
      this.directoryRepository,
      input.userId,
      directory.name,
      input.parentId,
      directory.id,
    );

    await this.directoryRepository.update({
      userId: input.userId,
      directoryId: directory.id,
      parentId: input.parentId ?? null,
      level: nextLevel,
    });

    const updatedDirectory = await getDirectoryOrThrow(
      this.directoryRepository,
      directory.id,
      input.userId,
    );

    await updateDirectorySubtreePaths(
      this.directoryRepository,
      input.userId,
      {
        ...updatedDirectory,
        parentId: input.parentId ?? null,
      },
    );

    return getDirectoryOrThrow(this.directoryRepository, directory.id, input.userId);
  }
}
