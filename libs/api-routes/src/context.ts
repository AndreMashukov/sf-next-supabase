import {
  AttachRuleToDirectoryUseCase,
  CreateDirectoryUseCase,
  CreateDocumentUseCase,
  CreateRuleUseCase,
  DeleteDirectoryUseCase,
  DeleteDocumentsUseCase,
  DeleteQuizzesUseCase,
  DeleteRuleUseCase,
  DetachRuleFromDirectoryUseCase,
  DirectoryAgentUseCase,
  GenerateQuizUseCase,
  KnowledgeIndexerService,
  MoveDirectoryUseCase,
  MoveDocumentUseCase,
  UpdateDirectoryUseCase,
  UpdateDocumentUseCase,
  UpdateQuizUseCase,
  UpdateRuleUseCase,
} from '@sf/api-application';
import type { AuthService } from '@sf/api-domain';
import {
  CompositeDocumentGeneratorService,
  createDocumentAgentConfigFromEnv,
  createTogetherAiConfigFromEnv,
  createTogetherEmbeddingConfigFromEnv,
  DocumentAgentClient,
  TogetherAiClient,
  TogetherEmbeddingService,
  TogetherQuizGeneratorService,
} from '@sf/api-infra-ai';
import {
  createStorageConfigFromEnv,
  S3StorageService,
} from '@sf/api-infra-storage';
import {
  createServiceClient,
  SupabaseAuthService,
  SupabaseDirectoryRepository,
  SupabaseDocumentRepository,
  SupabaseGenerationJobRepository,
  SupabaseQuizRepository,
  SupabaseRuleRepository,
  SupabaseVectorIndexRepository,
  type SupabaseConfig,
} from '@sf/api-infra-supabase';

export interface ApiRuntimeConfig {
  supabase: SupabaseConfig;
  port: number;
  host: string;
}

export interface ApiContext {
  authService: AuthService;
  createDocumentUseCase: CreateDocumentUseCase;
  generateQuizUseCase: GenerateQuizUseCase;
  createRuleUseCase: CreateRuleUseCase;
  updateRuleUseCase: UpdateRuleUseCase;
  deleteRuleUseCase: DeleteRuleUseCase;
  createDirectoryUseCase: CreateDirectoryUseCase;
  updateDirectoryUseCase: UpdateDirectoryUseCase;
  moveDirectoryUseCase: MoveDirectoryUseCase;
  deleteDirectoryUseCase: DeleteDirectoryUseCase;
  deleteDocumentsUseCase: DeleteDocumentsUseCase;
  deleteQuizzesUseCase: DeleteQuizzesUseCase;
  moveDocumentUseCase: MoveDocumentUseCase;
  attachRuleToDirectoryUseCase: AttachRuleToDirectoryUseCase;
  detachRuleFromDirectoryUseCase: DetachRuleFromDirectoryUseCase;
  updateDocumentUseCase: UpdateDocumentUseCase;
  updateQuizUseCase: UpdateQuizUseCase;
  directoryAgentUseCase: DirectoryAgentUseCase;
  knowledgeIndexer: KnowledgeIndexerService;
}

export function createSupabaseConfigFromEnv(env: NodeJS.ProcessEnv): SupabaseConfig {
  const url = env['SUPABASE_URL'] ?? env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = env['SUPABASE_ANON_KEY'] ?? env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { url, anonKey, serviceRoleKey };
}

export function createApiContext(env: NodeJS.ProcessEnv = process.env): ApiContext {
  const supabaseConfig = createSupabaseConfigFromEnv(env);
  const serviceClient = createServiceClient(supabaseConfig);
  const authService = new SupabaseAuthService(supabaseConfig);

  const documentRepository = new SupabaseDocumentRepository(serviceClient);
  const ruleRepository = new SupabaseRuleRepository(serviceClient);
  const quizRepository = new SupabaseQuizRepository(serviceClient);
  const directoryRepository = new SupabaseDirectoryRepository(serviceClient);
  const generationJobRepository = new SupabaseGenerationJobRepository(serviceClient);
  const vectorIndexRepository = new SupabaseVectorIndexRepository(serviceClient);
  const storageService = new S3StorageService(createStorageConfigFromEnv(env));

  const togetherAi = new TogetherAiClient(createTogetherAiConfigFromEnv(env));
  const embeddingService = new TogetherEmbeddingService(createTogetherEmbeddingConfigFromEnv(env));
  const knowledgeIndexer = new KnowledgeIndexerService(
    embeddingService,
    vectorIndexRepository,
    storageService,
  );
  const documentAgentConfig = createDocumentAgentConfigFromEnv(env);
  const documentAgent = documentAgentConfig
    ? new DocumentAgentClient(documentAgentConfig)
    : null;

  const documentGenerator = new CompositeDocumentGeneratorService(togetherAi, documentAgent);
  const quizGenerator = new TogetherQuizGeneratorService(togetherAi);

  const generateQuizUseCase = new GenerateQuizUseCase(
    documentRepository,
    quizRepository,
    storageService,
    quizGenerator,
    generationJobRepository,
    knowledgeIndexer,
  );
  const createDocumentUseCase = new CreateDocumentUseCase(
    documentRepository,
    ruleRepository,
    directoryRepository,
    storageService,
    documentGenerator,
    generationJobRepository,
    knowledgeIndexer,
    generateQuizUseCase,
  );
  const updateDocumentUseCase = new UpdateDocumentUseCase(
    documentRepository,
    storageService,
    knowledgeIndexer,
  );
  const updateQuizUseCase = new UpdateQuizUseCase(
    quizRepository,
    documentRepository,
    knowledgeIndexer,
  );
  const directoryAgentUseCase = new DirectoryAgentUseCase(directoryRepository, {
    directoryRepository,
    documentRepository,
    quizRepository,
    vectorIndexRepository,
    embeddingService,
    createDirectoryUseCase: new CreateDirectoryUseCase(directoryRepository, knowledgeIndexer),
    updateDirectoryUseCase: new UpdateDirectoryUseCase(directoryRepository, knowledgeIndexer),
    moveDirectoryUseCase: new MoveDirectoryUseCase(directoryRepository),
    createDocumentUseCase,
    updateDocumentUseCase,
    moveDocumentUseCase: new MoveDocumentUseCase(documentRepository, directoryRepository, knowledgeIndexer),
    generateQuizUseCase,
    updateQuizUseCase,
  });

  return {
    authService,
    createDocumentUseCase,
    generateQuizUseCase,
    createRuleUseCase: new CreateRuleUseCase(ruleRepository),
    updateRuleUseCase: new UpdateRuleUseCase(ruleRepository),
    deleteRuleUseCase: new DeleteRuleUseCase(ruleRepository, directoryRepository),
    createDirectoryUseCase: new CreateDirectoryUseCase(directoryRepository, knowledgeIndexer),
    updateDirectoryUseCase: new UpdateDirectoryUseCase(directoryRepository, knowledgeIndexer),
    moveDirectoryUseCase: new MoveDirectoryUseCase(directoryRepository),
    deleteDirectoryUseCase: new DeleteDirectoryUseCase(
      directoryRepository,
      documentRepository,
      storageService,
      knowledgeIndexer,
    ),
    deleteDocumentsUseCase: new DeleteDocumentsUseCase(
      documentRepository,
      storageService,
      knowledgeIndexer,
    ),
    deleteQuizzesUseCase: new DeleteQuizzesUseCase(quizRepository, knowledgeIndexer),
    moveDocumentUseCase: new MoveDocumentUseCase(documentRepository, directoryRepository, knowledgeIndexer),
    attachRuleToDirectoryUseCase: new AttachRuleToDirectoryUseCase(
      directoryRepository,
      ruleRepository,
    ),
    detachRuleFromDirectoryUseCase: new DetachRuleFromDirectoryUseCase(directoryRepository),
    updateDocumentUseCase,
    updateQuizUseCase,
    directoryAgentUseCase,
    knowledgeIndexer,
  };
}

export function createApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    supabase: createSupabaseConfigFromEnv(env),
    port: Number(env['API_PORT'] ?? 3001),
    host: env['API_HOST'] ?? '0.0.0.0',
  };
}
