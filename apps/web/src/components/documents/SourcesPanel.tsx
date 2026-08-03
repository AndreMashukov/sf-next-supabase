'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ChevronDown,
  FileText,
  FolderInput,
  Info,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import type { Document, GenerationJob, Rule } from '@sf/shared-types';
import { formatShortDate, getDocumentFallbackColor } from '@/lib/folder-constants';
import { getPendingJobLabel } from '@/lib/generation-jobs';
import { DirectoryPickerDialog } from '@/components/directories/DirectoryPickerDialog';
import { DeleteDocumentsDialog } from '@/components/documents/DeleteDocumentsDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import type { DirectorySummary } from '@/lib/data/directory-summaries';

function SourceRow({
  document,
  allFolders,
  rules,
  selected,
  linkedQuizCount,
  onSelectChange,
  onMoved,
  onDeleteRequest,
}: {
  document: Document;
  allFolders: DirectorySummary[];
  rules: Rule[];
  selected: boolean;
  linkedQuizCount: number;
  onSelectChange: (selected: boolean) => void;
  onMoved?: (document: Document) => void;
  onDeleteRequest: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const railColor = getDocumentFallbackColor(document.id);
  const appliedRuleNames = document.appliedRuleIds
    .map((id) => rules.find((rule) => rule.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <>
      <article
        className={`source-row${selected ? ' selected' : ''}`}
        style={{ borderLeftColor: railColor }}
      >
        <label className="source-row-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectChange(event.target.checked)}
            aria-label={`Select ${document.title}`}
          />
        </label>
        <FileText size={18} className="source-row-doc-icon" />
        <div className="source-row-main">
          <Link href={`/documents/${document.id}`} className="source-row-title">
            {document.title}
          </Link>
          <p className="source-row-meta muted">
            {document.wordCount} words · {formatShortDate(document.createdAt)}
            {linkedQuizCount > 0 ? ` · ${linkedQuizCount} quiz${linkedQuizCount === 1 ? '' : 'zes'}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="icon-button source-row-info"
          title={
            appliedRuleNames.length > 0
              ? `Rules: ${appliedRuleNames.join(', ')}`
              : 'No rules applied'
          }
          aria-label="Document info"
        >
          <Info size={16} />
        </button>
        <DropdownMenu
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          className="source-row-generate-wrap"
          trigger={
            <button
              type="button"
              className="button secondary source-row-generate"
              aria-expanded={generateOpen}
              aria-haspopup="menu"
              onClick={() => setGenerateOpen((open) => !open)}
            >
              Generate
              <ChevronDown size={14} />
            </button>
          }
        >
          <span className="dropdown-menu-muted-item muted">Coming soon</span>
        </DropdownMenu>
        <DropdownMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          className="source-row-menu-wrap"
          trigger={
            <button
              type="button"
              className="icon-button"
              aria-label="Source actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={16} />
            </button>
          }
        >
          <Link
            href={`/documents/${document.id}`}
            className="folder-card-menu-item"
            onClick={() => setMenuOpen(false)}
          >
            Open
          </Link>
          <button
            type="button"
            className="folder-card-menu-item"
            onClick={() => {
              setMenuOpen(false);
              setMoveOpen(true);
            }}
          >
            <FolderInput size={14} />
            Move
          </button>
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
      </article>

      <DirectoryPickerDialog
        title="Move document"
        folders={allFolders}
        currentDirectoryId={document.directoryId}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onConfirm={async (targetDirectoryId) => {
          if (!targetDirectoryId) {
            throw new Error('Documents must be moved into a folder');
          }
          const { moveDocument } = await import('@/lib/api');
          const updated = await moveDocument(document.id, targetDirectoryId);
          onMoved?.(updated);
        }}
      />
    </>
  );
}

export function SourcesPanel({
  documents,
  pendingDocumentJobs = [],
  allFolders,
  rules,
  quizCountsByDocumentId = {},
  onDocumentMoved,
  onDocumentsDeleted,
}: {
  documents: Document[];
  pendingDocumentJobs?: GenerationJob[];
  allFolders: DirectorySummary[];
  rules: Rule[];
  quizCountsByDocumentId?: Record<string, number>;
  onDocumentMoved?: (document: Document) => void;
  onDocumentsDeleted?: (documentIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string | undefined>();

  const pendingQuizCount = useMemo(
    () =>
      pendingDeleteIds.reduce(
        (total, documentId) => total + (quizCountsByDocumentId[documentId] ?? 0),
        0,
      ),
    [pendingDeleteIds, quizCountsByDocumentId],
  );

  function toggleSelected(documentId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(documentId);
      } else {
        next.delete(documentId);
      }
      return next;
    });
  }

  function openDeleteDialog(documentIds: string[], documentTitle?: string) {
    setPendingDeleteIds(documentIds);
    setPendingDeleteTitle(documentTitle);
    setDeleteOpen(true);
  }

  function handleDeleted(documentIds: string[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of documentIds) {
        next.delete(id);
      }
      return next;
    });
    onDocumentsDeleted?.(documentIds);
  }

  return (
    <section className="sources-panel">
      <div className="sources-panel-header">
        {selectedIds.size > 0 ? (
          <div className="sources-bulk-toolbar">
            <span>{selectedIds.size} selected</span>
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
          <h2>Sources ({documents.length + pendingDocumentJobs.length})</h2>
        )}
      </div>

      {documents.length === 0 && pendingDocumentJobs.length === 0 ? (
        <p className="sources-empty muted">
          No documents yet. Add a source to get started.
        </p>
      ) : (
        <div className="sources-list">
          {pendingDocumentJobs.map((job) => (
            <article
              key={job.id}
              className="source-row pending-generation-row"
              style={{ borderLeftColor: '#94a3b8' }}
            >
              <FileText size={18} className="source-row-doc-icon" />
              <div className="source-row-main">
                <span className="source-row-title">{getPendingJobLabel(job)}</span>
                <p className="source-row-meta muted">Generating...</p>
              </div>
            </article>
          ))}
          {documents.map((document) => (
            <SourceRow
              key={document.id}
              document={document}
              allFolders={allFolders}
              rules={rules}
              selected={selectedIds.has(document.id)}
              linkedQuizCount={quizCountsByDocumentId[document.id] ?? 0}
              onSelectChange={(selected) => toggleSelected(document.id, selected)}
              onMoved={onDocumentMoved}
              onDeleteRequest={() => openDeleteDialog([document.id], document.title)}
            />
          ))}
        </div>
      )}

      <DeleteDocumentsDialog
        documentIds={pendingDeleteIds}
        documentTitle={pendingDeleteTitle}
        quizCount={pendingQuizCount}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </section>
  );
}
