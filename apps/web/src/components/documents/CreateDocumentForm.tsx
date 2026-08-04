'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  createDocument,
  createDocumentSchema,
  formatValidationError,
} from '@/mutations';
import { InheritedRulesPreview } from '@/components/rules/InheritedRulesPreview';
import { RuleSelector } from '@/components/rules/RuleSelector';
import type { GenerationJob, Rule } from '@sf/shared-types';

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
