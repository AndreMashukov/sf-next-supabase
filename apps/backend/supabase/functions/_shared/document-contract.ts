// Auto-generated from libs/shared-types/src/document-contract.ts. Do not edit directly.
/**
 * Shared HTML output contract for document generation and validation.
 * Source of truth — synced to Edge Functions via scripts/sync-document-contract.mjs
 */

export const ALLOWED_HTML_TAGS = [
  'p',
  'strong',
  'em',
  'b',
  'i',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'br',
  'span',
  'div',
  'blockquote',
  'hr',
  'a',
] as const;

export const DISALLOWED_HTML_TAGS = ['script', 'iframe', 'style', 'link', 'object', 'embed'] as const;

export const DISALLOWED_HTML_ATTRIBUTES = ['style'] as const;

export const DISALLOWED_EVENT_HANDLER_PREFIX = 'on';

export const WRAPPER_HTML_TAGS = ['html', 'head', 'body'] as const;

export const MERMAID_DIAGRAM_PREFIXES = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'classDiagram',
  'erDiagram',
  'stateDiagram',
  'stateDiagram-v2',
] as const;

export const DOCUMENT_AGENT_MAX_REPAIR_RETRIES = 2;

export const SEALED_OUTPUT_CONTRACT_LINES = [
  '- Output ONLY an HTML fragment — no full documents (<html>, <head>, <body>).',
  '- NO wrapper code blocks (do not wrap the entire document in ```html or ```markdown).',
  '- Start directly with the HTML content.',
  '- Ensure content directly addresses the user\'s request.',
  `- Allowed tags: ${ALLOWED_HTML_TAGS.join(', ')}.`,
  `- Do NOT include ${DISALLOWED_HTML_TAGS.map((tag) => `<${tag}>`).join(', ')}, or event handler attributes (${DISALLOWED_EVENT_HANDLER_PREFIX}click, ${DISALLOWED_EVENT_HANDLER_PREFIX}load, etc.).`,
  `- Do NOT include external stylesheets or inline ${DISALLOWED_HTML_ATTRIBUTES.join(', ')} attributes.`,
  '- Use semantic headings and paragraphs for readable structure.',
  '- Prefer <pre><code class="language-…"> for code samples and <ul>/<ol> for lists.',
  '- When a diagram helps explain the topic, include Mermaid diagrams as:',
  '  <pre><code class="language-mermaid">flowchart TD',
  '    A --> B',
  '  </code></pre>',
  `- Use only supported Mermaid types: ${MERMAID_DIAGRAM_PREFIXES.slice(0, 5).join(', ')}, or stateDiagram.`,
  '- Keep diagrams compact; avoid bare /, \\, or @ inside square-bracket node labels.',
  '- NEVER use 4-space indentation for Mermaid — always use the language-mermaid pre/code form above.',
] as const;

export function buildSealedOutputContract(): string {
  return `[SEALED OUTPUT CONTRACT — overrides all instructions above]\n${SEALED_OUTPUT_CONTRACT_LINES.join('\n')}`;
}

export function buildDocumentPromptSections(userPrompt: string, rules?: string): {
  personaSection: string;
  rulesSection: string;
  userSection: string;
  sealedOutputContract: string;
} {
  const rulesSection = rules?.trim()
    ? `**DOMAIN RULES** (customise style, tone, or domain focus — do not change the output format requirements below):
---
${rules}
---`
    : '';

  const personaSection =
    'You are an expert content generator. Generate comprehensive, well-structured content based on the user\'s request.';

  const userSection = `**User's Request:**
${userPrompt}`;

  return {
    personaSection,
    rulesSection,
    userSection,
    sealedOutputContract: buildSealedOutputContract(),
  };
}

export function buildDocumentPrompt(userPrompt: string, rules?: string): string {
  const sections = buildDocumentPromptSections(userPrompt, rules);
  return [
    sections.personaSection,
    sections.rulesSection,
    sections.userSection,
    sections.sealedOutputContract,
  ]
    .filter(Boolean)
    .join('\n\n');
}
