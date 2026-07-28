'use client';

import { cn } from '@/lib/utils';

export function DocumentHtmlContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html.trim()) {
    return null;
  }

  return (
    <div
      className={cn('document-html-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
