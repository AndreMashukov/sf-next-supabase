'use client';

import { FormEvent, useState } from 'react';
import type { DirectoryDeleteImpact } from '@/data/directory-summaries';
import type { Directory } from '@sf/shared-types';
import { deleteDirectory } from '@/mutations';

export function DeleteDirectoryDialog({
  directory,
  impact,
  open,
  onClose,
  onDeleted,
}: {
  directory: Directory;
  impact: DirectoryDeleteImpact;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const canDelete = confirmation === directory.name;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canDelete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteDirectory(directory.id);
      onDeleted();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete folder');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-directory-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="delete-directory-title">Delete folder</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            This will permanently delete <strong>{directory.name}</strong> and everything inside it.
          </p>
        </div>
        <div className="delete-impact card subtle stack">
          <p style={{ margin: 0 }}>
            <strong>{impact.directoryCount}</strong> folder
            {impact.directoryCount === 1 ? '' : 's'} and{' '}
            <strong>{impact.documentCount}</strong> document
            {impact.documentCount === 1 ? '' : 's'} will be removed.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Document storage and nested folders cannot be recovered.
          </p>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="label">
            Type <strong>{directory.name}</strong> to confirm
            <input
              className="input"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={directory.name}
              autoComplete="off"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <div className="button-row">
            <button className="button secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="button danger" type="submit" disabled={!canDelete || loading}>
              {loading ? 'Deleting...' : 'Delete folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
