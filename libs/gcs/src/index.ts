export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export function buildDocumentStoragePath(userId: string, documentId: string): string {
  return `users/${userId}/documents/${documentId}/content.html`;
}

export function buildStorageObjectKey(bucketName: string, objectPath: string): string {
  return `${bucketName}/${objectPath}`;
}
