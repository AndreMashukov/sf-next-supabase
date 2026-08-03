'use client';

import type { Rule } from '@sf/shared-types';

export function InheritedRulesPreview({
  inheritedRules,
  directRules,
}: {
  inheritedRules: Rule[];
  directRules: Rule[];
}) {
  const inheritedOnly = inheritedRules.filter(
    (rule) => !directRules.some((directRule) => directRule.id === rule.id),
  );

  if (inheritedOnly.length === 0 && directRules.length === 0) {
    return null;
  }

  return (
    <section className="card subtle stack inherited-rules-preview">
      <div>
        <h3>Inherited rules</h3>
        <p className="muted" style={{ margin: '0.25rem 0 0' }}>
          These folder rules will be applied automatically during generation.
        </p>
      </div>
      {directRules.length > 0 ? (
        <div>
          <p className="rules-preview-label">Direct on this folder</p>
          <div className="rules-preview-list">
            {directRules.map((rule) => (
              <span key={rule.id} className="rules-preview-chip">
                {rule.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {inheritedOnly.length > 0 ? (
        <div>
          <p className="rules-preview-label">From parent folders</p>
          <div className="rules-preview-list">
            {inheritedOnly.map((rule) => (
              <span key={rule.id} className="rules-preview-chip inherited">
                {rule.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
