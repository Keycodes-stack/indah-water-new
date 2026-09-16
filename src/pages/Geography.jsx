import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import { byArea, totalArrears } from "../db/selectors.js";
import { rm, rmCompact, num, pct, AGEING_BUCKETS } from "../lib/format.js";
import { Stats, Panel, Badge, CellBar } from "../components/ui.jsx";
import { BarChartBox, seqFill, SEQ } from "../components/charts.jsx";
import AreaMap from "../components/AreaMap.jsx";

export default function Geography() {
  const navigate = useNavigate();
  const { customers, areas } = useData();

  const rows = useMemo(() => byArea(customers, areas), [customers, areas]);
  const total = useMemo(() => totalArrears(customers), [customers]);

  const maxValue = Math.max(...rows.map((r) => r.value), 1);

  /* Heat is normalised per row so each area's own ageing mix is readable,
     rather than the largest area washing out every other row. */
  const heatRows = rows.map((r) => {
    const rowMax = Math.max(...AGEING_BUCKETS.map((b) => r.ageing[b]), 1);
    return { ...r, rowMax };
  });

  const byState = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      if (!m.has(r.state)) m.set(r.state, { state: r.state, value: 0, accounts: 0 });
      const e = m.get(r.state);
      e.value += r.value;
      e.accounts += r.accounts;
    });
    return [...m.values()].sort((a, b) => b.value - a.value);
  }, [rows]);

  const worstAgeing = [...rows].sort(
    (a, b) => b.ageing["90+"] - a.ageing["90+"]
  )[0];
  const totalVacant = rows.reduce((s, r) => s + r.vacantPremises, 0);
  const avgCoverage = rows.length
    ? rows.reduce((s, r) => s + r.treatmentCoverage, 0) / rows.length
    : 0;

  return (
    <>
      <Stats cards={[
        { label: "Territories", value: num(rows.length), sub: "11 States + Federal Territories" },
        {
          label: "Top State",
          value: rows[0]?.area || "—",
          sub: `${rmCompact(rows[0]?.value || 0)} · ${pct(rows[0]?.share || 0)} of total book`,
        },
        {
          label: "Vacancy Signals",
          value: num(totalVacant),
          sub: "premises flagged vacant",
          tone: "bad",
        },
        {
          label: "Avg Treatment Coverage",
          value: pct(avgCoverage, 0),
          sub: "sewerage network coverage",
        },
      ]} />

      <div className="callout">
        <strong>Official Administrative Breakdown.</strong> State and Federal Territory aggregations reflect Indah Water's statutory operating zones across Peninsular Malaysia. Premise-level connections live in IGIS.
      </div>

      <Panel
        title="Geographic Arrears & Infrastructure Map"
        sub="Interactive regional map showing arrears concentration, vacancy signals, and sewerage treatment coverage across the 11 Malaysian states plus federal territories."
      >
        <AreaMap rows={rows} totalArrears={total} />
      </Panel>

      <div className="grid c2">
        <Panel
          title="Arrears Concentration By State & Territory"
          sub="Where the outstanding balance sits across the 11 states plus federal territories. Click any bar to inspect customer accounts."
        >
          <BarChartBox
            data={rows.map((r) => ({ name: r.area, value: r.value }))}
            xKey="name" yKey="value" fmt={rmCompact} horizontal height={360}
            onBarClick={(entry) => navigate(`/customers?area=${encodeURIComponent(entry.name)}`)}
            hint="Click state to inspect customers →"
          />
        </Panel>

        <Panel title="Rollup By State & Federal Territory" sub="Official aggregates for the 11 states plus federal territories.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Territory</th>
                  <th>Type</th>
                  <th className="num">Accounts</th>
                  <th className="num">Arrears</th>
                  <th className="num" style={{ minWidth: 140 }}>Share of Book</th>
                  <th className="num">Coverage</th>
                  <th style={{ width: 85 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.area}
                    className="row"
                    onClick={() => navigate(`/customers?area=${encodeURIComponent(s.area)}`)}
                  >
                    <td><strong>{s.area}</strong></td>
                    <td>
                      <span
                        className={`badge ${s.type === "Federal Territory" ? "info" : "mute"}`}
                        style={{ fontSize: 10 }}
                      >
                        {s.type || "State"}
                      </span>
                    </td>
                    <td className="num">{num(s.accounts)}</td>
                    <td className="num"><strong>{rm(s.value)}</strong></td>
                    <td className="num">
                      <CellBar value={s.value} max={rows[0]?.value || 1}>
                        {pct(s.share)}
                      </CellBar>
                    </td>
                    <td className="num">{pct(s.treatmentCoverage, 0)}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers?area=${encodeURIComponent(s.area)}`);
                        }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="Ageing Heat Map By State & Territory"
        sub="Arrears value per ageing bucket across the 11 states plus federal territories. Each row is shaded against its own maximum."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>State</th>
                <th className="num">Accounts</th>
                <th className="num">Total</th>
                {AGEING_BUCKETS.map((b) => (
                  <th key={b} className="num">{b} Days</th>
                ))}
                <th className="num">Avg Days</th>
              </tr>
            </thead>
            <tbody>
              {heatRows.map((r) => (
                <tr key={r.area}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.area}</td>
                  <td className="dim nowrap">{r.state}</td>
                  <td className="num">{num(r.accounts)}</td>
                  <td className="num"><strong>{rm(r.value)}</strong></td>
                  {AGEING_BUCKETS.map((b) => {
                    const v = r.ageing[b];
                    if (!v) return <td key={b} className="num dim">—</td>;
                    const { background, onDark } = seqFill(v / r.rowMax);
                    return (
                      <td key={b} className={`heat${onDark ? " on-dark" : ""}`} style={{ background }}>
                        {rmCompact(v)}
                      </td>
                    );
                  })}
                  <td className="num">{Math.round(r.avgDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="legend" style={{ marginTop: 12 }}>
          <span className="item">Lower</span>
          {SEQ.map((c) => (
            <span key={c} className="swatch" style={{ background: c, width: 22, height: 10, borderRadius: 2 }} />
          ))}
          <span className="item">Higher share of that area's arrears</span>
        </div>
      </Panel>

      <Panel
        title="Vacancy Signal And Treatment Coverage By State & Territory"
        sub="Vacant premises distort collections effort; coverage shows sewerage network penetration across each state and federal territory."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th className="num">Accounts</th>
                <th className="num">Vacant Premises</th>
                <th className="num">Vacancy Rate</th>
                <th className="num">Treatment Coverage</th>
                <th className="num">Connections</th>
                <th className="num">Plants</th>
                <th>IGIS Zone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const vacancyRate = r.accounts ? r.vacantPremises / r.accounts : 0;
                return (
                  <tr key={r.area}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.area}</td>
                    <td className="num">{num(r.accounts)}</td>
                    <td className="num">{num(r.vacantPremises)}</td>
                    <td className="num">
                      <Badge tone={vacancyRate > 0.06 ? "err" : vacancyRate > 0.03 ? "warn" : "ok"}>
                        {pct(vacancyRate)}
                      </Badge>
                    </td>
                    <td className="num">
                      <CellBar value={r.treatmentCoverage} max={1}>
                        {pct(r.treatmentCoverage, 0)}
                      </CellBar>
                    </td>
                    <td className="num">{num(r.sewerageConnections)}</td>
                    <td className="num">{num(r.treatmentPlants)}</td>
                    <td className="mono dim">{r.igisZoneId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {worstAgeing && (
          <p className="empty-note" style={{ marginTop: 10 }}>
            {worstAgeing.area} carries the largest 90+ day balance at{" "}
            {rm(worstAgeing.ageing["90+"])}.
          </p>
        )}
      </Panel>
    </>
  );
}
