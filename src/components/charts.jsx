/* ============================================================
   Recharts wrappers.

   Palette rules applied here (see dataviz):
   - Categorical hues are assigned in FIXED slot order, never cycled.
   - A single series gets one colour; the title names it, no legend.
   - >= 2 series always carry a legend, so identity is never colour-alone.
   - Sequential (blue ramp) is used only for true heat encodings.
   - Grid/axis stay recessive; text wears ink tokens, not series colour.
   ============================================================ */

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";

export const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
];

/* Sequential blue ramp for heat fills. Index 0 = lightest. */
export const SEQ = [
  "var(--seq-100)", "var(--seq-200)", "var(--seq-300)",
  "var(--seq-400)", "var(--seq-500)", "var(--seq-600)", "var(--seq-700)",
];

/** Steps 400+ are dark enough to need light text on top. */
export function seqFill(ratio) {
  const idx = Math.min(SEQ.length - 1, Math.max(0, Math.round(ratio * (SEQ.length - 1))));
  return { background: SEQ[idx], onDark: idx >= 3 };
}

const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--muted-ink)", fontSize: 11 } };

/* Axis ticks drop the "RM " prefix so a label like "RM 1.40M" does not wrap
   onto two lines. Tooltips and data labels keep the full currency string. */
function axisTicks(fmt) {
  if (!fmt) return undefined;
  return (v) => {
    const s = fmt(v);
    return typeof s === "string" ? s.replace(/^RM\s*/, "") : s;
  };
}

function Tip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="tip-label">{label}</div>
      {payload.map((p) => (
        <div className="tip-row" key={p.dataKey ?? p.name}>
          <span className="k">
            <span className="swatch" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="v">{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span className="item" key={i.label}>
          <span className="swatch" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ---------------- bar ---------------- */

/**
 * Vertical or horizontal bar chart.
 * One measure across categories = ONE series in one colour; position and the
 * axis label carry identity, so colour is not asked to do a second job.
 */
export function BarChartBox({
  data, xKey, yKey, height = 260, fmt, horizontal = false,
  color = "var(--series-1)", colorByIndex = false, label = false,
  onBarClick, onClick, hint,
}) {
  const isInteractive = Boolean(onBarClick || onClick);

  const handleChartClick = (state) => {
    if (!isInteractive) return;
    if (state && state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0].payload;
      if (onBarClick) onBarClick(entry);
      else if (onClick) onClick(entry);
    }
  };

  return (
    <div className={`chart-box${isInteractive ? " chart-box-interactive" : ""}`}>
      {isInteractive && (
        <div className="chart-interactive-badge">
          <span>{hint || "Click bar to inspect data →"}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: label ? 46 : 12, bottom: 4, left: horizontal ? 8 : 0 }}
          barCategoryGap={horizontal ? "22%" : "26%"}
          onClick={handleChartClick}
          style={{ cursor: isInteractive ? "pointer" : "default" }}
        >
          <CartesianGrid
            stroke="var(--grid)"
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis type="number" {...AXIS} tickFormatter={axisTicks(fmt)} />
              <YAxis type="category" dataKey={xKey} width={132} {...AXIS} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" />
              <YAxis {...AXIS} tickFormatter={axisTicks(fmt)} width={64} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--surface-3)" }}
            content={<Tip fmt={fmt} />}
          />
          <Bar
            dataKey={yKey}
            fill={color}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            onClick={(entry) => {
              if (onBarClick) onBarClick(entry);
              else if (onClick) onClick(entry);
            }}
            style={{ cursor: isInteractive ? "pointer" : "default" }}
          >
            {colorByIndex &&
              data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
            {label && (
              <LabelList
                dataKey={yKey}
                position={horizontal ? "right" : "top"}
                formatter={fmt}
                style={{ fill: "var(--text-dim)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- grouped bar ---------------- */

export function GroupedBarBox({
  data, xKey, series, height = 270, fmt, onBarClick, onClick, hint,
}) {
  const isInteractive = Boolean(onBarClick || onClick);

  const handleChartClick = (state) => {
    if (!isInteractive) return;
    if (state && state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0].payload;
      if (onBarClick) onBarClick(entry);
      else if (onClick) onClick(entry);
    }
  };

  return (
    <div className={`chart-box${isInteractive ? " chart-box-interactive" : ""}`}>
      {isInteractive && (
        <div className="chart-interactive-badge">
          <span>{hint || "Click bar to inspect data →"}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
          barCategoryGap="24%"
          onClick={handleChartClick}
          style={{ cursor: isInteractive ? "pointer" : "default" }}
        >
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" />
          <YAxis {...AXIS} tickFormatter={axisTicks(fmt)} width={64} />
          <Tooltip cursor={{ fill: "var(--surface-3)" }} content={<Tip fmt={fmt} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={SERIES[i % SERIES.length]}
              radius={[4, 4, 0, 0]}
              onClick={(entry) => {
                if (onBarClick) onBarClick({ ...entry, seriesKey: s.key });
                else if (onClick) onClick({ ...entry, seriesKey: s.key });
              }}
              style={{ cursor: isInteractive ? "pointer" : "default" }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legend items={series.map((s, i) => ({ label: s.label, color: SERIES[i % SERIES.length] }))} />
    </div>
  );
}

/* ---------------- line ---------------- */

export function LineChartBox({
  data, xKey, series, height = 260, fmt, domain, onClick, hint,
}) {
  const multi = series.length > 1;
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={`chart-box${isInteractive ? " chart-box-interactive" : ""}`}
      onClick={() => isInteractive && onClick && onClick()}
      style={{ cursor: isInteractive ? "pointer" : "default" }}
    >
      {isInteractive && (
        <div className="chart-interactive-badge">
          <span>{hint || "Click chart to inspect data →"}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...AXIS} tickFormatter={axisTicks(fmt)} width={64} domain={domain} />
          <Tooltip content={<Tip fmt={fmt} />} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {multi && (
        <Legend items={series.map((s, i) => ({ label: s.label, color: SERIES[i % SERIES.length] }))} />
      )}
    </div>
  );
}

/* ---------------- stacked area ---------------- */

export function StackedAreaBox({ data, xKey, series, height = 270, fmt }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...AXIS} tickFormatter={axisTicks(fmt)} width={64} />
          <Tooltip content={<Tip fmt={fmt} />} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="1"
              stroke={SERIES[i % SERIES.length]}
              /* 2px surface gap between stacked fills */
              strokeWidth={2}
              fill={SERIES[i % SERIES.length]}
              fillOpacity={0.22}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <Legend items={series.map((s, i) => ({ label: s.label, color: SERIES[i % SERIES.length] }))} />
    </div>
  );
}
