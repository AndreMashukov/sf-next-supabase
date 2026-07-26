import { describe, expect, it } from 'vitest';
import { quizResponseSchema } from '../index';

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
