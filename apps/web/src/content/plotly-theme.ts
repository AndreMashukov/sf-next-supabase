import type { Layout } from 'plotly.js';

const THEME_BG = '#121212';
const THEME_FG = '#e8e4ef';
const THEME_GRID = 'rgba(255,255,255,0.08)';
const THEME_AXIS = 'rgba(255,255,255,0.2)';
const THEME_FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, sans-serif';

const AXIS_THEME = {
  gridcolor: THEME_GRID,
  zerolinecolor: THEME_AXIS,
  linecolor: THEME_AXIS,
  tickfont: { color: THEME_FG },
  titlefont: { color: THEME_FG },
  color: THEME_FG,
};

const SCENE_AXIS_THEME = {
  gridcolor: THEME_GRID,
  zerolinecolor: THEME_AXIS,
  backgroundcolor: THEME_BG,
  color: THEME_FG,
  tickfont: { color: THEME_FG },
  titlefont: { color: THEME_FG },
};

/** Dark theme defaults. Structural keys may be overridden by figure layout. */
export const PLOTLY_DARK_LAYOUT: Partial<Layout> = {
  paper_bgcolor: THEME_BG,
  plot_bgcolor: THEME_BG,
  font: {
    color: THEME_FG,
    family: THEME_FONT_FAMILY,
    size: 12,
  },
  margin: { l: 48, r: 24, t: 48, b: 48 },
  colorway: ['#d2bbff', '#7dd3fc', '#f9a8d4', '#86efac', '#fcd34d'],
  xaxis: { ...AXIS_THEME },
  yaxis: { ...AXIS_THEME },
  legend: {
    bgcolor: 'rgba(18,18,18,0.85)',
    bordercolor: 'rgba(255,255,255,0.12)',
    font: { color: THEME_FG },
  },
  modebar: {
    bgcolor: 'transparent',
    color: 'rgba(232,228,239,0.65)',
    activecolor: THEME_FG,
  },
  scene: {
    xaxis: { ...SCENE_AXIS_THEME },
    yaxis: { ...SCENE_AXIS_THEME },
    zaxis: { ...SCENE_AXIS_THEME },
    bgcolor: THEME_BG,
  },
};

type AxisLike = Record<string, unknown> | undefined;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function mergeAxis(base: AxisLike, user: AxisLike, theme: Record<string, unknown>): Record<string, unknown> {
  const merged = {
    ...(base ?? {}),
    ...(user ?? {}),
  };

  const userTitle = asRecord(merged.title);
  const userTickfont = asRecord(merged.tickfont);
  const userTitlefont = asRecord(merged.titlefont);

  return {
    ...merged,
    ...theme,
    tickfont: { ...(userTickfont ?? {}), ...(asRecord(theme.tickfont) ?? {}) },
    titlefont: { ...(userTitlefont ?? {}), ...(asRecord(theme.titlefont) ?? {}) },
    ...(userTitle
      ? {
          title: {
            ...userTitle,
            font: {
              ...asRecord(userTitle.font),
              color: THEME_FG,
            },
          },
        }
      : {}),
  };
}

function pinTitle(title: unknown): unknown {
  if (typeof title === 'string') {
    return {
      text: title,
      font: { color: THEME_FG },
    };
  }

  const record = asRecord(title);
  if (!record) {
    return title;
  }

  return {
    ...record,
    font: {
      ...asRecord(record.font),
      color: THEME_FG,
    },
  };
}

function pinAnnotations(annotations: unknown): unknown {
  if (!Array.isArray(annotations)) {
    return annotations;
  }

  return annotations.map((annotation) => {
    const record = asRecord(annotation);
    if (!record) {
      return annotation;
    }

    return {
      ...record,
      font: {
        ...asRecord(record.font),
        color: THEME_FG,
      },
      arrowcolor: typeof record.arrowcolor === 'string' ? record.arrowcolor : THEME_AXIS,
    };
  });
}

/**
 * Merge generated Plotly layout with the app dark theme.
 * Content fields (title text, ranges, annotations text) come from the figure;
 * background and foreground theme colors always win so graphs stay readable.
 */
export function mergePlotlyDarkLayout(layout?: Record<string, unknown>): Partial<Layout> {
  const user = (layout ?? {}) as Partial<Layout> & Record<string, unknown>;
  const userScene = asRecord(user.scene);
  const userLegend = asRecord(user.legend);

  const merged: Record<string, unknown> = {
    ...PLOTLY_DARK_LAYOUT,
    ...user,
    font: {
      ...PLOTLY_DARK_LAYOUT.font,
      ...asRecord(user.font),
      color: THEME_FG,
      family: THEME_FONT_FAMILY,
    },
    margin: {
      ...PLOTLY_DARK_LAYOUT.margin,
      ...asRecord(user.margin),
    },
    xaxis: mergeAxis(
      asRecord(PLOTLY_DARK_LAYOUT.xaxis),
      asRecord(user.xaxis),
      AXIS_THEME,
    ),
    yaxis: mergeAxis(
      asRecord(PLOTLY_DARK_LAYOUT.yaxis),
      asRecord(user.yaxis),
      AXIS_THEME,
    ),
    legend: {
      ...asRecord(PLOTLY_DARK_LAYOUT.legend),
      ...(userLegend ?? {}),
      bgcolor: 'rgba(18,18,18,0.85)',
      bordercolor: 'rgba(255,255,255,0.12)',
      font: {
        ...asRecord(userLegend?.font),
        color: THEME_FG,
      },
    },
    modebar: {
      ...asRecord(PLOTLY_DARK_LAYOUT.modebar),
      ...asRecord(user.modebar),
      bgcolor: 'transparent',
      color: 'rgba(232,228,239,0.65)',
      activecolor: THEME_FG,
    },
    scene: {
      ...asRecord(PLOTLY_DARK_LAYOUT.scene),
      ...(userScene ?? {}),
      bgcolor: THEME_BG,
      xaxis: mergeAxis(
        asRecord(asRecord(PLOTLY_DARK_LAYOUT.scene)?.xaxis),
        asRecord(userScene?.xaxis),
        SCENE_AXIS_THEME,
      ),
      yaxis: mergeAxis(
        asRecord(asRecord(PLOTLY_DARK_LAYOUT.scene)?.yaxis),
        asRecord(userScene?.yaxis),
        SCENE_AXIS_THEME,
      ),
      zaxis: mergeAxis(
        asRecord(asRecord(PLOTLY_DARK_LAYOUT.scene)?.zaxis),
        asRecord(userScene?.zaxis),
        SCENE_AXIS_THEME,
      ),
    },
    // Theme locks: generated light paper/plot/font colors must not win.
    paper_bgcolor: THEME_BG,
    plot_bgcolor: THEME_BG,
  };

  if (user.title !== undefined) {
    merged.title = pinTitle(user.title);
  }

  if (user.annotations !== undefined) {
    merged.annotations = pinAnnotations(user.annotations);
  }

  return merged as Partial<Layout>;
}
