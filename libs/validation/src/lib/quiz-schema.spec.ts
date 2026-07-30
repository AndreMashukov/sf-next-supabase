import { describe, expect, it } from 'vitest';
import { generateQuizSchema, quizResponseSchema } from '@sf/shared-types';

describe('generateQuizSchema', () => {
  it('rejects question counts above 10', () => {
    const result = generateQuizSchema.safeParse({
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      questionCount: 11,
    });

    expect(result.success).toBe(false);
  });
});

describe('quizResponseSchema', () => {
  it('accepts a valid quiz payload', () => {
    const result = quizResponseSchema.safeParse({
      title: 'Sample Quiz',
      questions: [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          explanation: 'Two plus two equals four.',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('accepts optional hints on quiz questions', () => {
    const result = quizResponseSchema.safeParse({
      title: 'Sample Quiz',
      questions: [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          explanation: 'Two plus two equals four.',
          hint: 'Think about pairs.',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed quiz questions', () => {
    const result = quizResponseSchema.safeParse({
      title: 'Sample Quiz',
      questions: [
        {
          question: 'Broken question',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Missing options',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
