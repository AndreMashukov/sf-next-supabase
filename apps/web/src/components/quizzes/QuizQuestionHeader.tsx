'use client';

import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { QuizProgressBar } from './QuizProgressBar';

export function QuizQuestionHeader({
  progress,
  currentQuestion,
  totalQuestions,
  score,
  answeredCount,
  questionText,
  hint,
  leadingAction,
}: {
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  answeredCount: number;
  questionText: string;
  hint?: string;
  leadingAction?: ReactNode;
}) {
  return (
    <div className="quiz-question-header">
      <QuizProgressBar
        progress={progress}
        currentQuestion={currentQuestion}
        totalQuestions={totalQuestions}
        score={score}
        answeredCount={answeredCount}
        leadingAction={leadingAction}
      />
      <div className="quiz-question-title-row">
        <h2 className="quiz-question-title">{questionText}</h2>
        {hint ? (
          <button
            type="button"
            className="quiz-hint-button"
            title={hint}
            aria-label="Show hint"
          >
            <Lightbulb size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
