'use client';

import { useState } from 'react';
import type { Document } from '@sf/shared-types';
import type { DirectorySummary } from '@/lib/data/directory-summaries';
import { DirectoryPickerDialog } from '@/components/directories/DirectoryPickerDialog';
import { moveDocument } from '@/lib/api';

export function UnfiledCleanupBanner({
  documents,
  allFolders,
  onDocumentMoved,
}: {
  documents: Document[];
  allFolders: DirectorySummary[];
  onDocumentMoved: (documentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [movingDocumentId, setMovingDocumentId] = useState<string | null>(null);

  if (documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className="unfiled-cleanup-banner">
        <p>
          <strong>{documents.length}</strong> unfiled document{documents.length === 1 ? '' : 's'}{' '}
          need a folder.
        </p>
        <button type="button" className="button secondary compact-button" onClick={() => setOpen(true)}>
          Review and move
        </button>
      </div>

      {open ? (
        <div className="modal-overlay" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal-card modal-card-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unfiled-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="unfiled-title">Unfiled documents</h2>
            <p className="muted">
              These documents were created before folders were required. Move them into a folder.
            </p>
            <div className="list unfiled-cleanup-list">
              {documents.map((document) => (
                <div key={document.id} className="list-item document-list-item">
                  <div>
                    <strong>{document.title}</strong>
                    <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                      {document.wordCount} words
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button secondary compact-button"
                    onClick={() => setMovingDocumentId(document.id)}
                  >
                    Move
                  </button>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {movingDocumentId ? (
        <DirectoryPickerDialog
          title="Move document"
          folders={allFolders}
          currentDirectoryId={null}
          open={Boolean(movingDocumentId)}
          onClose={() => setMovingDocumentId(null)}
          onConfirm={async (targetDirectoryId) => {
            if (!targetDirectoryId) {
              throw new Error('Documents must be moved into a folder');
            }
            await moveDocument(movingDocumentId, targetDirectoryId);
            onDocumentMoved(movingDocumentId);
            setMovingDocumentId(null);
          }}
        />
      ) : null}
    </>
  );
}
