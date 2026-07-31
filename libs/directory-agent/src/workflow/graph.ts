import { END, START, StateGraph } from '@langchain/langgraph';
import { SystemMessage, ToolMessage } from '@langchain/core/messages';
import { createTogetherChatModel } from '../together-client';
import { createDirectoryAgentTools } from '../tools/create-tools';
import type { DirectoryAgentRuntimeContext } from '../tools/context';
import { DirectoryAgentState } from './state';
import { getDirectoryAgentMaxToolRounds } from '../config';

function buildSystemPrompt(context: DirectoryAgentRuntimeContext): string {
  return `You are a directory assistant for a learning content workspace.

You are scoped to directory ${context.directoryId} and its descendant folders.

Capabilities:
- Use search_knowledge to retrieve relevant indexed content before answering questions.
- You may create, update, and move directories, documents, and quizzes immediately when asked.
- For any delete request, call the propose_delete_* tools instead of deleting directly.
- Be concise, cite retrieved sources when helpful, and summarize actions you took.

When the user asks factual questions about folder content, prefer search_knowledge first.
When the user asks to modify content, use the appropriate CRUD tool.

Multi-step content creation:
- When the user wants a new subfolder plus a document and quiz, prefer create_folder_with_content in a single tool call.
- Document and quiz generation are async background jobs. After starting them, reply immediately with the job IDs and what was queued.
- Do NOT poll list_documents, list_quizzes, or retry generate_quiz waiting for completion in the same turn.
- To queue a quiz after a new document, pass quizTitle and questionCount to create_document or create_folder_with_content instead of calling generate_quiz separately.
- After completing the planned tool calls for the request, respond to the user without making additional tool calls.`;
}

function shouldContinue(state: typeof DirectoryAgentState.State) {
  if (state.toolRoundCount >= getDirectoryAgentMaxToolRounds()) {
    return END;
  }

  const messages = state.messages;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  if (
    lastMessage &&
    'tool_calls' in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }
  return END;
}

export function createDirectoryAgentGraph(context: DirectoryAgentRuntimeContext) {
  const tools = createDirectoryAgentTools(context);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const model = createTogetherChatModel().bindTools(tools);

  const callModel = async (state: typeof DirectoryAgentState.State) => {
    const response = await model.invoke([
      new SystemMessage(buildSystemPrompt(context)),
      ...state.messages,
    ]);
    return { messages: [response] };
  };

  const runTools = async (state: typeof DirectoryAgentState.State) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolMessages: ToolMessage[] = [];

    if (lastMessage && 'tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls)) {
      for (const toolCall of lastMessage.tool_calls) {
        const selectedTool = toolsByName.get(toolCall.name);
        if (!selectedTool) {
          toolMessages.push(
            new ToolMessage({
              content: `Unknown tool: ${toolCall.name}`,
              tool_call_id: toolCall.id ?? toolCall.name,
            }),
          );
          continue;
        }

        const result = await selectedTool.invoke(toolCall.args).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Tool execution failed';
          return `Error: ${message}`;
        });
        toolMessages.push(
          new ToolMessage({
            content: typeof result === 'string' ? result : JSON.stringify(result),
            tool_call_id: toolCall.id ?? toolCall.name,
          }),
        );
      }
    }

    return {
      messages: toolMessages,
      toolRoundCount: state.toolRoundCount + 1,
      executedActions: context.executedActions,
      proposedDeletes: context.proposedDeletes,
    };
  };

  return new StateGraph(DirectoryAgentState)
    .addNode('agent', callModel)
    .addNode('tools', runTools)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, ['tools', END])
    .addEdge('tools', 'agent')
    .compile();
}
