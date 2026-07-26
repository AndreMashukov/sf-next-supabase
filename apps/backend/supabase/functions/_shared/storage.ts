import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from 'https://esm.sh/@aws-sdk/client-s3@3.750.0';

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export function getStorageConfig(): StorageConfig {
  const endpoint = Deno.env.get('STORAGE_S3_ENDPOINT');
  const region = Deno.env.get('STORAGE_S3_REGION') ?? 'local';
  const accessKeyId = Deno.env.get('STORAGE_S3_ACCESS_KEY');
  const secretAccessKey = Deno.env.get('STORAGE_S3_SECRET_KEY');
  const bucketName = Deno.env.get('STORAGE_BUCKET') ?? 'documents';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing Supabase Storage S3 environment variables (STORAGE_S3_ENDPOINT, STORAGE_S3_ACCESS_KEY, STORAGE_S3_SECRET_KEY)',
    );
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

export function buildDocumentStoragePath(userId: string, documentId: string): string {
  return `users/${userId}/documents/${documentId}/content.html`;
}

function resolveStorageEndpoint(endpoint: string): string {
  // Edge Functions run in Docker during local `supabase functions serve`.
  if (endpoint.includes('127.0.0.1') || endpoint.includes('localhost')) {
    return endpoint
      .replace('127.0.0.1', 'host.docker.internal')
      .replace('localhost', 'host.docker.internal');
  }

  return endpoint;
}

function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: resolveStorageEndpoint(config.endpoint),
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function uploadHtmlToStorage(
  config: StorageConfig,
  objectPath: string,
  html: string,
): Promise<void> {
  const client = createS3Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectPath,
      Body: html,
      ContentType: 'text/html',
    }),
  );
}

export async function deleteFromStorage(
  config: StorageConfig,
  objectPath: string,
): Promise<void> {
  const client = createS3Client(config);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: objectPath,
    }),
  );
}

export async function downloadHtmlFromStorage(
  config: StorageConfig,
  objectPath: string,
): Promise<string> {
  const client = createS3Client(config);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectPath,
    }),
  );

  if (!response.Body) {
    throw new Error('Storage object had no body');
  }

  return response.Body.transformToString();
}
