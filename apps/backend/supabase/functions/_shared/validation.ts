import {
  countWords,
  createDocumentSchema,
  generateQuizSchema,
  parseRequest,
} from './schemas.ts';

/**
 * Normalize model output into an HTML body fragment.
 * Prefers raw HTML when present; falls back to plain-text paragraphs.
 */
export function normalizeGeneratedHtml(content: string): string {
  const stripped = content
    .replace(/^```(?:html|markdown)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!stripped) {
    return '';
  }

  if (/<[a-z][\s\S]*>/i.test(stripped)) {
    return stripped
      .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .trim();
  }

  const escaped = stripped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

export function wrapHtmlDocument(bodyHtml: string, title = 'Document'): string {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>${safeTitle}</title>\n</head>\n<body>\n${bodyHtml}\n</body>\n</html>`;
}

export { countWords };

export function validateCreateDocument(body: unknown) {
  return parseRequest(createDocumentSchema, body);
}

export function validateGenerateQuiz(body: unknown) {
  return parseRequest(generateQuizSchema, body);
}
