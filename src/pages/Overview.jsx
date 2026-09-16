import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import {
  bookSummary, byCategory, byStage, channelTotals, complianceSummary, byArea,
} from "../db/selectors.js";
import { fetchCalls } from "../lib/vapi.js";
import { CONFIG } from "../../config.js";
import {
  rm, rmUnit, rmCompact, num, pct, usd, minutesText, fmtDate, shortPeriod,
} from "../lib/format.js";
import { Stats, Panel, Badge } from "../components/ui.jsx";
import { BarChartBox, LineChartBox, Legend, SERIES } from "../components/charts.jsx";

/* Live Vapi summary — loaded independently so the demo data renders
   instantly even if the API is slow or unreachable. */
function useVoiceSummary() {
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let cancelled = false;
    fetchCalls()
      .then(({ rows }) => !cancelled && setState({ loading: false, error: null, rows }))
      .catch((e) => !cancelled && setState({ loading: false, error: e.message, rows: [] }));
    return () => { cancelled = true; };
  }, []);

  return state;
}

export default function Overview() {
  const navigate = useNavigate();
  const { customers, settings, channelActivity, kpis, compliance, areas } = useData();
  const voice = useVoiceSummary();

  const book = useMemo(() => bookSummary(customers), [customers]);
  const cats = useMemo(() => byCategory(customers), [customers]);
  const stages = useMemo(() => byStage(customers), [customers]);
  const areaRows = useMemo(() => byArea(customers, areas), [customers, areas]);
  const channels = useMemo(
    () => channelTotals(channelActivity, settings.channelCosts),
    [channelActivity, settings.channelCosts]
  );
  const conduct = useMemo(
    () => complianceSummary(compliance, settings.targets),
    [compliance, settings.targets]
  );

  const latestKpi = kpis[kpis.length - 1] || {};
  const treatmentSpend = channels.reduce((s, c) => s + c.cost, 0);
  const recovered = kpis.reduce((s, k) => s + k.amountRecovered, 0);

  const voiceCost = voice.rows.reduce((s, r) => s + r.cost, 0);
  const voiceSecs = voice.rows.reduce((s, r) => s + r.duration, 0);

  const trend = kpis.map((k) => ({
    week: shortPeriod(k.week),
    recovered: k.amountRecovered,
    cost: k.treatmentCost,
  }));

  return (
    <>
      <Stats cards={[
        {
          label: "Total Arrears",
          value: rmCompact(book.totalArrears),
          sub: `${num(book.accounts)} accounts on the book`,
        },
        {
          label: "Overdue Value",
          value: rmCompact(book.overdueValue),
          sub: `${num(book.overdueAccounts)} accounts · avg ${Math.round(book.avgDaysOverdue)} days`,
        },
        {
          label: "Recovered (90d)",
          value: rmCompact(recovered),
          sub: `${rmUnit(latestKpi.costPerRinggitRecovered || 0)} cost per RM recovered`,
          tone: "good",
        },
        {
          label: "Treatment Spend",
          value: rmCompact(treatmentSpend),
          sub: `${num(channels.reduce((s, c) => s + c.sent, 0))} contacts sent`,
        },
        {
          label: "Voice AI Calls",
          value: voice.loading ? "…" : voice.error ? "—" : num(voice.rows.length),
          sub: voice.loading
            ? "loading live telemetry..."
            : voice.error
            ? "Service unreachable"
            : `${usd(voiceCost)} · ${minutesText(voiceSecs)}`,
          tone: voice.error ? "bad" : undefined,
        },
        {
          label: "Complaints / 1,000",
          value: (conduct.latest.complaintsPer1000 ?? 0).toFixed(2),
          sub: "Timing concerns (bill due date elapsed)",
          tone: conduct.withinTarget ? "good" : "bad",
        },
      ]} />

      <div className="grid c2">
        <Panel
          title="Arrears By Customer Category"
          sub="Share of the total book, derived live from the customer records. Click any category to view customer records."
        >
          <BarChartBox
            data={cats.map((c) => ({ name: c.key, value: c.value }))}
            xKey="name"
            yKey="value"
            fmt={rmCompact}
            colorByIndex
            height={250}
            onBarClick={(entry) => navigate(`/customers?category=${encodeURIComponent(entry.name)}`)}
            hint="Click category to inspect customers →"
          />
          <Legend items={cats.map((c, i) => ({ label: c.key, color: SERIES[i] }))} />
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Accounts</th>
                  <th className="num">Value</th>
                  <th className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr
                    key={c.key}
                    className="clickable-row"
                    onClick={() => navigate(`/customers?category=${encodeURIComponent(c.key)}`)}
                    style={{ cursor: "pointer" }}
                    title={`Filter customers by ${c.key}`}
                  >
                    <td><strong>{c.key}</strong></td>
                    <td className="num">{num(c.accounts)}</td>
                    <td className="num">{rm(c.value)}</td>
                    <td className="num">{pct(c.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Accounts By Ladder Stage"
          sub="Position on the collections ladder, from bill presented through to residual. Click any bar to view customers."
        >
          <BarChartBox
            data={stages.map((s) => ({ name: s.key, value: s.accounts }))}
            xKey="name"
            yKey="value"
            fmt={num}
            horizontal
            label
            height={250}
            onBarClick={(entry) => navigate(`/customers?stage=${encodeURIComponent(entry.name)}`)}
            hint="Click stage to inspect customers →"
          />
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th className="num">Accounts</th>
                  <th className="num">Value</th>
                  <th className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr
                    key={s.key}
                    className="clickable-row"
                    onClick={() => navigate(`/customers?stage=${encodeURIComponent(s.key)}`)}
                    style={{ cursor: "pointer" }}
                    title={`Filter customers by ${s.key}`}
                  >
                    <td><strong>{s.key}</strong></td>
                    <td className="num">{num(s.accounts)}</td>
                    <td className="num">{rm(s.value)}</td>
                    <td className="num">{pct(s.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid c2">
        <Panel
          title="Recovery Vs Treatment Cost"
          sub="Weekly recovery vs treatment cost trend."
        >
          <LineChartBox
            data={trend}
            xKey="week"
            series={[
              { key: "recovered", label: "Amount Recovered" },
              { key: "cost", label: "Treatment Cost" },
            ]}
            fmt={rmCompact}
            height={250}
            onClick={() => navigate("/performance")}
            hint="View Performance →"
          />
        </Panel>

        <Panel
          title="Top Areas By Arrears Value"
          sub="11 Malaysian states plus federal territories breakdown. Click any bar to inspect accounts."
        >
          <BarChartBox
            data={areaRows.slice(0, 8).map((a) => ({ name: a.area, value: a.value }))}
            xKey="name"
            yKey="value"
            fmt={rmCompact}
            horizontal
            height={270}
            onBarClick={(entry) => navigate(`/customers?area=${encodeURIComponent(entry.name)}`)}
            hint="Click state to inspect customers →"
          />
          <p style={{ marginTop: 10, fontSize: 12.5 }}>
            <Link to="/geography">Full 11 States + Federal Territories Breakdown →</Link>
          </p>
        </Panel>
      </div>

      <div className="grid c2">
        <Panel title="Latest KPIs" sub={`Week ${shortPeriod(latestKpi.week || "")}`}>
          <div className="table-wrap">
            <table>
              <tbody>
                {[
                  ["Contactability Rate", latestKpi.contactabilityRate, settings.targets.contactabilityRate],
                  ["Response Rate", latestKpi.responseRate, null],
                  ["Conversion To Payment", latestKpi.conversionRate, settings.targets.conversionRate],
                  ["Promise-Kept Rate", latestKpi.promiseKeptRate, settings.targets.promiseKeptRate],
                  ["Instalment Adherence", latestKpi.instalmentAdherence, null],
                ].map(([label, v, target]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num"><strong>{pct(v || 0)}</strong></td>
                    <td className="num" style={{ width: 96 }}>
                      {target != null && (
                        <Badge tone={(v || 0) >= target ? "ok" : "warn"}>
                          {(v || 0) >= target ? "on target" : "below"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontSize: 12.5 }}>
            <Link to="/performance">Full Performance View →</Link>
          </p>
        </Panel>

        <Panel title="Recent Voice AI Calls" sub="Live telemetry and call history.">
          {voice.loading && <p className="empty-note">Loading calls…</p>}
          {voice.error && (
            <p className="empty-note">Service unreachable — {voice.error}</p>
          )}
          {!voice.loading && !voice.error && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Assistant</th>
                    <th className="num">Duration</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {voice.rows.slice(0, 6).map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.startedDate)}</td>
                      <td>{r.assistantName || "—"}</td>
                      <td className="num">{Math.round(r.duration)}s</td>
                      <td className="num">{usd(r.cost)}</td>
                    </tr>
                  ))}
                  {!voice.rows.length && (
                    <tr><td colSpan={4} className="empty-note">No calls on this account yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 10, fontSize: 12.5 }}>
            <Link to="/voice-ai">Full Call Logs And Recordings →</Link>
          </p>
        </Panel>
      </div>
    </>
  );
}
