import { describe, expect, it } from 'vitest';
import { mergePlotlyDarkLayout } from './plotly-theme';

describe('mergePlotlyDarkLayout', () => {
  it('keeps dark paper/plot/font when figure requests a light theme', () => {
    const layout = mergePlotlyDarkLayout({
      title: 'Tensor Shapes Through the 5 Problems',
      paper_bgcolor: '#ffffff',
      plot_bgcolor: 'white',
      font: { color: '#111111', size: 14 },
      xaxis: {
        title: 'elements',
        gridcolor: '#eeeeee',
        tickfont: { color: '#000000' },
      },
      annotations: [{ text: 'P1', font: { color: '#ffffff' } }],
    });

    expect(layout.paper_bgcolor).toBe('#121212');
    expect(layout.plot_bgcolor).toBe('#121212');
    expect(layout.font?.color).toBe('#e8e4ef');
    expect(layout.font?.size).toBe(14);
    expect((layout.xaxis as { gridcolor?: string } | undefined)?.gridcolor).toBe(
      'rgba(255,255,255,0.08)',
    );
    expect((layout.xaxis as { tickfont?: { color?: string } } | undefined)?.tickfont?.color).toBe(
      '#e8e4ef',
    );
    expect((layout.title as { text?: string; font?: { color?: string } }).text).toBe(
      'Tensor Shapes Through the 5 Problems',
    );
    expect((layout.title as { font?: { color?: string } }).font?.color).toBe('#e8e4ef');
    expect((layout.annotations as Array<{ font?: { color?: string } }>)[0]?.font?.color).toBe(
      '#e8e4ef',
    );
  });

  it('preserves non-theme layout fields from the figure', () => {
    const layout = mergePlotlyDarkLayout({
      width: 640,
      xaxis: { range: [0, 12] },
      yaxis: { range: [2, 6] },
    });

    expect(layout.width).toBe(640);
    expect((layout.xaxis as { range?: number[] } | undefined)?.range).toEqual([0, 12]);
    expect((layout.yaxis as { range?: number[] } | undefined)?.range).toEqual([2, 6]);
  });
});
