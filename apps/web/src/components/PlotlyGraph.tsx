'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Config, Data } from 'plotly.js';
import { parsePlotlySpec } from '@/lib/plotly-spec';
import { mergePlotlyDarkLayout } from '@/lib/plotly-theme';
import { cn } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="document-plotly document-plotly-loading">Loading graph…</div>
  ),
});

const DEFAULT_CONFIG: Partial<Config> = {
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
};

export function PlotlyGraph({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const parsed = useMemo(() => parsePlotlySpec(code), [code]);

  if (!parsed.ok) {
    return (
      <div className={cn('document-plotly', 'document-plotly-error', className)}>
        <p>Failed to render Plotly graph.</p>
        <p className="document-plotly-error-detail">{parsed.error}</p>
        <pre>{code}</pre>
      </div>
    );
  }

  const { data, layout, config } = parsed.figure;
  const has3d = data.some((trace) => {
    const type = typeof trace.type === 'string' ? trace.type : '';
    return type.includes('3d') || type === 'surface' || type === 'mesh3d';
  });

  return (
    <div className={cn('document-plotly', className)}>
      <div className="document-plotly-toolbar">
        <span className="document-plotly-toolbar-label">{has3d ? '3D Graph' : 'Graph'}</span>
      </div>
      <div className="document-plotly-stage">
        <Plot
          data={data as Data[]}
          layout={{
            ...mergePlotlyDarkLayout(layout),
            autosize: true,
            height: has3d ? 420 : 360,
          }}
          config={{ ...DEFAULT_CONFIG, ...(config as Partial<Config> | undefined) }}
          style={{ width: '100%', minHeight: has3d ? 420 : 360 }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
