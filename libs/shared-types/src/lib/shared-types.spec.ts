import { describe, expect, it } from 'vitest';
import type { Document, QuizQuestion } from '../index';

describe('shared types contracts', () => {
  it('allows constructing a document shape', () => {
    const document: Document = {
      id: 'doc-1',
      userId: 'user-1',
      title: 'Sample',
      description: 'Preview text',
      wordCount: 2,
      storagePath: 'users/user-1/documents/doc-1/content.html',
      appliedRuleIds: [],
      directoryId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(document.title).toBe('Sample');
  });

  it('allows constructing a quiz question shape', () => {
    const question: QuizQuestion = {
      question: 'Sample?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 1,
      explanation: 'Because B.',
    };

    expect(question.options).toHaveLength(4);
  });
});
