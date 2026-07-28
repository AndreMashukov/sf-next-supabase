'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { createDocument } from '@/lib/api';
import { RuleSelector } from '@/components/RuleSelector';
import type { Document, Rule } from '@sf/shared-types';

export function CreateDocumentForm({
  rules,
  onCreated,
}: {
  rules: Rule[];
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

    try {
      const document = await createDocument(title, text, selectedRuleIds);
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
        <p className="muted">Paste text and save it as HTML in Google Cloud Storage.</p>
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
        Text
        <textarea
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste your study material here..."
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
        {loading ? 'Saving...' : 'Create document'}
      </button>
    </form>
  );
}

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="card">
        <p className="muted">No documents yet. Create your first one above.</p>
      </div>
    );
  }

  return (
    <section className="stack">
      <h2>Your documents</h2>
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
}: {
  initialDocuments: Document[];
  initialRules: Rule[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);

  return (
    <div className="stack">
      <h1 className="page-title">Documents</h1>
      <CreateDocumentForm
        rules={initialRules}
        onCreated={(document) => setDocuments((current) => [document, ...current])}
      />
      <DocumentList documents={documents} />
    </div>
  );
}
