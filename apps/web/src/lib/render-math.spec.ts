// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { KATEX_MATH_DELIMITERS, renderMathInHtmlElement } from './render-math';

vi.mock('katex/contrib/auto-render', () => ({
  default: vi.fn(),
}));

describe('renderMathInHtmlElement', () => {
  it('configures dollar and bracket delimiters with throwOnError disabled', async () => {
    const renderMathInElement = (await import('katex/contrib/auto-render')).default;
    const element = document.createElement('div');
    element.innerHTML = '<p>Inline $E=mc^2$ and display $$x^2$$</p>';

    renderMathInHtmlElement(element);

    expect(renderMathInElement).toHaveBeenCalledWith(element, {
      delimiters: [...KATEX_MATH_DELIMITERS],
      throwOnError: false,
    });
  });

  it('exports all supported math delimiters', () => {
    expect(KATEX_MATH_DELIMITERS).toEqual([
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ]);
  });
});
