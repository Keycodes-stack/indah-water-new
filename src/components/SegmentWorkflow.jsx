/* ============================================================
   Segment Workflow Creator & Preview
   Defines tailored, non-black-box treatment pipelines per customer
   segment (Refusers, Hardship, Deceased Estate, Open Dispute, etc.)
   Guided by the core principle: Refusal != Immediate Escalation.
   ============================================================ */

import { useState } from "react";
import { Panel, Badge, Modal, Field } from "./ui.jsx";

const DEFAULT_WORKFLOWS = {
  Refusers: {
    title: "Refusers Structured Recovery Pipeline",
    version: "v2.3",
    description:
      "Customers who have financial capacity but decline or resist payment. Designed around the core principle: Refusal != Escalation. Initial resistance triggers polite channel variation and mediation before any statutory notice.",
    policyNote: "Guardrail Active: Refusal does NOT immediately trigger Section 88(2) legal notices or DCA placement. Multiple calm touches are required first.",
    targetResolutionSla: "35 days",
    escalationThreshold: "Day 45 (Post-Supervisor Review)",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "WhatsApp",
        title: "Informational e-Bill Statement and Dynamic QR",
        action: "Deliver clear statement with 1-click DuitNow QR link. Friendly reminder acknowledging customer status.",
        fallback: "If unread or dismissed: wait 5 days before next touch.",
      },
      {
        id: "step-2",
        day: "Day 5",
        channel: "Voice AI",
        title: "Autonomous Soft Telephony Inquiry",
        action: "Calm AI caller verifies statement receipt, listens to objections, and logs reason for non-payment without confrontational tone.",
        fallback: "If customer expresses refusal: mark as 'Resistant - Route to Assistance', offer flexible instalment arrangement.",
      },
      {
        id: "step-3",
        day: "Day 14",
        channel: "SMS and Email",
        title: "Instalment Proposal and Tariff Clarification",
        action: "Dispatched automated 3-month repayment schedule offer and water tariff audit option before formal escalation.",
        fallback: "If no response: queue for CRM Supervisor review.",
      },
      {
        id: "step-4",
        day: "Day 28",
        channel: "Registered Notice",
        title: "Pre-Legal Advisory and Final Mediation Invitation",
        action: "Formal written notice outlining statutory obligations and inviting customer to customer service center for settlement dialogue.",
        fallback: "Requires explicit Supervisor authorization before Section 88(2) pack generation.",
      },
      {
        id: "step-5",
        day: "Day 45",
        channel: "DCA / Legal",
        title: "External Panel Handover (Post-Review)",
        action: "Only after 4 prior non-aggressive touches and supervisor audit, account is placed with licensed panel agency.",
        fallback: "Same-day recall active if payment occurs.",
      },
    ],
  },
  "Hardship/eKasih": {
    title: "Hardship and eKasih Protected Treatment Path",
    version: "v1.8",
    description:
      "Registered vulnerable households, B40 demographic, and welfare recipients. Completely shielded from standard debt recovery, robocalls, and legal enforcement.",
    policyNote: "Protected Treatment: Zero legal action permitted. Contact is purely supportive and subsidy-oriented.",
    targetResolutionSla: "Indefinite / Annual Review",
    escalationThreshold: "Never Escalated",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "System Guard",
        title: "Automated Collections Suppression",
        action: "Lock account against automated dialer, SMS blasts, and late fee accumulation. Flag as protected welfare debtor.",
        fallback: "Persistent hold.",
      },
      {
        id: "step-2",
        day: "Day 3",
        channel: "WhatsApp and SMS",
        title: "IWK Care Welfare Assistance Invitation",
        action: "Send compassionate notification regarding IWK B40 tariff subsidy program and application requirements.",
        fallback: "Social worker or welfare officer alerted if uncontactable.",
      },
      {
        id: "step-3",
        day: "Day 14",
        channel: "Manual Officer",
        title: "Subsidized Micro-Instalment Structuring",
        action: "Community engagement officer schedules nominal arrangement (e.g. RM 5.00 - RM 10.00 / month) or CSR write-off grant.",
        fallback: "Account remains in protected status throughout tenure.",
      },
    ],
  },
  "Deceased Estate": {
    title: "Deceased Estate Protocol",
    version: "v1.4",
    description:
      "Premises where the registered account holder is deceased. All collection contact is immediately suppressed to respect next-of-kin while probate or title transfer is verified.",
    policyNote: "Statutory Suppression: Direct customer phone outreach and aggressive messaging are completely paused.",
    targetResolutionSla: "90-180 days (Estate settlement cycle)",
    escalationThreshold: "Amanah Raya / Probate Court",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "System Guard",
        title: "Immediate Contact Suppression",
        action: "All phone calls, automated reminders, and penalty charges halted instantly upon decease notification.",
        fallback: "Guardrail locked in CRM.",
      },
      {
        id: "step-2",
        day: "Day 14",
        channel: "Official Mail",
        title: "Estate Representative Formal Notice",
        action: "Respectful written advisory dispatched to property address requesting executor or administrator contact details.",
        fallback: "Hold for legal estate filing.",
      },
      {
        id: "step-3",
        day: "Day 60",
        channel: "Legal Liaison",
        title: "Amanah Raya / Probate Verification",
        action: "Claims file prepared for statutory settlement through official estate distribution.",
        fallback: "Transferred to title-holder update team upon new occupant deed registration.",
      },
    ],
  },
  "Open Dispute": {
    title: "Dispute and Grievance Resolution Workflow",
    version: "v2.1",
    description:
      "Accounts with active billing, tariff, or meter disputes. Collections paused until operational dispute is formally closed and revised bill issued.",
    policyNote: "Dispute Guardrail: Collections frozen during active dispute SLA. 14-day post-resolution grace period enforced.",
    targetResolutionSla: "14 days SLA",
    escalationThreshold: "Post-Dispute Closure + 14 Days",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "CRM Hold",
        title: "Dispute Ticket Ingestion and Suppression",
        action: "Customer dispute logged via CRM ticket. Automated outreach instantly paused pending investigation.",
        fallback: "Suppression timer active.",
      },
      {
        id: "step-2",
        day: "Day 3",
        channel: "Operations Inspection",
        title: "Technical Field Audit and Tariff Recalculation",
        action: "IWK operational unit conducts premise sewerage connection check or tariff classification review.",
        fallback: "If inspection confirms billing error: credit note issued immediately.",
      },
      {
        id: "step-3",
        day: "Day 10",
        channel: "WhatsApp and Email",
        title: "Dispute Outcome Brief and Revised Statement",
        action: "Customer notified of findings with transparent documentation and adjusted statement.",
        fallback: "14-day grace window begins before any reminder cadence resumes.",
      },
    ],
  },
  "Friction Payers": {
    title: "Friction Payers Instant Resolution Path",
    version: "v3.0",
    description:
      "Customers who intend to pay but delay due to payment channel obstacles. Solved through cheap digital nudges with 1-click links.",
    policyNote: "Digital-First: 100% automated resolution target with blended cost under RM 0.06 per touch.",
    targetResolutionSla: "7 days",
    escalationThreshold: "Day 21",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "WhatsApp",
        title: "Instant e-Bill WhatsApp Blast and DuitNow QR",
        action: "Direct interactive WhatsApp message containing zero-login payment link and instant receipt generation.",
        fallback: "82% expected conversion within 48 hours.",
      },
      {
        id: "step-2",
        day: "Day 3",
        channel: "SMS",
        title: "JomPAY Reference and Online Banking Quick-Code",
        action: "Biller Code 8888 reminder with dynamic account reference for banking app users.",
        fallback: "If unpaid: scheduled for soft voice AI touch.",
      },
      {
        id: "step-3",
        day: "Day 7",
        channel: "Voice AI",
        title: "Automated Courtesy Voice Touch",
        action: "Brief conversational check: 'Did you manage to complete your IWK e-Bill payment?' with instant SMS link resend.",
        fallback: "Auto-converts 94% of cohort.",
      },
    ],
  },
  Constrained: {
    title: "Financial Capacity Support Workflow",
    version: "v2.0",
    description:
      "Customers wanting to settle but facing temporary cashflow constraints. Routed to structured instalment plans rather than threats.",
    policyNote: "Affordability Focus: Emphasize 3 to 12 month payment restructuring.",
    targetResolutionSla: "21 days",
    escalationThreshold: "Day 40",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "WhatsApp",
        title: "Flexible Instalment Plan Invitation",
        action: "Present options for 3, 6, or 12 month interest-free repayment plans directly in the message.",
        fallback: "Interactive plan selector active.",
      },
      {
        id: "step-2",
        day: "Day 7",
        channel: "Voice AI",
        title: "Conversational Plan Agreement Lock",
        action: "Voice assistant walks customer through instalment amounts and secures automated payment promise date.",
        fallback: "Escalate to human billing consultant if custom schedule needed.",
      },
    ],
  },
  "Non-viable": {
    title: "Statutory Write-Off Assessment Pipeline",
    version: "v1.2",
    description:
      "Aged balances with negligible recovery probability (e.g. dissolved companies, demolished premises). Minimizes wasted treatment spend.",
    policyNote: "Cost Protection: Cease expensive contact spend. Prepare statutory write-off documentation.",
    targetResolutionSla: "Annual Board Review",
    escalationThreshold: "Statutory Write-off",
    steps: [
      {
        id: "step-1",
        day: "Day 0",
        channel: "Audit Guard",
        title: "Treatment Spend Freeze",
        action: "Halt all paid messaging, telephony, and postage spend on confirmed non-viable accounts.",
        fallback: "Saved spend logged.",
      },
      {
        id: "step-2",
        day: "Day 30",
        channel: "Corporate Review",
        title: "Statutory Bad Debt Write-Off Dossier",
        action: "Aggregate non-recovery evidence (insolvency filings, demolition certificates) for audit committee review.",
        fallback: "Formal accounting write-off clearance.",
      },
    ],
  },
};

const SEGMENT_TABS = [
  { key: "Refusers", label: "Refusers", badgeTone: "warn", highlight: "Refusal != Escalation" },
  { key: "Hardship/eKasih", label: "Hardship / eKasih", badgeTone: "info", highlight: "Protected Path" },
  { key: "Deceased Estate", label: "Deceased Estate", badgeTone: "mute", highlight: "Suppressed" },
  { key: "Open Dispute", label: "Open Dispute", badgeTone: "warn", highlight: "Collections Hold" },
  { key: "Friction Payers", label: "Friction Payers", badgeTone: "ok", highlight: "Cheapest To Resolve" },
  { key: "Constrained", label: "Constrained", badgeTone: "info", highlight: "Instalment Path" },
  { key: "Non-viable", label: "Non-viable", badgeTone: "err", highlight: "Write-off Candidates" },
];

export default function SegmentWorkflow() {
  const [selectedSegment, setSelectedSegment] = useState("Refusers");
  const [workflows, setWorkflows] = useState(DEFAULT_WORKFLOWS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New step form
  const [newDay, setNewDay] = useState("Day 10");
  const [newChannel, setNewChannel] = useState("WhatsApp");
  const [newTitle, setNewTitle] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newFallback, setNewFallback] = useState("");

  const activeWf = workflows[selectedSegment] || DEFAULT_WORKFLOWS["Refusers"];

  const handleAddStep = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAction.trim()) return;

    const newStepObj = {
      id: `step-${Date.now()}`,
      day: newDay,
      channel: newChannel,
      title: newTitle.trim(),
      action: newAction.trim(),
      fallback: newFallback.trim() || "Standard progression continues.",
    };

    setWorkflows((prev) => ({
      ...prev,
      [selectedSegment]: {
        ...prev[selectedSegment],
        steps: [...prev[selectedSegment].steps, newStepObj],
      },
    }));

    setNewTitle("");
    setNewAction("");
    setNewFallback("");
    setShowAddModal(false);
  };

  const handleDeleteStep = (id) => {
    setWorkflows((prev) => ({
      ...prev,
      [selectedSegment]: {
        ...prev[selectedSegment],
        steps: prev[selectedSegment].steps.filter((s) => s.id !== id),
      },
    }));
  };

  const channelColor = (channel) => {
    switch (channel.toLowerCase()) {
      case "whatsapp":
        return "#10b981";
      case "voice ai":
        return "#3b82f6";
      case "sms":
      case "sms and email":
        return "#6366f1";
      case "system guard":
      case "crm hold":
      case "audit guard":
        return "#f59e0b";
      case "dca / legal":
      case "registered notice":
        return "#ef4444";
      default:
        return "var(--series-4)";
    }
  };

  return (
    <Panel
      title="Segment Workflow Engine and Lifecycle Preview"
      sub="Configurable, non-black-box treatment pipelines per customer segment. Enforces the principle that customer refusal does not trigger premature litigation."
    >
      {/* Segment Selector Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {SEGMENT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedSegment(tab.key)}
            className={`btn-ghost${selectedSegment === tab.key ? " active-segment-tab" : ""}`}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius)",
              border: selectedSegment === tab.key ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: selectedSegment === tab.key ? "var(--surface-2)" : "var(--surface-1)",
              fontWeight: selectedSegment === tab.key ? 700 : 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <span>{tab.label}</span>
            <Badge tone={tab.badgeTone}>{tab.highlight}</Badge>
          </button>
        ))}
      </div>

      {/* Active Segment Strategy Card */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>{activeWf.title}</h3>
              <Badge tone="ok">{activeWf.version} Active</Badge>
              <Badge tone="info">SLA: {activeWf.targetResolutionSla}</Badge>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0", maxWidth: 780 }}>
              {activeWf.description}
            </p>
          </div>
        </div>
      </div>

      {/* Sequential Stepper / Workflow Pipeline Visualizer */}
      <div className="workflow-stepper-container" style={{ position: "relative", padding: "10px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {activeWf.steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "14px 16px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Header with step number and channel */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-dim)",
                  }}
                >
                  Step {idx + 1} · {step.day}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 12,
                    color: "#fff",
                    background: channelColor(step.channel),
                  }}
                >
                  {step.channel}
                </span>
              </div>

              {/* Step Title */}
              <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600 }}>
                {step.title}
              </h4>

              {/* Action */}
              <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 10px", flexGrow: 1 }}>
                {step.action}
              </p>

              {/* Fallback / Refusal Rule */}
              <div
                style={{
                  background: "var(--surface-2)",
                  borderTop: "1px solid var(--border)",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11.5,
                  marginTop: "auto",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--text)" }}>Refusal / Fallback: </span>
                <span style={{ color: "var(--text-dim)" }}>{step.fallback}</span>
              </div>

              {/* Delete Step option if added */}
              {activeWf.steps.length > 2 && (
                <button
                  onClick={() => handleDeleteStep(step.id)}
                  title="Remove step"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "2px 5px",
                    opacity: 0.6,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddModal && (
        <Modal
          title={`Add Custom Step to ${selectedSegment} Workflow`}
          onClose={() => setShowAddModal(false)}
          footer={
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-solid" onClick={handleAddStep}>
                Save Step
              </button>
            </div>
          }
        >
          <form onSubmit={handleAddStep} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Trigger Schedule">
                <input
                  type="text"
                  placeholder="e.g. Day 10"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  required
                />
              </Field>
              <Field label="Communication Channel">
                <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
                  <option value="WhatsApp">WhatsApp (e-Bill)</option>
                  <option value="Voice AI">Voice AI Telephony</option>
                  <option value="SMS">SMS Gateway</option>
                  <option value="Email">Email Gateway</option>
                  <option value="Manual Officer">Manual Supervisory Check</option>
                  <option value="Registered Notice">Registered Notice</option>
                  <option value="DCA / Legal">External Panel</option>
                </select>
              </Field>
            </div>

            <Field label="Step Title">
              <input
                type="text"
                placeholder="e.g. Secondary Soft Outreach and Mediation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </Field>

            <Field label="Operational Treatment Action">
              <textarea
                rows={3}
                placeholder="Describe what the system or rep does in this step..."
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                required
              />
            </Field>

            <Field label="Refusal / Non-Response Fallback Rule (Refusal != Escalation)">
              <input
                type="text"
                placeholder="e.g. Offer 3-month split before statutory review"
                value={newFallback}
                onChange={(e) => setNewFallback(e.target.value)}
              />
            </Field>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
