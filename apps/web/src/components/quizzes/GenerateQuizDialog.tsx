'use client';

import { FormEvent, useEffect, useState } from 'react';
import { formatValidationError, generateQuiz, generateQuizSchema } from '@/mutations';
import type { Document, GenerationJob } from '@sf/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

const QUESTION_COUNT_OPTIONS = [3, 5, 7, 10] as const;

export function GenerateQuizDialog({
  open,
  onClose,
  documents,
  defaultDocumentId,
  onJobStarted,
}: {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  defaultDocumentId?: string;
  onJobStarted?: (job: GenerationJob) => void;
}) {
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
      const job = await generateQuiz(documentId, title, questionCount);
      onJobStarted?.(job);
      onClose();
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
                <Select
                  value={documentId}
                  onValueChange={(nextDocumentId) => {
                    setDocumentId(nextDocumentId);
                    const nextDocument = documents.find((document) => document.id === nextDocumentId);
                    if (nextDocument) {
                      setTitle(`${nextDocument.title} Quiz`);
                    }
                  }}
                >
                  <SelectTrigger aria-label="Source document">
                    <SelectValue placeholder="Select a document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((document) => (
                      <SelectItem key={document.id} value={document.id}>
                        {document.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={String(questionCount)}
                  onValueChange={(value) => setQuestionCount(Number(value))}
                >
                  <SelectTrigger aria-label="Number of questions">
                    <SelectValue placeholder="Select question count" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
