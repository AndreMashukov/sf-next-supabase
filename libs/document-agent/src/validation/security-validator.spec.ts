import { describe, expect, it } from 'vitest';
import {
  validateAllowedTags,
  validateNonEmpty,
  validateSecurity,
} from './security-validator';

describe('security validator', () => {
  it('accepts valid HTML fragments', () => {
    const html = '<h1>Title</h1><p>Body text with <strong>emphasis</strong>.</p>';
    expect(validateNonEmpty(html)).toHaveLength(0);
    expect(validateSecurity(html)).toHaveLength(0);
    expect(validateAllowedTags(html)).toHaveLength(0);
  });

  it('rejects disallowed tags', () => {
    const findings = validateSecurity('<p>Hello</p><script>alert(1)</script>');
    expect(findings.some((finding) => finding.code === 'SECURITY_DISALLOWED_TAG')).toBe(true);
  });

  it('rejects wrapper tags', () => {
    const findings = validateSecurity('<html><body><p>Hello</p></body></html>');
    expect(findings.some((finding) => finding.code === 'FORMAT_WRAPPER_TAG')).toBe(true);
  });

  it('rejects event handlers and inline style', () => {
    const findings = validateSecurity('<p onclick="alert(1)" style="color:red">Hello</p>');
    expect(findings.some((finding) => finding.code === 'SECURITY_EVENT_HANDLER')).toBe(true);
    expect(findings.some((finding) => finding.code === 'FORMAT_DISALLOWED_ATTRIBUTE')).toBe(true);
  });

  it('allows escaped event-handler examples inside code samples', () => {
    const html =
      '<h1>Zustand</h1><pre><code>&lt;button onClick={() =&gt; inc()}&gt;+&lt;/button&gt;</code></pre>';
    const findings = validateSecurity(html);
    expect(findings.some((finding) => finding.code === 'SECURITY_EVENT_HANDLER')).toBe(false);
    expect(findings.some((finding) => finding.code === 'FORMAT_DISALLOWED_ATTRIBUTE')).toBe(false);
  });

  it('still rejects real event-handler attributes inside pre/code', () => {
    const html = '<pre><code><button onclick="alert(1)">x</button></code></pre>';
    const findings = validateSecurity(html);
    expect(findings.some((finding) => finding.code === 'SECURITY_EVENT_HANDLER')).toBe(true);
  });

  it('rejects markdown fences', () => {
    const findings = validateSecurity('```html\n<p>Hello</p>\n```');
    expect(findings.some((finding) => finding.code === 'FORMAT_CODE_FENCE')).toBe(true);
  });

  it('rejects empty content', () => {
    expect(validateNonEmpty('   ')).toHaveLength(1);
  });

  it('rejects tags outside the allowlist', () => {
    const findings = validateAllowedTags('<section><p>Hello</p></section>');
    expect(findings.some((finding) => finding.code === 'FORMAT_DISALLOWED_TAG')).toBe(true);
  });
});
