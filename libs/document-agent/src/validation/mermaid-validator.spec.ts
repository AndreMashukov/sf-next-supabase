import { describe, expect, it } from 'vitest';
import { extractMermaidBlocks, validateMermaidBlocks } from './mermaid-validator';

describe('mermaid validator', () => {
  it('accepts supported mermaid blocks', () => {
    const html = `<pre><code class="language-mermaid">flowchart TD
A --> B
</code></pre>`;
    expect(extractMermaidBlocks(html)).toHaveLength(1);
    expect(validateMermaidBlocks(html)).toHaveLength(0);
  });

  it('rejects unsupported diagram types', () => {
    const html = `<pre><code class="language-mermaid">pie title Stats
"A": 1
</code></pre>`;
    const findings = validateMermaidBlocks(html);
    expect(findings.some((finding) => finding.code === 'MERMAID_UNSUPPORTED_TYPE')).toBe(true);
  });

  it('rejects invalid node label characters', () => {
    const html = `<pre><code class="language-mermaid">flowchart TD
A[bad/label] --> B
</code></pre>`;
    const findings = validateMermaidBlocks(html);
    expect(findings.some((finding) => finding.code === 'MERMAID_INVALID_LABEL')).toBe(true);
  });

  it('rejects indented mermaid without proper wrapper', () => {
    const html = '    flowchart TD\n    A --> B';
    const findings = validateMermaidBlocks(html);
    expect(findings.some((finding) => finding.code === 'MERMAID_INDENTED_BLOCK')).toBe(true);
  });
});
