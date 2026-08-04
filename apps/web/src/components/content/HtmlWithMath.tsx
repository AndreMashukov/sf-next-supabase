'use client';

import { memo, useLayoutEffect, useRef } from 'react';
import { renderMathInHtmlElement } from '@/content/render-math';

export const HtmlWithMath = memo(function HtmlWithMath({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    element.innerHTML = html;
    renderMathInHtmlElement(element);
  }, [html]);

  return <div ref={containerRef} className={className} />;
});
