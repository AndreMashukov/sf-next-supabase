import {
  AppError,
  buildDirectoryPath,
  MAX_DIRECTORY_DEPTH,
  NotFoundError,
  type DirectoryRepository,
} from '@sf/api-domain';
import type { Directory } from '@sf/shared-types';

export async function getDirectoryOrThrow(
  directoryRepository: DirectoryRepository,
  directoryId: string,
  userId: string,
): Promise<Directory> {
  const directory = await directoryRepository.findByIdForUser(directoryId, userId);

  if (!directory) {
    throw new NotFoundError('Directory not found');
  }

  return directory;
}

export async function getParentDirectory(
  directoryRepository: DirectoryRepository,
  parentId: string | undefined,
  userId: string,
): Promise<Directory | null> {
  if (!parentId) {
    return null;
  }

  return getDirectoryOrThrow(directoryRepository, parentId, userId);
}

export function assertDirectoryDepth(parent: Directory | null) {
  const nextLevel = (parent?.level ?? -1) + 1;

  if (nextLevel > MAX_DIRECTORY_DEPTH) {
    throw new AppError(`Directory depth cannot exceed ${MAX_DIRECTORY_DEPTH}`);
  }

  return nextLevel;
}

export async function assertSiblingNameAvailable(
  directoryRepository: DirectoryRepository,
  userId: string,
  name: string,
  parentId: string | undefined,
  excludeDirectoryId?: string,
) {
  const directories = await directoryRepository.listForUser(userId);
  const conflict = directories.find(
    (directory) =>
      directory.id !== excludeDirectoryId &&
      directory.parentId === (parentId ?? null) &&
      directory.name.toLowerCase() === name.toLowerCase(),
  );

  if (conflict) {
    throw new AppError('A directory with this name already exists in the target location');
  }
}

export async function updateDirectorySubtreePaths(
  directoryRepository: DirectoryRepository,
  userId: string,
  directory: Directory,
  nextName?: string,
) {
  const directories = await directoryRepository.listForUser(userId);
  const nextPath = buildDirectoryPath(
    directory.parentId
      ? (directories.find((item) => item.id === directory.parentId)?.path ?? null)
      : null,
    nextName ?? directory.name,
  );

  await directoryRepository.update({
    userId,
    directoryId: directory.id,
    ...(nextName ? { name: nextName } : {}),
    path: nextPath,
  });

  const descendants = directories.filter((item) => item.path.startsWith(`${directory.path}/`));
  const pathMap = new Map<string, string>([[directory.path, nextPath]]);

  for (const descendant of descendants.sort(
    (left, right) => left.path.length - right.path.length,
  )) {
    const parentPath = pathMap.get(descendant.path.slice(0, descendant.path.lastIndexOf('/')));

    if (!parentPath) {
      continue;
    }

    const updatedPath = `${parentPath}/${descendant.name}`;
    pathMap.set(descendant.path, updatedPath);

    await directoryRepository.update({
      userId,
      directoryId: descendant.id,
      path: updatedPath,
      level: updatedPath.split('/').filter(Boolean).length - 1,
    });
  }
}

export function assertNotDescendant(
  directories: Directory[],
  directoryId: string,
  targetParentId: string | undefined,
) {
  if (!targetParentId) {
    return;
  }

  if (targetParentId === directoryId) {
    throw new AppError('A directory cannot be moved into itself');
  }

  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  let current = byId.get(targetParentId);

  while (current) {
    if (current.id === directoryId) {
      throw new AppError('A directory cannot be moved into its own descendant');
    }

    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
}
