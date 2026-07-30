'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderInput,
  MoreVertical,
} from 'lucide-react';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DocumentHtmlContent } from '@/components/DocumentHtmlContent';
import { DropdownMenu } from '@/components/DropdownMenu';
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
  parentDirectory,
}: {
  document: Document;
  quizzes: Quiz[];
  htmlContent: string | null;
  allFolders: DirectorySummary[];
  parentDirectory: DirectorySummary | null;
}) {
  const router = useRouter();
  const artifactsRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState(`${document.title} Quiz`);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [moveOpen, setMoveOpen] = useState(false);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(document);
  const [currentParentDirectory, setCurrentParentDirectory] = useState(parentDirectory);

  function handleBack() {
    if (currentParentDirectory) {
      router.push(`/directories/${currentParentDirectory.id}`);
      return;
    }
    router.push('/documents');
  }

  function openQuizForm() {
    setShowQuizForm(true);
    setGenerateMenuOpen(false);
    requestAnimationFrame(() => {
      artifactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

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
    <div className="document-viewer-page">
      <header className="document-viewer-header">
        <div className="document-viewer-back-row">
          <button type="button" className="document-viewer-back-button" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <span className="document-viewer-back-separator">|</span>
          <nav className="document-viewer-breadcrumb" aria-label="Breadcrumb">
            {currentParentDirectory ? (
              <>
                <Link href="/documents">Directories</Link>
                <span className="breadcrumb-separator">/</span>
                <Link href={`/directories/${currentParentDirectory.id}`}>
                  {currentParentDirectory.name}
                </Link>
                <span className="breadcrumb-separator">/</span>
              </>
            ) : (
              <>
                <Link href="/documents">Documents</Link>
                <span className="breadcrumb-separator">/</span>
              </>
            )}
            <span className="breadcrumb-current">{currentDocument.title}</span>
          </nav>
        </div>
      </header>

      <section className="document-viewer-title-card">
        <div className="document-viewer-title-row">
          <div className="document-viewer-title-block">
            <h1>{currentDocument.title}</h1>
            {currentDocument.description ? (
              <p className="document-viewer-description">{currentDocument.description}</p>
            ) : null}
          </div>
          <div className="document-viewer-actions">
            <button
              type="button"
              className="button secondary compact-button"
              onClick={() => setMoveOpen(true)}
            >
              <FolderInput size={16} />
              Move to folder
            </button>
            <DropdownMenu
              open={generateMenuOpen}
              onOpenChange={setGenerateMenuOpen}
              className="document-viewer-generate-wrap"
              trigger={
                <button
                  type="button"
                  className="button secondary compact-button document-viewer-generate-button"
                  aria-expanded={generateMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setGenerateMenuOpen((open) => !open)}
                >
                  Generate
                  <ChevronDown size={14} />
                </button>
              }
            >
              <button type="button" className="folder-card-menu-item" onClick={openQuizForm}>
                <Brain size={14} />
                Create quiz
              </button>
            </DropdownMenu>
            <DropdownMenu
              open={overflowMenuOpen}
              onOpenChange={setOverflowMenuOpen}
              className="document-viewer-overflow-wrap"
              trigger={
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Document actions"
                  aria-expanded={overflowMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setOverflowMenuOpen((open) => !open)}
                >
                  <MoreVertical size={16} />
                </button>
              }
            >
              <button
                type="button"
                className="folder-card-menu-item"
                onClick={() => {
                  setOverflowMenuOpen(false);
                  setMoveOpen(true);
                }}
              >
                <FolderInput size={14} />
                Move to folder
              </button>
              {currentParentDirectory ? (
                <Link
                  href={`/directories/${currentParentDirectory.id}`}
                  className="folder-card-menu-item"
                  onClick={() => setOverflowMenuOpen(false)}
                >
                  Open parent folder
                </Link>
              ) : null}
            </DropdownMenu>
          </div>
        </div>
        <div className="document-viewer-meta">
          <span>
            <Calendar size={14} />
            Created {formatDate(currentDocument.createdAt)}
          </span>
          <span>
            <Calendar size={14} />
            Updated {formatDate(currentDocument.updatedAt)}
          </span>
          <span>
            <FileText size={14} />
            {currentDocument.wordCount} words
          </span>
        </div>
      </section>

      <section className="document-viewer-content-card">
        {htmlContent ? (
          <div className="document-viewer-content-inner">
            <DocumentHtmlContent html={htmlContent} className="document-preview" />
          </div>
        ) : (
          <div className="document-viewer-empty">
            <p>Generated content is not available for this document.</p>
            {currentDocument.description ? (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                {currentDocument.description}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section ref={artifactsRef} className="document-viewer-artifacts">
        <h2>Artifacts</h2>

        {(showQuizForm || quizzes.length === 0) && (
          <div className="document-viewer-quiz-form-card">
            <h3>Generate quiz</h3>
            <p className="muted">Create a multiple-choice quiz from this source document.</p>
            <form className="document-viewer-quiz-form" onSubmit={handleGenerateQuiz}>
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
          </div>
        )}

        {quizzes.length > 0 ? (
          <div>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Quizzes ({quizzes.length})</h3>
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
          </div>
        ) : null}
      </section>

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
          const nextParent = allFolders.find((folder) => folder.id === targetDirectoryId) ?? null;
          setCurrentDocument(updated);
          setCurrentParentDirectory(nextParent);
          router.refresh();
        }}
      />
    </div>
  );
}
