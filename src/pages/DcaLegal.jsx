import { useMemo } from "react";

import { useData } from "../db/store.jsx";
import { rm, rmUnit, rmCompact, num, pct, fmtDate } from "../lib/format.js";
import { Stats, Panel, Badge, CellBar } from "../components/ui.jsx";
import { BarChartBox, GroupedBarBox, Legend, SERIES } from "../components/charts.jsx";

export default function DcaLegal() {
  const { customers, agencies, settings } = useData();
  const { agencies: list, recalls, legal } = agencies;

  /* Placement counts come from the live customer book, so deleting a placed
     account moves these numbers too. */
  const placedNow = useMemo(
    () => customers.filter((c) => c.dcaPlacement),
    [customers]
  );

  const placedByAgency = useMemo(() => {
    const m = new Map();
    placedNow.forEach((c) => {
      const id = c.dcaPlacement.agencyId;
      if (!m.has(id)) m.set(id, { accounts: 0, value: 0 });
      const e = m.get(id);
      e.accounts += 1;
      e.value += c.arrearsAmount;
    });
    return m;
  }, [placedNow]);

  const rows = list.map((a) => {
    const live = placedByAgency.get(a.id) || { accounts: 0, value: 0 };
    return {
      ...a,
      liveAccounts: live.accounts,
      liveValue: live.value,
      recovered: live.value * a.collectionRate,
    };
  });

  const totalPlacedValue = rows.reduce((s, r) => s + r.liveValue, 0);
  const totalRecovered = rows.reduce((s, r) => s + r.recovered, 0);
  const sameDayRecalls = recalls.filter((r) => r.sameDay).length;

  const placementCost =
    placedNow.length * (Number(settings.channelCosts["DCA Placement"]) || 0);
  const legalCost =
    legal.demandPacksGenerated * (Number(settings.channelCosts["Legal Demand Pack"]) || 0);

  const maxComplaint = Math.max(...rows.map((r) => r.complaintsPer1000), 0.1);

  return (
    <>
      <Stats cards={[
        {
          label: "Accounts placed",
          value: num(placedNow.length),
          sub: `${rmCompact(totalPlacedValue)} with agencies`,
        },
        {
          label: "Recovered by DCAs",
          value: rmCompact(totalRecovered),
          sub: `${pct(totalPlacedValue ? totalRecovered / totalPlacedValue : 0)} of placed value`,
          tone: "good",
        },
        {
          label: "Same-day recalls",
          value: num(sameDayRecalls),
          sub: `of ${num(recalls.length)} payment-triggered recalls`,
        },
        {
          label: "Placement + legal cost",
          value: rmCompact(placementCost + legalCost),
          sub: `${rmUnit(settings.channelCosts["DCA Placement"])} per placement`,
        },
      ]} />

      <div className="callout">
        <strong>s.88(2)</strong> refers to {legal.statuteReference}. Demand packs are
        generated only after the formal ladder stage has been exhausted.
      </div>

      <Panel
        title="Agency placement performance"
        sub="Contact rate, collection rate and complaint incidence per agency."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agency</th>
                <th className="num">Accounts placed</th>
                <th className="num">Value placed</th>
                <th className="num">Contact rate</th>
                <th className="num">Collection rate</th>
                <th className="num">Recovered</th>
                <th className="num">Same-day recalls</th>
                <th className="num" style={{ minWidth: 170 }}>Complaints / 1,000</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const agencyCost = r.liveAccounts * (Number(settings.channelCosts["DCA Placement"]) || 150);
                const agencyRoi = agencyCost > 0 ? (r.recovered / agencyCost).toFixed(1) : "0";
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong>{r.name}</strong>
                      <div className="mono dim" style={{ fontSize: 11 }}>
                        {r.id} · since {fmtDate(r.activeSince)}
                      </div>
                    </td>
                    <td className="num">{num(r.liveAccounts)}</td>
                    <td className="num">{rm(r.liveValue)}</td>
                    <td className="num">
                      <Badge tone={r.contactRate >= 0.6 ? "ok" : r.contactRate >= 0.5 ? "warn" : "err"}>
                        {pct(r.contactRate)}
                      </Badge>
                    </td>
                    <td className="num">
                      <Badge tone={r.collectionRate >= 0.2 ? "ok" : r.collectionRate >= 0.14 ? "warn" : "err"}>
                        {pct(r.collectionRate)}
                      </Badge>
                    </td>
                    <td className="num"><strong>{rm(r.recovered)}</strong></td>
                    <td className="num">{num(r.sameDayRecalls)}</td>
                    <td className="num">
                      <CellBar
                        value={r.complaintsPer1000}
                        max={maxComplaint}
                        color={r.complaintsPer1000 > 1.5 ? "var(--critical)" : "var(--series-3)"}
                      >
                        {r.complaintsPer1000.toFixed(2)}
                      </CellBar>
                    </td>
                    <td className="num">
                      <Badge tone={r.collectionRate >= 0.18 ? "ok" : r.collectionRate >= 0.16 ? "info" : "warn"}>
                        {agencyRoi}×
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{num(placedNow.length)}</td>
                <td className="num">{rm(totalPlacedValue)}</td>
                <td className="num" />
                <td className="num" />
                <td className="num">{rm(totalRecovered)}</td>
                <td className="num">{num(rows.reduce((s, r) => s + r.sameDayRecalls, 0))}</td>
                <td className="num" />
                <td className="num">
                  <Badge tone="ok">
                    {placementCost > 0 ? (totalRecovered / placementCost).toFixed(1) + "×" : "—"}
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="empty-note" style={{ marginTop: 10 }}>
          Complaint incidence is tracked per agency because conduct risk does not sit
          evenly across panels — a high collection rate does not excuse it.
        </p>
      </Panel>

      <div className="grid c2">
        <Panel title="Placed value by agency" sub="Live from the customer book.">
          <BarChartBox
            data={rows.map((r) => ({ name: r.name.split(" ")[0], value: r.liveValue }))}
            xKey="name" yKey="value" fmt={rmCompact} colorByIndex height={240}
          />
          <Legend items={rows.map((r, i) => ({ label: r.name, color: SERIES[i % SERIES.length] }))} />
        </Panel>

        <Panel
          title="Legal pipeline"
          sub={`Statutory action under ${legal.statuteReference}.`}
        >
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>s.88(2) demand packs generated</td>
                  <td className="num"><strong>{num(legal.demandPacksGenerated)}</strong></td>
                </tr>
                <tr>
                  <td>Demand packs served</td>
                  <td className="num"><strong>{num(legal.demandPacksServed)}</strong></td>
                </tr>
                <tr>
                  <td>Pending legal review</td>
                  <td className="num">
                    <Badge tone="warn">{num(legal.pendingLegalReview)}</Badge>
                  </td>
                </tr>
                <tr>
                  <td>Write-off recommended</td>
                  <td className="num">
                    <Badge tone="warn">{num(legal.writeOffRecommended)}</Badge>
                  </td>
                </tr>
                <tr>
                  <td>Write-off approved</td>
                  <td className="num">
                    <Badge tone="ok">{num(legal.writeOffApproved)}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="empty-note" style={{ marginTop: 10 }}>
            {num(legal.pendingLegalReview + legal.writeOffRecommended)} decisions are
            awaiting sign-off.
          </p>
        </Panel>
      </div>

      <Panel
        title="Payment-triggered recalls"
        sub="Accounts pulled back from an agency because the customer paid. Same-day recall prevents the single worst conduct failure — chasing someone who has already settled."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Agency</th>
                <th className="num">Amount paid</th>
                <th>Reason</th>
                <th>Recall speed</th>
              </tr>
            </thead>
            <tbody>
              {recalls.slice(0, 40).map((r, i) => (
                <tr key={`${r.customerId}-${i}`}>
                  <td className="nowrap">{fmtDate(r.date)}</td>
                  <td className="mono dim">{r.customerId}</td>
                  <td>{list.find((a) => a.id === r.agencyId)?.name || r.agencyId}</td>
                  <td className="num">{rm(r.amountPaid)}</td>
                  <td>{r.reason}</td>
                  <td>
                    <Badge tone={r.sameDay ? "ok" : "warn"}>
                      {r.sameDay ? "Same day" : "Next day"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recalls.length > 40 && (
          <p className="empty-note" style={{ marginTop: 10 }}>
            Showing the 40 most recent of {num(recalls.length)} recalls.
          </p>
        )}
      </Panel>
    </>
  );
}
