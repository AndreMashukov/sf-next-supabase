'use client';

import { Check, X } from 'lucide-react';
import type { QuizQuestion } from '@sf/shared-types';
import { QuizQuestionHeader } from './QuizQuestionHeader';

export function QuizQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  progress,
  score,
  answeredCount,
  selectedAnswer,
  showExplanation,
  onAnswerSelect,
  onNextQuestion,
  isLastQuestion,
  leadingAction,
}: {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  progress: number;
  score: number;
  answeredCount: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
  onAnswerSelect: (optionIndex: number) => void;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
  leadingAction?: React.ReactNode;
}) {
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question.correctAnswer;

  function getOptionClassName(optionIndex: number): string {
    const classes = ['quiz-option-v2'];
    if (!isAnswered) {
      return classes.join(' ');
    }
    if (optionIndex === question.correctAnswer) {
      classes.push('correct');
    } else if (optionIndex === selectedAnswer) {
      classes.push('incorrect');
    } else {
      classes.push('muted-option');
    }
    return classes.join(' ');
  }

  return (
    <section className="quiz-question-card">
      <QuizQuestionHeader
        progress={progress}
        currentQuestion={questionIndex + 1}
        totalQuestions={totalQuestions}
        score={score}
        answeredCount={answeredCount}
        questionText={question.question}
        hint={question.hint}
        leadingAction={leadingAction}
      />

      <div className="quiz-options-list">
        {question.options.map((option, optionIndex) => (
          <button
            key={`${questionIndex}-${optionIndex}`}
            type="button"
            className={getOptionClassName(optionIndex)}
            disabled={isAnswered}
            onClick={() => onAnswerSelect(optionIndex)}
          >
            <span className="quiz-option-label">{String.fromCharCode(65 + optionIndex)}.</span>
            <span className="quiz-option-text">{option}</span>
            {isAnswered ? (
              <span className="quiz-option-status">
                {optionIndex === question.correctAnswer ? (
                  <Check size={18} />
                ) : optionIndex === selectedAnswer ? (
                  <X size={18} />
                ) : null}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {showExplanation ? (
        <div className={`quiz-explanation-card${isCorrect ? ' correct' : ' incorrect'}`}>
          <div className="quiz-explanation-header">
            {isCorrect ? <Check size={16} /> : <X size={16} />}
            <strong>{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
          </div>
          <p>{question.explanation}</p>
        </div>
      ) : null}

      {showExplanation ? (
        <button type="button" className="button quiz-next-button" onClick={onNextQuestion}>
          {isLastQuestion ? 'View Results' : 'Next Question'}
        </button>
      ) : null}
    </section>
  );
}
