import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageService } from '@sf/api-domain';
import type { StorageConfig } from '@sf/gcs';

function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = createS3Client(config);
  }

  async uploadHtml(objectPath: string, html: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectPath,
        Body: html,
        ContentType: 'text/html',
      }),
    );
  }

  async downloadHtml(objectPath: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectPath,
      }),
    );

    if (!response.Body) {
      throw new Error('Storage object had no body');
    }

    return response.Body.transformToString();
  }

  async deleteObject(objectPath: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectPath,
      }),
    );
  }
}

export function createStorageConfigFromEnv(env: NodeJS.ProcessEnv): StorageConfig {
  const endpoint = env['STORAGE_S3_ENDPOINT'];
  const accessKeyId = env['STORAGE_S3_ACCESS_KEY'];
  const secretAccessKey = env['STORAGE_S3_SECRET_KEY'];

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing Supabase Storage S3 environment variables (STORAGE_S3_ENDPOINT, STORAGE_S3_ACCESS_KEY, STORAGE_S3_SECRET_KEY)',
    );
  }

  return {
    endpoint,
    region: env['STORAGE_S3_REGION'] ?? 'local',
    accessKeyId,
    secretAccessKey,
    bucketName: env['STORAGE_BUCKET'] ?? 'documents',
  };
}
