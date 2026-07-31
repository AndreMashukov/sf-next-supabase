'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Brain, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import type { Document, GenerationJob } from '@sf/shared-types';
import type { QuizWithDocumentTitle } from '@/lib/data/quizzes';
import { formatShortDate } from '@/lib/folder-constants';
import { getPendingJobLabel } from '@/lib/generation-jobs';
import { DeleteQuizzesDialog } from '@/components/DeleteQuizzesDialog';
import { DropdownMenu } from '@/components/DropdownMenu';
import { GenerateQuizDialog } from './GenerateQuizDialog';

function QuizRow({
  quiz,
  selected,
  onSelectChange,
  onDeleteRequest,
}: {
  quiz: QuizWithDocumentTitle;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onDeleteRequest: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className={`quiz-artifact-row${selected ? ' selected' : ''}`}>
      <label className="source-row-checkbox">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelectChange(event.target.checked)}
          aria-label={`Select ${quiz.title}`}
        />
      </label>
      <Link href={`/quizzes/${quiz.id}`} className="quiz-artifact-main">
        <span className="quiz-artifact-title">{quiz.title}</span>
        <p className="quiz-artifact-meta muted">
          {quiz.documentTitle} · {quiz.questions.length} questions ·{' '}
          {formatShortDate(quiz.createdAt)}
        </p>
      </Link>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        className="quiz-row-menu-wrap"
        trigger={
          <button
            type="button"
            className="icon-button"
            aria-label="Quiz actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical size={16} />
          </button>
        }
      >
        <Link
          href={`/quizzes/${quiz.id}`}
          className="folder-card-menu-item"
          onClick={() => setMenuOpen(false)}
        >
          Open
        </Link>
        <button
          type="button"
          className="folder-card-menu-item danger"
          onClick={() => {
            setMenuOpen(false);
            onDeleteRequest();
          }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </DropdownMenu>
      <ChevronRight size={16} className="muted quiz-artifact-chevron" />
    </article>
  );
}

export function QuizzesPanel({
  quizzes,
  documents,
  pendingQuizJobs = [],
  onJobStarted,
  onQuizzesDeleted,
}: {
  quizzes: QuizWithDocumentTitle[];
  documents: Document[];
  pendingQuizJobs?: GenerationJob[];
  onJobStarted?: (job: GenerationJob) => void;
  onQuizzesDeleted?: (quizIds: string[]) => void;
}) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string | undefined>();

  const selectedCount = selectedIds.size;

  function toggleSelected(quizId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(quizId);
      } else {
        next.delete(quizId);
      }
      return next;
    });
  }

  function openDeleteDialog(quizIds: string[], quizTitle?: string) {
    setPendingDeleteIds(quizIds);
    setPendingDeleteTitle(quizTitle);
    setDeleteOpen(true);
  }

  function handleDeleted(quizIds: string[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of quizIds) {
        next.delete(id);
      }
      return next;
    });
    onQuizzesDeleted?.(quizIds);
  }

  const pendingTitle = useMemo(() => {
    if (pendingDeleteIds.length !== 1) {
      return pendingDeleteTitle;
    }
    return pendingDeleteTitle ?? quizzes.find((quiz) => quiz.id === pendingDeleteIds[0])?.title;
  }, [pendingDeleteIds, pendingDeleteTitle, quizzes]);

  return (
    <section className="quizzes-panel">
      <div className="quizzes-panel-header">
        {selectedCount > 0 ? (
          <div className="sources-bulk-toolbar">
            <span>{selectedCount} selected</span>
            <button
              type="button"
              className="button secondary compact-button danger"
              onClick={() => openDeleteDialog([...selectedIds])}
            >
              <Trash2 size={14} />
              Delete selected
            </button>
          </div>
        ) : (
          <h2>
            <Brain
              size={18}
              style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.375rem' }}
            />
            Quizzes ({quizzes.length + pendingQuizJobs.length})
          </h2>
        )}
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
      ) : quizzes.length === 0 && pendingQuizJobs.length === 0 ? (
        <p className="quizzes-empty muted">No quizzes in this directory yet.</p>
      ) : (
        <div className="quizzes-list">
          {pendingQuizJobs.map((job) => (
            <article key={job.id} className="quiz-artifact-row pending-generation-row">
              <Brain size={18} className="muted" />
              <div className="quiz-artifact-main">
                <span className="quiz-artifact-title">{getPendingJobLabel(job)}</span>
                <p className="quiz-artifact-meta muted">Generating...</p>
              </div>
            </article>
          ))}
          {quizzes.map((quiz) => (
            <QuizRow
              key={quiz.id}
              quiz={quiz}
              selected={selectedIds.has(quiz.id)}
              onSelectChange={(selected) => toggleSelected(quiz.id, selected)}
              onDeleteRequest={() => openDeleteDialog([quiz.id], quiz.title)}
            />
          ))}
        </div>
      )}

      <GenerateQuizDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        documents={documents}
        onJobStarted={(job) => {
          onJobStarted?.(job);
          setGenerateOpen(false);
        }}
      />

      <DeleteQuizzesDialog
        quizIds={pendingDeleteIds}
        quizTitle={pendingTitle}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}
