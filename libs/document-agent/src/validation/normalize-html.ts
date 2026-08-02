/**
 * Encode bare `&` characters that are not already HTML entities.
 * Educational docs often include LaTeX matrices (`a & b`) and Plotly labels
 * with ampersands; browsers and html-validate require `&amp;`.
 */
export function encodeBareAmpersands(htmlFragment: string): string {
  return htmlFragment.replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
}

export function normalizeGeneratedHtmlFragment(htmlFragment: string): string {
  return encodeBareAmpersands(htmlFragment);
}
