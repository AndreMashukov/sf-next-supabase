'use client';

import { useMemo, useState } from 'react';
import { attachRuleToDirectory, detachRuleFromDirectory } from '@/mutations';
import { partitionDirectAndInheritedRules } from '@/domain/directories/rules';
import type { Rule } from '@sf/shared-types';

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
    () =>
      partitionDirectAndInheritedRules(
        rules,
        attachedRuleIds,
        inheritedRules.map((rule) => rule.id),
      ),
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
