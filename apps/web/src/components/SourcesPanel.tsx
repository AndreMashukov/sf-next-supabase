'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronDown,
  FileText,
  FolderInput,
  Info,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import type { Document, Rule } from '@sf/shared-types';
import { formatShortDate, getDocumentFallbackColor } from '@/lib/folder-constants';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { DropdownMenu } from '@/components/DropdownMenu';
import type { DirectorySummary } from '@/lib/data/directory-summaries';

function SourceRow({
  document,
  allFolders,
  rules,
  selected,
  onSelectChange,
  onMoved,
}: {
  document: Document;
  allFolders: DirectorySummary[];
  rules: Rule[];
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onMoved?: (document: Document) => void;
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
  allFolders,
  rules,
  onDocumentMoved,
}: {
  documents: Document[];
  allFolders: DirectorySummary[];
  rules: Rule[];
  onDocumentMoved?: (document: Document) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  return (
    <section className="sources-panel">
      <div className="sources-panel-header">
        {selectedIds.size > 0 ? (
          <div className="sources-bulk-toolbar">
            <span>{selectedIds.size} selected</span>
            <button type="button" className="button secondary compact-button" disabled>
              <Trash2 size={14} />
              Delete selected
            </button>
          </div>
        ) : (
          <h2>Sources ({documents.length})</h2>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="sources-empty muted">
          No documents yet. Add a source to get started.
        </p>
      ) : (
        <div className="sources-list">
          {documents.map((document) => (
            <SourceRow
              key={document.id}
              document={document}
              allFolders={allFolders}
              rules={rules}
              selected={selectedIds.has(document.id)}
              onSelectChange={(selected) => toggleSelected(document.id, selected)}
              onMoved={onDocumentMoved}
            />
          ))}
        </div>
      )}
    </section>
  );
}
