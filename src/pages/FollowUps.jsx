/* ============================================================
   Follow-Ups Cadence — Enterprise Gantt Chart View
   Scale-ready campaign progression for 900,000 debtor accounts.
   Visualizes multi-channel campaign waves along the arrears lifecycle
   with an interactive Wave Inspector and granular dispatch log.
   ============================================================ */

import { useState, useMemo } from "react";
import { Stats, Panel, Badge, Modal, Field } from "../components/ui.jsx";
import { rm, rmCompact, num, pct, downloadCsv } from "../lib/format.js";

/* 6 Macro Campaign Wave Tracks covering the 900,000 accounts lifecycle */
const CAMPAIGN_WAVES = [
  {
    id: "WAVE-01",
    name: "Wave 1: Pre-Due Courtesy Nudge",
    stage: "Pre-Due",
    channels: ["WhatsApp", "SMS"],
    startDay: -5,
    endDay: -1,
    startDate: "10 Sep",
    endDate: "15 Sep",
    totalAccounts: 240000,
    arrearsTarget: 31450000,
    progressPct: 100,
    status: "Completed",
    statusTone: "good",
    description: "Automated courtesy reminders dispatched 5 days prior to invoice due date. Includes one-click e-Bill statement access and early payment discount link.",
    cohortBreakdown: { domestic: 185000, commercial: 45000, industrial: 10000 },
    delivered: 235680,
    deliveryRate: 0.982,
    responses: 81400,
    responseRate: 0.345,
    ptpSecured: 14820000,
    sampleAccounts: [
      { id: "ACC-100021", name: "Ahmad Farhan bin Yusof", channel: "WhatsApp", amount: "RM 145.20", status: "Paid Early" },
      { id: "ACC-100045", name: "Chong Wei Ling", channel: "SMS", amount: "RM 88.50", status: "Delivered" },
      { id: "ACC-100088", name: "Kavitha a/p Ganesan", channel: "WhatsApp", amount: "RM 112.00", status: "Paid Early" },
    ],
  },
  {
    id: "WAVE-02",
    name: "Wave 2: Due Date Notice & Dynamic QR Blast",
    stage: "Due Date",
    channels: ["WhatsApp", "Email"],
    startDay: 0,
    endDay: 4,
    startDate: "16 Sep",
    endDate: "20 Sep",
    totalAccounts: 320000,
    arrearsTarget: 45800000,
    progressPct: 78,
    status: "Active (In Flight)",
    statusTone: "good",
    description: "Official invoice due date prompt embedding dynamic DuitNow QR code and JomPAY Biller Code 8888 reference for frictionless instant settlement.",
    cohortBreakdown: { domestic: 230000, commercial: 72000, industrial: 18000 },
    delivered: 249600,
    deliveryRate: 0.975,
    responses: 92400,
    responseRate: 0.370,
    ptpSecured: 18240000,
    sampleAccounts: [
      { id: "ACC-100000", name: "Rizal bin Abdullah", channel: "WhatsApp", amount: "RM 130.83", status: "Delivered (PTP)" },
      { id: "ACC-100012", name: "Nurul Izzati binti Zulkifli", channel: "WhatsApp", amount: "RM 95.60", status: "Paid" },
      { id: "ACC-100033", name: "Haji Daud bin Kassim", channel: "Email", amount: "RM 210.00", status: "Opened (3x)" },
    ],
  },
  {
    id: "WAVE-03",
    name: "Wave 3: Early Arrears Soft Voice AI Cadence",
    stage: "Early Arrears",
    channels: ["Voice AI", "WhatsApp"],
    startDay: 5,
    endDay: 14,
    startDate: "21 Sep",
    endDate: "30 Sep",
    totalAccounts: 185000,
    arrearsTarget: 28500000,
    progressPct: 42,
    status: "Active (In Flight)",
    statusTone: "info",
    description: "Autonomous conversational outbound Voice AI call offering payment clarification, dispute recording, or 3-month instalment arrangement options.",
    cohortBreakdown: { domestic: 125000, commercial: 46000, industrial: 14000 },
    delivered: 77700,
    deliveryRate: 0.912,
    responses: 44200,
    responseRate: 0.569,
    ptpSecured: 11500000,
    sampleAccounts: [
      { id: "ACC-100002", name: "Siti Sarah binti Omar", channel: "Voice AI", amount: "RM 245.50", status: "Instalment Requested" },
      { id: "ACC-100005", name: "Kumar a/l Subramaniam", channel: "WhatsApp", amount: "RM 420.00", status: "PTP Pledged" },
      { id: "ACC-100014", name: "Lim Chee Keong", channel: "Voice AI", amount: "RM 310.40", status: "Scheduled Call" },
    ],
  },
  {
    id: "WAVE-04",
    name: "Wave 4: Committed Arrears JomPAY Escalation",
    stage: "Committed Arrears",
    channels: ["SMS", "Email"],
    startDay: 15,
    endDay: 25,
    startDate: "01 Oct",
    endDate: "11 Oct",
    totalAccounts: 92000,
    arrearsTarget: 19400000,
    progressPct: 15,
    status: "Scheduled (Queueing)",
    statusTone: "warn",
    description: "Formal overdue notice with statutory escalation warning. Directs immediate payment to JomPAY or MyIndahWater digital portal.",
    cohortBreakdown: { domestic: 58000, commercial: 26000, industrial: 8000 },
    delivered: 13800,
    deliveryRate: 0.965,
    responses: 3800,
    responseRate: 0.275,
    ptpSecured: 2840000,
    sampleAccounts: [
      { id: "ACC-100004", name: "Tan Wei Loon", channel: "SMS", amount: "RM 185.20", status: "Pending Dispatch" },
      { id: "ACC-100016", name: "Wong Siew Mei", channel: "SMS", amount: "RM 175.00", status: "Scheduled" },
      { id: "ACC-100022", name: "Kelab Rekreasi Subang", channel: "Email", amount: "RM 1,450.00", status: "Pending Review" },
    ],
  },
  {
    id: "WAVE-05",
    name: "Wave 5: Formal Statutory Notice & Pre-DCA Warning",
    stage: "Formal",
    channels: ["Voice AI", "Email"],
    startDay: 26,
    endDay: 35,
    startDate: "12 Oct",
    endDate: "21 Oct",
    totalAccounts: 48000,
    arrearsTarget: 15200000,
    progressPct: 0,
    status: "Scheduled",
    statusTone: "mute",
    description: "Final supervisory call and formal Section 88(2) legal demand pack dispatch prior to third-party agency placement or supply restriction.",
    cohortBreakdown: { domestic: 28000, commercial: 15000, industrial: 5000 },
    delivered: 0,
    deliveryRate: 0,
    responses: 0,
    responseRate: 0,
    ptpSecured: 0,
    sampleAccounts: [
      { id: "ACC-100001", name: "Maju Food Processing", channel: "Voice AI", amount: "RM 44,630.00", status: "Pre-Legal Review" },
      { id: "ACC-100007", name: "Syarikat Kejuruteraan Dinamik", channel: "Voice AI", amount: "RM 3,450.00", status: "Queued for Agency" },
      { id: "ACC-100025", name: "Dr. Prema Nathan", channel: "Email", amount: "RM 880.00", status: "Formal Notice Draft" },
    ],
  },
  {
    id: "WAVE-06",
    name: "Wave 6: Instalment & Debt Restructuring Window",
    stage: "Restructuring",
    channels: ["WhatsApp", "Voice AI"],
    startDay: -5,
    endDay: 35,
    startDate: "10 Sep",
    endDate: "21 Oct",
    totalAccounts: 18000,
    arrearsTarget: 6850000,
    progressPct: 65,
    status: "Active (Rolling)",
    statusTone: "info",
    description: "Ongoing dedicated supervisory stream for managing active payment arrangements, hardship/eKasih relief, and flexible repayment tenures.",
    cohortBreakdown: { domestic: 12000, commercial: 5000, industrial: 1000 },
    delivered: 11700,
    deliveryRate: 0.985,
    responses: 8900,
    responseRate: 0.761,
    ptpSecured: 4920000,
    sampleAccounts: [
      { id: "ACC-100018", name: "Faridah binti Osman", channel: "WhatsApp", amount: "RM 280.00", status: "Active Plan (2/3)" },
      { id: "ACC-100029", name: "Mega Hardware Sdn Bhd", channel: "Voice AI", amount: "RM 2,400.00", status: "Negotiated" },
      { id: "ACC-100042", name: "Sivamani a/l Muniandy", channel: "WhatsApp", amount: "RM 350.00", status: "Extension Approved" },
    ],
  },
];

/* Granular item log samples for micro-inspection */
const INITIAL_LOG_ITEMS = [
  {
    id: "FLW-2001",
    customerName: "Rizal bin Abdullah",
    accountNo: "6199-1647-8082",
    waveId: "WAVE-02",
    message: "Payment reminder #2 with DuitNow QR for RM 130.83 overdue sewerage bill.",
    channel: "WhatsApp",
    deliveryTime: "2026-09-16 09:30 AM",
    status: "Scheduled",
    isFuture: true,
  },
  {
    id: "FLW-2002",
    customerName: "Siti Sarah binti Omar",
    accountNo: "4421-8890-1209",
    waveId: "WAVE-03",
    message: "Voice AI outbound call follow-up regarding overdue balance RM 245.50.",
    channel: "Voice AI",
    deliveryTime: "2026-09-16 11:00 AM",
    status: "Scheduled",
    isFuture: true,
  },
  {
    id: "FLW-2003",
    customerName: "Maju Food Processing",
    accountNo: "2268-3497-3412",
    waveId: "WAVE-05",
    message: "Formal demand letter PDF & payment portal link notification.",
    channel: "Email",
    deliveryTime: "2026-09-16 02:15 PM",
    status: "Pending",
    isFuture: true,
  },
  {
    id: "FLW-2004",
    customerName: "Tan Wei Loon",
    accountNo: "7731-5520-9943",
    waveId: "WAVE-04",
    message: "SMS alert: Overdue RM 185.20 payment promise due in 24 hours.",
    channel: "SMS",
    deliveryTime: "2026-09-17 10:00 AM",
    status: "Scheduled",
    isFuture: true,
  },
  {
    id: "FLW-2005",
    customerName: "Kumar a/l Subramaniam",
    accountNo: "3390-1124-7832",
    waveId: "WAVE-03",
    message: "WhatsApp reminder for instalment plan payment #2.",
    channel: "WhatsApp",
    deliveryTime: "2026-09-17 03:30 PM",
    status: "Scheduled",
    isFuture: true,
  },
  {
    id: "FLW-2006",
    customerName: "Syarikat Kejuruteraan Dinamik",
    accountNo: "8823-9901-4412",
    waveId: "WAVE-05",
    message: "Officer check-in call before formal DCA referral action.",
    channel: "Voice AI",
    deliveryTime: "2026-09-18 09:00 AM",
    status: "Scheduled",
    isFuture: true,
  },
  {
    id: "FLW-1001",
    customerName: "Ahmad Farhan bin Yusof",
    accountNo: "6645-3312-8876",
    waveId: "WAVE-01",
    message: "Voice AI call completed — Customer promised payment on 18 Sep.",
    channel: "Voice AI",
    deliveryTime: "2026-09-15 03:20 PM",
    status: "Completed",
    isFuture: false,
  },
  {
    id: "FLW-1002",
    customerName: "Nurul Izzati binti Zulkifli",
    accountNo: "5512-8743-6621",
    waveId: "WAVE-02",
    message: "WhatsApp notice delivered with read receipt confirmation.",
    channel: "WhatsApp",
    deliveryTime: "2026-09-15 01:10 PM",
    status: "Delivered",
    isFuture: false,
  },
];

const BLANK_FORM = {
  customerName: "",
  accountNo: "",
  message: "",
  channel: "WhatsApp",
  deliveryTime: "",
};

export default function FollowUps() {
  const [viewMode, setViewMode] = useState("gantt"); // 'gantt' | 'table'
  const [channelFilter, setChannelFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeWave, setActiveWave] = useState(null);
  const [logItems, setLogItems] = useState(INITIAL_LOG_ITEMS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [notification, setNotification] = useState("");

  // Timeline scale calculation: Day -5 to Day +35 (total 40 days)
  const minDay = -5;
  const maxDay = 35;
  const totalDays = maxDay - minDay; // 40 days

  // Today marker (Day 0 = 16 Sep)
  const todayDay = 0;
  const todayPercent = ((todayDay - minDay) / totalDays) * 100;

  // Filter waves
  const filteredWaves = useMemo(() => {
    return CAMPAIGN_WAVES.filter((w) => {
      if (channelFilter !== "all" && !w.channels.includes(channelFilter)) return false;
      if (stageFilter !== "all" && w.stage !== stageFilter) return false;
      return true;
    });
  }, [channelFilter, stageFilter]);

  // Aggregate executive metrics across 900,000 accounts
  const totalAccountsInCadence = useMemo(
    () => CAMPAIGN_WAVES.reduce((sum, w) => sum + w.totalAccounts, 0),
    []
  );
  const totalArrearsInScope = useMemo(
    () => CAMPAIGN_WAVES.reduce((sum, w) => sum + w.arrearsTarget, 0),
    []
  );
  const activeWavesCount = useMemo(
    () => CAMPAIGN_WAVES.filter((w) => w.status.includes("Active")).length,
    []
  );

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.message.trim()) return;

    const newItem = {
      id: `FLW-${Date.now().toString().slice(-4)}`,
      customerName: form.customerName.trim(),
      accountNo: form.accountNo.trim() || "6199-0000-0000",
      waveId: "WAVE-02",
      message: form.message.trim(),
      channel: form.channel,
      deliveryTime: form.deliveryTime || "2026-09-17 10:00 AM",
      status: "Scheduled",
      isFuture: true,
    };

    setLogItems([newItem, ...logItems]);
    setShowCreateModal(false);
    setForm(BLANK_FORM);
    setNotification(`New follow-up scheduled for ${newItem.customerName}!`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleExportCsv = () => {
    downloadCsv(
      `followups-campaign-waves-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Wave ID",
        "Campaign Name",
        "Cadence Stage",
        "Channels",
        "Start Date",
        "End Date",
        "Total Accounts",
        "Arrears Target (RM)",
        "Progress (%)",
        "Status",
      ],
      filteredWaves.map((w) => [
        w.id,
        w.name,
        w.stage,
        w.channels.join(" + "),
        w.startDate,
        w.endDate,
        w.totalAccounts,
        w.arrearsTarget,
        `${w.progressPct}%`,
        w.status,
      ])
    );
  };

  return (
    <div className="followups-page">
      {/* 4 Executive KPI StatCards tailored for 900,000 portfolio volume */}
      <Stats
        cards={[
          {
            label: "Accounts in Cadence",
            value: num(totalAccountsInCadence),
            sub: "across 6 structured campaign waves",
            explanation: "Total customer debtor accounts currently scheduled or treated across lifecycle cadence tracks.",
          },
          {
            label: "Active Waves",
            value: `${activeWavesCount} In Flight`,
            sub: "1 completed · 2 scheduled queue",
            explanation: "Number of automated multi-channel campaign waves currently executing in real-time.",
          },
          {
            label: "On-Schedule Delivery",
            value: "98.2%",
            sub: "carrier & telephony gateway health",
            tone: "good",
            explanation: "Percentage of digital messages and voice calls successfully dispatched within scheduled cadence intervals.",
          },
          {
            label: "Arrears in Scope",
            value: rmCompact(totalArrearsInScope),
            sub: "targeted across cadence ladder",
            explanation: "Cumulative value of outstanding arrears covered by active and queued campaign waves.",
          },
        ]}
      />

      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--good-soft)",
            color: "var(--good)",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{notification}</span>
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: "2px 6px" }}
            onClick={() => setNotification("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Panel with View Switcher */}
      <Panel
        title="Follow-Ups Cadence Control"
        sub="Executive Gantt chart timeline tracking overall campaign progress across 900,000 debtor accounts."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Switcher Toggle */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-2)",
                padding: "3px",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <button
                className={`btn-ghost ${viewMode === "gantt" ? "active" : ""}`}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: viewMode === "gantt" ? "var(--brand)" : "transparent",
                  color: viewMode === "gantt" ? "#fff" : "var(--text)",
                  borderRadius: 6,
                }}
                onClick={() => setViewMode("gantt")}
              >
                Gantt Cadence View
              </button>
              <button
                className={`btn-ghost ${viewMode === "table" ? "active" : ""}`}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: viewMode === "table" ? "var(--brand)" : "transparent",
                  color: viewMode === "table" ? "#fff" : "var(--text)",
                  borderRadius: 6,
                }}
                onClick={() => setViewMode("table")}
              >
                Granular Dispatch Log
              </button>
            </div>

            <button className="btn-ghost" onClick={handleExportCsv} title="Export campaign waves to CSV">
              Export CSV
            </button>
            <button className="btn-solid" onClick={() => setShowCreateModal(true)}>
              + Schedule Follow-Up
            </button>
          </div>
        }
      >
        {/* Filters Bar */}
        <section className="filters" style={{ marginBottom: 16 }}>
          <div className="fx">
            <label htmlFor="fc">Channel Filter</label>
            <select id="fc" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="all">All Channels</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Voice AI">Voice AI Telephony</option>
              <option value="SMS">SMS Gateway</option>
              <option value="Email">Email Gateway</option>
            </select>
          </div>

          <div className="fx">
            <label htmlFor="fs">Cadence Stage</label>
            <select id="fs" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="all">All Stages</option>
              <option value="Pre-Due">Pre-Due (Day -5)</option>
              <option value="Due Date">Due Date Notice (Day 0)</option>
              <option value="Early Arrears">Early Arrears (Day +5 to +14)</option>
              <option value="Committed Arrears">Committed Arrears (Day +15 to +25)</option>
              <option value="Formal">Formal Notice (Day +26 to +35)</option>
              <option value="Restructuring">Restructuring Window</option>
            </select>
          </div>

          {(channelFilter !== "all" || stageFilter !== "all") && (
            <div className="fx">
              <label>&nbsp;</label>
              <button
                className="btn-ghost"
                onClick={() => {
                  setChannelFilter("all");
                  setStageFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------
            MODE 1: EXECUTIVE GANTT TIMELINE VIEW
            ------------------------------------------------------------- */}
        {viewMode === "gantt" && (
          <div className="gantt-container" style={{ overflowX: "auto" }}>
            <div className="gantt-chart-wrapper" style={{ minWidth: 880 }}>
              {/* Timeline Header with Time Ticks */}
              <div className="gantt-header-row">
                <div className="gantt-track-label-col">
                  <strong>Campaign Wave &amp; Stage</strong>
                </div>
                <div className="gantt-timeline-area">
                  <div className="gantt-tick" style={{ left: "0%" }}>
                    <span className="tick-day">Day -5</span>
                    <span className="tick-date">10 Sep</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "12.5%" }}>
                    <span className="tick-day">Day 0 (Due)</span>
                    <span className="tick-date">16 Sep</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "30%" }}>
                    <span className="tick-day">Day +7</span>
                    <span className="tick-date">23 Sep</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "47.5%" }}>
                    <span className="tick-day">Day +14</span>
                    <span className="tick-date">30 Sep</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "65%" }}>
                    <span className="tick-day">Day +21</span>
                    <span className="tick-date">07 Oct</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "82.5%" }}>
                    <span className="tick-day">Day +28</span>
                    <span className="tick-date">14 Oct</span>
                  </div>
                  <div className="gantt-tick" style={{ left: "100%" }}>
                    <span className="tick-day">Day +35</span>
                    <span className="tick-date">21 Oct</span>
                  </div>
                </div>
              </div>

              {/* Gantt Wave Rows */}
              <div className="gantt-body-container" style={{ position: "relative" }}>
                {/* Red 'Today' Vertical Marker Line */}
                <div
                  className="gantt-today-line"
                  style={{ left: `calc(280px + ${todayPercent} * (100% - 280px) / 100)` }}
                >
                  <div className="gantt-today-badge">▼ Today (16 Sep)</div>
                </div>

                {filteredWaves.map((wave) => {
                  const left = ((wave.startDay - minDay) / totalDays) * 100;
                  const width = ((wave.endDay - wave.startDay) / totalDays) * 100;

                  return (
                    <div key={wave.id} className="gantt-row">
                      {/* Left Info Column */}
                      <div className="gantt-track-label-col">
                        <div className="gantt-wave-title">
                          <strong>{wave.name}</strong>
                        </div>
                        <div className="gantt-wave-meta">
                          <span className="mono-num">{num(wave.totalAccounts)}</span> accts ·{" "}
                          <span className="dim">{rmCompact(wave.arrearsTarget)}</span>
                        </div>
                        <div className="gantt-channel-badges">
                          {wave.channels.map((ch) => (
                            <span key={ch} className="gantt-channel-chip">
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Timeline Grid Area with Bar */}
                      <div className="gantt-timeline-area">
                        <div
                          className={`gantt-bar ${wave.statusTone}`}
                          style={{
                            left: `${Math.max(0, left)}%`,
                            width: `${Math.min(100 - left, Math.max(8, width))}%`,
                          }}
                          onClick={() => setActiveWave(wave)}
                          title={`Click to inspect ${wave.name} cohort breakdown`}
                        >
                          {/* Inner Fill representing Completion % */}
                          <div
                            className="gantt-bar-fill"
                            style={{ width: `${wave.progressPct}%` }}
                          />

                          {/* Bar Label */}
                          <div className="gantt-bar-content">
                            <span className="gantt-bar-text">
                              {wave.startDate} – {wave.endDate} ({wave.progressPct}% executed)
                            </span>
                            <span className="gantt-bar-status">{wave.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODE 2: GRANULAR DISPATCH LOG TABLE VIEW
            ------------------------------------------------------------- */}
        {viewMode === "table" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer &amp; Account</th>
                  <th>Wave / Stage</th>
                  <th>Channel</th>
                  <th>Message / Note</th>
                  <th>Delivery Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}
                    >
                      No follow-up records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  logItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <strong>{item.customerName}</strong>
                        </div>
                        <div className="dim" style={{ fontSize: 11.5 }}>
                          {item.accountNo} · {item.id}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: "var(--surface-3)", fontSize: 11 }}>
                          {item.waveId}
                        </span>
                      </td>
                      <td>
                        <span className="badge info">{item.channel}</span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: 13 }}>{item.message}</span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {item.deliveryTime}
                        </span>
                      </td>
                      <td>
                        <Badge tone={item.status === "Completed" || item.status === "Delivered" ? "good" : "info"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => {
                            setLogItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? { ...i, status: "Completed", isFuture: false }
                                  : i
                              )
                            );
                            setNotification(`Follow-up ${item.id} dispatched successfully!`);
                            setTimeout(() => setNotification(""), 4000);
                          }}
                        >
                          Dispatch Now
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* =============================================================
          INTERACTIVE WAVE INSPECTOR MODAL
          ============================================================= */}
      {activeWave && (
        <Modal
          wide
          title={`Wave Inspection: ${activeWave.name}`}
          onClose={() => setActiveWave(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span className="dim" style={{ fontSize: 12 }}>
                Cohort Population: <strong>{num(activeWave.totalAccounts)}</strong> accounts · Target: <strong>{rm(activeWave.arrearsTarget)}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setNotification(`Wave ${activeWave.id} dispatch pacing adjusted.`);
                    setActiveWave(null);
                    setTimeout(() => setNotification(""), 4000);
                  }}
                >
                  Adjust Wave Pacing
                </button>
                <button className="btn-solid" onClick={() => setActiveWave(null)}>
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="wave-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Wave Summary Info Banner */}
            <div
              style={{
                background: "var(--surface-2)",
                padding: "14px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <strong>Lifecycle Scope:</strong> {activeWave.startDate} – {activeWave.endDate} ({activeWave.stage} Stage)
              </div>
              <p style={{ margin: 0, color: "var(--text-dim)" }}>{activeWave.description}</p>
            </div>

            {/* Wave KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <div className="stat-modal-kpi-card">
                <div className="kpi-name">Accounts Targeted</div>
                <div className="kpi-val">{num(activeWave.totalAccounts)}</div>
              </div>
              <div className="stat-modal-kpi-card">
                <div className="kpi-name">Target Arrears</div>
                <div className="kpi-val">{rmCompact(activeWave.arrearsTarget)}</div>
              </div>
              <div className="stat-modal-kpi-card">
                <div className="kpi-name">Execution Progress</div>
                <div className="kpi-val">{activeWave.progressPct}%</div>
              </div>
              <div className="stat-modal-kpi-card">
                <div className="kpi-name">Delivery Rate</div>
                <div className="kpi-val">{pct(activeWave.deliveryRate)}</div>
              </div>
              <div className="stat-modal-kpi-card">
                <div className="kpi-name">PTP Secured</div>
                <div className="kpi-val">{typeof activeWave.ptpSecured === "number" ? rmCompact(activeWave.ptpSecured) : activeWave.ptpSecured}</div>
              </div>
            </div>

            {/* Sub-cohort Category Distribution */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 13 }}>Segment Cohort Breakdown</h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  fontSize: 12.5,
                }}
              >
                <div style={{ background: "var(--surface)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span className="dim">Domestic:</span> <strong>{num(activeWave.cohortBreakdown.domestic)}</strong> accts ({pct(activeWave.cohortBreakdown.domestic / activeWave.totalAccounts)})
                </div>
                <div style={{ background: "var(--surface)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span className="dim">Commercial:</span> <strong>{num(activeWave.cohortBreakdown.commercial)}</strong> accts ({pct(activeWave.cohortBreakdown.commercial / activeWave.totalAccounts)})
                </div>
                <div style={{ background: "var(--surface)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span className="dim">Industrial:</span> <strong>{num(activeWave.cohortBreakdown.industrial)}</strong> accts ({pct(activeWave.cohortBreakdown.industrial / activeWave.totalAccounts)})
                </div>
              </div>
            </div>

            {/* Sample Account Records belonging to this wave */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 13 }}>Sample Accounts in Wave Queue</h4>
              <div className="table-wrap">
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      <th>Customer Name</th>
                      <th>Channel</th>
                      <th>Arrears Amount</th>
                      <th>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeWave.sampleAccounts.map((acc) => (
                      <tr key={acc.id}>
                        <td><code>{acc.id}</code></td>
                        <td><strong>{acc.name}</strong></td>
                        <td><span className="badge info">{acc.channel}</span></td>
                        <td><strong>{acc.amount}</strong></td>
                        <td><Badge tone="ok">{acc.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule New Follow-up Modal */}
      {showCreateModal && (
        <Modal
          title="Schedule New Follow-Up"
          onClose={() => setShowCreateModal(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-solid" onClick={handleCreateSubmit}>
                Schedule Follow-Up
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateSubmit}>
            <div className="form-grid" style={{ gap: 12 }}>
              <Field label="Customer Full Name">
                <input
                  type="text"
                  placeholder="e.g. Ahmad Farhan bin Yusof"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
              </Field>

              <Field label="IWK Account Number">
                <input
                  type="text"
                  placeholder="e.g. 6199-4412-8876"
                  value={form.accountNo}
                  onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                />
              </Field>

              <Field label="Outreach Channel">
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Voice AI">Voice AI Outbound Call</option>
                  <option value="SMS">SMS Gateway</option>
                  <option value="Email">Email Statement</option>
                </select>
              </Field>

              <Field label="Scheduled Dispatch Date &amp; Time">
                <input
                  type="text"
                  placeholder="e.g. 2026-09-17 10:30 AM"
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Message / Follow-Up Note">
                <textarea
                  rows={3}
                  placeholder="Enter customized follow-up instructions..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}
                />
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
