import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { trimPromptMessages } from './trim-messages';

describe('trimPromptMessages', () => {
  it('keeps the most recent messages within the token budget', () => {
    const messages = Array.from({ length: 10 }, (_, index) =>
      new HumanMessage(`Message ${index} ${'word '.repeat(50)}`),
    );

    const trimmed = trimPromptMessages(messages, {
      AGENT_MEMORY_MAX_MESSAGES: '4',
      AGENT_MEMORY_MAX_PROMPT_TOKENS: '500',
    });

    expect(trimmed.length).toBeLessThanOrEqual(4);
    expect(trimmed[trimmed.length - 1]?.content).toContain('Message 9');
  });

  it('preserves short histories unchanged', () => {
    const messages = [new HumanMessage('Hello'), new AIMessage('Hi there')];
    const trimmed = trimPromptMessages(messages, {
      AGENT_MEMORY_MAX_MESSAGES: '40',
      AGENT_MEMORY_MAX_PROMPT_TOKENS: '8000',
    });

    expect(trimmed).toHaveLength(2);
  });

  it('does not leave orphaned tool messages at the front after trimming', () => {
    const messages = [
      new HumanMessage(`old ${'word '.repeat(80)}`),
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'call-1', name: 'list_directories', args: {} }],
      }),
      new ToolMessage({ content: `tool result ${'word '.repeat(80)}`, tool_call_id: 'call-1' }),
      new HumanMessage('latest question'),
      new AIMessage('latest answer'),
    ];

    const trimmed = trimPromptMessages(messages, {
      AGENT_MEMORY_MAX_MESSAGES: '10',
      AGENT_MEMORY_MAX_PROMPT_TOKENS: '40',
    });

    expect(trimmed[0]?.getType()).not.toBe('tool');
    expect(trimmed.some((message) => message.getType() === 'tool')).toBe(false);
    expect(trimmed[trimmed.length - 1]?.content).toBe('latest answer');
  });
});
