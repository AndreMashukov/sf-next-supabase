import type { SupabaseConfig } from './supabase-client';

export interface AgentMemoryDatabaseConfig {
  connectionString: string;
}

const LOCAL_DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export function createAgentMemoryDatabaseConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AgentMemoryDatabaseConfig | null {
  const enabled = env['AGENT_MEMORY_ENABLED'] !== 'false';
  if (!enabled) {
    return null;
  }

  const connectionString =
    env['AGENT_MEMORY_DATABASE_URL'] ??
    env['DATABASE_URL'] ??
    (env['NODE_ENV'] !== 'production' ? LOCAL_DEFAULT_DATABASE_URL : undefined);

  if (!connectionString) {
    throw new Error(
      'Agent memory is enabled but AGENT_MEMORY_DATABASE_URL (or DATABASE_URL) is not configured',
    );
  }

  return { connectionString };
}

export function deriveLocalAgentMemoryDatabaseUrl(config: SupabaseConfig): string {
  void config;
  return LOCAL_DEFAULT_DATABASE_URL;
}

export function isAgentMemoryEnabledForScope(scope: 'workspace' | 'directory'): boolean {
  return scope === 'workspace';
}

export function getAgentMemoryMaxPromptTokens(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MAX_PROMPT_TOKENS']);
  return Number.isFinite(configured) && configured > 0 ? configured : 8_000;
}

export function getAgentMemoryMaxMessages(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MAX_MESSAGES']);
  return Number.isFinite(configured) && configured > 0 ? configured : 40;
}

export function getAgentMemoryMatchCount(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MATCH_COUNT']);
  return Number.isFinite(configured) && configured > 0 ? configured : 6;
}

export function getAgentMemoryMinSimilarity(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MIN_SIMILARITY']);
  return Number.isFinite(configured) && configured >= 0 ? configured : 0.72;
}
