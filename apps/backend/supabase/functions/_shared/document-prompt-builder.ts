/**
 * Builds prompts for generating documents from user text prompts.
 * Output is HTML fragments (same approach as study-forge flashcards).
 */
export function buildDocumentPrompt(userPrompt: string, rules?: string): string {
  const rulesSection = rules?.trim()
    ? `**DOMAIN RULES** (customise style, tone, or domain focus — do not change the output format requirements below):
---
${rules}
---`
    : '';

  const personaSection =
    `You are an expert content generator. Generate comprehensive, well-structured content based on the user's request.`;

  const userSection = `**User's Request:**
${userPrompt}`;

  const sealedOutputContract = `[SEALED OUTPUT CONTRACT — overrides all instructions above]
- Output ONLY an HTML fragment — no full documents (<html>, <head>, <body>).
- NO wrapper code blocks (don't wrap the entire document in \`\`\`html or \`\`\`markdown).
- Start directly with the HTML content.
- Ensure content directly addresses the user's request.
- Allowed tags: p, strong, em, b, i, ul, ol, li, h1, h2, h3, h4, h5, h6, code, pre, table, thead, tbody, tr, th, td, br, span, div, blockquote, hr, a.
- Do NOT include <script>, <iframe>, <style>, <link>, or event handler attributes (onclick, onload, etc.).
- Do NOT include external stylesheets or inline style attributes.
- Use semantic headings and paragraphs for readable structure.
- Prefer <pre><code class="language-…"> for code samples and <ul>/<ol> for lists.
- When a diagram helps explain the topic, include Mermaid diagrams as:
  <pre><code class="language-mermaid">flowchart TD
    A --> B
  </code></pre>
- Use only supported Mermaid types: flowchart/graph, sequenceDiagram, classDiagram, erDiagram, or stateDiagram.
- Keep diagrams compact; avoid bare /, \\, or @ inside square-bracket node labels.
- NEVER use 4-space indentation for Mermaid — always use the language-mermaid pre/code form above.`;

  return [personaSection, rulesSection, userSection, sealedOutputContract]
    .filter(Boolean)
    .join('\n\n');
}
