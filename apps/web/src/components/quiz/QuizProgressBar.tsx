'use client';

import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function QuizProgressBar({
  progress,
  currentQuestion,
  totalQuestions,
  score,
  answeredCount,
  leadingAction,
}: {
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  answeredCount: number;
  leadingAction?: ReactNode;
}) {
  return (
    <div className="quiz-progress-wrap">
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="quiz-progress-meta">
        <div className="quiz-progress-meta-left">
          {leadingAction}
          <span className="quiz-progress-label">
            Question {currentQuestion} of {totalQuestions}
          </span>
        </div>
        <span className="quiz-progress-score-pill">
          <CheckCircle2 size={12} className="quiz-progress-score-icon" />
          <span className="quiz-progress-score-value">{score}</span>
          <span>/ {answeredCount} correct</span>
        </span>
      </div>
    </div>
  );
}
