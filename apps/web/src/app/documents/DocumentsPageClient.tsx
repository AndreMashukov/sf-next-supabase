'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import {
  attachRuleToDirectory,
  createDirectory,
  createDocument,
  createDocumentSchema,
  createDirectorySchema,
  detachRuleFromDirectory,
  formatValidationError,
  moveDocument,
  updateDirectory,
} from '@/lib/api';
import { DeleteDirectoryDialog } from '@/components/DeleteDirectoryDialog';
import { DirectoryPickerDialog } from '@/components/DirectoryPickerDialog';
import { FolderCardGrid } from '@/components/FolderCard';
import { InheritedRulesPreview } from '@/components/InheritedRulesPreview';
import { RuleSelector } from '@/components/RuleSelector';
import { CreateDirectoryDialog } from '@/components/CreateDirectoryDialog';
import { UnfiledCleanupBanner } from '@/components/UnfiledCleanupBanner';
import type { DirectoryDeleteImpact, DirectorySummary } from '@/lib/data/directory-summaries';
import { partitionDirectAndInheritedRules } from '@/lib/directory-rules';
import type { Directory, Document, GenerationJob, Rule } from '@sf/shared-types';

function Breadcrumbs({
  ancestors,
  currentName,
}: {
  ancestors: Directory[];
  currentName?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <Link href="/documents" className="breadcrumb-link">
        Root
      </Link>
      {ancestors.map((directory) => (
        <span key={directory.id} className="breadcrumb-segment">
          <span className="breadcrumb-separator">/</span>
          <Link href={`/directories/${directory.id}`} className="breadcrumb-link">
            {directory.name}
          </Link>
        </span>
      ))}
      {currentName ? (
        <span className="breadcrumb-segment">
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentName}</span>
        </span>
      ) : null}
    </nav>
  );
}

export function CreateDirectoryForm({
  parentId,
  onCreated,
}: {
  parentId?: string;
  onCreated: (directory: DirectorySummary) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = createDirectorySchema.safeParse({ name, parentId });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const directory = await createDirectory({ name, parentId });
      onCreated({
        ...directory,
        documentCount: 0,
        childCount: 0,
        ruleIds: [],
      });
      setName('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="folder-create-form" onSubmit={handleSubmit}>
      <label className="label folder-create-label">
        Folder name
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chapter 1"
          required
        />
      </label>
      <button className="button secondary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create folder'}
      </button>
      {error ? <div className="error folder-create-error">{error}</div> : null}
    </form>
  );
}

export function CreateDocumentForm({
  rules,
  directoryId,
  inheritedRules,
  directRules,
  onJobStarted,
}: {
  rules: Rule[];
  directoryId: string;
  inheritedRules: Rule[];
  directRules: Rule[];
  onJobStarted: (job: GenerationJob) => void;
}) {
  const defaultRuleIds = useMemo(
    () => rules.filter((rule) => rule.isDefault).map((rule) => rule.id),
    [rules],
  );
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(defaultRuleIds);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const validation = createDocumentSchema.safeParse({
      title,
      text,
      ruleIds: selectedRuleIds,
      directoryId,
    });

    if (!validation.success) {
      setError(formatValidationError(validation.error));
      setLoading(false);
      return;
    }

    try {
      const job = await createDocument(title, text, selectedRuleIds, directoryId);
      setTitle('');
      setText('');
      setSelectedRuleIds(defaultRuleIds);
      onJobStarted(job);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <div>
        <h2>Create document</h2>
        <p className="muted">
          Describe what to generate. Selected rules and inherited folder rules guide the AI.
        </p>
      </div>

      <InheritedRulesPreview inheritedRules={inheritedRules} directRules={directRules} />

      <label className="label">
        Title
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="My study notes"
          required
        />
      </label>

      <label className="label">
        Prompt
        <textarea
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Explain the topic, depth, and structure you want the AI to generate..."
          required
        />
      </label>

      <RuleSelector
        rules={rules}
        selectedRuleIds={selectedRuleIds}
        onSelectionChange={setSelectedRuleIds}
      />

      {error ? <div className="error">{error}</div> : null}

      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Create document'}
      </button>
    </form>
  );
}

export function DirectoryRuleManager({
  directoryId,
  rules,
  attachedRuleIds,
  inheritedRules,
  onChanged,
}: {
  directoryId: string;
  rules: Rule[];
  attachedRuleIds: string[];
  inheritedRules: Rule[];
  onChanged: (ruleIds: string[]) => void;
}) {
  const [loadingRuleId, setLoadingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { directRules, inheritedRules: inheritedOnly } = useMemo(
    () => partitionDirectAndInheritedRules(rules, attachedRuleIds, inheritedRules.map((rule) => rule.id)),
    [rules, attachedRuleIds, inheritedRules],
  );

  async function toggleRule(ruleId: string, attached: boolean) {
    setLoadingRuleId(ruleId);
    setError(null);

    try {
      if (attached) {
        await detachRuleFromDirectory(directoryId, ruleId);
        onChanged(attachedRuleIds.filter((id) => id !== ruleId));
      } else {
        await attachRuleToDirectory(directoryId, ruleId);
        onChanged([...attachedRuleIds, ruleId]);
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update folder rules');
    } finally {
      setLoadingRuleId(null);
    }
  }

  if (rules.length === 0) {
    return (
      <div className="card">
        <p className="muted">Create rules first to attach them to this folder.</p>
      </div>
    );
  }

  return (
    <section className="card stack">
      <div>
        <h3>Folder rules</h3>
        <p className="muted">Direct rules apply here. Parent folder rules are inherited automatically.</p>
      </div>
      {inheritedOnly.length > 0 ? (
        <div className="rules-preview-list">
          {inheritedOnly.map((rule) => (
            <span key={rule.id} className="rules-preview-chip inherited">
              {rule.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No inherited rules from parent folders.
        </p>
      )}
      <div className="list">
        {rules.map((rule) => {
          const attached = attachedRuleIds.includes(rule.id);
          return (
            <label key={rule.id} className="list-item checkbox-row">
              <span>
                <strong>{rule.name}</strong>
                {rule.description ? (
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {rule.description}
                  </p>
                ) : null}
              </span>
              <input
                type="checkbox"
                checked={attached}
                disabled={loadingRuleId === rule.id}
                onChange={() => toggleRule(rule.id, attached)}
              />
            </label>
          );
        })}
      </div>
      {directRules.length > 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Direct rules on this folder: {directRules.map((rule) => rule.name).join(', ')}
        </p>
      ) : null}
      {error ? <div className="error">{error}</div> : null}
    </section>
  );
}

export function DirectorySettings({
  directory,
  deleteImpact,
  onUpdated,
  onDeleted,
}: {
  directory: Directory;
  deleteImpact: DirectoryDeleteImpact;
  onUpdated: (directory: Directory) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(directory.name);
  const [description, setDescription] = useState(directory.description);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updated = await updateDirectory({
        directoryId: directory.id,
        name,
        description,
      });
      onUpdated(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update folder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="card stack">
        <div>
          <h3>Folder settings</h3>
        </div>
        <form className="stack" onSubmit={handleSave}>
          <label className="label">
            Name
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="label">
            Description
            <textarea
              className="textarea compact-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes about this folder"
            />
          </label>
          <div className="button-row">
            <button className="button secondary" type="submit" disabled={loading}>
              Save changes
            </button>
            <button
              className="button danger"
              type="button"
              disabled={loading}
              onClick={() => setDeleteOpen(true)}
            >
              Delete folder
            </button>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </form>
      </section>
      <DeleteDirectoryDialog
        directory={directory}
        impact={deleteImpact}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  );
}

export function DocumentList({
  documents,
  emptyMessage,
  allFolders,
  onDocumentMoved,
}: {
  documents: Document[];
  emptyMessage: string;
  allFolders?: DirectorySummary[];
  onDocumentMoved?: (document: Document) => void;
}) {
  const [movingDocumentId, setMovingDocumentId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="card">
        <p className="muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <section className="stack">
        <h2>Documents</h2>
        <div className="list">
          {documents.map((document) => (
            <div key={document.id} className="list-item document-list-item">
              <Link href={`/documents/${document.id}`} className="document-list-link">
                <div>
                  <strong>{document.title}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {document.wordCount} words
                  </p>
                </div>
                <span className="muted">View</span>
              </Link>
              {allFolders ? (
                <button
                  type="button"
                  className="button secondary compact-button"
                  onClick={() => setMovingDocumentId(document.id)}
                >
                  Move
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {allFolders && movingDocumentId ? (
        <DirectoryPickerDialog
          title="Move document"
          folders={allFolders}
          currentDirectoryId={documents.find((document) => document.id === movingDocumentId)?.directoryId}
          open={Boolean(movingDocumentId)}
          onClose={() => setMovingDocumentId(null)}
          onConfirm={async (targetDirectoryId) => {
            if (!targetDirectoryId) {
              throw new Error('Documents must be moved into a folder');
            }

            const updated = await moveDocument(movingDocumentId, targetDirectoryId);
            onDocumentMoved?.(updated);
            setMovingDocumentId(null);
          }}
        />
      ) : null}
    </>
  );
}

export function DocumentsPageClient({
  initialDocuments,
  initialRules: _initialRules,
  initialFolders,
  allFolders,
  deleteImpacts,
}: {
  initialDocuments: Document[];
  initialRules: Rule[];
  initialFolders: DirectorySummary[];
  allFolders: DirectorySummary[];
  deleteImpacts: Record<string, DirectoryDeleteImpact>;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [folders, setFolders] = useState(initialFolders);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="root-documents-page">
      <div className="root-documents-header">
        <h1 className="page-title">Root</h1>
        <button type="button" className="button secondary" onClick={() => setCreateOpen(true)}>
          <FolderPlus size={16} />
          New Folder
        </button>
      </div>

      <UnfiledCleanupBanner
        documents={documents}
        allFolders={allFolders}
        onDocumentMoved={(documentId) =>
          setDocuments((current) => current.filter((item) => item.id !== documentId))
        }
      />

      {folders.length > 0 ? (
        <FolderCardGrid
          folders={folders}
          allFolders={allFolders}
          deleteImpacts={deleteImpacts}
          onFolderMoved={(folder) =>
            setFolders((current) =>
              current.map((item) => (item.id === folder.id ? { ...item, ...folder } : item)),
            )
          }
          onFolderDeleted={(folderId) =>
            setFolders((current) => current.filter((folder) => folder.id !== folderId))
          }
          onFolderUpdated={(folder) =>
            setFolders((current) =>
              current.map((item) => (item.id === folder.id ? { ...item, ...folder } : item)),
            )
          }
          onManageRules={(folderId) => {
            window.location.href = `/directories/${folderId}?tab=rules`;
          }}
        />
      ) : (
        <div className="root-empty-state">
          <p className="muted">No folders yet. Create your first folder to organize documents.</p>
          <button type="button" className="button" onClick={() => setCreateOpen(true)}>
            <FolderPlus size={16} />
            New Folder
          </button>
        </div>
      )}

      <CreateDirectoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(directory) => setFolders((current) => [...current, directory])}
      />
    </div>
  );
}

export { DirectoryDetailClient as DirectoryPageClient } from '@/components/DirectoryDetailClient';

export { Breadcrumbs };
