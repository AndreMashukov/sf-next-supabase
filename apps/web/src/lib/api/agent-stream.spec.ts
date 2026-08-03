import { describe, expect, it } from 'vitest';
import { parseAgentMessageSseStream, parseSseEventBlock } from './agent-stream';

describe('parseSseEventBlock', () => {
  it('parses a single SSE event block', () => {
    const event = parseSseEventBlock(
      'event: delta\ndata: {"type":"delta","text":"Hello"}',
    );

    expect(event).toEqual({ type: 'delta', text: 'Hello' });
  });

  it('returns null for malformed JSON', () => {
    expect(parseSseEventBlock('event: delta\ndata: {bad json')).toBeNull();
  });

  it('parses error payloads when schema validation fails', () => {
    const event = parseSseEventBlock('event: error\ndata: {"message":"boom"}');
    expect(event).toEqual({ type: 'error', message: 'boom' });
  });
});

describe('parseAgentMessageSseStream', () => {
  it('parses events split across chunks', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('event: thread\ndata: {"type":"thread","threadId":"11111111-1111-4111-8111-111111111111"}\n\n'),
        );
        controller.enqueue(encoder.encode('event: delta\ndata: {"type":"delta","te'));
        controller.enqueue(encoder.encode('xt":"Hi"}\n\n'));
        controller.close();
      },
    });

    const events = [];
    for await (const event of parseAgentMessageSseStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'thread', threadId: '11111111-1111-4111-8111-111111111111' },
      { type: 'delta', text: 'Hi' },
    ]);
  });
});
