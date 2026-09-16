import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import {
  byCategory, byStage, bookSummary, movementSeries, STAGES, ageingSplit,
} from "../db/selectors.js";
import { rm, rmCompact, num, pct, shortPeriod } from "../lib/format.js";
import { Stats, Panel } from "../components/ui.jsx";
import {
  BarChartBox, Legend, SERIES, seqFill,
} from "../components/charts.jsx";

export default function BookPosition() {
  const navigate = useNavigate();
  const { customers, movements } = useData();

  const book = useMemo(() => bookSummary(customers), [customers]);
  const cats = useMemo(() => byCategory(customers), [customers]);
  const stages = useMemo(() => byStage(customers), [customers]);
  const ageing = useMemo(() => ageingSplit(customers), [customers]);
  const movement = useMemo(() => movementSeries(movements), [movements]);

  const latest = movements[movements.length - 1];

  /* Transition matrix: from-stage x to-stage, value = accounts moved.
     Heat is a true sequential encoding, so the blue ramp is right here. */
  const matrix = useMemo(() => {
    if (!latest) return { cols: [], rows: [], max: 0 };
    const cols = [...STAGES.slice(1), "Resolved/Paid"];
    const rows = STAGES.map((from) => ({
      from,
      cells: cols.map(
        (to) =>
          latest.transitions.find((t) => t.from === from && t.to === to)?.accounts || 0
      ),
    }));
    const max = Math.max(1, ...rows.flatMap((r) => r.cells));
    return { cols, rows, max };
  }, [latest]);

  const catMax = Math.max(...cats.map((c) => c.value), 1);

  return (
    <>
      <Stats cards={[
        { label: "Total Arrears", value: rmCompact(book.totalArrears), sub: `${num(book.accounts)} accounts` },
        { label: "Overdue", value: rmCompact(book.overdueValue), sub: `${num(book.overdueAccounts)} accounts past due` },
        { label: "Avg Days Overdue", value: Math.round(book.avgDaysOverdue), sub: "across overdue accounts" },
        { label: "Avg Balance", value: rm(book.accounts ? book.totalArrears / book.accounts : 0), sub: "per account" },
      ]} />

      <div className="grid c2">
        <Panel
          title="Arrears By Customer Category"
          sub="Value and account count across the three customer categories (Domestic, Commercial, Industrial). Click any category to view customer records."
        >
          <BarChartBox
            data={cats.map((c) => ({ name: c.key, value: c.value }))}
            xKey="name" yKey="value" fmt={rmCompact} colorByIndex height={240}
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
                  <th className="num">Avg</th>
                  <th className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr
                    key={c.key}
                    onClick={() => navigate(`/customers?category=${encodeURIComponent(c.key)}`)}
                    style={{ cursor: "pointer" }}
                    title={`Filter customers by ${c.key}`}
                  >
                    <td><strong>{c.key}</strong></td>
                    <td className="num">{num(c.accounts)}</td>
                    <td className="num">{rm(c.value)}</td>
                    <td className="num">{rm(c.avg)}</td>
                    <td className="num">{pct(c.share)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{num(book.accounts)}</td>
                  <td className="num">{rm(book.totalArrears)}</td>
                  <td className="num">{rm(book.accounts ? book.totalArrears / book.accounts : 0)}</td>
                  <td className="num">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        <Panel
          title="Stage Distribution"
          sub="How many accounts sit in each ladder stage, and what they are worth. Click any bar to view customers."
        >
          <BarChartBox
            data={stages.map((s) => ({ name: s.key, value: s.accounts }))}
            xKey="name" yKey="value" fmt={num} horizontal label height={240}
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
                  <th className="num">Share of Value</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.key}>
                    <td>{s.key}</td>
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
          title="Movement Between Stages Over Time"
          sub="Accounts ageing into a later stage versus converting out through payment."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="num">Aged In</th>
                  <th className="num">Converted Out</th>
                  <th className="num">Net</th>
                  <th className="num">Value Resolved</th>
                </tr>
              </thead>
              <tbody>
                {movement.map((m) => (
                  <tr key={m.period}>
                    <td>{shortPeriod(m.period)}</td>
                    <td className="num">{num(m.agedIn)}</td>
                    <td className="num">{num(m.convertedOut)}</td>
                    <td className="num" style={{ color: m.net > 0 ? "var(--critical)" : "var(--good)", fontWeight: 700 }}>
                      {m.net > 0 ? "+" : ""}{num(m.net)}
                    </td>
                    <td className="num">{rm(m.valueResolved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="empty-note" style={{ marginTop: 8 }}>
            A positive net means the book is ageing faster than it is being resolved.
          </p>
        </Panel>

        <Panel
          title="Ageing Profile"
          sub="Value of the book by days overdue. Click to view Customer accounts."
        >
          <BarChartBox
            data={ageing.map((a) => ({ name: a.bucket, value: a.value }))}
            xKey="name" yKey="value" fmt={rmCompact} height={240}
            onBarClick={() => navigate("/customers")}
            hint="Click to inspect in Customers →"
          />
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Days Overdue</th>
                  <th className="num">Accounts</th>
                  <th className="num">Value</th>
                </tr>
              </thead>
              <tbody>
                {ageing.map((a) => (
                  <tr key={a.bucket}>
                    <td>{a.bucket}</td>
                    <td className="num">{num(a.accounts)}</td>
                    <td className="num">{rm(a.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title={`Stage Transition Matrix — ${shortPeriod(latest?.period || "")}`}
        sub="Accounts moving from each stage (row) to the next position (column). Darker means more accounts."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>From \ To</th>
                {matrix.cols.map((c) => <th key={c} className="num">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.from}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.from}</td>
                  {r.cells.map((v, i) => {
                    if (!v) return <td key={i} className="num dim">—</td>;
                    const { background, onDark } = seqFill(v / matrix.max);
                    return (
                      <td key={i} className={`heat${onDark ? " on-dark" : ""}`} style={{ background }}>
                        {num(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
