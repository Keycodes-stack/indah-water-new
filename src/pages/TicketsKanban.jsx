/* ============================================================
   Native Ticketing & CRM Kanban Board
   Organizes customer debtor accounts into collection ladder stages
   with full CRM context, live AI transcripts, AI summaries,
   rep notes, and simplified Approve / Decline call takeover.
   ============================================================ */

import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  getTicketsStore,
  updateTicketInStore,
  addTicketNoteInStore,
  TICKET_STAGES,
} from "../db/tickets.js";
import { session, isSupervisor, getSupervisors } from "../auth/session.js";
import { rm, num, relativeTime } from "../lib/format.js";
import { Stats, Panel, Badge, Modal, Field } from "../components/ui.jsx";

export default function TicketsKanban() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState(() => [...getTicketsStore()]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchParams] = useSearchParams();

  // Filters
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [stageFilter, setStageFilter] = useState("all");
  const [onlyFlagged, setOnlyFlagged] = useState(searchParams.get("flagged") === "true");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");

  // User session
  const userSession = session();
  const currentUsername = userSession?.user || "admin";
  const supervisorUser = isSupervisor();
  const supervisorsList = getSupervisors();

  // Note input in modal
  const [newNoteText, setNewNoteText] = useState("");
  // Active call simulation state
  const [callTimer, setCallTimer] = useState(0);
  const [activeCallInterval, setActiveCallInterval] = useState(null);

  // Sync tickets store
  const refreshStore = () => {
    setTickets([...getTicketsStore()]);
    if (selectedTicket) {
      const refreshed = getTicketsStore().find((t) => t.id === selectedTicket.id);
      if (refreshed) setSelectedTicket(refreshed);
    }
  };

  // Auto-open ticket if account parameter passed in URL
  useEffect(() => {
    const accParam = searchParams.get("account");
    if (accParam) {
      const found = tickets.find((t) => t.accountNo === accParam || t.customerId === accParam || t.id === accParam);
      if (found) setSelectedTicket(found);
    }
  }, [searchParams, tickets]);

  // Handle active call timer when an agent takes over
  useEffect(() => {
    if (selectedTicket?.status === "Agent Handling") {
      const interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallTimer(0);
    }
  }, [selectedTicket?.status]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const query = q.trim().toLowerCase();
    return tickets.filter((t) => {
      if (onlyFlagged && !t.isFlagged) return false;
      if (stageFilter !== "all" && t.stage !== stageFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (supervisorUser && t.assignedSupervisor !== currentUsername) return false;
      if (!supervisorUser && supervisorFilter !== "all" && t.assignedSupervisor !== supervisorFilter) return false;

      if (query) {
        const hay = `${t.id} ${t.accountNo} ${t.name} ${t.phone} ${t.email} ${t.area} ${t.state} ${t.flagReason || ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [tickets, q, onlyFlagged, stageFilter, categoryFilter, supervisorFilter, supervisorUser, currentUsername]);

  // Group tickets by ladder stage
  const columns = useMemo(() => {
    const map = {};
    TICKET_STAGES.forEach((stg) => {
      map[stg] = [];
    });
    filteredTickets.forEach((t) => {
      if (map[t.stage]) {
        map[t.stage].push(t);
      } else {
        if (!map["Early Arrears"]) map["Early Arrears"] = [];
        map["Early Arrears"].push(t);
      }
    });
    return map;
  }, [filteredTickets]);

  // Metrics
  const totalCount = tickets.length;
  const flaggedCount = tickets.filter((t) => t.isFlagged).length;
  const handlingCount = tickets.filter((t) => t.status === "Agent Handling").length;
  const totalArrearsTracked = useMemo(() => {
    return tickets.reduce((acc, t) => acc + (Number(t.arrearsAmount) || 0), 0);
  }, [tickets]);

  // Handlers
  const handleApproveTakeover = (ticket) => {
    updateTicketInStore(ticket.id, {
      status: "Agent Handling",
      isFlagged: false,
      assignedSupervisor: currentUsername,
    });
    addTicketNoteInStore(
      ticket.id,
      `Call Taken Over by @${currentUsername}. Redirecting to Twilio live call audio session...`,
      `@${currentUsername}`
    );
    refreshStore();
    setSelectedTicket(null);
    navigate("/call/join");
  };

  const handleReassignSupervisor = (ticketId, newSupervisor) => {
    const updated = updateTicketInStore(ticketId, { assignedSupervisor: newSupervisor });
    addTicketNoteInStore(
      ticketId,
      `Ticket reassigned to supervisor @${newSupervisor} by @${currentUsername}.`,
      `@${currentUsername}`
    );
    refreshStore();
    if (selectedTicket?.id === ticketId && updated) {
      setSelectedTicket({ ...updated });
    }
  };

  const handleDeclineAlert = (ticket) => {
    const updated = updateTicketInStore(ticket.id, {
      status: "Open",
      isFlagged: false,
    });
    addTicketNoteInStore(
      ticket.id,
      `Alert dismissed by @${currentUsername}. Queued for standard collection review.`,
      `@${currentUsername}`
    );
    refreshStore();
    if (selectedTicket?.id === ticket.id && updated) {
      setSelectedTicket({ ...updated });
    }
  };

  const handleMoveStage = (ticketId, newStage) => {
    const updated = updateTicketInStore(ticketId, { stage: newStage });
    addTicketNoteInStore(
      ticketId,
      `Collection ladder stage advanced to '${newStage}'.`,
      `@${currentUsername}`
    );
    refreshStore();
    if (selectedTicket?.id === ticketId && updated) {
      setSelectedTicket({ ...updated });
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedTicket) return;
    addTicketNoteInStore(selectedTicket.id, newNoteText.trim(), `@${currentUsername}`);
    setNewNoteText("");
    refreshStore();
  };

  const handleLogPTP = () => {
    if (!selectedTicket) return;
    const ptpAmount = (selectedTicket.arrearsAmount * 0.5).toFixed(2);
    addTicketNoteInStore(
      selectedTicket.id,
      `Promise-to-Pay (PTP) secured for RM ${ptpAmount} due within 7 calendar days.`,
      `@${currentUsername}`
    );
    updateTicketInStore(selectedTicket.id, {
      status: "Resolved",
    });
    refreshStore();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="tickets-page">
      {/* Top Collective KPIs */}
      <Stats
        cards={[
          {
            label: "Total Account Tickets",
            value: num(totalCount),
            sub: "Active collections book records",
          },
          {
            label: "AI Flagged Queue",
            value: num(flaggedCount),
            sub: "Requires rep takeover / dispute",
            tone: flaggedCount > 0 ? "bad" : "good",
          },
          {
            label: "Active Rep Handling",
            value: num(handlingCount),
            sub: "Calls currently in progress",
            tone: handlingCount > 0 ? "good" : undefined,
          },
          {
            label: "Total Arrears In Play",
            value: rm(totalArrearsTracked),
            sub: "Across all ladder stages",
          },
        ]}
      />

      {/* Control & Filter Panel */}
      <Panel className="tickets-filters-panel">
        <div className="tickets-filter-bar">
          <div className="tickets-search-wrap">
            <input
              type="search"
              placeholder="Search tickets by name, account no, phone, area..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="tickets-search-input"
            />
            {q && (
              <button className="tickets-clear-btn" onClick={() => setQ("")}>
                ×
              </button>
            )}
          </div>

          <div className="tickets-filter-controls">
            <label className="tickets-toggle-flagged">
              <input
                type="checkbox"
                checked={onlyFlagged}
                onChange={(e) => setOnlyFlagged(e.target.checked)}
              />
              <span className="flag-toggle-label">Only AI Flagged</span>
            </label>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="tickets-select"
            >
              <option value="all">All Ladder Stages</option>
              {TICKET_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tickets-select"
            >
              <option value="all">All Categories</option>
              <option value="Domestic">Domestic</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
            </select>

            {!supervisorUser && (
              <select
                value={supervisorFilter}
                onChange={(e) => setSupervisorFilter(e.target.value)}
                className="tickets-select"
              >
                <option value="all">All Supervisors</option>
                {supervisorsList.map((sup) => (
                  <option key={sup.username} value={sup.username}>
                    @{sup.username}
                  </option>
                ))}
              </select>
            )}

            <button className="btn-ghost" onClick={refreshStore}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </Panel>

      {/* Kanban Board Container */}
      <div className="kanban-board-container">
        <div className="kanban-columns-grid">
          {TICKET_STAGES.map((stageName) => {
            const stageTickets = columns[stageName] || [];
            const stageValue = stageTickets.reduce((acc, t) => acc + (Number(t.arrearsAmount) || 0), 0);

            return (
              <div key={stageName} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-header-left">
                    <span className="kanban-stage-title">{stageName}</span>
                    <span className="kanban-count-pill">{stageTickets.length}</span>
                  </div>
                  <div className="kanban-stage-value">{rm(stageValue)}</div>
                </div>

                <div className="kanban-cards-scroll">
                  {stageTickets.length === 0 ? (
                    <div className="kanban-empty-slot">No accounts in {stageName}</div>
                  ) : (
                    stageTickets.slice(0, 30).map((ticket) => {
                      const isHigh = ticket.priority === "High" || ticket.arrearsAmount > 1000;
                      return (
                        <div
                          key={ticket.id}
                          className={`kanban-card${ticket.isFlagged ? " is-flagged" : ""}${
                            ticket.status === "Agent Handling" ? " is-handling" : ""
                          }`}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          {/* Card Top Meta */}
                          <div className="kanban-card-top">
                            <span className="kanban-ticket-id">{ticket.id}</span>
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              <Badge
                                tone={
                                  ticket.category === "Industrial"
                                    ? "err"
                                    : ticket.category === "Commercial"
                                    ? "warn"
                                    : "info"
                                }
                              >
                                {ticket.category}
                              </Badge>
                              <Badge tone={isHigh ? "err" : "mute"}>{ticket.priority}</Badge>
                            </div>
                          </div>

                          {/* Customer Identification */}
                          <div className="kanban-customer-name">{ticket.name}</div>
                          <div className="kanban-account-no mono">{ticket.accountNo}</div>

                          {/* Arrears & Aging */}
                          <div className="kanban-arrears-row">
                            <span className="kanban-arrears-val">{rm(ticket.arrearsAmount)}</span>
                            <span className="kanban-aging-val">{ticket.arrearsDays}d overdue</span>
                          </div>

                          {/* Flag Trigger Alert Box if AI Flagged */}
                          {ticket.isFlagged && (
                            <div className="kanban-flag-alert">
                              <span className="pulse-dot">●</span>
                              <span className="flag-reason-text">
                                <strong>AI Flagged:</strong> {ticket.flagReason || "Requires Supervisor Takeover"}
                              </span>
                            </div>
                          )}

                          {/* Active Call Agent Handling Pill */}
                          {ticket.status === "Agent Handling" && (
                            <div className="kanban-handling-alert">
                              <span className="live-dot">●</span>
                              <span>Agent In-Call (@{ticket.assignedSupervisor})</span>
                            </div>
                          )}

                          {/* Card Footer */}
                          <div className="kanban-card-foot">
                            <span className="kanban-assigned-rep">@{ticket.assignedSupervisor}</span>
                            <span className="kanban-view-link">Context & Actions →</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {stageTickets.length > 30 && (
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", padding: "6px 0" }}>
                      + {stageTickets.length - 30} more accounts in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive CRM Ticket Modal Drawer */}
      {selectedTicket && (
        <Modal
          title={`Ticket: ${selectedTicket.id} — ${selectedTicket.name}`}
          wide
          onClose={() => setSelectedTicket(null)}
          footer={
            <div className="ticket-modal-footer-bar">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="dim" style={{ fontSize: 12 }}>
                  Stage: <strong>{selectedTicket.stage}</strong> · Status: <strong>{selectedTicket.status}</strong>
                </span>
              </div>
              <button className="btn-solid" onClick={() => setSelectedTicket(null)}>
                Close Record
              </button>
            </div>
          }
        >
          <div className="ticket-modal-content">
            {/* Live Call Alert Takeover Banner (if flagged or agent handling) */}
            {selectedTicket.isFlagged && (
              <div className="ticket-action-banner urgent">
                <div className="banner-left">
                  <div>
                    <h4>AI Flagged Call Alert — Supervisor Action Required</h4>
                    <p>{selectedTicket.flagReason}</p>
                  </div>
                </div>
                <div className="banner-buttons">
                  <button
                    className="btn-ghost danger"
                    onClick={() => handleDeclineAlert(selectedTicket)}
                  >
                    Decline Alert
                  </button>
                  <button
                    className="btn-solid"
                    style={{ background: "var(--good)" }}
                    onClick={() => handleApproveTakeover(selectedTicket)}
                  >
                    Approve (Take Over Call)
                  </button>
                </div>
              </div>
            )}

            {selectedTicket.status === "Agent Handling" && (
              <div className="ticket-action-banner connected">
                <div className="banner-left">
                  <div>
                    <h4>Live Rep Connected Session (Active)</h4>
                    <p>
                      Handling: <strong>{selectedTicket.name}</strong> · Duration:{" "}
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {formatTimer(callTimer)}
                      </span>{" "}
                      · Assigned: @{selectedTicket.assignedSupervisor}
                    </p>
                  </div>
                </div>
                <div className="banner-buttons">
                  <button className="btn-solid" onClick={handleLogPTP}>
                    Secured PTP (50%)
                  </button>
                  <button
                    className="btn-ghost danger"
                    onClick={() => {
                      updateTicketInStore(selectedTicket.id, { status: "Resolved" });
                      addTicketNoteInStore(
                        selectedTicket.id,
                        `Call concluded by @${currentUsername}. Total talk duration ${formatTimer(callTimer)}.`,
                        `@${currentUsername}`
                      );
                      refreshStore();
                    }}
                  >
                    End Call Session
                  </button>
                </div>
              </div>
            )}

            {/* 3-Column Ticket Detail Grid */}
            <div className="ticket-layout-grid">
              {/* Column 1: Customer Profile & Financials */}
              <div className="ticket-col profile-col">
                <div className="ticket-subpanel">
                  <h4>Customer CRM Profile</h4>
                  <dl className="kv-grid">
                    <dt>Account No</dt>
                    <dd className="mono">{selectedTicket.accountNo}</dd>
                    <dt>Category</dt>
                    <dd>{selectedTicket.category}</dd>
                    <dt>Segment</dt>
                    <dd>{selectedTicket.segment}</dd>
                    <dt>Phone</dt>
                    <dd className="mono">{selectedTicket.phone}</dd>
                    <dt>Email</dt>
                    <dd>{selectedTicket.email}</dd>
                    <dt>Premise Address</dt>
                    <dd>{selectedTicket.address}</dd>
                    <dt>Territory</dt>
                    <dd>
                      {selectedTicket.area}, {selectedTicket.state}
                    </dd>
                  </dl>
                </div>

                <div className="ticket-subpanel">
                  <h4>Debt & Collections Context</h4>
                  <dl className="kv-grid">
                    <dt>Arrears Amount</dt>
                    <dd>
                      <strong style={{ color: "var(--critical)", fontSize: 15 }}>
                        {rm(selectedTicket.arrearsAmount)}
                      </strong>
                    </dd>
                    <dt>Days Overdue</dt>
                    <dd>{selectedTicket.arrearsDays} days past due</dd>
                    <dt>Last Bill Date</dt>
                    <dd>{selectedTicket.lastBillDate}</dd>
                    <dt>Last Payment Date</dt>
                    <dd>{selectedTicket.lastPaymentDate}</dd>
                  </dl>

                  <div style={{ marginTop: 12 }}>
                    <Field label="Collection Ladder Stage">
                      <select
                        value={selectedTicket.stage}
                        onChange={(e) => handleMoveStage(selectedTicket.id, e.target.value)}
                        className="tickets-select"
                        style={{ width: "100%" }}
                      >
                        {TICKET_STAGES.map((stg) => (
                          <option key={stg} value={stg}>
                            Move to: {stg}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Field label="Assigned Supervisor / Queue">
                      <select
                        value={selectedTicket.assignedSupervisor || "supervisor"}
                        onChange={(e) => handleReassignSupervisor(selectedTicket.id, e.target.value)}
                        className="tickets-select"
                        style={{ width: "100%" }}
                      >
                        {supervisorsList.map((s) => (
                          <option key={s.username} value={s.username}>
                            @{s.username} — {s.name} ({s.queue || "Queue"})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Column 2: AI Diagnostic Summary & Transcript */}
              <div className="ticket-col transcript-col">
                <div className="ticket-subpanel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4>AI Call Diagnostic & Sentiment</h4>
                    <Badge tone={selectedTicket.sentiment.includes("Negative") ? "err" : "ok"}>
                      {selectedTicket.sentiment}
                    </Badge>
                  </div>
                  <p className="ticket-ai-summary">{selectedTicket.aiSummary}</p>
                </div>

                <div className="ticket-subpanel" style={{ flex: 1 }}>
                  <h4>Interactive Call Transcript Stream</h4>
                  <div className="ticket-transcript-stream">
                    {selectedTicket.transcript.map((msg, idx) => {
                      const isAgent = msg.sender.includes("Agent") || msg.sender.includes("AI");
                      return (
                        <div key={idx} className={`transcript-bubble ${isAgent ? "agent" : "customer"}`}>
                          <div className="bubble-header">
                            <span className="bubble-sender">{msg.sender}</span>
                            <span className="bubble-time">{msg.time}</span>
                          </div>
                          <div className="bubble-text">{msg.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 3: Rep Notes Log & History */}
              <div className="ticket-col notes-col">
                <div className="ticket-subpanel">
                  <h4>Rep Interaction Notes</h4>
                  <form onSubmit={handleAddNote} style={{ marginBottom: 12 }}>
                    <textarea
                      rows={3}
                      placeholder="Add supervisor/rep note regarding this customer account..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="ticket-note-input"
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button type="submit" className="btn-solid" style={{ fontSize: 12 }}>
                        Add Note
                      </button>
                    </div>
                  </form>

                  <div className="ticket-notes-thread">
                    {selectedTicket.notes.map((n, i) => (
                      <div key={i} className="ticket-note-item">
                        <div className="note-meta">
                          <span className="note-author">{n.author}</span>
                          <span className="note-time">{n.timestamp}</span>
                        </div>
                        <div className="note-body">{n.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ticket-subpanel">
                  <h4>Past Call History</h4>
                  <div className="ticket-call-history-list">
                    {selectedTicket.callHistory.map((ch, idx) => (
                      <div key={idx} className="call-history-row">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{ch.date}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                            {ch.assistant} · {ch.duration}
                          </div>
                        </div>
                        <Badge tone="mute" style={{ fontSize: 10 }}>
                          {ch.outcome}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
