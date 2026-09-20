import { useState, useMemo } from "react";
import { Badge, Modal } from "../components/ui.jsx";
import { RefreshIcon } from "../components/icons.jsx";

const PREBUILT_WORKFLOWS = [
  {
    id: "wf-1",
    name: "Auto Hardship & Installment Cadence",
    description: "Triggered after call end when customer requests payment installment options.",
    status: "ACTIVE",
    category: "Financial Hardship",
    nodes: [
      {
        id: "n-1",
        type: "TRIGGER",
        title: "⚡ Trigger: After Call End",
        eventType: "After Call End",
        filters: {
          intent: "POSITIVE",
          priority: "GREY",
          outcome: "NEEDS_INSTALMENTS",
          situation: "FINANCIAL_HARDSHIP",
        },
      },
      {
        id: "n-2",
        type: "FETCH_BILL",
        title: "💲 Fetch Bill Amount",
        accountQuery: "Pull Live Outstanding Balance & Due Date",
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "💬 Send SMS Details",
        channel: "sms",
        messagePrompt: "Salam {{customer_name}}, your IWK account {{account_no}} has an outstanding balance of {{bill_amount}}. Here is your installment schedule link: {{installment_url}}.",
      },
      {
        id: "n-4",
        type: "UPDATE_FIELDS",
        title: "🏷️ Update Customer Fields",
        fieldName: "followup_status",
        fieldValue: "INSTALLMENT_SCHEDULED",
      },
      {
        id: "n-5",
        type: "INTERNAL_TEAM",
        title: "👥 Send to Internal Team",
        team: "Hardship & Financial Assistance Desk",
      },
    ],
  },
  {
    id: "wf-2",
    name: "Severe Refusal DND Enforcement",
    description: "Triggered when call handling priority is RED and customer refuses payment or requests DND.",
    status: "ACTIVE",
    category: "Legal & Compliance",
    nodes: [
      {
        id: "n-1",
        type: "TRIGGER",
        title: "⚡ Trigger: After Call End",
        eventType: "After Call End",
        filters: {
          intent: "NEGATIVE",
          priority: "RED",
          outcome: "REFUSED_PAYMENT",
          situation: "ALL",
        },
      },
      {
        id: "n-2",
        type: "PUT_DND",
        title: "🚫 Put in DND",
        dndType: "permanent",
        reason: "Explicit refusal & Do-Not-Call suppression requested",
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "💬 Send Legal Pre-Notice",
        channel: "sms",
        messagePrompt: "PERINGATAN MESRA IWK: Akaun {{account_no}} telah dimajukan ke Unit Tindakan Khas. Sila jelaskan tunggakan atau hubungi 03-20803888.",
      },
      {
        id: "n-4",
        type: "CALL_AGENT",
        title: "🤖 Trigger AI Agent Call",
        agent: "Hakim AI agent (Legal & Severe Collections)",
        contextPrompt: "Customer explicitly refused payment on previous call. Initiate formal recovery statement and explain legal escalation steps.",
      },
      {
        id: "n-5",
        type: "INTERNAL_TEAM",
        title: "👥 Send to Internal Team",
        team: "Legal & Recovery Desk",
      },
    ],
  },
  {
    id: "wf-3",
    name: "Account Dispute Legal Pre-Notice",
    description: "Verifies payment status, fetches live balance, and escalates billing disputes to QA.",
    status: "DRAFT",
    category: "Dispute Verification",
    nodes: [
      {
        id: "n-1",
        type: "TRIGGER",
        title: "⚡ Trigger: After Call End",
        eventType: "After Call End",
        filters: {
          intent: "CONDITIONAL",
          priority: "GREY",
          outcome: "DISPUTING_BILL",
          situation: "BILLING_DISPUTE_DISCREPANCY",
        },
      },
      {
        id: "n-2",
        type: "VERIFY_BILL",
        title: "🔍 Verify Bill Paid",
        condition: "Check ledger payment transaction & receipt status",
      },
      {
        id: "n-3",
        type: "FETCH_BILL",
        title: "💲 Fetch Bill Amount",
        accountQuery: "Query ledger for itemized dispute breakdown",
      },
      {
        id: "n-4",
        type: "INTERNAL_TEAM",
        title: "👥 Send to Internal Team",
        team: "QA depart (records verify)",
      },
    ],
  },
  {
    id: "wf-4",
    name: "Instant Payment Verification & SMS",
    description: "Verifies online payments, updates customer tags, and dispatches instant WhatsApp receipt.",
    status: "ACTIVE",
    category: "Automated Receipts",
    nodes: [
      {
        id: "n-1",
        type: "TRIGGER",
        title: "⚡ Trigger: Webhook Received",
        eventType: "Webhook Received",
        filters: {
          intent: "POSITIVE",
          priority: "GREEN",
          outcome: "PTP_AGREED",
          situation: "ALL",
        },
      },
      {
        id: "n-2",
        type: "VERIFY_BILL",
        title: "🔍 Verify Bill Paid",
        condition: "Verify FPX / JomPAY transaction reference ID",
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "💬 Send WhatsApp Receipt",
        channel: "whatsapp",
        messagePrompt: "Terima kasih {{customer_name}}! Pembayaran sebanyak {{paid_amount}} untuk akaun IWK {{account_no}} telah berjaya dikemas kini.",
      },
      {
        id: "n-4",
        type: "UPDATE_FIELDS",
        title: "🏷️ Update Customer Fields",
        fieldName: "account_status",
        fieldValue: "PAID_IN_FULL",
      },
    ],
  },
];

const NODE_TYPES = [
  {
    type: "SEND_MESSAGE",
    title: "Send SMS / Email / WhatsApp",
    icon: "💬",
    color: "#10b981",
    description: "Dispatch automated SMS, Email, or WhatsApp text notification.",
  },
  {
    type: "CALL_AGENT",
    title: "Call Agent Trigger",
    icon: "🤖",
    color: "#8b5cf6",
    description: "Trigger AI voice agent with custom context and prompts.",
  },
  {
    type: "INTERNAL_TEAM",
    title: "Send to Internal Team",
    icon: "👥",
    color: "#3b82f6",
    description: "Route case lead to QA, Legal, Dispute, or Supervisor desks.",
  },
  {
    type: "VERIFY_BILL",
    title: "Verify Bill Paid",
    icon: "🔍",
    color: "#06b6d4",
    description: "Verify payment ledger and FPX / JomPAY transaction status.",
  },
  {
    type: "FETCH_BILL",
    title: "Fetch Bill Amount",
    icon: "💲",
    color: "#f59e0b",
    description: "Query live API for outstanding balance and itemized bill details.",
  },
  {
    type: "UPDATE_FIELDS",
    title: "Update Customer Fields",
    icon: "🏷️",
    color: "#ec4899",
    description: "Update account status, priority tags, and customer notes.",
  },
  {
    type: "PUT_DND",
    title: "Put in DND",
    icon: "🚫",
    color: "#ef4444",
    description: "Add customer directly to Do Not Disturb registry.",
  },
];

export default function Workflows() {
  const [workflowsList, setWorkflowsList] = useState(PREBUILT_WORKFLOWS);
  const [activeWfId, setActiveWfId] = useState(PREBUILT_WORKFLOWS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [insertIndex, setInsertIndex] = useState(null);
  const [toast, setToast] = useState(null);

  const activeWf = useMemo(() => {
    return workflowsList.find((w) => w.id === activeWfId) || workflowsList[0];
  }, [workflowsList, activeWfId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !activeWf) return null;
    return activeWf.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [activeWf, selectedNodeId]);

  // Create New Workflow
  const handleCreateNewWf = () => {
    const newId = `wf-${Date.now()}`;
    const newWf = {
      id: newId,
      name: `New Custom Workflow ${workflowsList.length + 1}`,
      description: "Custom automated workflow builder flow.",
      status: "DRAFT",
      category: "Custom Automation",
      nodes: [
        {
          id: `n-${Date.now()}-1`,
          type: "TRIGGER",
          title: "⚡ Trigger: After Call End",
          eventType: "After Call End",
          filters: {
            intent: "ALL",
            priority: "ALL",
            outcome: "ALL",
            situation: "ALL",
          },
        },
        {
          id: `n-${Date.now()}-2`,
          type: "SEND_MESSAGE",
          title: "💬 Send SMS Notification",
          channel: "sms",
          messagePrompt: "Salam {{customer_name}}, regarding your IWK account {{account_no}}...",
        },
      ],
    };
    setWorkflowsList([newWf, ...workflowsList]);
    setActiveWfId(newId);
    setToast("✓ New Workflow Created!");
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle Publish Status
  const handleTogglePublish = () => {
    const nextStatus = activeWf.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setWorkflowsList((prev) =>
      prev.map((w) => (w.id === activeWf.id ? { ...w, status: nextStatus } : w))
    );
    setToast(`✓ Workflow status set to ${nextStatus}!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Save Workflow
  const handleSaveWorkflow = () => {
    setToast(`✓ Workflow "${activeWf.name}" saved successfully!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Add Node to Flow
  const handleAddNodeTemplate = (nodeTemplate) => {
    const newNodeId = `n-${Date.now()}`;
    let newNode = {
      id: newNodeId,
      type: nodeTemplate.type,
      title: `${nodeTemplate.icon} ${nodeTemplate.title}`,
    };

    if (nodeTemplate.type === "SEND_MESSAGE") {
      newNode.channel = "sms";
      newNode.messagePrompt = "Enter custom message template prompt here...";
    } else if (nodeTemplate.type === "CALL_AGENT") {
      newNode.agent = "Hakim AI agent (Legal & Severe Collections)";
      newNode.contextPrompt = "Pass prompt context to voice agent...";
    } else if (nodeTemplate.type === "INTERNAL_TEAM") {
      newNode.team = "QA depart (records verify)";
    } else if (nodeTemplate.type === "VERIFY_BILL") {
      newNode.condition = "Verify FPX / JomPAY transaction ledger";
    } else if (nodeTemplate.type === "FETCH_BILL") {
      newNode.accountQuery = "Pull live outstanding bill amount & due date";
    } else if (nodeTemplate.type === "UPDATE_FIELDS") {
      newNode.fieldName = "account_status";
      newNode.fieldValue = "UNDER_REVIEW";
    } else if (nodeTemplate.type === "PUT_DND") {
      newNode.dndType = "permanent";
      newNode.reason = "Do-Not-Call suppression requested";
    }

    const currentNodes = [...activeWf.nodes];
    if (insertIndex !== null && insertIndex >= 0) {
      currentNodes.splice(insertIndex + 1, 0, newNode);
    } else {
      currentNodes.push(newNode);
    }

    setWorkflowsList((prev) =>
      prev.map((w) => (w.id === activeWf.id ? { ...w, nodes: currentNodes } : w))
    );
    setShowAddNodeModal(false);
    setInsertIndex(null);
    setSelectedNodeId(newNodeId);
    setToast(`✓ Added ${nodeTemplate.title} node!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Delete Node from Flow
  const handleDeleteNode = (nodeId, e) => {
    e.stopPropagation();
    if (activeWf.nodes.length <= 1) {
      alert("Workflow must contain at least one trigger node.");
      return;
    }
    const updatedNodes = activeWf.nodes.filter((n) => n.id !== nodeId);
    setWorkflowsList((prev) =>
      prev.map((w) => (w.id === activeWf.id ? { ...w, nodes: updatedNodes } : w))
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setToast("✓ Node removed!");
    setTimeout(() => setToast(null), 3000);
  };

  // Update Node Config Field
  const updateNodeField = (nodeId, key, value) => {
    setWorkflowsList((prev) =>
      prev.map((w) => {
        if (w.id !== activeWf.id) return w;
        const updatedNodes = w.nodes.map((n) => {
          if (n.id !== nodeId) return n;
          if (key.includes(".")) {
            const [parent, child] = key.split(".");
            return {
              ...n,
              [parent]: { ...n[parent], [child]: value },
            };
          }
          return { ...n, [key]: value };
        });
        return { ...w, nodes: updatedNodes };
      })
    );
  };

  // Node Header Accent Color Helper
  const getNodeColor = (type) => {
    switch (type) {
      case "TRIGGER":
        return "#f59e0b";
      case "SEND_MESSAGE":
        return "#10b981";
      case "CALL_AGENT":
        return "#8b5cf6";
      case "INTERNAL_TEAM":
        return "#3b82f6";
      case "VERIFY_BILL":
        return "#06b6d4";
      case "FETCH_BILL":
        return "#f97316";
      case "UPDATE_FIELDS":
        return "#ec4899";
      case "PUT_DND":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Workflows</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Interactive node-based workflow automation builder for Indah Water AI Recovery Engine.
          </p>
        </div>

        {toast && (
          <div
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#10b981",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* Main Split Layout: Prebuilt Workflows Sidebar (Left) + Canvas Builder (Right) */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left Sidebar: Prebuilt Workflows List */}
        <div
          style={{
            width: 320,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: "var(--shadow)",
          }}
        >
          {/* Top Add Workflow Button */}
          <button
            type="button"
            className="btn-solid"
            onClick={handleCreateNewWf}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              background: "var(--brand)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            ➕ Create New Workflow
          </button>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Prebuilt Workflows ({workflowsList.length})
          </div>

          {/* Cards List */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
            {workflowsList.map((wf) => {
              const isActive = wf.id === activeWf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => {
                    setActiveWfId(wf.id);
                    setSelectedNodeId(null);
                  }}
                  style={{
                    background: isActive ? "var(--surface-2)" : "var(--surface)",
                    border: isActive ? "2px solid var(--brand)" : "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", lineHeight: 1.3 }}>
                      {wf.name}
                    </div>
                    <Badge tone={wf.status === "ACTIVE" ? "good" : "warn"} style={{ fontSize: 10, padding: "2px 6px" }}>
                      {wf.status}
                    </Badge>
                  </div>
                  <p style={{ margin: "6px 0 8px", fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.4 }}>
                    {wf.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "var(--text-faint)" }}>
                    <span>⚡ {wf.nodes.length} Nodes</span>
                    <span style={{ color: "var(--brand)", fontWeight: 600 }}>{wf.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Canvas Builder Area */}
        <div
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
            position: "relative",
          }}
        >
          {/* Top Canvas Bar */}
          <div
            style={{
              padding: "12px 18px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="text"
                value={activeWf.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setWorkflowsList((prev) =>
                    prev.map((w) => (w.id === activeWf.id ? { ...w, name: val } : w))
                  );
                }}
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  borderBottom: "1px dashed var(--border-strong)",
                  padding: "2px 4px",
                  minWidth: 260,
                }}
              />
              <Badge tone={activeWf.status === "ACTIVE" ? "good" : "warn"}>
                {activeWf.status === "ACTIVE" ? "🟢 ACTIVE" : "🟡 DRAFT"}
              </Badge>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleTogglePublish}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {activeWf.status === "ACTIVE" ? "Unpublish to Draft" : "⚡ Publish Workflow"}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setInsertIndex(activeWf.nodes.length - 1);
                  setShowAddNodeModal(true);
                }}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}
              >
                ➕ Add Node
              </button>

              <button
                type="button"
                className="btn-solid"
                onClick={handleSaveWorkflow}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: "var(--brand)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                💾 Save Workflow
              </button>
            </div>
          </div>

          {/* Main Node Canvas Area (GoHighLevel Node Builder Look) */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 30,
              background: "radial-gradient(var(--border) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              display: "flex",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, maxWidth: 440, width: "100%" }}>
              {activeWf.nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const nodeColor = getNodeColor(node.type);

                return (
                  <div key={node.id} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {/* Node Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        width: "100%",
                        background: "var(--surface)",
                        border: isSelected ? `2px solid ${nodeColor}` : "1px solid var(--border-strong)",
                        borderRadius: 12,
                        boxShadow: isSelected ? `0 0 16px ${nodeColor}33` : "var(--shadow)",
                        cursor: "pointer",
                        overflow: "hidden",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Node Top Accent Header */}
                      <div
                        style={{
                          background: nodeColor,
                          color: "#ffffff",
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 800,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        <span>{node.type.replace(/_/g, " ")}</span>
                        {node.type !== "TRIGGER" && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNode(node.id, e)}
                            title="Delete Node"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ffffff",
                              fontSize: 12,
                              cursor: "pointer",
                              opacity: 0.8,
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {/* Node Body */}
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                          {node.title}
                        </div>

                        {/* Node Specific Preview Snippets */}
                        {node.type === "TRIGGER" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 3 }}>
                            <div>Trigger Event: <strong>{node.eventType}</strong></div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              <Badge tone="warn" style={{ fontSize: 10 }}>
                                Priority: {node.filters?.priority || "ALL"}
                              </Badge>
                              <Badge tone="info" style={{ fontSize: 10 }}>
                                Intent: {node.filters?.intent || "ALL"}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {node.type === "SEND_MESSAGE" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            <Badge tone="good" style={{ fontSize: 10, marginBottom: 4 }}>
                              {node.channel?.toUpperCase() || "SMS"}
                            </Badge>
                            <div style={{ fontStyle: "italic", fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                              "{node.messagePrompt?.substring(0, 60)}..."
                            </div>
                          </div>
                        )}

                        {node.type === "CALL_AGENT" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            <div>Agent: <strong style={{ color: "#8b5cf6" }}>{node.agent}</strong></div>
                            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                              Prompt Context: {node.contextPrompt?.substring(0, 45)}...
                            </div>
                          </div>
                        )}

                        {node.type === "INTERNAL_TEAM" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            Route Case to: <strong style={{ color: "#3b82f6" }}>{node.team}</strong>
                          </div>
                        )}

                        {node.type === "VERIFY_BILL" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            Condition: <strong>{node.condition}</strong>
                          </div>
                        )}

                        {node.type === "FETCH_BILL" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            API Action: <strong>{node.accountQuery}</strong>
                          </div>
                        )}

                        {node.type === "UPDATE_FIELDS" && (
                          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                            Set Field <code>{node.fieldName}</code> = <strong style={{ color: "#ec4899" }}>{node.fieldValue}</strong>
                          </div>
                        )}

                        {node.type === "PUT_DND" && (
                          <div style={{ fontSize: 11.5, color: "#ef4444" }}>
                            DND Type: <strong>{node.dndType?.toUpperCase()}</strong> ({node.reason})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Node Connection Line & Plus Button */}
                    {index < activeWf.nodes.length - 1 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "4px 0" }}>
                        <div style={{ width: 2, height: 16, background: "var(--border-strong)" }} />
                        <button
                          type="button"
                          onClick={() => {
                            setInsertIndex(index);
                            setShowAddNodeModal(true);
                          }}
                          title="Insert node here"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-strong)",
                            color: "var(--brand)",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          +
                        </button>
                        <div style={{ width: 2, height: 16, background: "var(--border-strong)" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Slide-over Node Inspector Config Panel */}
        {selectedNode && (
          <div
            style={{
              width: 320,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "var(--shadow)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
                ⚙️ Node Settings
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSelectedNodeId(null)}
                style={{ padding: "2px 6px", fontSize: 12 }}
              >
                ✕ Close
              </button>
            </div>

            {/* Node Title Field */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                Node Title
              </label>
              <input
                type="text"
                value={selectedNode.title}
                onChange={(e) => updateNodeField(selectedNode.id, "title", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: 12.5,
                }}
              />
            </div>

            {/* Config options based on Node Type */}
            {selectedNode.type === "TRIGGER" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Trigger Event
                  </label>
                  <select
                    value={selectedNode.eventType}
                    onChange={(e) => updateNodeField(selectedNode.id, "eventType", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  >
                    <option value="After Call End">After Call End</option>
                    <option value="Webhook Received">Webhook Received</option>
                    <option value="Manual Escalation Trigger">Manual Escalation Trigger</option>
                    <option value="Payment Overdue Event">Payment Overdue Event</option>
                  </select>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", display: "block", marginBottom: 8 }}>
                    🎯 Call Fields Taxonomy Filters
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", display: "block" }}>Handling Priority</span>
                      <select
                        value={selectedNode.filters?.priority || "ALL"}
                        onChange={(e) => updateNodeField(selectedNode.id, "filters.priority", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12 }}
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="RED">RED (High Priority Escalation)</option>
                        <option value="GREY">GREY (Review Zone)</option>
                        <option value="GREEN">GREEN (Standard Resolution)</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", display: "block" }}>Customer Intent</span>
                      <select
                        value={selectedNode.filters?.intent || "ALL"}
                        onChange={(e) => updateNodeField(selectedNode.id, "filters.intent", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12 }}
                      >
                        <option value="ALL">All Intents</option>
                        <option value="POSITIVE">POSITIVE</option>
                        <option value="NEGATIVE">NEGATIVE</option>
                        <option value="CONDITIONAL">CONDITIONAL</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", display: "block" }}>Call Outcome</span>
                      <select
                        value={selectedNode.filters?.outcome || "ALL"}
                        onChange={(e) => updateNodeField(selectedNode.id, "filters.outcome", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12 }}
                      >
                        <option value="ALL">All Outcomes</option>
                        <option value="NEEDS_INSTALMENTS">NEEDS_INSTALMENTS</option>
                        <option value="REFUSED_PAYMENT">REFUSED_PAYMENT</option>
                        <option value="DISPUTING_BILL">DISPUTING_BILL</option>
                        <option value="FINANCIAL_HARDSHIP">FINANCIAL_HARDSHIP</option>
                        <option value="PTP_AGREED">PTP_AGREED</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", display: "block" }}>Hardship / Situation</span>
                      <select
                        value={selectedNode.filters?.situation || "ALL"}
                        onChange={(e) => updateNodeField(selectedNode.id, "filters.situation", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12 }}
                      >
                        <option value="ALL">All Situations</option>
                        <option value="FINANCIAL_HARDSHIP">FINANCIAL_HARDSHIP</option>
                        <option value="JOB_LOSS_UNEMPLOYMENT">JOB_LOSS_UNEMPLOYMENT</option>
                        <option value="BILLING_DISPUTE_DISCREPANCY">BILLING_DISPUTE_DISCREPANCY</option>
                        <option value="MEDICAL_EMERGENCY">MEDICAL_EMERGENCY</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.type === "SEND_MESSAGE" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Messaging Channel
                  </label>
                  <select
                    value={selectedNode.channel || "sms"}
                    onChange={(e) => updateNodeField(selectedNode.id, "channel", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Message Body Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={selectedNode.messagePrompt || ""}
                    onChange={(e) => updateNodeField(selectedNode.id, "messagePrompt", e.target.value)}
                    placeholder="Enter message body prompt text..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12, resize: "vertical" }}
                  />
                </div>
              </div>
            )}

            {selectedNode.type === "CALL_AGENT" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Select Voice AI Agent
                  </label>
                  <select
                    value={selectedNode.agent || "Hakim AI agent (Legal & Severe Collections)"}
                    onChange={(e) => updateNodeField(selectedNode.id, "agent", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  >
                    <option value="Hakim AI agent (Legal & Severe Collections)">Hakim AI agent (Legal &amp; Severe Collections)</option>
                    <option value="Aina AI agent (Mandatory Dispute Escalation)">Aina AI agent (Mandatory Dispute Escalation)</option>
                    <option value="Mei Ling AI agent (Mandarin Voice Assistant)">Mei Ling AI agent (Mandarin Voice Assistant)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Pass Context / Custom Prompt Box
                  </label>
                  <textarea
                    rows={4}
                    value={selectedNode.contextPrompt || ""}
                    onChange={(e) => updateNodeField(selectedNode.id, "contextPrompt", e.target.value)}
                    placeholder="Enter custom context text prompt to pass to AI agent..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12, resize: "vertical" }}
                  />
                </div>
              </div>
            )}

            {selectedNode.type === "INTERNAL_TEAM" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Select Target Internal Team
                </label>
                <select
                  value={selectedNode.team || "QA depart (records verify)"}
                  onChange={(e) => updateNodeField(selectedNode.id, "team", e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                >
                  <option value="QA depart (records verify)">QA depart (records verify)</option>
                  <option value="Legal & Recovery Desk">Legal &amp; Recovery Desk</option>
                  <option value="Supervisor Escalations Desk">Supervisor Escalations Desk</option>
                  <option value="Billing Calculations & Dispute Team">Billing Calculations &amp; Dispute Team</option>
                  <option value="Hardship & Financial Assistance Desk">Hardship &amp; Financial Assistance Desk</option>
                </select>
              </div>
            )}

            {selectedNode.type === "VERIFY_BILL" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Payment Verification Rule
                </label>
                <input
                  type="text"
                  value={selectedNode.condition || ""}
                  onChange={(e) => updateNodeField(selectedNode.id, "condition", e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                />
              </div>
            )}

            {selectedNode.type === "FETCH_BILL" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  API Account Query Action
                </label>
                <input
                  type="text"
                  value={selectedNode.accountQuery || ""}
                  onChange={(e) => updateNodeField(selectedNode.id, "accountQuery", e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                />
              </div>
            )}

            {selectedNode.type === "UPDATE_FIELDS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={selectedNode.fieldName || ""}
                    onChange={(e) => updateNodeField(selectedNode.id, "fieldName", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Field Value
                  </label>
                  <input
                    type="text"
                    value={selectedNode.fieldValue || ""}
                    onChange={(e) => updateNodeField(selectedNode.id, "fieldValue", e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  />
                </div>
              </div>
            )}

            {selectedNode.type === "PUT_DND" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    DND Registration Type
                  </label>
                  <select
                    value={selectedNode.dndType || "permanent"}
                    onChange={(e) => updateNodeField(selectedNode.id, "dndType", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  >
                    <option value="permanent">Permanent DND</option>
                    <option value="temporary">Temporary DND (30 Days)</option>
                    <option value="opt-out">Customer Opt-Out Request</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    DND Reason
                  </label>
                  <input
                    type="text"
                    value={selectedNode.reason || ""}
                    onChange={(e) => updateNodeField(selectedNode.id, "reason", e.target.value)}
                    placeholder="Enter reason..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Template Selector Modal */}
      {showAddNodeModal && (
        <Modal title="Add Action Node to Workflow" onClose={() => setShowAddNodeModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {NODE_TYPES.map((nt) => (
              <div
                key={nt.type}
                onClick={() => handleAddNodeTemplate(nt)}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: `${nt.color}20`,
                    color: nt.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  {nt.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
                    {nt.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>
                    {nt.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
