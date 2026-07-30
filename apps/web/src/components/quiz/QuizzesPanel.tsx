'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import type { Document } from '@sf/shared-types';
import type { QuizWithDocumentTitle } from '@/lib/data/quizzes';
import { formatShortDate } from '@/lib/folder-constants';
import { GenerateQuizDialog } from './GenerateQuizDialog';

export function QuizzesPanel({
  quizzes,
  documents,
}: {
  quizzes: QuizWithDocumentTitle[];
  documents: Document[];
}) {
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <section className="quizzes-panel">
      <div className="quizzes-panel-header">
        <h2>
          <Brain size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.375rem' }} />
          Quizzes ({quizzes.length})
        </h2>
        <button
          type="button"
          className="button secondary compact-button"
          onClick={() => setGenerateOpen(true)}
          disabled={documents.length === 0}
        >
          + Create quiz
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="quizzes-empty muted">Add a source document before creating quizzes.</p>
      ) : quizzes.length === 0 ? (
        <p className="quizzes-empty muted">No quizzes in this directory yet.</p>
      ) : (
        <div className="quizzes-list">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="quiz-artifact-row">
              <div className="quiz-artifact-main">
                <span className="quiz-artifact-title">{quiz.title}</span>
                <p className="quiz-artifact-meta muted">
                  {quiz.documentTitle} · {quiz.questions.length} questions ·{' '}
                  {formatShortDate(quiz.createdAt)}
                </p>
              </div>
              <ChevronRight size={16} className="muted" />
            </Link>
          ))}
        </div>
      )}

      <GenerateQuizDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        documents={documents}
        onGenerated={() => setGenerateOpen(false)}
      />
    </section>
  );
}
