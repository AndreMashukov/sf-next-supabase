import { Annotation } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
import type { AgentActionResult, AgentProposedDelete } from '@sf/shared-types';

export const DirectoryAgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  executedActions: Annotation<AgentActionResult[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  proposedDeletes: Annotation<AgentProposedDelete[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  toolRoundCount: Annotation<number>({
    reducer: (_, right) => right,
    default: () => 0,
  }),
});

export type DirectoryAgentStateType = typeof DirectoryAgentState.State;
