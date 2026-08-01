const DEFAULT_MAX_TOOL_ROUNDS = 15;
const DEFAULT_RECURSION_LIMIT = 50;
const DEFAULT_MAX_PROMPT_TOKENS = 8_000;
const DEFAULT_MAX_MESSAGES = 40;

export function getAgentMemoryMaxPromptTokens(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MAX_PROMPT_TOKENS']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_PROMPT_TOKENS;
}

export function getAgentMemoryMaxMessages(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env['AGENT_MEMORY_MAX_MESSAGES']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_MESSAGES;
}

export function getDirectoryAgentMaxToolRounds(): number {
  const configured = Number(process.env['DIRECTORY_AGENT_MAX_TOOL_ROUNDS']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_TOOL_ROUNDS;
}

export function getDirectoryAgentRecursionLimit(): number {
  const configured = Number(process.env['DIRECTORY_AGENT_RECURSION_LIMIT']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RECURSION_LIMIT;
}
