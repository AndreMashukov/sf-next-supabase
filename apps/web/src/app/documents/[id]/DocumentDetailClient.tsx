'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateQuiz } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { formatDate } from '@/lib/utils';
import type { Document, Quiz } from '@sf/shared-types';

export function DocumentDetailClient({
  document,
  quizzes,
}: {
  document: Document;
  quizzes: Quiz[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState(`${document.title} Quiz`);

  async function handleGenerateQuiz() {
    setLoading(true);
    setError(null);

    try {
      const quiz = await generateQuiz(document.id, quizTitle, 5);
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
    <main className="container stack">
      <AppHeader title={document.title} />

      <section className="card stack">
        <div className="row">
          <div>
            <p className="muted" style={{ margin: 0 }}>
              Created {formatDate(document.createdAt)}
            </p>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {document.wordCount} words
            </p>
          </div>
          <Link href="/documents" className="button secondary">
            Back to documents
          </Link>
        </div>

        <div>
          <h2>Preview</h2>
          <p>{document.description}</p>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>Generate quiz</h2>
          <p className="muted">
            Create a multiple-choice quiz from this document using Gemini.
          </p>
        </div>

        <label className="label">
          Quiz title
          <input
            className="input"
            value={quizTitle}
            onChange={(event) => setQuizTitle(event.target.value)}
          />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <button className="button" type="button" onClick={handleGenerateQuiz} disabled={loading}>
          {loading ? 'Generating quiz...' : 'Generate quiz'}
        </button>
      </section>

      <section className="stack">
        <h2>Existing quizzes</h2>
        {quizzes.length === 0 ? (
          <div className="card">
            <p className="muted">No quizzes yet for this document.</p>
          </div>
        ) : (
          <div className="list">
            {quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="list-item">
                <div>
                  <strong>{quiz.title}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {quiz.questions.length} questions
                  </p>
                </div>
                <span className="muted">Take quiz</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
