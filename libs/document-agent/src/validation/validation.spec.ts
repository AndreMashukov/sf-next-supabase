import { describe, expect, it } from 'vitest';
import { validateDocumentHtml } from './index';

describe('validateDocumentHtml', () => {
  it('passes valid HTML fragments', async () => {
    const report = await validateDocumentHtml(
      '<h1>Topic</h1><p>Clear explanation with a list:</p><ul><li>One</li><li>Two</li></ul>',
    );

    expect(report.passed).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it('fails invalid HTML with structured findings', async () => {
    const report = await validateDocumentHtml('<script>alert(1)</script><p>Hello</p>');

    expect(report.passed).toBe(false);
    expect(report.findings.some((finding) => finding.code === 'SECURITY_DISALLOWED_TAG')).toBe(
      true,
    );
  });

  it('does not apply shallow rule heuristics during deterministic validation', async () => {
    const report = await validateDocumentHtml('<p>Only intro</p>', [
      {
        name: 'Structure',
        content: 'Must include section: "Summary"',
      },
    ]);

    expect(report.findings.some((finding) => finding.code === 'RULE_REQUIRED_SECTION')).toBe(
      false,
    );
  });
});
