/* ============================================================
   Call Alerts — Live feed from n8n webhook (GET) with 5s background polling,
   persistent ringtone modal (/teams-ring tone.mp3), seen ID tracking,
   and direct Takeover redirection to /testing.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CONFIG } from "../../config.js";
import { session, isSupervisor, getSupervisors } from "../auth/session.js";
import { num, fmtDate, fmtTime, relativeTime, downloadCsv, rm } from "../lib/format.js";
import { Stats, Panel, Badge, Loading, ErrorState, EmptyState, Modal } from "../components/ui.jsx";
import { RefreshIcon } from "../components/icons.jsx";
import { getTicketsStore, updateTicketInStore, addTicketNoteInStore } from "../db/tickets.js";

const FRESH_ALERT_SECONDS = 40;

const ageInSeconds = (ts) => {
  const t = new Date(ts || 0).getTime();
  return Number.isNaN(t) || !t ? Infinity : (Date.now() - t) / 1000;
};

// Helper for persistent seen alert IDs in localStorage
const getSeenAlertIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem("iwk_seen_alert_ids") || "[]"));
  } catch {
    return new Set();
  }
};

const markAlertAsSeen = (alertId) => {
  if (!alertId) return;
  try {
    const set = getSeenAlertIds();
    set.add(String(alertId));
    localStorage.setItem("iwk_seen_alert_ids", JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Failed to save seen alert ID:", e);
  }
};

// Audio Listen Scrubber Modal
function AudioModal({ alertRow, onClose }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAudio() {
      if (alertRow?.Call_id) {
        try {
          const res = await fetch(`${CONFIG.vapi?.baseUrl || "https://api.vapi.ai"}/call/${alertRow.Call_id}`, {
            headers: { Authorization: `Bearer ${CONFIG.vapi?.secretKey}` },
          });
          if (res.ok) {
            const data = await res.json();
            const url = data.recordingUrl || data.artifact?.recording?.mono?.combinedUrl;
            if (isMounted && url) {
              setAudioUrl(url);
              setLoadingAudio(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Audio fetch fallback:", e);
        }
      }
      if (isMounted) {
        setAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
        setLoadingAudio(false);
      }
    }
    fetchAudio();
    return () => {
      isMounted = false;
    };
  }, [alertRow?.Call_id]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(console.error);
    }
  };

  return (
    <Modal
      title={`Live Audio Stream — Call ID: ${alertRow?.Call_id || alertRow?.row_number || "Alert"}`}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <button type="button" className="btn-solid" onClick={onClose}>
            Close Audio Stream
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Reason: <strong style={{ color: "var(--text)" }}>{alertRow?.Reason || "Flagged Call"}</strong>
        </div>
        <div style={{ background: "var(--surface-2)", padding: 16, borderRadius: 10, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: playing ? "#10b981" : "var(--text-dim)" }}>
            {loadingAudio ? "Connecting audio stream..." : playing ? "● PLAYING AUDIO STREAM" : "STREAM PAUSED / READY"}
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </Modal>
  );
}

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
  const [incoming, setIncoming] = useState(null);
  const [audioModalAlert, setAudioModalAlert] = useState(null);
  const navigate = useNavigate();

  // Teams Ringtone Audio Player
  const ringtoneRef = useRef(null);

  const playTeamsRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio("/teams-ring tone.mp3");
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play().catch((err) => {
        console.warn("Ringtone audio playback blocked by browser:", err);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, []);

  const stopTeamsRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopTeamsRingtone();
    };
  }, [stopTeamsRingtone]);

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

  // Helper to link an alert row with a customer ticket from CRM store
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

    const flagged = store.filter((t) => t.isFlagged);
    if (flagged.length > 0) {
      return flagged[(r.row_number ?? index ?? 0) % flagged.length];
    }
    return store[(r.row_number ?? index ?? 0) % store.length];
  }, []);

  // Fetch function with 5s background polling & un-popped fresh alert detection (<70s)
  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
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

      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setRows(list);
      setFetchedAt(new Date());

      // Check for un-seen fresh alert strictly under 40 seconds old
      const seenIds = getSeenAlertIds();
      const freshAlert = list.find((r) => {
        const alertId = String(r.Call_id || r.row_number || "");
        const age = ageInSeconds(r.Timestamp);
        return age < FRESH_ALERT_SECONDS && !seenIds.has(alertId);
      });

      if (freshAlert) {
        setIncoming((prev) => {
          if (!prev) {
            playTeamsRingtone();
            return freshAlert;
          }
          return prev;
        });
      }
    } catch (e) {
      if (!isBackground) {
        setError(e.message);
        setRows([]);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [playTeamsRingtone]);

  // Initial load + 5-second background polling
  useEffect(() => {
    load(false);
    const interval = setInterval(() => {
      load(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

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

  const roleFilteredRows = useMemo(() => {
    if (supervisorUser) {
      const userRows = mappedRows.filter((r) => r.assignedSupervisor === currentUsername);
      return userRows.length > 0 ? userRows : mappedRows;
    }
    if (supervisorFilter !== "all") {
      const filtered = mappedRows.filter((r) => r.assignedSupervisor === supervisorFilter);
      return filtered.length > 0 ? filtered : mappedRows;
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

  // Incoming alert linked CRM ticket
  const incomingTicket = useMemo(() => {
    if (!incoming) return null;
    return incoming.linkedTicket || getLinkedTicket(incoming, 0);
  }, [incoming, getLinkedTicket]);

  // Actions for Pop-Up & Table Controls
  const handleTakeOver = useCallback((alertRow) => {
    stopTeamsRingtone();
    if (alertRow) {
      const alertId = String(alertRow.Call_id || alertRow.row_number || "");
      markAlertAsSeen(alertId);
    }
    setIncoming(null);
    navigate("/testing");
  }, [navigate, stopTeamsRingtone]);

  const handleListen = useCallback((alertRow) => {
    stopTeamsRingtone();
    if (alertRow) {
      const alertId = String(alertRow.Call_id || alertRow.row_number || "");
      markAlertAsSeen(alertId);
    }
    setIncoming(null);
    navigate("/testing");
  }, [navigate, stopTeamsRingtone]);

  const handleReject = useCallback((alertRow) => {
    stopTeamsRingtone();
    if (alertRow) {
      const alertId = String(alertRow.Call_id || alertRow.row_number || "");
      markAlertAsSeen(alertId);
    }
    setIncoming(null);
  }, [stopTeamsRingtone]);

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
      {/* INCOMING ALERT PERSISTENT POP-UP MODAL */}
      {incoming && (
        <div className="ring-backdrop" role="dialog" aria-modal="true" aria-label="Incoming call alert">
          <div className="ring-card" style={{ maxWidth: 460 }}>
            <div className="ring-avatar" aria-hidden="true">
              <span className="ring-wave" />
              <span className="ring-wave d2" />
              
            </div>

            <div className="ring-label">INCOMING LIVE CALL ALERT (&lt; 40s)</div>
            <h3 className="ring-title">{incoming.Reason || "Call Flagged For Immediate Supervisor Attention"}</h3>

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
              <dd>@{incoming.assignedSupervisor || currentUsername}</dd>
              <dt>Received</dt>
              <dd>{relativeTime(incoming.Timestamp)}</dd>
            </dl>

            {/* Action Buttons: Take Over, Listen, Reject */}
            <div className="ring-actions" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <button
                className="btn-solid"
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onClick={() => handleTakeOver(incoming)}
              >
                Take Over (Redirect to Testing)
              </button>

              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button
                  className="btn-solid"
                  style={{
                    flex: 1,
                    background: "#10b981",
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    border: "none",
                  }}
                  onClick={() => handleListen(incoming)}
                >
                  Listen
                </button>

                <button
                  className="btn-ghost"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    border: "1px solid var(--border-strong)",
                  }}
                  onClick={() => handleReject(incoming)}
                >
                  Reject / Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIO LISTEN SCRUBBER MODAL */}
      {audioModalAlert && (
        <AudioModal alertRow={audioModalAlert} onClose={() => setAudioModalAlert(null)} />
      )}

      {/* STYLED FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          background: "var(--surface-2)",
          padding: 14,
          borderRadius: 12,
          border: "1px solid var(--border)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 280, position: "relative" }}>
          <input
            type="search"
            placeholder="Filter by Call ID, reason, timestamp or supervisor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              title="Clear search"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!supervisorUser && (
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Filter view by assigned supervisor"
            >
              <option value="all">All Supervisors (Admin)</option>
              {supervisorsList.map((s) => (
                <option key={s.username} value={s.username}>
                  @{s.username} ({s.name})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn-ghost"
            onClick={() => load(false)}
            disabled={loading}
            style={{
              padding: "9px 16px",
              fontSize: 13,
              borderRadius: 8,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              border: "1px solid var(--border-strong)",
            }}
          >
            <RefreshIcon size={14} className={loading ? "spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable num" style={{ width: 62 }} onClick={() => sortBy("row_number")}>
                # <span className="arrow">{arrow("row_number")}</span>
              </th>
              <th>Call ID</th>
              <th className="sortable" style={{ minWidth: 280, width: "40%" }} onClick={() => sortBy("Reason")}>
                Reason <span className="arrow">{arrow("Reason")}</span>
              </th>
              <th>Assigned To</th>
              <th className="sortable" style={{ width: 170 }} onClick={() => sortBy("Timestamp")}>
                Timestamp <span className="arrow">{arrow("Timestamp")}</span>
              </th>
              <th style={{ width: 180, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}>
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
                  <td style={{ lineHeight: 1.45 }}>{r.Reason || <span className="dim">—</span>}</td>
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
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn-solid"
                        style={{ fontSize: 11, padding: "4px 8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
                        onClick={() => handleTakeOver(r)}
                        title="Take over call - Redirect to Testing"
                      >
                        Take Over
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
                        onClick={() => handleListen(r)}
                        title="Listen to call audio recording"
                      >
                        Listen
                      </button>
                    </div>
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
