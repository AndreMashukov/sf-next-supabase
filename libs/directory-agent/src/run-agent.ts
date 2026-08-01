import { randomUUID } from 'node:crypto';
import { HumanMessage, isAIMessageChunk, type AIMessageChunk } from '@langchain/core/messages';
import type { AgentMessageResponse, AgentMessageStreamEvent, AgentScope } from '@sf/shared-types';
import {
  createAgentRuntimeContext,
  type DirectoryAgentDependencies,
  type DirectoryAgentRuntimeContext,
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

interface PreparedDirectoryAgentRun {
  runtimeContext: DirectoryAgentRuntimeContext;
  memoryEnabled: boolean;
  threadId: string;
  graph: ReturnType<typeof createDirectoryAgentGraph>;
  invokeConfig: { configurable?: { thread_id: string }; recursionLimit: number };
  initialState: {
    messages: HumanMessage[];
    executedActions: [];
    proposedDeletes: [];
    toolRoundCount: number;
  };
  input: RunDirectoryAgentInput;
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

function asMessageChunk(message: unknown): AIMessageChunk | null {
  if (typeof message !== 'object' || message === null) {
    return null;
  }

  if (!isAIMessageChunk(message as AIMessageChunk)) {
    return null;
  }

  return message as AIMessageChunk;
}

function extractMessageChunkContent(message: unknown): string {
  const chunk = asMessageChunk(message);
  if (!chunk) {
    return '';
  }

  if (typeof chunk.content === 'string') {
    return chunk.content;
  }

  if (Array.isArray(chunk.content)) {
    return chunk.content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (typeof part === 'object' && part !== null && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('');
  }

  return '';
}

function messageChunkHasToolCalls(message: unknown): boolean {
  const chunk = asMessageChunk(message);
  if (!chunk) {
    return false;
  }

  return (chunk.tool_call_chunks?.length ?? 0) > 0;
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

async function prepareDirectoryAgentRun(input: RunDirectoryAgentInput): Promise<PreparedDirectoryAgentRun> {
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

  return {
    runtimeContext,
    memoryEnabled,
    threadId,
    graph,
    invokeConfig,
    initialState: {
      messages: [new HumanMessage(input.message)],
      executedActions: [],
      proposedDeletes: [],
      toolRoundCount: 0,
    },
    input,
  };
}

function buildAgentResponse(input: {
  reply: string;
  threadId: string;
  runtimeContext: DirectoryAgentRuntimeContext;
  toolRoundCount: number;
  scope: AgentScope;
}): AgentMessageResponse {
  const hitToolRoundLimit = input.toolRoundCount >= getDirectoryAgentMaxToolRounds();
  const scopeLabel = input.scope === 'workspace' ? 'workspace' : 'folder';

  return {
    reply:
      hitToolRoundLimit && !input.reply.trim()
        ? `I hit the tool step limit while working on your request. Some actions may have started in the background; check the ${scopeLabel} for new content or try a smaller follow-up request.`
        : input.reply,
    threadId: input.threadId,
    executedActions: input.runtimeContext.executedActions,
    proposedDeletes: input.runtimeContext.proposedDeletes,
  };
}

async function captureTurnMemories(
  input: RunDirectoryAgentInput,
  memoryEnabled: boolean,
  threadId: string,
  assistantReply: string,
): Promise<void> {
  if (!memoryEnabled || !input.memory?.onTurnComplete) {
    return;
  }

  try {
    await input.memory.onTurnComplete({
      userMessage: input.message,
      assistantReply,
      threadId,
      scope: input.scope,
    });
  } catch (error) {
    console.error('Failed to capture agent turn memories', error);
  }
}

function collectRuntimeMetadataEvents(
  runtimeContext: DirectoryAgentRuntimeContext,
  seenActionCount: number,
  seenDeleteCount: number,
): { events: AgentMessageStreamEvent[]; seenActionCount: number; seenDeleteCount: number } {
  const events: AgentMessageStreamEvent[] = [];

  for (const action of runtimeContext.executedActions.slice(seenActionCount)) {
    events.push({ type: 'action', action });
  }

  for (const proposal of runtimeContext.proposedDeletes.slice(seenDeleteCount)) {
    events.push({ type: 'delete_proposal', proposal });
  }

  return {
    events,
    seenActionCount: runtimeContext.executedActions.length,
    seenDeleteCount: runtimeContext.proposedDeletes.length,
  };
}

export async function runDirectoryAgent(input: RunDirectoryAgentInput): Promise<AgentMessageResponse> {
  const prepared = await prepareDirectoryAgentRun(input);
  const finalState = await prepared.graph.invoke(prepared.initialState, prepared.invokeConfig);
  const reply = extractAssistantReply(finalState.messages);

  await captureTurnMemories(input, prepared.memoryEnabled, prepared.threadId, reply);

  return buildAgentResponse({
    reply,
    threadId: prepared.threadId,
    runtimeContext: prepared.runtimeContext,
    toolRoundCount: finalState.toolRoundCount,
    scope: input.scope,
  });
}

export async function* runDirectoryAgentStream(
  input: RunDirectoryAgentInput,
): AsyncGenerator<AgentMessageStreamEvent> {
  const prepared = await prepareDirectoryAgentRun(input);

  yield { type: 'thread', threadId: prepared.threadId };
  yield { type: 'status', message: 'Thinking...' };

  let streamedText = '';
  let toolRoundCount = 0;
  let finalMessages: unknown[] = prepared.initialState.messages;
  let seenActionCount = 0;
  let seenDeleteCount = 0;

  try {
    const eventStream = await prepared.graph.stream(prepared.initialState, {
      ...prepared.invokeConfig,
      streamMode: ['messages', 'updates', 'values'] as const,
    });

    for await (const chunk of eventStream) {
      const [mode, data] = chunk as [string, unknown];

      if (mode === 'messages') {
        const [message, metadata] = data as [unknown, { langgraph_node?: string } | undefined];
        if (metadata?.langgraph_node !== 'agent') {
          continue;
        }

        if (messageChunkHasToolCalls(message)) {
          yield { type: 'status', message: 'Planning actions...' };
          continue;
        }

        const delta = extractMessageChunkContent(message);
        if (delta) {
          streamedText += delta;
          yield { type: 'delta', text: delta };
        }
        continue;
      }

      if (mode === 'updates') {
        const updates = data as Record<string, unknown>;
        if ('tools' in updates) {
          yield { type: 'status', message: 'Running tools...' };
          const toolsUpdate = updates['tools'] as { toolRoundCount?: number } | undefined;
          if (typeof toolsUpdate?.toolRoundCount === 'number') {
            toolRoundCount = toolsUpdate.toolRoundCount;
          }
        }

        const metadata = collectRuntimeMetadataEvents(
          prepared.runtimeContext,
          seenActionCount,
          seenDeleteCount,
        );
        for (const event of metadata.events) {
          yield event;
        }
        seenActionCount = metadata.seenActionCount;
        seenDeleteCount = metadata.seenDeleteCount;
        continue;
      }

      if (mode === 'values') {
        const values = data as { messages?: unknown[]; toolRoundCount?: number };
        if (Array.isArray(values.messages)) {
          finalMessages = values.messages;
        }
        if (typeof values.toolRoundCount === 'number') {
          toolRoundCount = values.toolRoundCount;
        }
      }
    }

    const replyFromState = extractAssistantReply(finalMessages);
    const reply = streamedText.trim().length > 0 ? streamedText : replyFromState;

    await captureTurnMemories(input, prepared.memoryEnabled, prepared.threadId, reply);

    const response = buildAgentResponse({
      reply,
      threadId: prepared.threadId,
      runtimeContext: prepared.runtimeContext,
      toolRoundCount,
      scope: input.scope,
    });

    yield { type: 'done', response };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent stream failed';
    yield { type: 'error', message };
  }
}
