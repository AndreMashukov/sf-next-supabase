'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

let mermaidInitialized = false;
let renderQueue: Promise<void> = Promise.resolve();

function ensureMermaidInit() {
  if (mermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'dark',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });
  mermaidInitialized = true;
}

export function MermaidDiagram({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      setSvg(null);
      setError('Empty diagram');
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setError(null);

    renderQueue = renderQueue
      .then(async () => {
        if (cancelled) {
          return;
        }

        ensureMermaidInit();
        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`;

        try {
          const { svg: out } = await mermaid.render(id, trimmed);
          if (!cancelled) {
            setSvg(out);
            setIsRendering(false);
          }
        } catch (renderError) {
          document.getElementById(`d${id}`)?.remove();
          if (!cancelled) {
            setSvg(null);
            setIsRendering(false);
            setError(
              renderError instanceof Error
                ? renderError.message
                : 'Failed to render diagram',
            );
          }
        }
      })
      .catch(() => {
        /* keep queue alive */
      });

    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (isRendering) {
    return (
      <div className={cn('document-mermaid', 'document-mermaid-loading', className)}>
        Rendering diagram…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('document-mermaid', 'document-mermaid-error', className)}>
        <p>Failed to render Mermaid diagram.</p>
        <pre>{code}</pre>
      </div>
    );
  }

  return (
    <div
      className={cn('document-mermaid', className)}
      dangerouslySetInnerHTML={{ __html: svg ?? '' }}
    />
  );
}
