export const MAX_DIRECTORY_DEPTH = 10;

export function buildDirectoryPath(parentPath: string | null, name: string): string {
  if (!parentPath) {
    return `/${name}`;
  }

  return `${parentPath}/${name}`;
}
