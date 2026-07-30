import {
  CreateDocumentUseCase,
  CreateRuleUseCase,
  DeleteRuleUseCase,
  GenerateQuizUseCase,
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
  SupabaseDocumentRepository,
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
      storageService,
      documentGenerator,
    ),
    generateQuizUseCase: new GenerateQuizUseCase(
      documentRepository,
      quizRepository,
      storageService,
      quizGenerator,
    ),
    createRuleUseCase: new CreateRuleUseCase(ruleRepository),
    updateRuleUseCase: new UpdateRuleUseCase(ruleRepository),
    deleteRuleUseCase: new DeleteRuleUseCase(ruleRepository),
  };
}

export function createApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    supabase: createSupabaseConfigFromEnv(env),
    port: Number(env['API_PORT'] ?? 3001),
    host: env['API_HOST'] ?? '0.0.0.0',
  };
}
