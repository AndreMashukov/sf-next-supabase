import { describe, expect, it } from 'vitest';
import {
  computeQuizAccuracy,
  computeQuizProgress,
  computeQuizScore,
  formatQuizDuration,
  getScoreToneClass,
} from './quiz-utils';
import type { QuizQuestion } from '@sf/shared-types';

const sampleQuestions: QuizQuestion[] = [
  {
    question: 'Q1',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Because B',
  },
  {
    question: 'Q2',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Because A',
  },
];

describe('quiz-utils', () => {
  it('computes progress from the current question index', () => {
    expect(computeQuizProgress(0, 4)).toBe(25);
    expect(computeQuizProgress(3, 4)).toBe(100);
  });

  it('computes score from answer records', () => {
    const score = computeQuizScore(
      {
        0: { selected: 1, isCorrect: true },
        1: { selected: 2, isCorrect: false },
      },
      sampleQuestions,
    );

    expect(score).toBe(1);
  });

  it('formats duration and accuracy helpers', () => {
    expect(formatQuizDuration(65_000)).toBe('1:05');
    expect(computeQuizAccuracy(4, 5)).toBe(80);
    expect(getScoreToneClass(85)).toBe('success');
    expect(getScoreToneClass(65)).toBe('warning');
    expect(getScoreToneClass(40)).toBe('danger');
  });
});
