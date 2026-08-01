import { randomUUID } from 'node:crypto';
import { HumanMessage } from '@langchain/core/messages';
import type { AgentMessageResponse, AgentScope } from '@sf/shared-types';
import {
  createAgentRuntimeContext,
  type DirectoryAgentDependencies,
} from './tools/context';
import { createDirectoryAgentGraph } from './workflow/graph';
import { getDirectoryAgentMaxToolRounds, getDirectoryAgentRecursionLimit } from './config';
import type { DirectoryAgentMemoryRuntime } from './memory/types';

export interface RunDirectoryAgentInput {
  userId: string;
  scope: AgentScope;
  directoryId?: string;
  message: string;
  threadId?: string;
  deps: DirectoryAgentDependencies;
  memory?: DirectoryAgentMemoryRuntime;
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

async function resolveDirectoryIds(input: RunDirectoryAgentInput): Promise<string[]> {
  if (input.scope === 'workspace') {
    const directories = await input.deps.directoryRepository.listForUser(input.userId);
    return directories.map((directory) => directory.id);
  }

  if (!input.directoryId) {
    throw new Error('directoryId is required for directory scope');
  }

  return input.deps.directoryRepository.listDescendantIds(input.userId, input.directoryId);
}

export async function runDirectoryAgent(input: RunDirectoryAgentInput): Promise<AgentMessageResponse> {
  const directoryIds = await resolveDirectoryIds(input);

  const runtimeContext = createAgentRuntimeContext({
    deps: input.deps,
    userId: input.userId,
    scope: input.scope,
    directoryId: input.directoryId,
    directoryIds,
  });

  const memoryEnabled = Boolean(input.memory?.enabled && input.memory.threadId);
  const threadId = memoryEnabled ? input.memory!.threadId! : input.threadId ?? randomUUID();

  const graph = createDirectoryAgentGraph(runtimeContext, {
    checkpointer: memoryEnabled ? input.memory?.checkpointer : undefined,
    memorySnippets: input.memory?.memorySnippets,
  });

  const invokeConfig = memoryEnabled
    ? {
        configurable: { thread_id: threadId },
        recursionLimit: getDirectoryAgentRecursionLimit(),
      }
    : { recursionLimit: getDirectoryAgentRecursionLimit() };

  const finalState = await graph.invoke(
    {
      messages: [new HumanMessage(input.message)],
      executedActions: [],
      proposedDeletes: [],
      toolRoundCount: 0,
    },
    invokeConfig,
  );

  const reply = extractAssistantReply(finalState.messages);
  const hitToolRoundLimit = finalState.toolRoundCount >= getDirectoryAgentMaxToolRounds();
  const scopeLabel = input.scope === 'workspace' ? 'workspace' : 'folder';

  if (memoryEnabled && input.memory?.onTurnComplete) {
    try {
      await input.memory.onTurnComplete({
        userMessage: input.message,
        assistantReply: reply,
        threadId,
        scope: input.scope,
      });
    } catch (error) {
      console.error('Failed to capture agent turn memories', error);
    }
  }

  return {
    reply: hitToolRoundLimit && !reply.trim()
      ? `I hit the tool step limit while working on your request. Some actions may have started in the background; check the ${scopeLabel} for new content or try a smaller follow-up request.`
      : reply,
    threadId,
    executedActions: runtimeContext.executedActions,
    proposedDeletes: runtimeContext.proposedDeletes,
  };
}
