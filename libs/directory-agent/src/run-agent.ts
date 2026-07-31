import { randomUUID } from 'node:crypto';
import { HumanMessage } from '@langchain/core/messages';
import type { AgentMessageResponse } from '@sf/shared-types';
import {
  createAgentRuntimeContext,
  type DirectoryAgentDependencies,
} from './tools/context';
import { createDirectoryAgentGraph } from './workflow/graph';
import { getDirectoryAgentMaxToolRounds, getDirectoryAgentRecursionLimit } from './config';

export interface RunDirectoryAgentInput {
  userId: string;
  directoryId: string;
  message: string;
  threadId?: string;
  deps: DirectoryAgentDependencies;
}

function extractAssistantReply(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { type?: string; content?: unknown };
    if (message.type === 'ai' || message.type === 'assistant') {
      if (typeof message.content === 'string') {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        return message.content
          .map((part) => {
            if (typeof part === 'string') {
              return part;
            }
            if (typeof part === 'object' && part !== null && 'text' in part) {
              return String((part as { text?: string }).text ?? '');
            }
            return '';
          })
          .join('')
          .trim();
      }
    }
  }

  return 'I completed the requested actions.';
}

export async function runDirectoryAgent(input: RunDirectoryAgentInput): Promise<AgentMessageResponse> {
  const directoryIds = await input.deps.directoryRepository.listDescendantIds(
    input.userId,
    input.directoryId,
  );

  const runtimeContext = createAgentRuntimeContext({
    deps: input.deps,
    userId: input.userId,
    directoryId: input.directoryId,
    directoryIds,
  });

  const graph = createDirectoryAgentGraph(runtimeContext);
  const finalState = await graph.invoke(
    {
      messages: [new HumanMessage(input.message)],
      executedActions: [],
      proposedDeletes: [],
      toolRoundCount: 0,
    },
    { recursionLimit: getDirectoryAgentRecursionLimit() },
  );

  const reply = extractAssistantReply(finalState.messages);
  const hitToolRoundLimit = finalState.toolRoundCount >= getDirectoryAgentMaxToolRounds();

  return {
    reply: hitToolRoundLimit && !reply.trim()
      ? 'I hit the tool step limit while working on your request. Some actions may have started in the background; check the folder for new content or try a smaller follow-up request.'
      : reply,
    threadId: input.threadId ?? randomUUID(),
    executedActions: runtimeContext.executedActions,
    proposedDeletes: runtimeContext.proposedDeletes,
  };
}
