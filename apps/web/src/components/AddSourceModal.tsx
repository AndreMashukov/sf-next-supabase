'use client';

import { CreateDocumentForm } from '@/app/documents/DocumentsPageClient';
import type { Rule } from '@sf/shared-types';
import type { Document } from '@sf/shared-types';

export function AddSourceModal({
  open,
  onClose,
  directoryId,
  rules,
  inheritedRules,
  directRules,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  directoryId: string;
  rules: Rule[];
  inheritedRules: Rule[];
  directRules: Rule[];
  onCreated: (document: Document) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <dialog
        open
        className="modal-card modal-card-wide add-source-dialog"
        aria-labelledby="add-source-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="add-source-dialog-header">
          <h2 id="add-source-title">Add source</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <CreateDocumentForm
          rules={rules}
          directoryId={directoryId}
          inheritedRules={inheritedRules}
          directRules={directRules}
          onCreated={(document) => {
            onCreated(document);
            onClose();
          }}
        />
      </dialog>
    </div>
  );
}
