import sanitizeHtml from 'sanitize-html';
import { ALLOWED_HTML_TAGS } from '@sf/shared-types';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_HTML_TAGS],
  allowedAttributes: {
    a: ['href', 'title'],
    code: ['class'],
    pre: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
  },
  allowProtocolRelative: false,
};

export function normalizeGeneratedHtml(content: string): string {
  const stripped = content
    .replace(/^```(?:html|markdown)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!stripped) {
    return '';
  }

  if (/<[a-z][\s\S]*>/i.test(stripped)) {
    return sanitizeHtml(stripped, SANITIZE_OPTIONS).trim();
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
