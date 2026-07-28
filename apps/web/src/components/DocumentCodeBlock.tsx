'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

export function DocumentCodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const resolvedLanguage = language?.trim() || 'text';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn('document-code-block', className)}>
      <button
        type="button"
        className="document-code-copy"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language={resolvedLanguage}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '2.25rem 0.875rem 0.875rem',
          borderRadius: '0.625rem',
          background: 'rgb(16 13 22)',
          border: '1px solid var(--border)',
          fontSize: '0.875rem',
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            background: 'transparent',
          },
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
