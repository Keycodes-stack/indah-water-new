import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import { bookSummary } from "../db/selectors.js";
import { rm, rmUnit, rmCompact, num, pct, shortPeriod } from "../lib/format.js";
import { Stats, Panel, Meter, Badge } from "../components/ui.jsx";
import { LineChartBox, BarChartBox } from "../components/charts.jsx";

export default function Performance() {
  const navigate = useNavigate();
  const { customers, kpis, settings } = useData();
  const targets = settings.targets;

  const book = useMemo(() => bookSummary(customers), [customers]);
  const latest = kpis[kpis.length - 1] || {};
  const first = kpis[0] || {};

  const totals = useMemo(() => {
    const recovered = kpis.reduce((s, k) => s + k.amountRecovered, 0);
    const cost = kpis.reduce((s, k) => s + k.treatmentCost, 0);
    const converted = kpis.reduce((s, k) => s + k.accountsConverted, 0);
    return {
      recovered, cost, converted,
      costPerRinggit: recovered ? cost / recovered : 0,
    };
  }, [kpis]);

  const series = kpis.map((k) => ({
    week: shortPeriod(k.week),
    contactability: k.contactabilityRate,
    response: k.responseRate,
    conversion: k.conversionRate,
    promiseKept: k.promiseKeptRate,
    adherence: k.instalmentAdherence,
    recovered: k.amountRecovered,
    costPerRinggit: k.costPerRinggitRecovered,
  }));

  const delta = (key) => {
    const a = first[key] || 0;
    const b = latest[key] || 0;
    return b - a;
  };

  const deltaLabel = (key) => {
    const d = delta(key);
    return `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)}pp since week 1`;
  };

  return (
    <>
      <Stats cards={[
        {
          label: "Amount recovered",
          value: rmCompact(totals.recovered),
          sub: `${num(totals.converted)} accounts converted`,
          tone: "good",
        },
        {
          label: "Cost per RM recovered",
          value: rmUnit(totals.costPerRinggit),
          sub: totals.costPerRinggit <= targets.costPerRinggitRecovered
            ? "within target"
            : `target ${rm(targets.costPerRinggitRecovered)}`,
          tone: totals.costPerRinggit <= targets.costPerRinggitRecovered ? "good" : "bad",
        },
        {
          label: "Conversion to payment",
          value: pct(latest.conversionRate || 0),
          sub: deltaLabel("conversionRate"),
          tone: delta("conversionRate") >= 0 ? "good" : "bad",
        },
        {
          label: "Promise-kept rate",
          value: pct(latest.promiseKeptRate || 0),
          sub: deltaLabel("promiseKeptRate"),
          tone: delta("promiseKeptRate") >= 0 ? "good" : "bad",
        },
      ]} />

      <div className="callout">
        <strong>Performance KPIs.</strong> These are the operational measures defined and carried into the standing operational dashboard.
      </div>

      <div className="grid wide-left">
        <Panel
          title="KPI trend"
          sub="Weekly rates over time. All five are proportions on one shared axis."
        >
          <LineChartBox
            data={series}
            xKey="week"
            series={[
              { key: "contactability", label: "Contactability" },
              { key: "response", label: "Response" },
              { key: "conversion", label: "Conversion to payment" },
              { key: "promiseKept", label: "Promise kept" },
            ]}
            fmt={(v) => pct(v, 0)}
            domain={[0, 1]}
            height={300}
          />
        </Panel>

        <Panel title="Against target" sub="Latest week versus configured targets.">
          <Meter
            label="Contactability rate"
            value={latest.contactabilityRate}
            display={pct(latest.contactabilityRate || 0)}
            target={targets.contactabilityRate}
            tone={(latest.contactabilityRate || 0) >= targets.contactabilityRate ? "good" : "warn"}
          />
          <Meter
            label="Conversion to payment"
            value={latest.conversionRate}
            display={pct(latest.conversionRate || 0)}
            target={targets.conversionRate}
            tone={(latest.conversionRate || 0) >= targets.conversionRate ? "good" : "warn"}
          />
          <Meter
            label="Promise-kept rate"
            value={latest.promiseKeptRate}
            display={pct(latest.promiseKeptRate || 0)}
            target={targets.promiseKeptRate}
            tone={(latest.promiseKeptRate || 0) >= targets.promiseKeptRate ? "good" : "warn"}
          />
          <Meter
            label="Instalment adherence"
            value={latest.instalmentAdherence}
            display={pct(latest.instalmentAdherence || 0)}
            tone="good"
          />

          <h4 style={{ marginTop: 18 }}>From the live book</h4>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>Promises outstanding</td>
                  <td className="num"><strong>{num(book.promisesOutstanding)}</strong></td>
                </tr>
                <tr>
                  <td>Promise-kept (book)</td>
                  <td className="num"><strong>{pct(book.promiseKeptRate)}</strong></td>
                </tr>
                <tr>
                  <td>Active instalment plans</td>
                  <td className="num"><strong>{num(book.instalmentPlans)}</strong></td>
                </tr>
                <tr>
                  <td>Plan adherence (book)</td>
                  <td className="num"><strong>{pct(book.instalmentAdherence)}</strong></td>
                </tr>
                <tr>
                  <td>Contactable accounts</td>
                  <td className="num"><strong>{pct(book.contactableRate)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid c2">
        <Panel title="Amount recovered per week" sub="RM collected, by week. Click to inspect Treatment channels.">
          <BarChartBox
            data={series.map((s) => ({ name: s.week, value: s.recovered }))}
            xKey="name" yKey="value" fmt={rmCompact} height={250}
            onBarClick={() => navigate("/treatment")}
            hint="Click to open Treatment & Channels →"
          />
        </Panel>

        <Panel
          title="Cost per ringgit recovered"
          sub="Treatment spend divided by amount collected — lower is better. Click to inspect Treatment spend."
        >
          <LineChartBox
            data={series}
            xKey="week"
            series={[{ key: "costPerRinggit", label: "Cost per RM recovered" }]}
            fmt={(v) => rmUnit(v)}
            height={250}
            onClick={() => navigate("/treatment")}
            hint="Click to open Treatment & Channels →"
          />
        </Panel>
      </div>

      <Panel title="Weekly detail" sub="Every KPI, week by week.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th className="num">Contacts</th>
                <th className="num">Contactability</th>
                <th className="num">Response</th>
                <th className="num">Conversion</th>
                <th className="num">Promise kept</th>
                <th className="num">Adherence</th>
                <th className="num">Recovered</th>
                <th className="num">Cost</th>
                <th className="num">Cost / RM</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => {
                const roiMultiple = k.treatmentCost > 0 ? k.amountRecovered / k.treatmentCost : 0;
                return (
                  <tr key={k.week}>
                    <td className="nowrap">{shortPeriod(k.week)}</td>
                    <td className="num">{num(k.contactsSent)}</td>
                    <td className="num">{pct(k.contactabilityRate)}</td>
                    <td className="num">{pct(k.responseRate)}</td>
                    <td className="num">{pct(k.conversionRate)}</td>
                    <td className="num">{pct(k.promiseKeptRate)}</td>
                    <td className="num">{pct(k.instalmentAdherence)}</td>
                    <td className="num">{rm(k.amountRecovered)}</td>
                    <td className="num">{rm(k.treatmentCost)}</td>
                    <td className="num">
                      <Badge tone={k.costPerRinggitRecovered <= targets.costPerRinggitRecovered ? "ok" : "warn"}>
                        {rmUnit(k.costPerRinggitRecovered)}
                      </Badge>
                    </td>
                    <td className="num">
                      <Badge tone={roiMultiple >= 18 ? "ok" : roiMultiple >= 14 ? "info" : "warn"}>
                        {roiMultiple.toFixed(1)}×
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{num(kpis.reduce((s, k) => s + k.contactsSent, 0))}</td>
                <td className="num" colSpan={5} />
                <td className="num">{rm(totals.recovered)}</td>
                <td className="num">{rm(totals.cost)}</td>
                <td className="num">{rmUnit(totals.costPerRinggit)}</td>
                <td className="num">
                  <Badge tone="ok">
                    {(totals.cost > 0 ? totals.recovered / totals.cost : 0).toFixed(1)}×
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
