/* ============================================================
   Call Alerts — live feed from the n8n webhook (GET).

   Response shape:
     { code: 200, data: [ { row_number, Call_id, Reason, Timestamp } ] }
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CONFIG } from "../../config.js";
import { session, isSupervisor, getSupervisors } from "../auth/session.js";
import { num, fmtDate, fmtTime, relativeTime, downloadCsv, rm } from "../lib/format.js";
import { Stats, Panel, Badge, Loading, ErrorState, EmptyState } from "../components/ui.jsx";
import { getTicketsStore, updateTicketInStore, addTicketNoteInStore } from "../db/tickets.js";
import * as ring from "../lib/ring.js";

/* An alert newer than this pops an incoming-call prompt on page load. */
const FRESH_ALERT_SECONDS = 60;
const RING_SECONDS = 6;

/* The prompt hands off to the same place as the Call / Join tab. */
const JOIN_ROUTE = "/call/join";

const ageInSeconds = (ts) => {
  const t = new Date(ts || 0).getTime();
  return Number.isNaN(t) || !t ? Infinity : (Date.now() - t) / 1000;
};

export default function CallAlerts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "Timestamp", dir: "desc" });

  const userSession = session();
  const supervisorUser = isSupervisor();
  const currentUsername = userSession?.user || "admin";
  const supervisorsList = getSupervisors();

  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(CONFIG.alerts.webhookUrl, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const body = await res.json();
      if (body?.code && body.code !== 200) {
        throw new Error(`Webhook returned code ${body.code}`);
      }

      // Tolerate the payload arriving bare or wrapped.
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setRows(list);
      setFetchedAt(new Date());
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Helper to link an alert row with a customer ticket from the native CRM store
  const getLinkedTicket = useCallback((r, index) => {
    const store = getTicketsStore();
    if (!store.length) return null;

    if (r?.Call_id) {
      const match = store.find(
        (t) =>
          t.customerId.toLowerCase().includes(String(r.Call_id).toLowerCase()) ||
          t.accountNo.toLowerCase().includes(String(r.Call_id).toLowerCase())
      );
      if (match) return match;
    }

    // Give priority to flagged accounts for realistic demo context
    const flagged = store.filter((t) => t.isFlagged);
    if (flagged.length > 0) {
      return flagged[(r.row_number ?? index ?? 0) % flagged.length];
    }
    return store[(r.row_number ?? index ?? 0) % store.length];
  }, []);

  // Persistent call assignment overrides by Admin
  const [assignments, setAssignments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("iwk_call_assignments") || "{}");
    } catch {
      return {};
    }
  });

  const handleAssignAlert = useCallback((alertKey, newSupervisor, linkedTicket) => {
    setAssignments((prev) => {
      const next = { ...prev, [alertKey]: newSupervisor };
      localStorage.setItem("iwk_call_assignments", JSON.stringify(next));
      return next;
    });

    if (linkedTicket) {
      updateTicketInStore(linkedTicket.id, { assignedSupervisor: newSupervisor });
      addTicketNoteInStore(
        linkedTicket.id,
        `Alert & Ticket assigned to @${newSupervisor} by Admin @${currentUsername}.`,
        `@${currentUsername}`
      );
    }
  }, [currentUsername]);

  // Deterministically map each alert to a registered supervisor and CRM Ticket
  const mappedRows = useMemo(() => {
    return rows.map((r, i) => {
      const alertKey = r.Call_id || `row-${r.row_number ?? i}`;
      const assigned =
        assignments[alertKey] ||
        r.supervisor ||
        supervisorsList[((r.row_number ?? i) % supervisorsList.length)]?.username ||
        "supervisor";
      const linkedTicket = getLinkedTicket(r, i);
      return { ...r, assignedSupervisor: assigned, linkedTicket, alertKey };
    });
  }, [rows, supervisorsList, getLinkedTicket, assignments]);

  // Supervisors ONLY see their own alerts; Admin sees all or filtered by supervisor
  const roleFilteredRows = useMemo(() => {
    if (supervisorUser) {
      return mappedRows.filter((r) => r.assignedSupervisor === currentUsername);
    }
    if (supervisorFilter !== "all") {
      return mappedRows.filter((r) => r.assignedSupervisor === supervisorFilter);
    }
    return mappedRows;
  }, [mappedRows, supervisorUser, currentUsername, supervisorFilter]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = roleFilteredRows.filter((r) =>
      !needle ||
      `${r.Call_id ?? ""} ${r.Reason ?? ""} ${r.Timestamp ?? ""} ${r.assignedSupervisor ?? ""}`.toLowerCase().includes(needle)
    );

    const mul = sort.dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === "Timestamp") {
        av = new Date(av || 0).getTime();
        bv = new Date(bv || 0).getTime();
      }
      if (typeof av === "string") return av.localeCompare(String(bv ?? "")) * mul;
      return (av === bv ? 0 : av > bv ? 1 : -1) * mul;
    });
  }, [roleFilteredRows, q, sort]);

  const latest = useMemo(() => {
    const times = roleFilteredRows.map((r) => new Date(r.Timestamp || 0).getTime()).filter(Boolean);
    return times.length ? new Date(Math.max(...times)) : null;
  }, [roleFilteredRows]);

  const uniqueCalls = useMemo(
    () => new Set(roleFilteredRows.map((r) => r.Call_id).filter(Boolean)).size,
    [roleFilteredRows]
  );

  /* ---------------- incoming-call prompt ----------------
     The demo flow is a manual page refresh. Whenever the newest alert in
     THIS user's scope is under a minute old, it pops as an incoming call
     with a ring. Fires once per load, so re-sorting or searching cannot
     retrigger it — only another refresh can. */

  const [incoming, setIncoming] = useState(null);
  const [muted, setMuted] = useState(false);   // browser refused to play
  const [ringCycle, setRingCycle] = useState(0); // bumped when the ring restarts
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current || loading || !roleFilteredRows.length) return;

    const newest = roleFilteredRows.reduce((best, r) => {
      if (!r.Timestamp) return best;
      return !best || new Date(r.Timestamp) > new Date(best.Timestamp) ? r : best;
    }, null);

    if (!newest || ageInSeconds(newest.Timestamp) >= FRESH_ALERT_SECONDS) return;

    prompted.current = true;
    setIncoming(newest);
    ring.start(RING_SECONDS).then((playing) => setMuted(!playing));
  }, [loading, roleFilteredRows]);

  /* Close on its own once the ring has finished. Keyed on ringCycle too, so
     enabling sound late restarts the countdown rather than cutting the ring
     off part-way through. */
  useEffect(() => {
    if (!incoming) return undefined;
    const t = setTimeout(() => {
      ring.stop();
      setIncoming(null);
    }, RING_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [incoming, ringCycle]);

  // Never leave a ring playing behind us.
  useEffect(() => () => ring.stop(), []);

  const closeIncoming = useCallback(() => {
    ring.stop();
    setIncoming(null);
  }, []);

  const joinCall = useCallback(() => {
    ring.stop();
    setIncoming(null);
    navigate(JOIN_ROUTE);
  }, [navigate]);

  const takeOverTicket = useCallback((ticket) => {
    if (ticket) {
      updateTicketInStore(ticket.id, {
        status: "Agent Handling",
        assignedSupervisor: currentUsername,
      });
      addTicketNoteInStore(
        ticket.id,
        `Supervisor @${currentUsername} initiated call takeover from live alert feed.`,
        `@${currentUsername}`
      );
    }
    ring.stop();
    setIncoming(null);
    navigate(`/customers?q=${ticket?.accountNo || ticket?.id || ""}`);
  }, [currentUsername, navigate]);

  const incomingTicket = useMemo(() => {
    if (!incoming) return null;
    return incoming.linkedTicket || getLinkedTicket(incoming, 0);
  }, [incoming, getLinkedTicket]);

  const enableSound = useCallback(async () => {
    // Runs inside a click, which is what the browser was waiting for.
    if (await ring.unlock()) {
      setMuted(false);
      ring.start(RING_SECONDS);
      setRingCycle((n) => n + 1); // restart the auto-dismiss countdown
    }
  }, []);

  function sortBy(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? "▴" : "▾") : "");

  function exportCsv() {
    downloadCsv(
      `call-alerts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Row", "Call ID", "Reason", "Timestamp", "Assigned Supervisor"],
      visible.map((r) => [r.row_number, r.Call_id, r.Reason, r.Timestamp, r.assignedSupervisor])
    );
  }

  return (
    <>
      {incoming && (
        <div className="ring-backdrop" role="dialog" aria-modal="true" aria-label="Incoming call alert">
          <div className="ring-card">
            <div className="ring-avatar" aria-hidden="true">
              <span className="ring-wave" />
              <span className="ring-wave d2" />
              ☎
            </div>

            <div className="ring-label">Incoming call alert · Live Flag</div>
            <h3 className="ring-title">{incoming.Reason || "Call flagged for attention"}</h3>

            {incomingTicket && (
              <div style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: "9px 12px",
                marginBottom: 14,
                textAlign: "left",
                fontSize: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <strong style={{ color: "var(--brand)", fontSize: 13 }}>{incomingTicket.name}</strong>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{incomingTicket.accountNo}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-dim)" }}>
                  <span>Arrears: <strong style={{ color: "var(--text)" }}>{rm(incomingTicket.arrearsAmount)}</strong></span>
                  <span className="badge info" style={{ fontSize: 10, padding: "2px 6px" }}>{incomingTicket.stage}</span>
                </div>
              </div>
            )}

            <dl className="ring-meta">
              <dt>Call ID</dt>
              <dd className="mono">{incoming.Call_id || "—"}</dd>
              <dt>Assigned to</dt>
              <dd>@{incoming.assignedSupervisor}</dd>
              <dt>Received</dt>
              <dd>{relativeTime(incoming.Timestamp)}</dd>
            </dl>

            {muted && (
              <button className="ring-sound" onClick={enableSound}>
                🔇 Sound blocked by the browser — tap to enable
              </button>
            )}

            <div className="ring-actions" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {incomingTicket && (
                <button
                  className="ring-btn approve"
                  style={{
                    background: "var(--brand, #0284c7)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: 9,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
                  }}
                  onClick={() => takeOverTicket(incomingTicket)}
                >
                  ⚡ Approve & Take Over in CRM
                </button>
              )}
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button className="ring-btn decline" style={{ flex: 1 }} onClick={closeIncoming}>
                  Dismiss
                </button>
                <button className="ring-btn join" style={{ flex: 1 }} onClick={joinCall}>
                  ☎ Twilio Join
                </button>
              </div>
            </div>

            {/* Depletes over the auto-dismiss window. The key restarts the
                animation whenever the ring is restarted. */}
            <div className="ring-countdown" aria-hidden="true">
              <span
                key={ringCycle}
                style={{ animationDuration: `${RING_SECONDS}s` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CRM Native Ticketing Banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
        background: "var(--surface)",
        padding: "12px 18px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <strong style={{ fontSize: 14 }}>Native CRM Ticketing System Active</strong>
            <span className="badge good" style={{ fontSize: 10 }}>In-Dashboard</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
            Organized by collection ladder stages (Early Arrears, Committed Arrears, Formal, Residual) with full customer CRM context.
          </div>
        </div>
        <Link
          to="/customers"
          className="btn"
          style={{
            background: "var(--brand)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            padding: "8px 16px",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          View Customers →
        </Link>
      </div>

      <Stats cards={[
        {
          label: supervisorUser ? "My Assigned Alerts" : "Alerts",
          value: loading && !roleFilteredRows.length ? "…" : num(roleFilteredRows.length),
          sub: supervisorUser ? `assigned to @${currentUsername}` : error ? "feed unreachable" : "in the current feed",
          tone: error ? "bad" : undefined,
        },
        {
          label: "Calls flagged",
          value: loading && !roleFilteredRows.length ? "…" : num(uniqueCalls),
          sub: supervisorUser ? "in your queue" : "distinct call IDs",
        },
        {
          label: "Latest alert",
          value: latest ? relativeTime(latest) : "—",
          sub: latest ? `${fmtDate(latest)} ${fmtTime(latest)}` : "no alerts yet",
        },
        {
          label: "Feed checked",
          value: fetchedAt ? fmtTime(fetchedAt) : "—",
          sub: error ? "last attempt failed" : "press Refresh to re-check",
          tone: error ? "bad" : "good",
        },
      ]} />

      {/* Role Banner */}
      {supervisorUser ? (
        <div className="callout" style={{ borderLeftColor: "var(--brand)" }}>
          <span>
            🛡️ <strong>Supervisor Scoped View:</strong> Showing only alerts assigned to your queue (<strong>@{currentUsername}</strong> · {userSession?.queue || "Operations"}).
          </span>
        </div>
      ) : (
        <div className="callout" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>
            👑 <strong>Admin Global View:</strong> Showing all alerts across all teams and supervisors.
          </span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Total in feed: {mappedRows.length} alerts
          </span>
        </div>
      )}

      <section className="filters">
        <div className="fx grow">
          <label htmlFor="aq">Search</label>
          <input
            id="aq"
            type="search"
            placeholder="Call ID, reason, or supervisor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {!supervisorUser && (
          <div className="fx">
            <label htmlFor="as">Supervisor</label>
            <select
              id="as"
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
            >
              <option value="all">All Supervisors ({mappedRows.length})</option>
              {supervisorsList.map((s) => (
                <option key={s.username} value={s.username}>
                  @{s.username} ({s.name})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={() => setQ("")} disabled={!q}>Clear</button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={exportCsv} disabled={!visible.length}>
            Export CSV
          </button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable num" style={{ width: 62 }} onClick={() => sortBy("row_number")}>
                # <span className="arrow">{arrow("row_number")}</span>
              </th>
              <th>Call ID</th>
              <th>Customer & CRM Account</th>
              <th className="sortable" onClick={() => sortBy("Reason")}>
                Reason <span className="arrow">{arrow("Reason")}</span>
              </th>
              <th>Assigned To</th>
              <th className="sortable" style={{ width: 170 }} onClick={() => sortBy("Timestamp")}>
                Timestamp <span className="arrow">{arrow("Timestamp")}</span>
              </th>
              <th style={{ width: 130, textAlign: "right" }}>CRM Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}>
                  {supervisorUser
                    ? `No alerts currently assigned to @${currentUsername}.`
                    : "No alerts match your filter criteria."}
                </td>
              </tr>
            ) : (
              visible.map((r, i) => (
                <tr key={`${r.Call_id ?? "row"}-${r.row_number ?? i}`}>
                  <td className="num dim">{r.row_number ?? "—"}</td>
                  <td className="mono">{r.Call_id || <span className="dim">—</span>}</td>
                  <td>
                    {r.linkedTicket ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          <Link
                            to={`/customers?q=${r.linkedTicket.accountNo}`}
                            style={{ color: "var(--brand)", textDecoration: "none" }}
                          >
                            {r.linkedTicket.name}
                          </Link>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <span className="mono">{r.linkedTicket.accountNo}</span>
                          <span>•</span>
                          <span style={{ fontWeight: 600, color: "var(--text)" }}>{rm(r.linkedTicket.arrearsAmount)}</span>
                          <span className="badge info" style={{ fontSize: 10, padding: "0 5px" }}>{r.linkedTicket.stage}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td>{r.Reason || <span className="dim">—</span>}</td>
                  <td>
                    {!supervisorUser ? (
                      <select
                        value={r.assignedSupervisor}
                        onChange={(e) => handleAssignAlert(r.alertKey, e.target.value, r.linkedTicket)}
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Reassign this call to another supervisor"
                      >
                        {supervisorsList.map((s) => (
                          <option key={s.username} value={s.username}>
                            @{s.username}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge info" style={{ fontSize: 11 }}>
                        @{r.assignedSupervisor}
                      </span>
                    )}
                  </td>
                  <td className="nowrap">
                  {r.Timestamp ? (
                    <>
                      <div>{fmtDate(r.Timestamp)} {fmtTime(r.Timestamp)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        {relativeTime(r.Timestamp)}
                      </div>
                    </>
                  ) : <span className="dim">—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {r.linkedTicket ? (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
                        onClick={() => takeOverTicket(r.linkedTicket)}
                        title="Take over ticket in Native CRM Kanban"
                      >
                        ⚡ Take Over ↗
                      </button>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {loading && !rows.length && <Loading>Fetching alerts…</Loading>}

        {error && (
          <ErrorState title="Could not load call alerts">
            {error} — check the webhook URL in config.js.
          </ErrorState>
        )}

        {!loading && !error && !visible.length && (
          <EmptyState title={rows.length ? "No alerts match" : "No alerts yet"}>
            {rows.length
              ? "Try clearing the search."
              : "The webhook returned an empty feed."}
          </EmptyState>
        )}
      </div>

      <div className="footer-bar">
        <span>
          Showing {num(visible.length)} of {num(rows.length)} alert{rows.length === 1 ? "" : "s"}
          {fetchedAt && <> · fetched {relativeTime(fetchedAt)}</>}
        </span>
      </div>
    </>
  );
}
