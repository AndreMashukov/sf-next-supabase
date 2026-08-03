'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { Quiz } from '@sf/shared-types';
import { QuizQuestionCard } from '@/components/quizzes/QuizQuestionCard';
import { QuizScoreCard } from '@/components/quizzes/QuizScoreCard';
import { DeleteQuizzesDialog } from '@/components/quizzes/DeleteQuizzesDialog';
import {
  computeQuizProgress,
  computeQuizScore,
  type QuizAnswerRecord,
} from '@/lib/quiz-utils';

type QuizPhase = 'playing' | 'completed';

export function QuizPageClient({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [phase, setPhase] = useState<QuizPhase>('playing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuizAnswerRecord>>({});
  const [startTime, setStartTime] = useState(() => Date.now());
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const deleteAction = (
    <button
      type="button"
      className="button secondary compact-button danger"
      onClick={() => setDeleteOpen(true)}
    >
      <Trash2 size={14} />
      Delete quiz
    </button>
  );

  if (phase === 'completed') {
    const breakdown = quiz.questions.map((_question, index) =>
      answers[index] ?? { selected: -1, isCorrect: false },
    );

    return (
      <>
        <div className="quiz-play-page">
          <div className="quiz-play-actions">{deleteAction}</div>
          <QuizScoreCard
            title={quiz.title}
            score={score}
            totalQuestions={quiz.questions.length}
            timeTakenMs={(completedAt ?? Date.now()) - startTime}
            answersBreakdown={breakdown}
            onRetake={handleRetake}
          />
        </div>
        <DeleteQuizzesDialog
          quizIds={[quiz.id]}
          quizTitle={quiz.title}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push(`/documents/${quiz.documentId}`)}
        />
      </>
    );
  }

  return (
    <>
      <div className="quiz-play-page">
        <div className="quiz-play-title-row">
          <h1 className="quiz-play-title">{quiz.title}</h1>
          {deleteAction}
        </div>
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
      <DeleteQuizzesDialog
        quizIds={[quiz.id]}
        quizTitle={quiz.title}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push(`/documents/${quiz.documentId}`)}
      />
    </>
  );
}
