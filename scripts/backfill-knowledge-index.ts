import { KnowledgeIndexerService } from '@sf/api-application';
import {
  createTogetherEmbeddingConfigFromEnv,
  TogetherEmbeddingService,
} from '@sf/api-infra-ai';
import { createSupabaseConfigFromEnv } from '@sf/api-routes';
import { createStorageConfigFromEnv, S3StorageService } from '@sf/api-infra-storage';
import {
  createServiceClient,
  SupabaseDirectoryRepository,
  SupabaseDocumentRepository,
  SupabaseQuizRepository,
  SupabaseVectorIndexRepository,
} from '@sf/api-infra-supabase';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    throw new Error('Usage: tsx scripts/backfill-knowledge-index.ts <user-id>');
  }

  const supabaseConfig = createSupabaseConfigFromEnv(process.env);
  const serviceClient = createServiceClient(supabaseConfig);
  const directoryRepository = new SupabaseDirectoryRepository(serviceClient);
  const documentRepository = new SupabaseDocumentRepository(serviceClient);
  const quizRepository = new SupabaseQuizRepository(serviceClient);
  const vectorIndexRepository = new SupabaseVectorIndexRepository(serviceClient);
  const storageService = new S3StorageService(createStorageConfigFromEnv(process.env));
  const embeddingService = new TogetherEmbeddingService(createTogetherEmbeddingConfigFromEnv(process.env));
  const knowledgeIndexer = new KnowledgeIndexerService(
    embeddingService,
    vectorIndexRepository,
    storageService,
  );

  await knowledgeIndexer.backfillUserKnowledge({
    userId,
    directoryRepository,
    documentRepository,
    quizRepository,
  });

  console.log(`Backfilled knowledge index for user ${userId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
