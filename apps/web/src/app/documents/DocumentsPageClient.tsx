'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
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
import type { DirectoryDeleteImpact, DirectorySummary } from '@/lib/data/directory-summaries';
import { partitionDirectAndInheritedRules } from '@/lib/directory-rules';
import type { Directory, Document, Rule } from '@sf/shared-types';

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
  onCreated,
}: {
  rules: Rule[];
  directoryId: string;
  inheritedRules: Rule[];
  directRules: Rule[];
  onCreated: (document: Document) => void;
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
      const document = await createDocument(title, text, selectedRuleIds, directoryId);
      setTitle('');
      setText('');
      setSelectedRuleIds(defaultRuleIds);
      onCreated(document);
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
  initialRules,
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

  return (
    <div className="stack">
      <h1 className="page-title">Documents</h1>
      <Breadcrumbs ancestors={[]} />
      <section className="card stack">
        <div>
          <h2>Folders</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Create a folder first, then add documents inside it.
          </p>
        </div>
        <CreateDirectoryForm
          onCreated={(directory) => setFolders((current) => [...current, directory])}
        />
        {folders.length > 0 ? (
          <FolderCardGrid
            folders={folders}
            allFolders={allFolders}
            deleteImpacts={deleteImpacts}
            onFolderDeleted={(folderId) =>
              setFolders((current) => current.filter((folder) => folder.id !== folderId))
            }
          />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No folders yet. Create your first folder to get started.
          </p>
        )}
      </section>
      {documents.length > 0 ? (
        <section className="stack">
          <h2>Unfiled documents</h2>
          <p className="muted">
            These documents were created before folders were required. Move them into a folder to
            keep things organized.
          </p>
          <DocumentList
            documents={documents}
            emptyMessage=""
            allFolders={allFolders}
            onDocumentMoved={(document) =>
              setDocuments((current) => current.filter((item) => item.id !== document.id))
            }
          />
        </section>
      ) : null}
    </div>
  );
}

export function DirectoryPageClient({
  directory,
  ancestors,
  childFolders,
  documents,
  rules,
  attachedRuleIds,
  inheritedRules,
  directRules,
  allFolders,
  deleteImpact,
  childDeleteImpacts,
}: {
  directory: Directory;
  ancestors: Directory[];
  childFolders: DirectorySummary[];
  documents: Document[];
  rules: Rule[];
  attachedRuleIds: string[];
  inheritedRules: Rule[];
  directRules: Rule[];
  allFolders: DirectorySummary[];
  deleteImpact: DirectoryDeleteImpact;
  childDeleteImpacts: Record<string, DirectoryDeleteImpact>;
}) {
  const [currentDirectory, setCurrentDirectory] = useState(directory);
  const [folderRules, setFolderRules] = useState(attachedRuleIds);
  const [childFolderList, setChildFolderList] = useState(childFolders);
  const [documentList, setDocumentList] = useState(documents);

  return (
    <div className="stack">
      <h1 className="page-title">{currentDirectory.name}</h1>
      <Breadcrumbs ancestors={ancestors} currentName={currentDirectory.name} />
      <CreateDocumentForm
        rules={rules}
        directoryId={currentDirectory.id}
        inheritedRules={inheritedRules}
        directRules={directRules}
        onCreated={(document) => setDocumentList((current) => [document, ...current])}
      />
      <section className="card stack">
        <div>
          <h2>Subfolders</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Create nested folders inside {currentDirectory.name}.
          </p>
        </div>
        <CreateDirectoryForm
          parentId={currentDirectory.id}
          onCreated={(folder) => setChildFolderList((current) => [...current, folder])}
        />
        {childFolderList.length > 0 ? (
          <FolderCardGrid
            folders={childFolderList}
            allFolders={allFolders}
            deleteImpacts={childDeleteImpacts}
            onFolderDeleted={(folderId) =>
              setChildFolderList((current) => current.filter((folder) => folder.id !== folderId))
            }
          />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No subfolders yet.
          </p>
        )}
      </section>
      <DirectoryRuleManager
        directoryId={currentDirectory.id}
        rules={rules}
        attachedRuleIds={folderRules}
        inheritedRules={inheritedRules}
        onChanged={setFolderRules}
      />
      <DirectorySettings
        directory={currentDirectory}
        deleteImpact={deleteImpact}
        onUpdated={setCurrentDirectory}
        onDeleted={() => {
          window.location.href = ancestors.length
            ? `/directories/${ancestors[ancestors.length - 1]?.id}`
            : '/documents';
        }}
      />
      <DocumentList
        documents={documentList}
        emptyMessage="No documents in this folder yet."
        allFolders={allFolders}
        onDocumentMoved={(document) =>
          setDocumentList((current) => current.filter((item) => item.id !== document.id))
        }
      />
    </div>
  );
}

export { Breadcrumbs };
