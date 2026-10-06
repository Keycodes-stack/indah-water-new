import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel, Badge, Meter } from "../components/ui.jsx";
import { BarChartBox } from "../components/charts.jsx";
import {
  UsersIcon,
  PhoneIcon,
  PhoneCallIcon,
  AgentIcon,
  WorkflowIcon,
  RefreshIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  DashboardIcon,
  InboxIcon,
  TicketIcon,
  DollarIcon,
  TrendingUpIcon,
} from "../components/icons.jsx";

const WEEKLY_TREND_DATA = [
  { day: "Mon", calls: 180, workflows: 120, agreements: 142 },
  { day: "Tue", calls: 220, workflows: 154, agreements: 185 },
  { day: "Wed", calls: 245, workflows: 178, agreements: 210 },
  { day: "Thu", calls: 210, workflows: 142, agreements: 175 },
  { day: "Fri", calls: 260, workflows: 190, agreements: 240 },
  { day: "Sat", calls: 85, workflows: 52, agreements: 65 },
  { day: "Sun", calls: 48, workflows: 26, agreements: 31 },
];

const AGENT_PERFORMANCE = [
  {
    name: "Hakim AI agent",
    role: "Malay / English Recovery Specialist",
    totalCalls: 542,
    agreementRate: "76.4%",
    avgDuration: "2m 14s",
    sentiment: "POSITIVE (71%)",
    status: "ACTIVE",
    badgeTone: "good",
  },
  {
    name: "Aina AI agent",
    role: "English Hardship & Billing Assistant",
    totalCalls: 486,
    agreementRate: "72.1%",
    avgDuration: "2m 48s",
    sentiment: "POSITIVE (66%)",
    status: "ACTIVE",
    badgeTone: "good",
  },
  {
    name: "Mei Ling AI agent",
    role: "Mandarin Senior Collections Assistant",
    totalCalls: 220,
    agreementRate: "78.9%",
    avgDuration: "1m 58s",
    sentiment: "POSITIVE (74%)",
    status: "ACTIVE",
    badgeTone: "good",
  },
];

const RECENT_FEED = [
  {
    id: "LOG-9821",
    customer: "Ahmad Razak",
    phone: "+6012-3882910",
    zone: "RED",
    intent: "NEGATIVE",
    outcome: "REFUSED_PAYMENT",
    frustration: "HIGH",
    time: "12 mins ago",
    link: "/escalate-panel",
  },
  {
    id: "LOG-9818",
    customer: "Siti Nurhaliza",
    phone: "+6017-8821940",
    zone: "GREY",
    intent: "CONDITIONAL",
    outcome: "NEEDS_INSTALMENTS",
    frustration: "MODERATE",
    time: "28 mins ago",
    link: "/review-panel",
  },
  {
    id: "LOG-9812",
    customer: "Tan Wei Meng",
    phone: "+6016-4428190",
    zone: "GREY",
    intent: "CONDITIONAL",
    outcome: "DISPUTING_BILL",
    frustration: "MODERATE",
    time: "45 mins ago",
    link: "/review-panel",
  },
  {
    id: "LOG-9805",
    customer: "Kavitha Suppiah",
    phone: "+6019-2281049",
    zone: "RED",
    intent: "NEGATIVE",
    outcome: "UNREACHABLE",
    frustration: "SEVERE",
    time: "1 hour ago",
    link: "/escalate-panel",
  },
];

const RECOVERY_DATA = {
  this_month: {
    periodLabel: "September 2026 (This Month)",
    shortLabel: "This Month",
    totalAmount: "RM 485,250",
    casesCount: "3,240",
    targetAchievement: "92.4%",
    growthRate: "↑ +18.5% vs last month",
    avgPerCase: "RM 149.76 / case",
  },
  this_quarter: {
    periodLabel: "Q3 2026 (Jul - Sep)",
    shortLabel: "This Quarter",
    totalAmount: "RM 1,420,800",
    casesCount: "9,580",
    targetAchievement: "94.8%",
    growthRate: "↑ +22.1% vs Q2 2026",
    avgPerCase: "RM 148.31 / case",
  },
  ytd: {
    periodLabel: "Year-To-Date (2026)",
    shortLabel: "YTD 2026",
    totalAmount: "RM 4,850,600",
    casesCount: "32,450",
    targetAchievement: "96.1%",
    growthRate: "↑ +27.4% vs YTD 2025",
    avgPerCase: "RM 149.48 / case",
  },
};

export default function Overview() {
  const navigate = useNavigate();
  const [recoveryPeriod, setRecoveryPeriod] = useState("this_month");
  const currentRecovery = RECOVERY_DATA[recoveryPeriod];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header & Quick Action Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Dashboard Overview</h1>
            <Badge tone="good" style={{ fontSize: 11, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              Live Telemetry Connected
            </Badge>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Real-time analytics, voice AI call metrics, workflow executions, and recovery performance overview.
          </p>
        </div>

        {/* Quick Navigation Action Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/outbound-caller")}
            style={{ fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <PhoneCallIcon size={14} /> Outbound Campaign
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/workflows")}
            style={{ fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <WorkflowIcon size={14} /> Workflow Builder
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/review-panel")}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertTriangleIcon size={14} /> Review Panel (42)
          </button>
          <button
            type="button"
            className="btn-solid"
            onClick={() => navigate("/escalate-panel")}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircleIcon size={14} /> Escalate Panel (18)
          </button>
        </div>
      </div>

      {/* Row 1: Primary Metrics Grid (6 Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {/* Dedicated Recovery KPI Tile */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 4px 20px rgba(16,185,129,0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <DollarIcon size={16} /> Total Recovery
            </span>
            <select
              value={recoveryPeriod}
              onChange={(e) => setRecoveryPeriod(e.target.value)}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
                borderRadius: 6,
                padding: "2px 6px",
                fontSize: 10.5,
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="this_month">This Month</option>
              <option value="this_quarter">Q3 2026</option>
              <option value="ytd">YTD 2026</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", letterSpacing: -0.5 }}>
              {currentRecovery.totalAmount}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, flexWrap: "wrap", gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                {currentRecovery.casesCount} Recovered Cases
              </div>
              <Badge tone="good" style={{ fontSize: 9.5, padding: "2px 6px" }}>
                {currentRecovery.targetAchievement} Target
              </Badge>
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
            <span style={{ color: "#10b981", fontWeight: 700 }}>{currentRecovery.growthRate}</span>
            <span style={{ color: "var(--text-faint)" }}>Period: {currentRecovery.shortLabel}</span>
          </div>
        </div>

        {/* Total Customers */}
        <div
          onClick={() => navigate("/customers")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Total Customers
            </span>
            <UsersIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>14,850</div>
          <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700, marginTop: 4 }}>
            ↑ +340 new accounts this month
          </div>
        </div>

        {/* Calls Made (This Week) */}
        <div
          onClick={() => navigate("/call-logs")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Calls Made (This Week)
            </span>
            <PhoneIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>1,248</div>
          <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700, marginTop: 4 }}>
            ↑ 14% vs previous week
          </div>
        </div>

        {/* Active Agents */}
        <div
          onClick={() => navigate("/voice-agents")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Active AI Agents
            </span>
            <AgentIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>3 Agents</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>
            Hakim, Aina, Mei Ling (100% Online)
          </div>
        </div>

        {/* Active Workflows */}
        <div
          onClick={() => navigate("/workflows")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Active Workflows
            </span>
            <WorkflowIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>4 Active</div>
          <div style={{ fontSize: 11.5, color: "var(--brand)", fontWeight: 700, marginTop: 4 }}>
            +1 Draft Workflow in Builder
          </div>
        </div>

        {/* Workflows Run (This Week) */}
        <div
          onClick={() => navigate("/workflows")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Workflows Run (This Week)
            </span>
            <RefreshIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>862 Runs</div>
          <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700, marginTop: 4 }}>
            99.2% execution success rate
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Performance Grid (5 Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {/* Positive (Customer) */}
        <div
          onClick={() => navigate("/call-logs")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Positive (Customer)
            </span>
            <TicketIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>68.4%</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>
            854 Positive Intent Customers
          </div>
        </div>

        {/* In Review (Grey Zone) */}
        <div
          onClick={() => navigate("/review-panel")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              In Review (Grey Zone)
            </span>
            <AlertTriangleIcon size={20} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>42 Cases</div>
          <div style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 700, marginTop: 4 }}>
            Hardship &amp; Dispute verification
          </div>
        </div>

        {/* Escalated (Red Zone) */}
        <div
          onClick={() => navigate("/escalate-panel")}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Escalated (Red Zone)
            </span>
            <AlertCircleIcon size={20} style={{ color: "#ef4444" }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>18 Cases</div>
          <div style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700, marginTop: 4 }}>
            Legal pre-notice &amp; DND action
          </div>
        </div>

        {/* Outreach Made (This Week) */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Outreach Made (This Week)
            </span>
            <InboxIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>3,420</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>
            SMS, Email &amp; WhatsApp Touchpoints
          </div>
        </div>

        {/* Conversions & Debt Recovery */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Conversions &amp; PTP
            </span>
            <DashboardIcon size={20} className="text-muted" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981" }}>RM 485,200</div>
          <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700, marginTop: 4 }}>
            74.2% Agreement &amp; PTP Rate
          </div>
        </div>
      </div>

      {/* Row 3: Visual Analytics (Trend Chart + Voice AI Agent Breakdown) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 16 }}>
        {/* Weekly Call Telemetry & Workflow Execution Trends */}
        <Panel
          title="Weekly Telemetry & Workflow Execution Trends"
          sub="Monitoring daily AI calls, automated workflow triggers, and agreements"
        >
          <div style={{ marginTop: 12 }}>
            <BarChartBox
              data={WEEKLY_TREND_DATA}
              xKey="day"
              yKey="calls"
              height={240}
              color="var(--brand)"
            />
          </div>
        </Panel>

        {/* Active Voice AI Agents Performance */}
        <Panel
          title="Active Voice AI Agent Performance"
          sub="Live call volume, commitment rates, average duration, and sentiment scores per agent"
        >
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table className="table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Agent Name</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Calls</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>PTP Rate</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Avg Call</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {AGENT_PERFORMANCE.map((ag, idx) => (
                  <tr
                    key={ag.name}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                    }}
                  >
                    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{ag.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{ag.role}</div>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, verticalAlign: "middle" }}>
                      {ag.totalCalls}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#10b981", verticalAlign: "middle" }}>
                      {ag.agreementRate}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-dim)", verticalAlign: "middle" }}>
                      {ag.avgDuration}
                    </td>
                    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                      <Badge tone={ag.badgeTone} style={{ fontSize: 10.5 }}>
                        ONLINE
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Row 4: Intent Distribution & Live Escalation Queue */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 16 }}>
        {/* Customer Intent & Priority Distribution */}
        <Panel
          title="Customer Intent & Handling Distribution"
          sub="Automated breakdown of customer sentiment and risk priority tiers"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                Customer Intent Distribution
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Meter label="POSITIVE Intent (Willing to Pay / PTP)" value={0.684} display="68.4% (854)" tone="good" />
                <Meter label="CONDITIONAL Intent (Needs Installments / Info)" value={0.182} display="18.2% (227)" tone="warn" />
                <Meter label="NEGATIVE Intent (Refusal / Dispute)" value={0.134} display="13.4% (167)" tone="bad" />
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                Handling Priority Tiers
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Meter label="GREEN Zone (Standard AI Resolution)" value={0.72} display="72% (898)" tone="good" />
                <Meter label="GREY Zone (Review Panel - Financial Hardship)" value={0.19} display="19% (237)" tone="warn" />
                <Meter label="RED Zone (Escalate Panel - Legal Notice & DND)" value={0.09} display="9% (113)" tone="bad" />
              </div>
            </div>
          </div>
        </Panel>

        {/* Live Operational Action Queue */}
        <Panel
          title="Live Operational Action Queue"
          sub="Recent cases requiring review or escalation routing"
          actions={
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/review-panel")}
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              View All Queue →
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {RECENT_FEED.map((feed) => (
              <div
                key={feed.id}
                onClick={() => navigate(feed.link)}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{feed.customer}</span>
                    <Badge tone={feed.zone === "RED" ? "critical" : "warn"} style={{ fontSize: 10 }}>
                      {feed.zone === "RED" ? "RED ZONE" : "GREY ZONE"}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>
                    {feed.phone} • {feed.outcome}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{feed.time}</div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: feed.zone === "RED" ? "#ef4444" : "#f59e0b" }}>
                    Take Action →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
