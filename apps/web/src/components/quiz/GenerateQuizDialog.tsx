'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatValidationError, generateQuiz, generateQuizSchema } from '@/lib/api';
import type { Document } from '@sf/shared-types';

const QUESTION_COUNT_OPTIONS = [3, 5, 7, 10] as const;

export function GenerateQuizDialog({
  open,
  onClose,
  documents,
  defaultDocumentId,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  defaultDocumentId?: string;
  onGenerated?: () => void;
}) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState(defaultDocumentId ?? documents[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialDocumentId = defaultDocumentId ?? documents[0]?.id ?? '';
    const initialDocument = documents.find((document) => document.id === initialDocumentId);
    setDocumentId(initialDocumentId);
    setTitle(initialDocument ? `${initialDocument.title} Quiz` : '');
    setQuestionCount(5);
    setError(null);
  }, [open, defaultDocumentId, documents]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = generateQuizSchema.safeParse({
      documentId,
      title,
      questionCount,
    });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const quiz = await generateQuiz(documentId, title, questionCount);
      onGenerated?.();
      onClose();
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
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-wide"
        role="dialog"
        aria-labelledby="generate-quiz-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="directory-dialog-header">
          <div>
            <h2 id="generate-quiz-title">Generate quiz</h2>
            <p className="muted">Create an MCQ quiz from a source document in this folder.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="quiz-generate-form" onSubmit={handleSubmit}>
          {documents.length === 0 ? (
            <p className="muted">Add a source document before generating a quiz.</p>
          ) : (
            <>
              <label className="label">
                Source document
                <select
                  className="input"
                  value={documentId}
                  onChange={(event) => {
                    const nextDocumentId = event.target.value;
                    setDocumentId(nextDocumentId);
                    const nextDocument = documents.find((document) => document.id === nextDocumentId);
                    if (nextDocument) {
                      setTitle(`${nextDocument.title} Quiz`);
                    }
                  }}
                >
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Quiz name
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
            </>
          )}

          {error ? <div className="error">{error}</div> : null}

          <div className="quiz-generate-form-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button"
              disabled={loading || documents.length === 0}
            >
              {loading ? 'Generating...' : 'Generate quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
