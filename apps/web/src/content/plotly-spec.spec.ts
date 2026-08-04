import { describe, expect, it } from 'vitest';
import { parsePlotlySpec, PLOTLY_ALLOWED_TRACE_TYPES } from './plotly-spec';

describe('parsePlotlySpec', () => {
  it('accepts a valid 2D scatter figure', () => {
    const result = parsePlotlySpec(
      JSON.stringify({
        data: [{ type: 'scatter', mode: 'lines', x: [0, 1], y: [0, 1] }],
        layout: { title: 'Line' },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.figure.data).toHaveLength(1);
      expect(result.figure.layout?.title).toBe('Line');
    }
  });

  it('accepts a valid 3D surface figure', () => {
    const result = parsePlotlySpec(
      JSON.stringify({
        data: [{ type: 'surface', z: [[1, 2], [3, 4]] }],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = parsePlotlySpec('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/valid JSON/i);
    }
  });

  it('rejects unsupported trace types', () => {
    const result = parsePlotlySpec(
      JSON.stringify({
        data: [{ type: 'pie', values: [1, 2] }],
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(PLOTLY_ALLOWED_TRACE_TYPES[0]);
    }
  });

  it('rejects empty data arrays', () => {
    const result = parsePlotlySpec(JSON.stringify({ data: [] }));
    expect(result.ok).toBe(false);
  });
});
