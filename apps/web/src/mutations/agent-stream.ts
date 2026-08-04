import type { AgentMessageStreamEvent } from '@sf/shared-types';
import { agentMessageStreamEventSchema } from '@sf/shared-types';

export function parseSseEventBlock(block: string): AgentMessageStreamEvent | null {
  const lines = block.split('\n');
  let eventType: string | undefined;
  let dataLine: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLine = line.slice('data:'.length).trim();
    }
  }

  if (!dataLine) {
    return null;
  }

  try {
    const parsed = JSON.parse(dataLine) as unknown;
    const validated = agentMessageStreamEventSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }

    if (eventType === 'error' && typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
      return {
        type: 'error',
        message: String((parsed as { message?: string }).message ?? 'Stream failed'),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function* parseAgentMessageSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentMessageStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          continue;
        }

        const event = parseSseEventBlock(trimmed);
        if (event) {
          yield event;
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      const event = parseSseEventBlock(trailing);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
