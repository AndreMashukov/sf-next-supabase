'use client';

import { CreateDocumentForm } from '@/components/documents/CreateDocumentForm';
import type { GenerationJob, Rule } from '@sf/shared-types';

export function AddSourceModal({
  open,
  onClose,
  directoryId,
  rules,
  inheritedRules,
  directRules,
  onJobStarted,
}: {
  open: boolean;
  onClose: () => void;
  directoryId: string;
  rules: Rule[];
  inheritedRules: Rule[];
  directRules: Rule[];
  onJobStarted: (job: GenerationJob) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-wide add-source-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-source-title"
        onClick={(event) => event.stopPropagation()}
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
          onJobStarted={(job) => {
            onJobStarted(job);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
