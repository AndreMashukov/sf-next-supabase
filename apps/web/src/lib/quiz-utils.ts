import type { QuizQuestion } from '@sf/shared-types';

export type QuizAnswerRecord = {
  selected: number;
  isCorrect: boolean;
};

export function computeQuizProgress(currentIndex: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  return Math.round(((currentIndex + 1) / totalQuestions) * 100);
}

export function computeQuizScore(
  answers: Record<number, QuizAnswerRecord>,
  questions: QuizQuestion[],
): number {
  return questions.reduce((total, _question, index) => {
    return answers[index]?.isCorrect ? total + 1 : total;
  }, 0);
}

export function formatQuizDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function computeQuizAccuracy(score: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  return Math.round((score / totalQuestions) * 100);
}

export function getScoreToneClass(percentage: number): 'success' | 'warning' | 'danger' {
  if (percentage >= 80) {
    return 'success';
  }
  if (percentage >= 60) {
    return 'warning';
  }
  return 'danger';
}
