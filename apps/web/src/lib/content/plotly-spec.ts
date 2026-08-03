export const PLOTLY_ALLOWED_TRACE_TYPES = [
  'scatter',
  'scatter3d',
  'surface',
  'contour',
  'bar',
  'heatmap',
  'mesh3d',
] as const;

export type PlotlyAllowedTraceType = (typeof PLOTLY_ALLOWED_TRACE_TYPES)[number];

export type PlotlyFigureSpec = {
  data: Array<Record<string, unknown>>;
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

const ALLOWED_TYPE_SET = new Set<string>(PLOTLY_ALLOWED_TRACE_TYPES);

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function parsePlotlySpec(
  code: string,
): { ok: true; figure: PlotlyFigureSpec } | { ok: false; error: string } {
  const trimmed = decodeBasicEntities(code).trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty Plotly block' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Plotly block must be valid JSON' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Plotly JSON must be an object with a data array' };
  }

  const figure = parsed as Record<string, unknown>;
  if (!Array.isArray(figure.data) || figure.data.length === 0) {
    return { ok: false, error: 'Plotly JSON requires a non-empty data array' };
  }

  for (const [index, trace] of figure.data.entries()) {
    if (!trace || typeof trace !== 'object' || Array.isArray(trace)) {
      return { ok: false, error: `Trace ${index + 1} must be an object` };
    }

    const type = (trace as Record<string, unknown>).type;
    if (typeof type !== 'string' || !ALLOWED_TYPE_SET.has(type)) {
      return {
        ok: false,
        error: `Trace ${index + 1} type must be one of: ${PLOTLY_ALLOWED_TRACE_TYPES.join(', ')}`,
      };
    }
  }

  if (figure.layout !== undefined && (typeof figure.layout !== 'object' || figure.layout === null || Array.isArray(figure.layout))) {
    return { ok: false, error: 'layout must be an object when provided' };
  }

  if (figure.config !== undefined && (typeof figure.config !== 'object' || figure.config === null || Array.isArray(figure.config))) {
    return { ok: false, error: 'config must be an object when provided' };
  }

  return {
    ok: true,
    figure: {
      data: figure.data as Array<Record<string, unknown>>,
      layout: (figure.layout as Record<string, unknown> | undefined) ?? undefined,
      config: (figure.config as Record<string, unknown> | undefined) ?? undefined,
    },
  };
}
