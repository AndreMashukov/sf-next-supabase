'use client';

import { useState } from 'react';
import { deleteDocuments } from '@/mutations';

export function DeleteDocumentsDialog({
  documentIds,
  documentTitle,
  quizCount = 0,
  open,
  onClose,
  onDeleted,
}: {
  documentIds: string[];
  documentTitle?: string;
  quizCount?: number;
  open: boolean;
  onClose: () => void;
  onDeleted: (documentIds: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const count = documentIds.length;
  const title =
    count === 1 && documentTitle
      ? `Delete "${documentTitle}"?`
      : `Delete ${count} document${count === 1 ? '' : 's'}?`;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      await deleteDocuments(documentIds);
      onDeleted(documentIds);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete documents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-documents-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="delete-documents-title">{title}</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            This action cannot be undone.
            {quizCount > 0
              ? ` ${quizCount} linked quiz${quizCount === 1 ? '' : 'es'} will also be deleted.`
              : ' Any linked quizzes will also be deleted.'}
          </p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="button-row">
          <button className="button secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="button danger" type="button" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Deleting...' : count === 1 ? 'Delete document' : 'Delete selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
