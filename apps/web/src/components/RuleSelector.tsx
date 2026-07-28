'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Rule } from '@sf/shared-types';

export function RuleSelector({
  rules,
  selectedRuleIds,
  onSelectionChange,
}: {
  rules: Rule[];
  selectedRuleIds: string[];
  onSelectionChange: (ruleIds: string[]) => void;
}) {
  const defaultRuleIds = useMemo(
    () => rules.filter((rule) => rule.isDefault).map((rule) => rule.id),
    [rules],
  );

  function toggleRule(ruleId: string) {
    if (selectedRuleIds.includes(ruleId)) {
      onSelectionChange(selectedRuleIds.filter((id) => id !== ruleId));
      return;
    }

    onSelectionChange([...selectedRuleIds, ruleId]);
  }

  function resetSelection() {
    onSelectionChange(defaultRuleIds);
  }

  if (rules.length === 0) {
    return (
      <div className="rule-selector">
        <div className="rule-selector-header">
          <strong>Rules</strong>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          No rules yet.{' '}
          <Link href="/rules" style={{ color: 'var(--primary)' }}>
            Create one
          </Link>{' '}
          to guide document creation.
        </p>
      </div>
    );
  }

  return (
    <div className="rule-selector">
      <div className="rule-selector-header">
        <strong>Rules ({selectedRuleIds.length})</strong>
        <button className="button secondary" type="button" onClick={resetSelection}>
          Reset defaults
        </button>
      </div>

      <div className="rule-selector-list">
        {rules.map((rule) => {
          const selected = selectedRuleIds.includes(rule.id);

          return (
            <label
              key={rule.id}
              className={`rule-selector-item${selected ? ' selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleRule(rule.id)}
              />
              <span className="rule-selector-item-body">
                <span className="rule-selector-item-title">
                  {rule.name}
                  {rule.isDefault ? <span className="badge">Always apply</span> : null}
                </span>
                {rule.description ? (
                  <span className="muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                    {rule.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
