import type { BaseMessage } from '@langchain/core/messages';
import { getAgentMemoryMaxMessages, getAgentMemoryMaxPromptTokens } from '../config';

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function getMessageText(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (typeof part === 'object' && part !== null && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join(' ');
  }

  return '';
}

function dropLeadingToolMessages(messages: BaseMessage[]): BaseMessage[] {
  let start = 0;
  while (start < messages.length && messages[start]!.getType() === 'tool') {
    start += 1;
  }
  return start === 0 ? messages : messages.slice(start);
}

export function trimPromptMessages(
  messages: BaseMessage[],
  env: NodeJS.ProcessEnv = process.env,
): BaseMessage[] {
  const maxMessages = getAgentMemoryMaxMessages(env);
  const maxTokens = getAgentMemoryMaxPromptTokens(env);

  let trimmed = dropLeadingToolMessages(messages.slice(-maxMessages));

  while (trimmed.length > 1) {
    const totalTokens = trimmed.reduce(
      (sum, message) => sum + estimateTokens(getMessageText(message)),
      0,
    );

    if (totalTokens <= maxTokens) {
      break;
    }

    trimmed = dropLeadingToolMessages(trimmed.slice(1));
  }

  return trimmed;
}
