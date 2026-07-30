import type { Directory } from '@sf/shared-types';

export function getDescendantDirectoryIds(
  directories: Directory[],
  directoryId: string,
): string[] {
  const byParent = new Map<string, string[]>();

  for (const directory of directories) {
    if (!directory.parentId) {
      continue;
    }

    const siblings = byParent.get(directory.parentId) ?? [];
    siblings.push(directory.id);
    byParent.set(directory.parentId, siblings);
  }

  const result: string[] = [directoryId];
  const queue = [directoryId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const childId of byParent.get(current) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }

  return result;
}

export function buildDirectorySummaries<T extends Directory>(
  directories: T[],
  documents: Array<{ directory_id: string | null }>,
  ruleIdsByDirectory: Map<string, string[]>,
): Array<
  T & {
    documentCount: number;
    childCount: number;
    ruleIds: string[];
  }
> {
  const childCountByParent = new Map<string, number>();
  const documentCountByDirectory = new Map<string, number>();

  for (const directory of directories) {
    if (directory.parentId) {
      childCountByParent.set(
        directory.parentId,
        (childCountByParent.get(directory.parentId) ?? 0) + 1,
      );
    }
  }

  for (const document of documents) {
    if (!document.directory_id) {
      continue;
    }

    documentCountByDirectory.set(
      document.directory_id,
      (documentCountByDirectory.get(document.directory_id) ?? 0) + 1,
    );
  }

  return directories.map((directory) => ({
    ...directory,
    childCount: childCountByParent.get(directory.id) ?? 0,
    documentCount: documentCountByDirectory.get(directory.id) ?? 0,
    ruleIds: ruleIdsByDirectory.get(directory.id) ?? [],
  }));
}

export function computeDeleteImpact(
  directories: Directory[],
  documents: Array<{ directory_id: string | null }>,
  directoryId: string,
): { directoryCount: number; documentCount: number } {
  const descendantIds = new Set(getDescendantDirectoryIds(directories, directoryId));
  const documentCount = documents.filter(
    (document) => document.directory_id && descendantIds.has(document.directory_id),
  ).length;

  return {
    directoryCount: descendantIds.size,
    documentCount,
  };
}
