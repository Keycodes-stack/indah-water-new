import { useMemo, useState } from "react";

import { useData } from "../db/store.jsx";
import { complianceSummary } from "../db/selectors.js";
import { num, pct, fmtDate, shortPeriod } from "../lib/format.js";
import { Stats, Panel, Badge, Meter, EmptyState } from "../components/ui.jsx";
import { LineChartBox, BarChartBox } from "../components/charts.jsx";

export default function Compliance() {
  const { compliance, settings } = useData();
  const targets = settings.targets;
  const policy = settings.contactPolicy;

  const summary = useMemo(
    () => complianceSummary(compliance, targets),
    [compliance, targets]
  );

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const complaints = useMemo(() => {
    return compliance.complaints.filter(
      (c) => (!status || c.status === status) && (!category || c.category === category)
    );
  }, [compliance.complaints, status, category]);

  const categories = useMemo(
    () => [...new Set(compliance.complaints.map((c) => c.category))].sort(),
    [compliance.complaints]
  );

  const trend = summary.monthly.map((m) => ({
    month: shortPeriod(m.month),
    per1000: m.complaintsPer1000,
    complaints: m.complaints,
    postPayment: m.postPaymentContacts,
  }));

  /* Post-payment contact has a zero target — it is the trust metric, so it
     gets its own card and an explicit pass/fail rather than a rate. */
  const postPaymentClean = summary.latest.postPaymentContacts === 0;

  return (
    <>
      <Stats cards={[
        {
          label: "Complaints / 1,000",
          value: (summary.latest.complaintsPer1000 ?? 0).toFixed(2),
          sub: summary.withinTarget
            ? `within target of ${targets.complaintsPer1000}`
            : `above target of ${targets.complaintsPer1000}`,
          tone: summary.withinTarget ? "good" : "bad",
        },
        {
          label: "Post-payment contacts",
          value: num(summary.latest.postPaymentContacts ?? 0),
          sub: postPaymentClean ? "target of zero met" : "target is zero — breach",
          tone: postPaymentClean ? "good" : "bad",
        },
        {
          label: "Frequency cap breaches",
          value: num(summary.capBreaches),
          sub: `cap is ${policy.maxContactsPerWeek}/week, ${policy.maxContactsPerDay}/day`,
          tone: summary.capBreaches === 0 ? "good" : undefined,
        },
        {
          label: "Quiet-hours breaches",
          value: num(summary.quietBreaches),
          sub: `quiet ${policy.quietHoursStart}–${policy.quietHoursEnd}`,
          tone: summary.quietBreaches === 0 ? "good" : undefined,
        },
      ]} />

      <div className="callout">
        <strong>Post-payment contact is the critical trust metric.</strong> Contacting
        someone after they have already paid is the fastest way to lose confidence in
        the whole programme, so the target is zero — not a rate.
      </div>

      <div className="grid wide-left">
        <Panel
          title="Complaints per 1,000 contacts"
          sub="Normalised against actual contact volume, so campaign scale-up does not flatter the number."
        >
          <LineChartBox
            data={trend}
            xKey="month"
            series={[{ key: "per1000", label: "Complaints per 1,000 contacts" }]}
            fmt={(v) => v.toFixed(2)}
            height={260}
          />
          <p className="empty-note" style={{ marginTop: 8 }}>
            Target is {targets.complaintsPer1000} per 1,000. Programme average is{" "}
            {summary.complaintsPer1000.toFixed(2)} across{" "}
            {num(summary.totalContacts)} contacts.
          </p>
        </Panel>

        <Panel title="Conduct adherence" sub="Latest month.">
          <Meter
            label="Quiet-hours adherence"
            value={summary.latest.quietHoursAdherence || 0}
            display={pct(summary.latest.quietHoursAdherence || 0, 2)}
            tone="good"
          />
          <Meter
            label="Frequency-cap adherence"
            value={summary.latest.frequencyCapAdherence || 0}
            display={pct(summary.latest.frequencyCapAdherence || 0, 2)}
            tone="good"
          />

          <h4 style={{ marginTop: 18 }}>Active suppression rules</h4>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>Post-payment block</td>
                  <td className="num"><Badge tone="ok">{policy.postPaymentContactBlockHours}h</Badge></td>
                </tr>
                <tr>
                  <td>Open dispute</td>
                  <td className="num">
                    <Badge tone={policy.suppressOnOpenDispute ? "ok" : "err"}>
                      {policy.suppressOnOpenDispute ? "Suppressed" : "Off"}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td>Deceased estate</td>
                  <td className="num">
                    <Badge tone={policy.suppressOnDeceasedEstate ? "ok" : "err"}>
                      {policy.suppressOnDeceasedEstate ? "Suppressed" : "Off"}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid c2">
        <Panel title="Post-payment contact incidents" sub="Monthly count against a zero target.">
          <BarChartBox
            data={trend.map((t) => ({ name: t.month, value: t.postPayment }))}
            xKey="name" yKey="value" fmt={num} label
            color="var(--critical)"
            height={230}
          />
          <p className="empty-note" style={{ marginTop: 8 }}>
            {summary.postPaymentTotal === 0
              ? "No post-payment contact recorded in the window."
              : `${summary.postPaymentTotal} incident(s) recorded — each one is investigated individually.`}
          </p>
        </Panel>

        <Panel title="Monthly conduct summary" sub="Contacts, complaints and breaches by month.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num">Contacts</th>
                  <th className="num">Complaints</th>
                  <th className="num">Per 1,000</th>
                  <th className="num">Post-payment</th>
                  <th className="num">Cap</th>
                  <th className="num">Quiet</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthly.map((m) => (
                  <tr key={m.month}>
                    <td className="nowrap">{shortPeriod(m.month)}</td>
                    <td className="num">{num(m.contacts)}</td>
                    <td className="num">{num(m.complaints)}</td>
                    <td className="num">
                      <Badge tone={m.complaintsPer1000 <= targets.complaintsPer1000 ? "ok" : "warn"}>
                        {m.complaintsPer1000.toFixed(2)}
                      </Badge>
                    </td>
                    <td className="num">
                      <Badge tone={m.postPaymentContacts === 0 ? "ok" : "err"}>
                        {m.postPaymentContacts}
                      </Badge>
                    </td>
                    <td className="num">{m.frequencyCapBreaches}</td>
                    <td className="num">{m.quietHoursBreaches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="Complaint register"
        sub={`${num(complaints.length)} of ${num(compliance.complaints.length)} complaints`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
                    style={{ padding: "7px 9px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
                    style={{ padding: "7px 9px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
              <option value="">All statuses</option>
              <option value="Resolved">Resolved</option>
              <option value="In Review">In Review</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Date</th>
                <th>Account</th>
                <th>Area</th>
                <th>Channel</th>
                <th>Category</th>
                <th>Status</th>
                <th>Upheld</th>
              </tr>
            </thead>
            <tbody>
              {complaints.slice(0, 60).map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td className="nowrap">{fmtDate(c.date)}</td>
                  <td className="mono dim">{c.customerId}</td>
                  <td>{c.area}</td>
                  <td>{c.channel}</td>
                  <td>{c.category}</td>
                  <td>
                    <Badge tone={c.status === "Resolved" ? "ok" : c.status === "Escalated" ? "err" : "warn"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td>{c.upheld ? <Badge tone="err">Upheld</Badge> : <span className="dim">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!complaints.length && <EmptyState title="No complaints match">Try clearing the filters.</EmptyState>}
        {complaints.length > 60 && (
          <p className="empty-note" style={{ marginTop: 10 }}>
            Showing the 60 most recent of {num(complaints.length)} matching complaints.
          </p>
        )}
      </Panel>
    </>
  );
}
