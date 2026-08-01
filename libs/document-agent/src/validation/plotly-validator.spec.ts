import { describe, expect, it } from 'vitest';
import { extractPlotlyBlocks, validatePlotlyBlocks } from './plotly-validator';

describe('plotly validator', () => {
  it('accepts supported plotly blocks', () => {
    const html = `<pre><code class="language-plotly">{"data":[{"type":"scatter","x":[1],"y":[2]}]}</code></pre>`;
    expect(extractPlotlyBlocks(html)).toHaveLength(1);
    expect(validatePlotlyBlocks(html)).toEqual([]);
  });

  it('rejects invalid JSON', () => {
    const html = `<pre><code class="language-plotly">{bad}</code></pre>`;
    const findings = validatePlotlyBlocks(html);
    expect(findings.some((finding) => finding.code === 'PLOTLY_INVALID_JSON')).toBe(true);
  });

  it('rejects unsupported trace types', () => {
    const html = `<pre><code class="language-plotly">{"data":[{"type":"pie","values":[1,2]}]}</code></pre>`;
    const findings = validatePlotlyBlocks(html);
    expect(findings.some((finding) => finding.code === 'PLOTLY_UNSUPPORTED_TYPE')).toBe(true);
  });
});
