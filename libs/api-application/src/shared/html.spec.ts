import { normalizeGeneratedHtml, wrapHtmlDocument } from '@sf/api-application';

describe('html helpers', () => {
  it('strips markdown fences and unsafe tags from generated html', () => {
    const normalized = normalizeGeneratedHtml('```html\n<p>Hello</p><script>alert(1)</script>\n```');
    expect(normalized).toBe('<p>Hello</p>');
  });

  it('removes unquoted event handlers', () => {
    const normalized = normalizeGeneratedHtml('<img src=x onerror=alert(1)><p onclick=alert(1)>Hi</p>');
    expect(normalized).not.toMatch(/onerror|onclick|alert/i);
    expect(normalized).toContain('<p>Hi</p>');
  });

  it('removes javascript URLs from links', () => {
    const normalized = normalizeGeneratedHtml(
      '<p><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>',
    );
    expect(normalized).not.toMatch(/javascript:/i);
    expect(normalized).toContain('<a href="https://example.com">good</a>');
    expect(normalized).toContain('>bad</a>');
  });

  it('removes svg, object, iframe, and similar markup', () => {
    const normalized = normalizeGeneratedHtml(
      [
        '<p>Safe</p>',
        '<svg onload="alert(1)"><script>alert(1)</script></svg>',
        '<object data="javascript:alert(1)"></object>',
        '<iframe src="https://evil.test"></iframe>',
        '<embed src="https://evil.test"></embed>',
      ].join(''),
    );

    expect(normalized).toBe('<p>Safe</p>');
  });

  it('keeps permitted semantic html and mermaid code blocks intact', () => {
    const input = [
      '<h2>Overview</h2>',
      '<p>Intro with <strong>emphasis</strong> and <a href="https://example.com" title="Example">link</a>.</p>',
      '<ul><li>One</li><li>Two</li></ul>',
      '<pre><code class="language-mermaid">flowchart TD\n  A --> B\n</code></pre>',
    ].join('');

    const normalized = normalizeGeneratedHtml(input);

    expect(normalized).toContain('<h2>Overview</h2>');
    expect(normalized).toContain('<strong>emphasis</strong>');
    expect(normalized).toContain('<a href="https://example.com" title="Example">link</a>');
    expect(normalized).toContain('<ul><li>One</li><li>Two</li></ul>');
    expect(normalized).toContain('<code class="language-mermaid">');
    expect(normalized).toContain('flowchart TD');
  });

  it('wraps body html in a full document with escaped title', () => {
    const html = wrapHtmlDocument('<p>Body</p>', 'Title <script>');
    expect(html).toContain('<title>Title &lt;script&gt;</title>');
    expect(html).toContain('<p>Body</p>');
  });
});
