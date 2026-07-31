import { describe, expect, it } from 'vitest';
import { agentMessageSchema, parseRequest } from '@sf/shared-types';

describe('agentMessageSchema', () => {
  it('accepts valid agent messages', () => {
    const parsed = parseRequest(agentMessageSchema, {
      directoryId: '11111111-1111-4111-8111-111111111111',
      message: 'Summarize this folder',
    });

    expect(parsed.message).toBe('Summarize this folder');
  });

  it('rejects empty messages', () => {
    expect(() =>
      parseRequest(agentMessageSchema, {
        directoryId: '11111111-1111-4111-8111-111111111111',
        message: '   ',
      }),
    ).toThrow('Message is required');
  });
});
