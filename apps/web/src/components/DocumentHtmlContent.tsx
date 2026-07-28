'use client';

import { useMemo } from 'react';
import { DocumentCodeBlock } from '@/components/DocumentCodeBlock';
import { cn } from '@/lib/utils';

type HtmlSegment = { type: 'html'; html: string };
type CodeSegment = { type: 'code'; code: string; language: string };
type Segment = HtmlSegment | CodeSegment;

const PRE_CODE_RE =
  /<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
};

function normalizeLanguage(language: string | undefined): string {
  if (!language) {
    return 'text';
  }

  const key = language.toLowerCase();
  return LANGUAGE_ALIASES[key] ?? key;
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractLanguage(attrs: string): string {
  const match = /language-([\w+-]+)/i.exec(attrs);
  return normalizeLanguage(match?.[1]);
}

export function splitHtmlByCodeBlocks(html: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  const re = new RegExp(PRE_CODE_RE.source, PRE_CODE_RE.flags);

  for (const match of html.matchAll(re)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({ type: 'html', html: html.slice(lastIndex, index) });
    }

    segments.push({
      type: 'code',
      language: extractLanguage(match[1] ?? ''),
      code: decodeBasicEntities(match[2] ?? '').replace(/\n$/, ''),
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'html', html: html.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'html', html }];
}

export function DocumentHtmlContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const segments = useMemo(() => splitHtmlByCodeBlocks(html), [html]);

  if (!html.trim()) {
    return null;
  }

  return (
    <div className={cn('document-html-content', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return (
            <DocumentCodeBlock
              key={`code-${index}`}
              code={segment.code}
              language={segment.language}
            />
          );
        }

        if (!segment.html.trim()) {
          return null;
        }

        return (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: segment.html }}
          />
        );
      })}
    </div>
  );
}
