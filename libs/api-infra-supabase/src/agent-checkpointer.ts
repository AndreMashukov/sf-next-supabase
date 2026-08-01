import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import type { AgentMemoryDatabaseConfig } from './agent-memory-config';

let sharedCheckpointer: PostgresSaver | null = null;
let setupPromise: Promise<void> | null = null;

export async function getAgentCheckpointer(
  config: AgentMemoryDatabaseConfig,
): Promise<PostgresSaver> {
  if (!sharedCheckpointer) {
    sharedCheckpointer = PostgresSaver.fromConnString(config.connectionString);
  }

  if (!setupPromise) {
    setupPromise = sharedCheckpointer.setup().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
  return sharedCheckpointer;
}

export async function resetAgentCheckpointerForTests(): Promise<void> {
  if (sharedCheckpointer) {
    await sharedCheckpointer.end().catch(() => undefined);
  }
  sharedCheckpointer = null;
  setupPromise = null;
}
