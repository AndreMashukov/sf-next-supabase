'use client';

import {
  agentMessageSchema,
  parseRequest,
  type AgentMessageApiResponse,
  type AgentMessageStreamEvent,
} from '@sf/shared-types';
import { parseAgentMessageSseStream } from './agent-stream';
import { getAccessToken, getApiBaseUrl, postJson } from './client';

export async function sendAgentMessage(input: {
  scope?: 'workspace' | 'directory';
  directoryId?: string;
  message: string;
  threadId?: string;
}) {
  const payload: Record<string, string> = {
    message: input.message,
  };

  if (input.scope) {
    payload.scope = input.scope;
  }

  if (input.directoryId) {
    payload.directoryId = input.directoryId;
  }

  if (input.threadId) {
    payload.threadId = input.threadId;
  }

  const body = parseRequest(agentMessageSchema, payload);
  return postJson<AgentMessageApiResponse>('agent-message', body);
}

export async function streamAgentMessage(
  input: {
    scope?: 'workspace' | 'directory';
    directoryId?: string;
    message: string;
    threadId?: string;
  },
  handlers: {
    onEvent: (event: AgentMessageStreamEvent) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const payload: Record<string, string> = {
    message: input.message,
  };

  if (input.scope) {
    payload.scope = input.scope;
  }

  if (input.directoryId) {
    payload.directoryId = input.directoryId;
  }

  if (input.threadId) {
    payload.threadId = input.threadId;
  }

  const body = parseRequest(agentMessageSchema, payload);
  const token = await getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/agent-message-stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!response.ok) {
    let message = `Request to agent-message-stream failed`;
    try {
      const errorPayload = (await response.json()) as { error?: string };
      message = errorPayload.error ?? message;
    } catch {
      // Ignore non-JSON error bodies from the stream endpoint.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Streaming response body is unavailable');
  }

  for await (const event of parseAgentMessageSseStream(response.body)) {
    handlers.onEvent(event);
    if (event.type === 'error') {
      throw new Error(event.message);
    }
  }
}
