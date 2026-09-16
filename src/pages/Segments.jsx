import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import {
  bySegment, specialRouting, mainFunnel, SEGMENTS, ageingSplit, totalArrears,
} from "../db/selectors.js";
import { rm, rmCompact, num, pct } from "../lib/format.js";
import { Stats, Panel, Badge } from "../components/ui.jsx";
import { BarChartBox, GroupedBarBox, Legend, SERIES } from "../components/charts.jsx";
import SegmentWorkflow from "../components/SegmentWorkflow.jsx";

/* How each segment is meant to be handled — the operating rationale
   behind the split, shown alongside the numbers. */
const SEGMENT_NOTES = {
  "Friction Payers": "Will pay once the friction is removed. Cheap digital nudges resolve most of this group.",
  Refusers: "Can pay but will not. Escalation and formal action carry the load here.",
  Constrained: "Wants to pay but cannot in full. Route to instalment plans and hardship support.",
  "Non-viable": "No realistic prospect of recovery. Candidate for write-off review rather than treatment spend.",
};

const ROUTING_NOTES = {
  "Deceased Estate": "Contact suppressed; handled through estate process.",
  "Vacant Premise": "No occupier to treat; needs a field or billing check.",
  "Hardship/eKasih": "Registered hardship — protected treatment path.",
  "Open Dispute": "Collections paused until the dispute is closed.",
};

export default function Segments() {
  const navigate = useNavigate();
  const { customers } = useData();

  /* Special-routing accounts are deliberately excluded from the funnel:
     they are counted and worked separately, not mixed into treatment. */
  const funnel = useMemo(() => mainFunnel(customers), [customers]);
  const segs = useMemo(() => bySegment(funnel), [funnel]);
  const special = useMemo(() => specialRouting(customers), [customers]);

  const specialTotal = special.reduce((s, r) => s + r.accounts, 0);
  const specialValue = special.reduce((s, r) => s + r.value, 0);

  /* Ageing mix within each segment. */
  const ageingBySegment = useMemo(
    () =>
      SEGMENTS.map((seg) => {
        const rows = funnel.filter((c) => c.segment === seg);
        const split = ageingSplit(rows);
        const out = { name: seg };
        split.forEach((s) => { out[s.bucket] = s.accounts; });
        return out;
      }),
    [funnel]
  );

  return (
    <>
      <Stats cards={[
        { label: "In main funnel", value: num(funnel.length), sub: `${rmCompact(totalArrears(funnel))} in scope for treatment` },
        { label: "Special routing", value: num(specialTotal), sub: `${rmCompact(specialValue)} worked separately` },
        {
          label: "Friction Payers",
          value: num(segs.find((s) => s.key === "Friction Payers")?.accounts || 0),
          sub: "cheapest to resolve",
          tone: "good",
        },
        {
          label: "Non-viable",
          value: num(segs.find((s) => s.key === "Non-viable")?.accounts || 0),
          sub: "write-off candidates",
          tone: "bad",
        },
      ]} />


      <div className="grid c2">
        <Panel
          title="Accounts by operating segment"
          sub="How the treatable book splits across the four behavioural segments. Click any bar to inspect customers."
        >
          <BarChartBox
            data={segs.map((s) => ({ name: s.key, value: s.accounts }))}
            xKey="name" yKey="value" fmt={num} colorByIndex label height={250}
            onBarClick={(entry) => navigate(`/customers?segment=${encodeURIComponent(entry.name)}`)}
            hint="Click segment to inspect customers →"
          />
          <Legend items={segs.map((s, i) => ({ label: s.key, color: SERIES[i] }))} />
        </Panel>

        <Panel
          title="Value by operating segment"
          sub="Arrears value distribution — click any bar to inspect matching customers."
        >
          <BarChartBox
            data={segs.map((s) => ({ name: s.key, value: s.value }))}
            xKey="name" yKey="value" fmt={rmCompact} colorByIndex height={250}
            onBarClick={(entry) => navigate(`/customers?segment=${encodeURIComponent(entry.name)}`)}
            hint="Click segment to inspect customers →"
          />
          <Legend items={segs.map((s, i) => ({ label: s.key, color: SERIES[i] }))} />
        </Panel>
      </div>

      <Panel title="Segment detail" sub="Counts, value and the intended treatment approach.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th className="num">Accounts</th>
                <th className="num">Value</th>
                <th className="num">Avg balance</th>
                <th className="num">Share of value</th>
                <th>Operating approach</th>
              </tr>
            </thead>
            <tbody>
              {segs.map((s, i) => (
                <tr key={s.key}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="legend" style={{ margin: 0, display: "inline-flex" }}>
                      <span className="swatch" style={{ background: SERIES[i], marginRight: 7 }} />
                    </span>
                    <strong>{s.key}</strong>
                  </td>
                  <td className="num">{num(s.accounts)}</td>
                  <td className="num">{rm(s.value)}</td>
                  <td className="num">{rm(s.avg)}</td>
                  <td className="num">{pct(s.share)}</td>
                  <td style={{ fontSize: 12.5, color: "var(--text-dim)", minWidth: 280 }}>
                    {SEGMENT_NOTES[s.key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Ageing mix within each segment"
        sub="Days overdue by segment — refusers and non-viable skew old, friction payers skew fresh."
      >
        <GroupedBarBox
          data={ageingBySegment}
          xKey="name"
          series={[
            { key: "0-30", label: "0–30 days" },
            { key: "31-60", label: "31–60 days" },
            { key: "61-90", label: "61–90 days" },
            { key: "90+", label: "90+ days" },
          ]}
          fmt={num}
          height={280}
        />
      </Panel>

      <SegmentWorkflow />

      <Panel
        title="Special-routing populations"
        sub="Tracked as their own workload and counts — deliberately kept out of the main funnel."
      >
        <div className="grid c3" style={{ marginBottom: 0 }}>
          {special.map((s) => (
            <div className="panel" key={s.key} style={{ background: "var(--surface-2)" }}>
              <h4>{s.key}</h4>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {num(s.accounts)}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 }}>
                {rm(s.value)} held
              </div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "10px 0 0" }}>
                {ROUTING_NOTES[s.key]}
              </p>
            </div>
          ))}
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Population</th>
                <th className="num">Accounts</th>
                <th className="num">Value held</th>
                <th>Contact status</th>
              </tr>
            </thead>
            <tbody>
              {special.map((s) => (
                <tr key={s.key}>
                  <td>{s.key}</td>
                  <td className="num">{num(s.accounts)}</td>
                  <td className="num">{rm(s.value)}</td>
                  <td>
                    <Badge tone={s.key === "Hardship/eKasih" ? "info" : "warn"}>
                      {s.key === "Deceased Estate" || s.key === "Open Dispute"
                        ? "Suppressed"
                        : s.key === "Hardship/eKasih"
                        ? "Protected path"
                        : "Field check"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{num(specialTotal)}</td>
                <td className="num">{rm(specialValue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
