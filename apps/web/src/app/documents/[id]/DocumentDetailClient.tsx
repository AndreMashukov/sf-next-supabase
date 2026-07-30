'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DocumentHtmlContent } from '@/components/DocumentHtmlContent';
import { generateQuiz, formatValidationError, generateQuizSchema, moveDocument } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { DirectorySummary } from '@/lib/data/directory-summaries';
import type { Document, Quiz } from '@sf/shared-types';

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
  const [moveOpen, setMoveOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(document);

  async function handleGenerateQuiz() {
    setLoading(true);
    setError(null);

    const validation = generateQuizSchema.safeParse({
      documentId: currentDocument.id,
      title: quizTitle,
      questionCount: 5,
    });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const quiz = await generateQuiz(currentDocument.id, quizTitle, 5);
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
        <h2>Generate quiz</h2>
        <label className="label">
          Quiz title
          <input
            className="input"
            value={quizTitle}
            onChange={(event) => setQuizTitle(event.target.value)}
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" type="button" disabled={loading} onClick={handleGenerateQuiz}>
          {loading ? 'Generating...' : 'Generate quiz'}
        </button>
      </section>

      {quizzes.length > 0 ? (
        <section className="stack">
          <h2>Quizzes</h2>
          <div className="list">
            {quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="list-item">
                <strong>{quiz.title}</strong>
                <span className="muted">Open</span>
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
