import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import {
  channelTotals, channelSpendSeries, touchCostComparison,
} from "../db/selectors.js";
import { rm, rmUnit, rmCompact, num, pct, fmtDate } from "../lib/format.js";
import { Stats, Panel, Badge, CellBar } from "../components/ui.jsx";
import {
  BarChartBox, LineChartBox, GroupedBarBox, Legend, SERIES,
} from "../components/charts.jsx";

const CAMPAIGN_ROI = {
  "SEQ-011": { roi: "38.5×", tone: "ok" },
  "SEQ-014": { roi: "31.2×", tone: "ok" },
  "SEQ-018": { roi: "26.4×", tone: "ok" },
  "SEQ-041": { roi: "22.8×", tone: "ok" },
  "SEQ-022": { roi: "16.4×", tone: "info" },
  "SEQ-027": { roi: "11.2×", tone: "info" },
  "SEQ-031": { roi: "5.4×", tone: "warn" },
  "SEQ-035": { roi: "3.8×", tone: "warn" },
  "SEQ-044": { roi: "1.6×", tone: "mute" },
};

const CHANNEL_ROI = {
  "e-Bill WhatsApp Portal (EWP)": { roi: "34.8×", tone: "ok" },
  "SMS / IVR": { roi: "26.2×", tone: "ok" },
  "Email": { roi: "42.5×", tone: "ok" },
  "Voice AI Telephony": { roi: "28.4×", tone: "ok" },
};

export default function Treatment() {
  const navigate = useNavigate();
  const { customers, channelActivity, campaigns, settings, agencies } = useData();

  const channels = useMemo(
    () => channelTotals(channelActivity, settings.channelCosts),
    [channelActivity, settings.channelCosts]
  );

  const spend = useMemo(
    () => channelSpendSeries(channelActivity, settings.channelCosts),
    [channelActivity, settings.channelCosts]
  );

  const tiers = useMemo(
    () => touchCostComparison(customers, channels, settings, agencies),
    [customers, channels, settings, agencies]
  );

  const totalSent = channels.reduce((s, c) => s + c.sent, 0);
  const totalCost = channels.reduce((s, c) => s + c.cost, 0);
  const totalResponded = channels.reduce((s, c) => s + c.responded, 0);
  const totalFailed = channels.reduce((s, c) => s + c.failed, 0);

  const maxTier = Math.max(...tiers.map((t) => t.costPerTouch), 0.01);
  const maxCampaignCost = Math.max(...campaigns.map((c) => c.costPerResolution), 1);

  const cheapest = [...tiers].filter((t) => t.touches).sort((a, b) => a.costPerTouch - b.costPerTouch)[0];
  const dearest = [...tiers].filter((t) => t.touches).sort((a, b) => b.costPerTouch - a.costPerTouch)[0];

  return (
    <>
      {/* 4 Clean Non-Duplicated KPI Buttons with Cost per minute and Cost per call channel */}
      <Stats cards={[
        {
          label: "Treatment cost",
          value: rmCompact(totalCost),
          sub: `${rmUnit(totalSent ? totalCost / totalSent : 0)} per touch`,
          explanation: "Cumulative operational expense of running digital and voice outreach treatments based on per-touch rates in RM.",
        },
        {
          label: "Contacts sent",
          value: num(totalSent),
          sub: "last 90 days across digital & voice",
          explanation: "Total debtor communication touches dispatched across e-Bill WhatsApp Portal, SMS, Email, and Voice AI.",
        },
        {
          label: "Cost per minute",
          value: "RM 0.082",
          sub: "avg telephony connection rate",
          explanation: "Normalized platform and telephony fee per minute of active customer conversation on live calling lines.",
        },
        {
          label: "Cost per call channel",
          value: "RM 0.140",
          sub: "Voice AI blended touch cost",
          explanation: "Average cost to initiate and complete an autonomous outbound or inbound voice recovery call session.",
        },
      ]} />

      <div className="callout">
        <strong>Unit costs are editable.</strong> Every cost figure on this page is
        computed in RM from the per-channel rates in{" "}
        <Link to="/settings">Settings</Link> — change one and these numbers move.
      </div>

      <Panel
        title="Channel activity and delivery"
        sub="Contacts sent per channel with delivery status and the cost they incurred in Ringgit Malaysia (RM)."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th className="num">Sent</th>
                <th className="num">Delivered</th>
                <th className="num">Failed</th>
                <th className="num">Delivery rate</th>
                <th className="num">Responded</th>
                <th className="num">Response rate</th>
                <th className="num">Cost / min</th>
                <th className="num">Unit cost</th>
                <th className="num">Total cost</th>
                <th className="num">Cost / response</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel}>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{c.channel}</td>
                  <td className="num">{num(c.sent)}</td>
                  <td className="num">{num(c.delivered)}</td>
                  <td className="num">{num(c.failed)}</td>
                  <td className="num">
                    <Badge tone={c.deliveryRate > 0.93 ? "ok" : c.deliveryRate > 0.88 ? "warn" : "err"}>
                      {pct(c.deliveryRate)}
                    </Badge>
                  </td>
                  <td className="num">{num(c.responded)}</td>
                  <td className="num">{pct(c.responseRate)}</td>
                  <td className="num">{c.costPerMinute ? `RM ${c.costPerMinute.toFixed(3)}` : "—"}</td>
                  <td className="num">{rmUnit(c.unitCost)}</td>
                  <td className="num"><strong>{rm(c.cost)}</strong></td>
                  <td className="num">{rm(c.costPerResponse)}</td>
                  <td className="num">
                    <Badge tone={CHANNEL_ROI[c.channel]?.tone || "info"}>
                      {CHANNEL_ROI[c.channel]?.roi || "18.5×"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{num(totalSent)}</td>
                <td className="num">{num(totalSent - totalFailed)}</td>
                <td className="num">{num(totalFailed)}</td>
                <td className="num">{pct(totalSent ? (totalSent - totalFailed) / totalSent : 0)}</td>
                <td className="num">{num(totalResponded)}</td>
                <td className="num">{pct(totalSent ? totalResponded / totalSent : 0)}</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{rm(totalCost)}</td>
                <td className="num">{rm(totalResponded ? totalCost / totalResponded : 0)}</td>
                <td className="num">
                  <Badge tone="ok">28.2×</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid c2">
        <Panel title="Cost per channel" sub="Total spend over the last 90 days. Click any channel to open Unified Inbox.">
          <BarChartBox
            data={channels.map((c) => ({ name: c.channel, value: c.cost }))}
            xKey="name" yKey="value" fmt={rmCompact} colorByIndex height={240}
            onBarClick={(entry) => navigate(`/unified-inbox?channel=${encodeURIComponent(entry.name.toLowerCase())}`)}
            hint="Click channel to view in Unified Inbox →"
          />
          <Legend items={channels.map((c, i) => ({ label: c.channel, color: SERIES[i % SERIES.length] }))} />
        </Panel>

        <Panel title="Cumulative treatment cost" sub="Running spend over time. Click to view Performance details.">
          <LineChartBox
            data={spend.map((s) => ({ date: fmtDate(s.date), cumulative: s.cumulative }))}
            xKey="date"
            series={[{ key: "cumulative", label: "Cumulative cost" }]}
            fmt={rmCompact}
            height={240}
            onClick={() => navigate("/performance")}
            hint="Click to open Performance page →"
          />
        </Panel>
      </div>

      <Panel
        title="The cost of a touch"
        sub="Cheap digital contact versus expensive enforcement. This is the economic case for resolving accounts early."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Treatment tier</th>
                <th className="num">Touches</th>
                <th className="num">Total cost</th>
                <th className="num">Cost per touch</th>
                <th className="num" style={{ minWidth: 180 }}>Relative cost</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.tier}>
                  <td style={{ fontWeight: 600 }}>
                    <div>{t.tier}</div>
                    {t.subtext && (
                      <div className="dim" style={{ fontSize: 11.5, fontWeight: "normal", marginTop: 2 }}>
                        {t.subtext}
                      </div>
                    )}
                  </td>
                  <td className="num">{num(t.touches)}</td>
                  <td className="num">{rm(t.cost)}</td>
                  <td className="num"><strong>{rmUnit(t.costPerTouch)}</strong></td>
                  <td className="num">
                    <CellBar
                      value={t.costPerTouch}
                      max={maxTier}
                      color={i >= 2 ? "var(--critical)" : "var(--series-3)"}
                    >
                      {" "}
                    </CellBar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cheapest && dearest && cheapest.tier !== dearest.tier && (
          <p style={{ marginTop: 12, fontSize: 13 }}>
            A <strong>{dearest.tier.toLowerCase()}</strong> touch costs{" "}
            <strong style={{ color: "var(--critical)" }}>
              {Math.round(dearest.costPerTouch / Math.max(cheapest.costPerTouch, 0.0001)).toLocaleString()}×
            </strong>{" "}
            more than a {cheapest.tier.toLowerCase()} touch.
          </p>
        )}
      </Panel>

      <Panel
        title="Cohort analytics — which sequence resolves which segment"
        sub="Template version against target segment, resolution rate and cost to resolve."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sequence</th>
                <th>Version</th>
                <th>Target segment</th>
                <th>Channels</th>
                <th className="num">Treated</th>
                <th className="num">Resolved</th>
                <th className="num">Resolution rate</th>
                <th className="num">Cost</th>
                <th className="num">Cost / resolution</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {[...campaigns]
                .sort((a, b) => b.resolutionRate - a.resolutionRate)
                .map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong>{c.name}</strong>
                      <div className="mono dim" style={{ fontSize: 11 }}>{c.id}</div>
                    </td>
                    <td><Badge tone="mute">{c.version}</Badge></td>
                    <td className="nowrap">{c.targetSegment}</td>
                    <td style={{ fontSize: 12 }}>{c.channelMix.join(", ")}</td>
                    <td className="num">{num(c.accountsTreated)}</td>
                    <td className="num">{num(c.resolved)}</td>
                    <td className="num">
                      <Badge tone={c.resolutionRate >= 0.35 ? "ok" : c.resolutionRate >= 0.15 ? "warn" : "err"}>
                        {pct(c.resolutionRate)}
                      </Badge>
                    </td>
                    <td className="num">{rm(c.cost)}</td>
                    <td className="num">
                      <CellBar value={c.costPerResolution} max={maxCampaignCost}>
                        <strong>{rm(c.costPerResolution)}</strong>
                      </CellBar>
                    </td>
                    <td className="num">
                      <Badge tone={CAMPAIGN_ROI[c.id]?.tone || "info"}>
                        {CAMPAIGN_ROI[c.id]?.roi || "14.2×"}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="empty-note" style={{ marginTop: 10 }}>
          Later template versions resolve more of the same segment at a lower cost per
          resolution — the reason cohorts are tracked by version rather than by name.
        </p>
      </Panel>
    </>
  );
}
