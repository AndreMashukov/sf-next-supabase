import { describe, expect, it } from 'vitest';
import { agentMessageSchema, parseRequest } from '@sf/shared-types';

describe('agentMessageSchema', () => {
  it('accepts workspace messages without directoryId', () => {
    const parsed = parseRequest(agentMessageSchema, {
      message: 'List all my directories',
    });

    expect(parsed.scope).toBe('workspace');
    expect(parsed.message).toBe('List all my directories');
    expect(parsed.directoryId).toBeUndefined();
  });

  it('accepts directory-scoped messages with directoryId', () => {
    const parsed = parseRequest(agentMessageSchema, {
      scope: 'directory',
      directoryId: '11111111-1111-4111-8111-111111111111',
      message: 'Summarize this folder',
    });

    expect(parsed.scope).toBe('directory');
    expect(parsed.message).toBe('Summarize this folder');
  });

  it('rejects empty messages', () => {
    expect(() =>
      parseRequest(agentMessageSchema, {
        message: '   ',
      }),
    ).toThrow('Message is required');
  });
});
