'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Config, Data, Layout } from 'plotly.js';
import { parsePlotlySpec } from '@/lib/plotly-spec';
import { cn } from '@/lib/utils';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="document-plotly document-plotly-loading">Loading graph…</div>
  ),
});

const DARK_LAYOUT: Partial<Layout> = {
  paper_bgcolor: 'rgba(18, 18, 18, 0)',
  plot_bgcolor: 'rgba(18, 18, 18, 0)',
  font: {
    color: '#e8e4ef',
    family: 'Inter, ui-sans-serif, system-ui, sans-serif',
    size: 12,
  },
  margin: { l: 48, r: 24, t: 48, b: 48 },
  colorway: ['#d2bbff', '#7dd3fc', '#f9a8d4', '#86efac', '#fcd34d'],
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.08)',
    zerolinecolor: 'rgba(255,255,255,0.2)',
    linecolor: 'rgba(255,255,255,0.2)',
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.08)',
    zerolinecolor: 'rgba(255,255,255,0.2)',
    linecolor: 'rgba(255,255,255,0.2)',
  },
  scene: {
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.08)',
      zerolinecolor: 'rgba(255,255,255,0.2)',
      backgroundcolor: 'rgba(18,18,18,0)',
    },
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.08)',
      zerolinecolor: 'rgba(255,255,255,0.2)',
      backgroundcolor: 'rgba(18,18,18,0)',
    },
    zaxis: {
      gridcolor: 'rgba(255,255,255,0.08)',
      zerolinecolor: 'rgba(255,255,255,0.2)',
      backgroundcolor: 'rgba(18,18,18,0)',
    },
  },
};

const DEFAULT_CONFIG: Partial<Config> = {
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
};

function mergeLayout(layout?: Record<string, unknown>): Partial<Layout> {
  const user = (layout ?? {}) as Partial<Layout>;
  return {
    ...DARK_LAYOUT,
    ...user,
    font: { ...DARK_LAYOUT.font, ...(user.font ?? {}) },
    margin: { ...DARK_LAYOUT.margin, ...(user.margin ?? {}) },
    xaxis: { ...DARK_LAYOUT.xaxis, ...(user.xaxis ?? {}) },
    yaxis: { ...DARK_LAYOUT.yaxis, ...(user.yaxis ?? {}) },
    scene: {
      ...DARK_LAYOUT.scene,
      ...(user.scene ?? {}),
      xaxis: {
        ...(DARK_LAYOUT.scene as Layout['scene'] | undefined)?.xaxis,
        ...(user.scene as Layout['scene'] | undefined)?.xaxis,
      },
      yaxis: {
        ...(DARK_LAYOUT.scene as Layout['scene'] | undefined)?.yaxis,
        ...(user.scene as Layout['scene'] | undefined)?.yaxis,
      },
      zaxis: {
        ...(DARK_LAYOUT.scene as Layout['scene'] | undefined)?.zaxis,
        ...(user.scene as Layout['scene'] | undefined)?.zaxis,
      },
    },
  };
}

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
            ...mergeLayout(layout),
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
