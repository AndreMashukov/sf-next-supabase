'use client';

import { useState } from 'react';
import { deleteQuizzes } from '@/mutations';

export function DeleteQuizzesDialog({
  quizIds,
  quizTitle,
  open,
  onClose,
  onDeleted,
}: {
  quizIds: string[];
  quizTitle?: string;
  open: boolean;
  onClose: () => void;
  onDeleted: (quizIds: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const count = quizIds.length;
  const title =
    count === 1 && quizTitle
      ? `Delete "${quizTitle}"?`
      : `Delete ${count} quiz${count === 1 ? '' : 'zes'}?`;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      await deleteQuizzes(quizIds);
      onDeleted(quizIds);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete quizzes');
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
        aria-labelledby="delete-quizzes-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="delete-quizzes-title">{title}</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            This action cannot be undone.
          </p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="button-row">
          <button className="button secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="button danger" type="button" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Deleting...' : count === 1 ? 'Delete quiz' : 'Delete selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
