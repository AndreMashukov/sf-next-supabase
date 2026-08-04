import renderMathInElement from 'katex/contrib/auto-render';

export const KATEX_MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
] as const;

export function renderMathInHtmlElement(element: HTMLElement): void {
  renderMathInElement(element, {
    delimiters: [...KATEX_MATH_DELIMITERS],
    throwOnError: false,
  });
}
