'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import type { Quiz, QuizQuestion } from '@sf/shared-types';

export function QuizPageClient({ quiz }: { quiz: Quiz }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];
  const score = useMemo(() => {
    return quiz.questions.reduce((total, question, index) => {
      return answers[index] === question.correctAnswer ? total + 1 : total;
    }, 0);
  }, [answers, quiz.questions]);

  function selectAnswer(optionIndex: number) {
    if (submitted) {
      return;
    }

    setAnswers((current) => ({ ...current, [currentIndex]: optionIndex }));
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleNext() {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((index) => index + 1);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    }
  }

  return (
    <main className="container stack">
      <AppHeader title={quiz.title} />

      <section className="card stack">
        <div className="row">
          <p className="muted" style={{ margin: 0 }}>
            Question {currentIndex + 1} of {quiz.questions.length}
          </p>
          <Link href={`/documents/${quiz.documentId}`} className="button secondary">
            Back to document
          </Link>
        </div>

        <QuestionCard
          question={currentQuestion}
          questionIndex={currentIndex}
          selectedAnswer={answers[currentIndex]}
          submitted={submitted}
          onSelect={selectAnswer}
        />

        <div className="row">
          <button
            className="button secondary"
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </button>

          {currentIndex < quiz.questions.length - 1 ? (
            <button className="button" type="button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="button" type="button" onClick={handleSubmit} disabled={submitted}>
              {submitted ? 'Submitted' : 'Submit quiz'}
            </button>
          )}
        </div>

        {submitted ? (
          <div className="card" style={{ background: '#eef2ff' }}>
            <strong>
              Score: {score}/{quiz.questions.length}
            </strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              Review each question to see explanations.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  submitted,
  onSelect,
}: {
  question: QuizQuestion;
  questionIndex: number;
  selectedAnswer?: number;
  submitted: boolean;
  onSelect: (optionIndex: number) => void;
}) {
  return (
    <div className="stack">
      <h2>{question.question}</h2>
      <div className="stack">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === optionIndex;
          const isCorrect = optionIndex === question.correctAnswer;
          const className = [
            'quiz-option',
            isSelected ? 'selected' : '',
            submitted && isCorrect ? 'correct' : '',
            submitted && isSelected && !isCorrect ? 'incorrect' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${questionIndex}-${optionIndex}`}
              type="button"
              className={className}
              onClick={() => onSelect(optionIndex)}
            >
              <span>{String.fromCharCode(65 + optionIndex)}.</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div className="card">
          <strong>Explanation</strong>
          <p style={{ marginBottom: 0 }}>{question.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
