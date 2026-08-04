'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import { cn } from '@/utils';

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
  const stageRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

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

  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  function zoomIn() {
    setFit(false);
    setScale((current) => Math.min(2.5, Number((current + 0.15).toFixed(2))));
  }

  function zoomOut() {
    setFit(false);
    setScale((current) => Math.max(0.5, Number((current - 0.15).toFixed(2))));
  }

  function fitToView() {
    setFit(true);
    setScale(1);
  }

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

  const diagram = (
    <div className={cn('document-mermaid', fullscreen && 'document-mermaid-fullscreen', className)}>
      <div className="document-mermaid-toolbar">
        <span className="document-mermaid-toolbar-label">Diagram</span>
        <div className="document-mermaid-toolbar-actions">
          <button type="button" className="document-mermaid-tool" onClick={zoomOut} aria-label="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="document-mermaid-tool" onClick={zoomIn} aria-label="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className={cn('document-mermaid-tool', fit && 'active')}
            onClick={fitToView}
            aria-label="Fit diagram"
          >
            Fit
          </button>
          <button
            type="button"
            className="document-mermaid-tool"
            onClick={() => setFullscreen((open) => !open)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen diagram'}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div ref={stageRef} className={cn('document-mermaid-stage', fit && 'is-fit')}>
        <div
          className="document-mermaid-canvas"
          style={fit ? undefined : { transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svg ?? '' }}
        />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <>
        <div className="document-mermaid document-mermaid-placeholder" aria-hidden="true" />
        <div className="document-mermaid-overlay" role="dialog" aria-modal="true" aria-label="Diagram fullscreen">
          {diagram}
        </div>
      </>
    );
  }

  return diagram;
}
