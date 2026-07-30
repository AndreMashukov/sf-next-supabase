'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import {
  attachRuleToDirectory,
  createDirectory,
  createDocument,
  createDocumentSchema,
  createDirectorySchema,
  deleteDirectory,
  detachRuleFromDirectory,
  formatValidationError,
  updateDirectory,
} from '@/lib/api';
import { RuleSelector } from '@/components/RuleSelector';
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
  onCreated: (directory: Directory) => void;
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
      setName('');
      onCreated(directory);
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
  onCreated,
}: {
  rules: Rule[];
  directoryId?: string;
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
  onChanged,
}: {
  directoryId: string;
  rules: Rule[];
  attachedRuleIds: string[];
  onChanged: (ruleIds: string[]) => void;
}) {
  const [loadingRuleId, setLoadingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <p className="muted">Attached rules are inherited by this folder and its subfolders.</p>
      </div>
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
      {error ? <div className="error">{error}</div> : null}
    </section>
  );
}

export function DirectoryActions({
  directory,
  onUpdated,
  onDeleted,
}: {
  directory: Directory;
  onUpdated: (directory: Directory) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(directory.name);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updated = await updateDirectory({ directoryId: directory.id, name });
      onUpdated(updated);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename folder');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this folder and all nested folders and documents?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteDirectory(directory.id);
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete folder');
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h3>Folder settings</h3>
      </div>
      <form className="folder-create-form" onSubmit={handleRename}>
        <label className="label folder-create-label">
          Name
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button className="button secondary" type="submit" disabled={loading}>
          Rename
        </button>
        <button className="button danger" type="button" disabled={loading} onClick={handleDelete}>
          Delete folder
        </button>
        {error ? <div className="error folder-create-error">{error}</div> : null}
      </form>
    </section>
  );
}

export function DocumentList({
  documents,
  emptyMessage,
}: {
  documents: Document[];
  emptyMessage: string;
}) {
  if (documents.length === 0) {
    return (
      <div className="card">
        <p className="muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section className="stack">
      <h2>Documents</h2>
      <div className="list">
        {documents.map((document) => (
          <Link key={document.id} href={`/documents/${document.id}`} className="list-item">
            <div>
              <strong>{document.title}</strong>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                {document.wordCount} words
              </p>
            </div>
            <span className="muted">View</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DocumentsPageClient({
  initialDocuments,
  initialRules,
  initialFolders,
}: {
  initialDocuments: Document[];
  initialRules: Rule[];
  initialFolders: Directory[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [folders, setFolders] = useState(initialFolders);

  return (
    <div className="stack">
      <h1 className="page-title">Documents</h1>
      <Breadcrumbs ancestors={[]} />
      <CreateDocumentForm
        rules={initialRules}
        onCreated={(document) => setDocuments((current) => [document, ...current])}
      />
      <section className="card stack">
        <div>
          <h2>Folders</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Group documents into nested folders.
          </p>
        </div>
        <CreateDirectoryForm onCreated={(directory) => setFolders((current) => [...current, directory])} />
        {folders.length > 0 ? (
          <div className="list">
            {folders.map((folder) => (
              <Link key={folder.id} href={`/directories/${folder.id}`} className="list-item">
                <div>
                  <strong>{folder.name}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {folder.path}
                  </p>
                </div>
                <span className="muted">Open</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No folders yet.
          </p>
        )}
      </section>
      <DocumentList documents={documents} emptyMessage="No documents yet. Create your first one above." />
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
}: {
  directory: Directory;
  ancestors: Directory[];
  childFolders: Directory[];
  documents: Document[];
  rules: Rule[];
  attachedRuleIds: string[];
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
          <div className="list">
            {childFolderList.map((folder) => (
              <Link key={folder.id} href={`/directories/${folder.id}`} className="list-item">
                <div>
                  <strong>{folder.name}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {folder.path}
                  </p>
                </div>
                <span className="muted">Open</span>
              </Link>
            ))}
          </div>
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
        onChanged={setFolderRules}
      />
      <DirectoryActions
        directory={currentDirectory}
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
      />
    </div>
  );
}

export { Breadcrumbs };
