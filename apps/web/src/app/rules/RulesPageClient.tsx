'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createRule, deleteRule, updateRule } from '@/lib/api';
import type { Rule } from '@sf/shared-types';

type RuleFormState = {
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
};

const emptyForm: RuleFormState = {
  name: '',
  description: '',
  content: '',
  isDefault: false,
};

function RuleForm({
  title,
  submitLabel,
  initialValues,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  initialValues: RuleFormState;
  onSubmit: (values: RuleFormState) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(values);
      if (!onCancel) {
        setValues(emptyForm);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <div>
        <h2>{title}</h2>
        <p className="muted">Rules guide document creation and future AI generation.</p>
      </div>

      <label className="label">
        Name
        <input
          className="input"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Concise style guide"
          required
          maxLength={100}
        />
      </label>

      <label className="label">
        Description
        <input
          className="input"
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          placeholder="Optional short summary"
        />
      </label>

      <label className="label">
        Content
        <textarea
          className="textarea"
          value={values.content}
          onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
          placeholder="Write the rule instructions here..."
          required
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(event) =>
            setValues((current) => ({ ...current, isDefault: event.target.checked }))
          }
        />
        <span>Always apply by default in document creation</span>
      </label>

      {error ? <div className="error">{error}</div> : null}

      <div className="button-row">
        {onCancel ? (
          <button className="button secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        ) : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function RulesPageClient({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingValues = useMemo<RuleFormState>(() => {
    if (!editingRule) {
      return emptyForm;
    }

    return {
      name: editingRule.name,
      description: editingRule.description,
      content: editingRule.content,
      isDefault: editingRule.isDefault,
    };
  }, [editingRule]);

  async function handleCreate(values: RuleFormState) {
    const rule = await createRule({
      name: values.name,
      description: values.description || undefined,
      content: values.content,
      isDefault: values.isDefault,
    });
    setRules((current) => [rule, ...current]);
  }

  async function handleUpdate(values: RuleFormState) {
    if (!editingRule) {
      return;
    }

    const rule = await updateRule({
      ruleId: editingRule.id,
      name: values.name,
      description: values.description,
      content: values.content,
      isDefault: values.isDefault,
    });

    setRules((current) => current.map((item) => (item.id === rule.id ? rule : item)));
    setEditingRule(null);
  }

  async function handleDelete(ruleId: string) {
    if (!window.confirm('Delete this rule? This cannot be undone.')) {
      return;
    }

    setDeletingId(ruleId);
    try {
      await deleteRule(ruleId);
      setRules((current) => current.filter((rule) => rule.id !== ruleId));
      if (editingRule?.id === ruleId) {
        setEditingRule(null);
      }
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete rule',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Rules</h1>

      <div className="rules-layout">
        <section className="stack">
          <h2>Your rules</h2>
          {rules.length === 0 ? (
            <div className="card">
              <p className="muted">No rules yet. Create your first one to use during document creation.</p>
            </div>
          ) : (
            <div className="list">
              {rules.map((rule) => (
                <div key={rule.id} className="list-item rule-list-item">
                  <div className="rule-list-item-body">
                    <div className="rule-list-item-header">
                      <strong>{rule.name}</strong>
                      {rule.isDefault ? <span className="badge">Always apply</span> : null}
                    </div>
                    {rule.description ? (
                      <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                        {rule.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="button-row compact">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setEditingRule(rule)}
                    >
                      Edit
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      disabled={deletingId === rule.id}
                    >
                      {deletingId === rule.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="stack">
          {editingRule ? (
            <RuleForm
              key={editingRule.id}
              title={`Edit ${editingRule.name}`}
              submitLabel="Save changes"
              initialValues={editingValues}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRule(null)}
            />
          ) : (
            <RuleForm title="Create rule" submitLabel="Create rule" initialValues={emptyForm} onSubmit={handleCreate} />
          )}
        </section>
      </div>
    </div>
  );
}
