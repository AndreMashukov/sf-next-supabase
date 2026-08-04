'use client';

import { Check, Clock, RotateCcw, Target, Trophy, X } from 'lucide-react';
import type { QuizAnswerRecord } from '@/domain/quizzes/utils';
import { formatQuizDuration, getScoreToneClass } from '@/domain/quizzes/utils';

export function QuizScoreCard({
  title,
  score,
  totalQuestions,
  timeTakenMs,
  answersBreakdown,
  onRetake,
}: {
  title: string;
  score: number;
  totalQuestions: number;
  timeTakenMs: number;
  answersBreakdown: QuizAnswerRecord[];
  onRetake: () => void;
}) {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const tone = getScoreToneClass(percentage);

  return (
    <div className="quiz-score-page">
      <section className="quiz-score-hero card">
        <div className="quiz-score-trophy">
          <Trophy size={40} />
        </div>
        <h1>Quiz Completed!</h1>
        <p className="muted">{title}</p>
      </section>

      <div className="quiz-score-stats">
        <article className="card quiz-score-stat">
          <Target size={28} className="quiz-score-stat-icon" />
          <div className={`quiz-score-stat-value tone-${tone}`}>
            {score}/{totalQuestions}
          </div>
          <div className="muted">Score</div>
        </article>
        <article className="card quiz-score-stat">
          <div className={`quiz-score-stat-value tone-${tone}`}>{percentage}%</div>
          <div className="muted">Accuracy</div>
        </article>
        <article className="card quiz-score-stat">
          <Clock size={28} className="quiz-score-stat-icon" />
          <div className="quiz-score-stat-value tone-primary">{formatQuizDuration(timeTakenMs)}</div>
          <div className="muted">Time</div>
        </article>
      </div>

      <section className="card quiz-score-review">
        <h2>Review Results</h2>
        <div className="quiz-score-review-list">
          {answersBreakdown.map((answer, index) => (
            <div
              key={index}
              className={`quiz-score-review-item${answer.isCorrect ? ' correct' : ' incorrect'}`}
            >
              {answer.isCorrect ? <Check size={18} /> : <X size={18} />}
              <span>
                Question {index + 1}: {answer.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <button type="button" className="button quiz-retake-button" onClick={onRetake}>
        <RotateCcw size={18} />
        Take Quiz Again
      </button>
    </div>
  );
}
