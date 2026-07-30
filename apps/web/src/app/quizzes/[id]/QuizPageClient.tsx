'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Quiz } from '@sf/shared-types';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizScoreCard } from '@/components/quiz/QuizScoreCard';
import {
  computeQuizProgress,
  computeQuizScore,
  type QuizAnswerRecord,
} from '@/lib/quiz-utils';

type QuizPhase = 'playing' | 'completed';

export function QuizPageClient({ quiz }: { quiz: Quiz }) {
  const [phase, setPhase] = useState<QuizPhase>('playing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuizAnswerRecord>>({});
  const [startTime, setStartTime] = useState(() => Date.now());
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const selectedAnswer = answers[currentIndex]?.selected ?? null;
  const showExplanation = selectedAnswer !== null;
  const score = useMemo(() => computeQuizScore(answers, quiz.questions), [answers, quiz.questions]);
  const answeredCount = Object.keys(answers).length;
  const progress = computeQuizProgress(currentIndex, quiz.questions.length);

  function selectAnswer(optionIndex: number) {
    if (selectedAnswer !== null) {
      return;
    }

    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    setAnswers((current) => ({
      ...current,
      [currentIndex]: { selected: optionIndex, isCorrect },
    }));
  }

  function handleNextQuestion() {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    setCompletedAt(Date.now());
    setPhase('completed');
  }

  function handleRetake() {
    setPhase('playing');
    setCurrentIndex(0);
    setAnswers({});
    setCompletedAt(null);
    setStartTime(Date.now());
  }

  if (phase === 'completed') {
    const breakdown = quiz.questions.map((_question, index) =>
      answers[index] ?? { selected: -1, isCorrect: false },
    );

    return (
      <QuizScoreCard
        title={quiz.title}
        score={score}
        totalQuestions={quiz.questions.length}
        timeTakenMs={(completedAt ?? Date.now()) - startTime}
        answersBreakdown={breakdown}
        onRetake={handleRetake}
      />
    );
  }

  return (
    <div className="quiz-play-page">
      <h1 className="quiz-play-title">{quiz.title}</h1>
      <QuizQuestionCard
        question={currentQuestion}
        questionIndex={currentIndex}
        totalQuestions={quiz.questions.length}
        progress={progress}
        score={score}
        answeredCount={answeredCount}
        selectedAnswer={selectedAnswer}
        showExplanation={showExplanation}
        onAnswerSelect={selectAnswer}
        onNextQuestion={handleNextQuestion}
        isLastQuestion={currentIndex === quiz.questions.length - 1}
        leadingAction={
          <Link href={`/documents/${quiz.documentId}`} className="quiz-back-link icon-button" aria-label="Back to document">
            <ArrowLeft size={16} />
          </Link>
        }
      />
    </div>
  );
}
