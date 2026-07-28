import { validateRuleIds } from './rules.ts';

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

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').join('<br />');
      return `<p>${lines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>Document</title>\n</head>\n<body>\n${paragraphs}\n</body>\n</html>`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateCreateDocument(body: unknown): {
  title: string;
  text: string;
  ruleIds: string[];
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { title, text, ruleIds } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    throw new Error('Title is required and must be 200 characters or fewer');
  }

  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 100_000) {
    throw new Error('Document prompt is required and must be 100,000 characters or fewer');
  }

  return {
    title: title.trim(),
    text: text.trim(),
    ruleIds: validateRuleIds(ruleIds),
  };
}

export function validateGenerateQuiz(body: unknown): {
  documentId: string;
  title?: string;
  questionCount: number;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { documentId, title, questionCount } = body as Record<string, unknown>;

  if (typeof documentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    throw new Error('Invalid document ID');
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    throw new Error('Quiz title must be a non-empty string when provided');
  }

  const count = questionCount === undefined ? 5 : Number(questionCount);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error('questionCount must be an integer between 1 and 10');
  }

  return {
    documentId,
    title: typeof title === 'string' ? title.trim() : undefined,
    questionCount: count,
  };
}
