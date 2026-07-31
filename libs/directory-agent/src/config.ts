const DEFAULT_MAX_TOOL_ROUNDS = 15;
const DEFAULT_RECURSION_LIMIT = 50;

export function getDirectoryAgentMaxToolRounds(): number {
  const configured = Number(process.env['DIRECTORY_AGENT_MAX_TOOL_ROUNDS']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_TOOL_ROUNDS;
}

export function getDirectoryAgentRecursionLimit(): number {
  const configured = Number(process.env['DIRECTORY_AGENT_RECURSION_LIMIT']);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RECURSION_LIMIT;
}
