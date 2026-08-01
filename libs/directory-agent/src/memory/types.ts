import type { AgentScope } from '@sf/shared-types';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

export interface DirectoryAgentGraphOptions {
  checkpointer?: BaseCheckpointSaver;
  memorySnippets?: string[];
}

export interface DirectoryAgentMemoryRuntime {
  enabled: boolean;
  threadId?: string;
  checkpointer?: BaseCheckpointSaver;
  memorySnippets?: string[];
  onTurnComplete?: (input: {
    userMessage: string;
    assistantReply: string;
    threadId: string;
    scope: AgentScope;
  }) => Promise<void>;
}
