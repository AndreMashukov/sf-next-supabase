'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DocumentHtmlContent } from '@/components/DocumentHtmlContent';
import { formatValidationError, generateQuiz, generateQuizSchema, moveDocument } from '@/lib/api';
import { formatShortDate } from '@/lib/folder-constants';
import { formatDate } from '@/lib/utils';
import type { DirectorySummary } from '@/lib/data/directory-summaries';
import type { Document, Quiz } from '@sf/shared-types';

const QUESTION_COUNT_OPTIONS = [3, 5, 7, 10] as const;

export function DocumentDetailClient({
  document,
  quizzes,
  htmlContent,
  allFolders,
}: {
  document: Document;
  quizzes: Quiz[];
  htmlContent: string | null;
  allFolders: DirectorySummary[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState(`${document.title} Quiz`);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [moveOpen, setMoveOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(document);

  async function handleGenerateQuiz(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = generateQuizSchema.safeParse({
      documentId: currentDocument.id,
      title: quizTitle,
      questionCount,
    });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const quiz = await generateQuiz(currentDocument.id, quizTitle, questionCount);
      router.push(`/quizzes/${quiz.id}`);
      router.refresh();
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : 'Failed to generate quiz',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">{currentDocument.title}</h1>

      <section className="card stack">
        <div className="row">
          <div>
            <p className="muted" style={{ margin: 0 }}>
              Created {formatDate(currentDocument.createdAt)}
            </p>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {currentDocument.wordCount} words
            </p>
          </div>
          <button className="button secondary compact-button" type="button" onClick={() => setMoveOpen(true)}>
            Move to folder
          </button>
        </div>

        <div>
          <h2>Prompt</h2>
          <p className="muted">{currentDocument.description}</p>
        </div>

        <div>
          <h2>Preview</h2>
          {htmlContent ? (
            <DocumentHtmlContent html={htmlContent} className="document-preview" />
          ) : (
            <p className="muted">Generated HTML is not available for this document.</p>
          )}
        </div>
      </section>

      <section className="card stack">
        <div className="row">
          <div>
            <h2 style={{ margin: 0 }}>Generate quiz</h2>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              Create a multiple-choice quiz from this source document.
            </p>
          </div>
          <Sparkles size={20} className="muted" />
        </div>

        <form className="stack" onSubmit={handleGenerateQuiz}>
          <label className="label">
            Quiz name
            <input
              className="input"
              value={quizTitle}
              onChange={(event) => setQuizTitle(event.target.value)}
              placeholder="Chapter 1 Quiz"
            />
          </label>

          <label className="label">
            Number of questions
            <select
              className="input"
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            >
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Generating quiz...' : 'Generate quiz'}
          </button>
        </form>
      </section>

      {quizzes.length > 0 ? (
        <section className="stack">
          <h2>Quizzes ({quizzes.length})</h2>
          <div className="document-quiz-list">
            {quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="document-quiz-row">
                <div>
                  <strong>{quiz.title}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                    {quiz.questions.length} questions · {formatShortDate(quiz.createdAt)}
                  </p>
                </div>
                <ChevronRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <DirectoryPickerDialog
        title="Move document"
        folders={allFolders}
        currentDirectoryId={currentDocument.directoryId}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onConfirm={async (targetDirectoryId) => {
          if (!targetDirectoryId) {
            throw new Error('Documents must be moved into a folder');
          }

          const updated = await moveDocument(currentDocument.id, targetDirectoryId);
          setCurrentDocument(updated);
          router.refresh();
        }}
      />
    </div>
  );
}
