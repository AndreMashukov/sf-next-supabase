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
  GenerateQuizUseCase,
  MoveDirectoryUseCase,
  MoveDocumentUseCase,
  UpdateDirectoryUseCase,
  UpdateRuleUseCase,
} from '@sf/api-application';
import type { AuthService } from '@sf/api-domain';
import {
  CompositeDocumentGeneratorService,
  createDocumentAgentConfigFromEnv,
  createTogetherAiConfigFromEnv,
  DocumentAgentClient,
  TogetherAiClient,
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
  const storageService = new S3StorageService(createStorageConfigFromEnv(env));

  const togetherAi = new TogetherAiClient(createTogetherAiConfigFromEnv(env));
  const documentAgentConfig = createDocumentAgentConfigFromEnv(env);
  const documentAgent = documentAgentConfig
    ? new DocumentAgentClient(documentAgentConfig)
    : null;

  const documentGenerator = new CompositeDocumentGeneratorService(togetherAi, documentAgent);
  const quizGenerator = new TogetherQuizGeneratorService(togetherAi);

  return {
    authService,
    createDocumentUseCase: new CreateDocumentUseCase(
      documentRepository,
      ruleRepository,
      directoryRepository,
      storageService,
      documentGenerator,
      generationJobRepository,
    ),
    generateQuizUseCase: new GenerateQuizUseCase(
      documentRepository,
      quizRepository,
      storageService,
      quizGenerator,
      generationJobRepository,
    ),
    createRuleUseCase: new CreateRuleUseCase(ruleRepository),
    updateRuleUseCase: new UpdateRuleUseCase(ruleRepository),
    deleteRuleUseCase: new DeleteRuleUseCase(ruleRepository, directoryRepository),
    createDirectoryUseCase: new CreateDirectoryUseCase(directoryRepository),
    updateDirectoryUseCase: new UpdateDirectoryUseCase(directoryRepository),
    moveDirectoryUseCase: new MoveDirectoryUseCase(directoryRepository),
    deleteDirectoryUseCase: new DeleteDirectoryUseCase(
      directoryRepository,
      documentRepository,
      storageService,
    ),
    deleteDocumentsUseCase: new DeleteDocumentsUseCase(documentRepository, storageService),
    deleteQuizzesUseCase: new DeleteQuizzesUseCase(quizRepository),
    moveDocumentUseCase: new MoveDocumentUseCase(documentRepository, directoryRepository),
    attachRuleToDirectoryUseCase: new AttachRuleToDirectoryUseCase(
      directoryRepository,
      ruleRepository,
    ),
    detachRuleFromDirectoryUseCase: new DetachRuleFromDirectoryUseCase(directoryRepository),
  };
}

export function createApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    supabase: createSupabaseConfigFromEnv(env),
    port: Number(env['API_PORT'] ?? 3001),
    host: env['API_HOST'] ?? '0.0.0.0',
  };
}
