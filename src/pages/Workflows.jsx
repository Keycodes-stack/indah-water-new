import { useState, useMemo, useRef, useEffect } from "react";
import { Badge, Modal } from "../components/ui.jsx";

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
        title: "Trigger: After Call End",
        eventType: "After Call End",
        x: 80,
        y: 180,
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
        title: "Fetch Bill Amount",
        accountQuery: "Pull Live Outstanding Balance & Due Date",
        x: 420,
        y: 180,
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "Send SMS Details",
        channel: "sms",
        messagePrompt: "Salam {{customer_name}}, your IWK account {{account_no}} has an outstanding balance of {{bill_amount}}. Here is your installment schedule link: {{installment_url}}.",
        x: 760,
        y: 180,
      },
      {
        id: "n-4",
        type: "UPDATE_FIELDS",
        title: "Update Customer Fields",
        fieldName: "followup_status",
        fieldValue: "INSTALLMENT_SCHEDULED",
        x: 1100,
        y: 180,
      },
      {
        id: "n-5",
        type: "INTERNAL_TEAM",
        title: "Send to Internal Team",
        team: "Hardship & Financial Assistance Desk",
        x: 1440,
        y: 180,
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
        title: "Trigger: After Call End",
        eventType: "After Call End",
        x: 80,
        y: 180,
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
        title: "Put in DND",
        dndType: "permanent",
        reason: "Explicit refusal & Do-Not-Call suppression requested",
        x: 420,
        y: 180,
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "Send Legal Pre-Notice",
        channel: "sms",
        messagePrompt: "PERINGATAN MESRA IWK: Akaun {{account_no}} telah dimajukan ke Unit Tindakan Khas. Sila jelaskan tunggakan atau hubungi 03-20803888.",
        x: 760,
        y: 180,
      },
      {
        id: "n-4",
        type: "CALL_AGENT",
        title: "Trigger AI Agent Call",
        agent: "Hakim AI agent (Legal & Severe Collections)",
        contextPrompt: "Customer explicitly refused payment on previous call. Initiate formal recovery statement and explain legal escalation steps.",
        x: 1100,
        y: 180,
      },
      {
        id: "n-5",
        type: "INTERNAL_TEAM",
        title: "Send to Internal Team",
        team: "Legal & Recovery Desk",
        x: 1440,
        y: 180,
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
        title: "Trigger: After Call End",
        eventType: "After Call End",
        x: 80,
        y: 180,
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
        title: "Verify Bill Paid",
        condition: "Check ledger payment transaction & receipt status",
        x: 420,
        y: 180,
      },
      {
        id: "n-3",
        type: "FETCH_BILL",
        title: "Fetch Bill Amount",
        accountQuery: "Query ledger for itemized dispute breakdown",
        x: 760,
        y: 180,
      },
      {
        id: "n-4",
        type: "INTERNAL_TEAM",
        title: "Send to Internal Team",
        team: "QA depart (records verify)",
        x: 1100,
        y: 180,
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
        title: "Trigger: Webhook Received",
        eventType: "Webhook Received",
        x: 80,
        y: 180,
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
        title: "Verify Bill Paid",
        condition: "Verify FPX / JomPAY transaction reference ID",
        x: 420,
        y: 180,
      },
      {
        id: "n-3",
        type: "SEND_MESSAGE",
        title: "Send WhatsApp Receipt",
        channel: "whatsapp",
        messagePrompt: "Terima kasih {{customer_name}}! Pembayaran sebanyak {{paid_amount}} untuk akaun IWK {{account_no}} telah berjaya dikemas kini.",
        x: 760,
        y: 180,
      },
      {
        id: "n-4",
        type: "UPDATE_FIELDS",
        title: "Update Customer Fields",
        fieldName: "account_status",
        fieldValue: "PAID_IN_FULL",
        x: 1100,
        y: 180,
      },
    ],
  },
];

const NODE_TYPES = [
  {
    type: "SEND_MESSAGE",
    title: "Send SMS / Email / WhatsApp",
    icon: "",
    color: "#10b981",
    description: "Dispatch automated SMS, Email, or WhatsApp text notification.",
  },
  {
    type: "CALL_AGENT",
    title: "Call Agent Trigger",
    icon: "",
    color: "#8b5cf6",
    description: "Trigger AI voice agent with custom context and prompts.",
  },
  {
    type: "INTERNAL_TEAM",
    title: "Send to Internal Team",
    icon: "",
    color: "#3b82f6",
    description: "Route case lead to QA, Legal, Dispute, or Supervisor desks.",
  },
  {
    type: "VERIFY_BILL",
    title: "Verify Bill Paid",
    icon: "",
    color: "#06b6d4",
    description: "Verify payment ledger and FPX / JomPAY transaction status.",
  },
  {
    type: "FETCH_BILL",
    title: "Fetch Bill Amount",
    icon: "",
    color: "#f59e0b",
    description: "Query live API for outstanding balance and itemized bill details.",
  },
  {
    type: "UPDATE_FIELDS",
    title: "Update Customer Fields",
    icon: "",
    color: "#ec4899",
    description: "Update account status, priority tags, and customer notes.",
  },
  {
    type: "PUT_DND",
    title: "Put in DND",
    icon: "",
    color: "#ef4444",
    description: "Add customer directly to Do Not Disturb registry.",
  },
];

const AVAILABLE_VARIABLES = [
  { key: "{{customer_name}}", label: "Customer Name", desc: "Full name of customer" },
  { key: "{{account_no}}", label: "IWK Account No.", desc: "Sewerage account number" },
  { key: "{{bill_amount}}", label: "Outstanding Amount", desc: "Current bill balance" },
  { key: "{{due_date}}", label: "Bill Due Date", desc: "Payment due date" },
  { key: "{{installment_url}}", label: "Installment Link", desc: "Custom arrangement URL" },
  { key: "{{paid_amount}}", label: "Paid Amount", desc: "Last verified payment" },
  { key: "{{priority_level}}", label: "Priority Tag", desc: "RED, GREY, GREEN" },
  { key: "{{call_summary}}", label: "AI Call Summary", desc: "Transcript summary" },
];

export default function Workflows() {
  const [workflowsList, setWorkflowsList] = useState(PREBUILT_WORKFLOWS);
  const [activeWfId, setActiveWfId] = useState(PREBUILT_WORKFLOWS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [insertIndex, setInsertIndex] = useState(null);
  const [toast, setToast] = useState(null);

  // Miro Canvas Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);

  // Collapsible sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const activeWf = useMemo(() => {
    return workflowsList.find((w) => w.id === activeWfId) || workflowsList[0];
  }, [workflowsList, activeWfId]);

  // Ensure all nodes have x, y coordinates
  const nodesWithPositions = useMemo(() => {
    if (!activeWf) return [];
    return activeWf.nodes.map((node, idx) => ({
      ...node,
      x: typeof node.x === "number" ? node.x : 80 + idx * 340,
      y: typeof node.y === "number" ? node.y : 180,
    }));
  }, [activeWf]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !nodesWithPositions) return null;
    return nodesWithPositions.find((n) => n.id === selectedNodeId) || null;
  }, [nodesWithPositions, selectedNodeId]);

  // Handle Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 60, y: 60 });
  };
  const handleCenterView = () => {
    if (nodesWithPositions.length === 0) return;
    const minX = Math.min(...nodesWithPositions.map((n) => n.x));
    const maxX = Math.max(...nodesWithPositions.map((n) => n.x));
    const minY = Math.min(...nodesWithPositions.map((n) => n.y));
    const maxY = Math.max(...nodesWithPositions.map((n) => n.y));

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (rect.width - (maxX - minX + 280) * zoom) / 2 - minX * zoom;
      const centerY = (rect.height - (maxY - minY + 160) * zoom) / 2 - minY * zoom;
      setPan({ x: Math.max(20, centerX), y: Math.max(20, centerY) });
    }
  };

  // Canvas Mouse Wheel Zooming
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => {
      const nextZoom = Math.min(2.5, Math.max(0.3, z * zoomFactor));
      return +nextZoom.toFixed(2);
    });
  };

  // Canvas Pan Handlers
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest(".workflow-node-card") || e.target.closest(".canvas-control-dock")) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

      // Update active node coordinates in workflowsList
      setWorkflowsList((prev) =>
        prev.map((w) => {
          if (w.id !== activeWf.id) return w;
          const updatedNodes = w.nodes.map((n) =>
            n.id === draggingNodeId
              ? { ...n, x: Math.round(rawX), y: Math.round(rawY) }
              : n
          );
          return { ...w, nodes: updatedNodes };
        })
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Dragging Start
  const handleNodeMouseDown = (node, e) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({
        x: mouseCanvasX - node.x,
        y: mouseCanvasY - node.y,
      });
    }
  };

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
          title: "Trigger: After Call End",
          eventType: "After Call End",
          x: 100,
          y: 200,
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
          title: "Send SMS Notification",
          channel: "sms",
          messagePrompt: "Salam {{customer_name}}, regarding your IWK account {{account_no}}...",
          x: 460,
          y: 200,
        },
      ],
    };
    setWorkflowsList([newWf, ...workflowsList]);
    setActiveWfId(newId);
    setSelectedNodeId(null);
    setToast("New Workflow Created!");
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle Publish Status
  const handleTogglePublish = () => {
    const nextStatus = activeWf.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setWorkflowsList((prev) =>
      prev.map((w) => (w.id === activeWf.id ? { ...w, status: nextStatus } : w))
    );
    setToast(`Workflow status set to ${nextStatus}!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Save Workflow
  const handleSaveWorkflow = () => {
    setToast(`Workflow "${activeWf.name}" saved successfully!`);
    setTimeout(() => setToast(null), 3000);
  };

  // Add Node to Flow
  const handleAddNodeTemplate = (nodeTemplate) => {
    const newNodeId = `n-${Date.now()}`;

    let lastNode = nodesWithPositions[nodesWithPositions.length - 1];
    let spawnX = lastNode ? lastNode.x + 340 : 100;
    let spawnY = lastNode ? lastNode.y : 200;

    if (insertIndex !== null && nodesWithPositions[insertIndex]) {
      const prevN = nodesWithPositions[insertIndex];
      const nextN = nodesWithPositions[insertIndex + 1];
      if (nextN) {
        spawnX = Math.round((prevN.x + nextN.x) / 2);
        spawnY = Math.round((prevN.y + nextN.y) / 2);
      } else {
        spawnX = prevN.x + 340;
        spawnY = prevN.y;
      }
    }

    let newNode = {
      id: newNodeId,
      type: nodeTemplate.type,
      title: `${nodeTemplate.icon} ${nodeTemplate.title}`,
      x: spawnX,
      y: spawnY,
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
    setToast(`Added ${nodeTemplate.title} node!`);
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
    setToast("Node removed!");
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
              [parent]: { ...(n[parent] || {}), [child]: value },
            };
          }
          return { ...n, [key]: value };
        });
        return { ...w, nodes: updatedNodes };
      })
    );
  };

  // Quick Insert Variable into Prompt Text Field
  const handleInsertVariable = (varKey, targetField = "messagePrompt") => {
    if (!selectedNode) return;
    const currentText = selectedNode[targetField] || "";
    updateNodeField(selectedNode.id, targetField, `${currentText} ${varKey}`);
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
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Workflows Canvas</span>
            <Badge tone="good" style={{ fontSize: 11, padding: "2px 8px" }}>Miro Mode</Badge>
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Interactive infinite Miro-style workflow builder for Indah Water AI Recovery Engine. Drag nodes, pan, and zoom.
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

      {/* Main Split Layout: Prebuilt Workflows Sidebar (Left) + Canvas Builder (Middle/Right) + Node Info Panel (Right) */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0, position: "relative" }}>
        {/* Left Sidebar: Prebuilt Workflows List (Collapsible) */}
        <div
          style={{
            width: isSidebarOpen ? 300 : 54,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: isSidebarOpen ? 16 : "12px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: "var(--shadow)",
            zIndex: 2,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {isSidebarOpen ? (
            <>
              {/* Sidebar Header with Collapse Toggle Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Prebuilt Workflows ({workflowsList.length})
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  title="Collapse Panel"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-dim)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  ◀ Collapse
                </button>
              </div>

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
                Create New Workflow
              </button>

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
                        whiteSpace: "normal",
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
                        <span>{wf.nodes.length} Nodes</span>
                        <span style={{ color: "var(--brand)", fontWeight: 600 }}>{wf.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Collapsed Slim Dock View */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="Expand Workflows Panel"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--brand)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                ▶
              </button>

              <div
                onClick={() => setIsSidebarOpen(true)}
                title="Click to expand Prebuilt Workflows"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {workflowsList.map((wf) => {
                  const isActive = wf.id === activeWf.id;
                  return (
                    <div
                      key={wf.id}
                      title={`${wf.name} (${wf.status})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveWfId(wf.id);
                        setSelectedNodeId(null);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isActive ? "var(--brand)" : "var(--surface-2)",
                        color: isActive ? "#fff" : "var(--text)",
                        border: isActive ? "2px solid #fff" : "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        boxShadow: isActive ? "0 0 10px rgba(59,130,246,0.5)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      
                    </div>
                  );
                })}

                <div
                  style={{
                    writingMode: "vertical-rl",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    fontSize: 10,
                    fontWeight: 800,
                    color: "var(--text-dim)",
                    transform: "rotate(180deg)",
                    marginTop: 10,
                  }}
                >
                  Workflows ({workflowsList.length})
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Miro Canvas Viewport Area */}
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            flex: 1,
            background: "#0d1117",
            border: "1px solid var(--border)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
            position: "relative",
            cursor: isPanning ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          {/* Top Canvas Bar */}
          <div
            style={{
              padding: "10px 18px",
              background: "rgba(22, 27, 34, 0.85)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              zIndex: 10,
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
                {activeWf.status === "ACTIVE" ? "ACTIVE" : "DRAFT"}
              </Badge>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleTogglePublish}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {activeWf.status === "ACTIVE" ? "Unpublish to Draft" : " Publish Workflow"}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setInsertIndex(nodesWithPositions.length - 1);
                  setShowAddNodeModal(true);
                }}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}
              >
                Add Node
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
                Save Workflow
              </button>
            </div>
          </div>

          {/* Miro Infinite Grid Canvas Layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px)",
              backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              pointerEvents: "none",
            }}
          />

          {/* Zoomable & Pannable Transform Container */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              pointerEvents: "auto",
            }}
          >
            {/* Dynamic SVG Bezier Connection Lines */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 5000,
                height: 5000,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--brand)" />
                </marker>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {nodesWithPositions.map((node, index) => {
                if (index === nodesWithPositions.length - 1) return null;
                const nextNode = nodesWithPositions[index + 1];

                // Output port of current node (Right center)
                const startX = node.x + 280;
                const startY = node.y + 70;

                // Input port of next node (Left center)
                const endX = nextNode.x;
                const endY = nextNode.y + 70;

                const dx = Math.abs(endX - startX) * 0.5;
                const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                // Midpoint for dynamic insert node button
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                return (
                  <g key={`conn-${node.id}-${nextNode.id}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      markerEnd="url(#arrow)"
                      style={{ transition: draggingNodeId ? "none" : "all 0.1s ease" }}
                    />
                    {/* Add node inline button on edge */}
                    <g
                      transform={`translate(${midX - 12}, ${midY - 12})`}
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsertIndex(index);
                        setShowAddNodeModal(true);
                      }}
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="12"
                        fill="var(--surface-2)"
                        stroke="var(--brand)"
                        strokeWidth="2"
                      />
                      <text
                        x="12"
                        y="16"
                        textAnchor="middle"
                        fill="var(--brand)"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        +
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Draggable Node Cards on Miro Board */}
            {nodesWithPositions.map((node, index) => {
              const isSelected = selectedNodeId === node.id;
              const nodeColor = getNodeColor(node.type);

              return (
                <div
                  key={node.id}
                  className="workflow-node-card"
                  onMouseDown={(e) => handleNodeMouseDown(node, e)}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: 280,
                    background: "var(--surface)",
                    border: isSelected ? `2.5px solid ${nodeColor}` : "1px solid var(--border-strong)",
                    borderRadius: 14,
                    boxShadow: isSelected
                      ? `0 0 20px ${nodeColor}55, 0 10px 25px rgba(0,0,0,0.5)`
                      : "0 6px 16px rgba(0,0,0,0.4)",
                    cursor: draggingNodeId === node.id ? "grabbing" : "grab",
                    overflow: "hidden",
                    zIndex: isSelected ? 8 : 4,
                    transition: draggingNodeId === node.id ? "none" : "box-shadow 0.2s ease, border 0.2s ease",
                  }}
                >
                  {/* Connection Input Dot */}
                  {index > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: -6,
                        top: 64,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "var(--brand)",
                        border: "2px solid #fff",
                        zIndex: 10,
                      }}
                    />
                  )}

                  {/* Connection Output Dot */}
                  {index < nodesWithPositions.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        right: -6,
                        top: 64,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        border: "2px solid #fff",
                        zIndex: 10,
                      }}
                    />
                  )}

                  {/* Node Top Header Drag Bar */}
                  <div
                    style={{
                      background: nodeColor,
                      color: "#ffffff",
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⣿</span>
                      <span>{node.type.replace(/_/g, " ")}</span>
                    </span>
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
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Node Body Content */}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                      {node.title}
                    </div>

                    {/* Node Specific Previews */}
                    {node.type === "TRIGGER" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div>Event: <strong>{node.eventType}</strong></div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                          <Badge tone="warn" style={{ fontSize: 9.5 }}>
                            Priority: {node.filters?.priority || "ALL"}
                          </Badge>
                          <Badge tone="info" style={{ fontSize: 9.5 }}>
                            Intent: {node.filters?.intent || "ALL"}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {node.type === "SEND_MESSAGE" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        <Badge tone="good" style={{ fontSize: 9.5, marginBottom: 4 }}>
                          {node.channel?.toUpperCase() || "SMS"}
                        </Badge>
                        <div style={{ fontStyle: "italic", fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          "{node.messagePrompt?.substring(0, 45)}..."
                        </div>
                      </div>
                    )}

                    {node.type === "CALL_AGENT" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        <div>Agent: <strong style={{ color: "#8b5cf6" }}>{node.agent}</strong></div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          Prompt: {node.contextPrompt?.substring(0, 35)}...
                        </div>
                      </div>
                    )}

                    {node.type === "INTERNAL_TEAM" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        Route to: <strong style={{ color: "#3b82f6" }}>{node.team}</strong>
                      </div>
                    )}

                    {node.type === "VERIFY_BILL" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        Rule: <strong>{node.condition}</strong>
                      </div>
                    )}

                    {node.type === "FETCH_BILL" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        API Query: <strong>{node.accountQuery}</strong>
                      </div>
                    )}

                    {node.type === "UPDATE_FIELDS" && (
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                        Set <code>{node.fieldName}</code> = <strong style={{ color: "#ec4899" }}>{node.fieldValue}</strong>
                      </div>
                    )}

                    {node.type === "PUT_DND" && (
                      <div style={{ fontSize: 11.5, color: "#ef4444" }}>
                        DND: <strong>{node.dndType?.toUpperCase()}</strong> ({node.reason})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Miro Floating Controls Dock (Bottom Left) */}
          <div
            className="canvas-control-dock"
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              background: "rgba(22, 27, 34, 0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-strong)",
              borderRadius: 30,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              zIndex: 20,
            }}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>

            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42, textAlign: "center", color: "var(--text)" }}>
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>

            <div style={{ width: 1, height: 18, background: "var(--border)" }} />

            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset 100%"
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              100%
            </button>

            <button
              type="button"
              onClick={handleCenterView}
              title="Center View"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: "var(--brand)",
                border: "none",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Fit View
            </button>
          </div>
        </div>

        {/* Right Slide-over Node Inspector & Configuration Panel */}
        {selectedNode && (
          <div
            style={{
              width: 340,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "var(--shadow)",
              overflowY: "auto",
              zIndex: 10,
            }}
          >
            {/* Panel Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: getNodeColor(selectedNode.type),
                  }}
                />
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
                  Node Information &amp; Config
                </div>
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

            {/* General Information */}
            <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
                <span>Node ID:</span>
                <code style={{ color: "var(--brand)" }}>{selectedNode.id}</code>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
                <span>Type:</span>
                <span style={{ fontWeight: 700, color: getNodeColor(selectedNode.type) }}>
                  {selectedNode.type}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
                <span>Position:</span>
                <span>X: {selectedNode.x}, Y: {selectedNode.y}</span>
              </div>
            </div>

            {/* Node Title Field */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                Node Title Label
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

            {/* Flow Variables Section */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Available Flow Variables</span>
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Click to Insert</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    title={v.desc}
                    onClick={() => handleInsertVariable(v.key)}
                    style={{
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#3b82f6",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Config Controls based on Node Type */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
                Node Configuration Options
              </div>

              {selectedNode.type === "TRIGGER" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                      Trigger Event Type
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

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)" }}>
                      Call Fields Taxonomy Filters
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", display: "block" }}>Handling Priority</span>
                      <select
                        value={selectedNode.filters?.priority || "ALL"}
                        onChange={(e) => updateNodeField(selectedNode.id, "filters.priority", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 12 }}
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
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 12 }}
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
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 12 }}
                      >
                        <option value="ALL">All Outcomes</option>
                        <option value="NEEDS_INSTALMENTS">NEEDS_INSTALMENTS</option>
                        <option value="REFUSED_PAYMENT">REFUSED_PAYMENT</option>
                        <option value="DISPUTING_BILL">DISPUTING_BILL</option>
                        <option value="FINANCIAL_HARDSHIP">FINANCIAL_HARDSHIP</option>
                        <option value="PTP_AGREED">PTP_AGREED</option>
                      </select>
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
                      rows={5}
                      value={selectedNode.messagePrompt || ""}
                      onChange={(e) => updateNodeField(selectedNode.id, "messagePrompt", e.target.value)}
                      placeholder="Enter message template text..."
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
                      Pass Context Prompt to Agent
                    </label>
                    <textarea
                      rows={4}
                      value={selectedNode.contextPrompt || ""}
                      onChange={(e) => updateNodeField(selectedNode.id, "contextPrompt", e.target.value)}
                      placeholder="Enter context prompt..."
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "INTERNAL_TEAM" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                    Select Target Internal Desk
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
                      DND Suppression Reason
                    </label>
                    <input
                      type="text"
                      value={selectedNode.reason || ""}
                      onChange={(e) => updateNodeField(selectedNode.id, "reason", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                    />
                  </div>
                </div>
              )}
            </div>
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
