/* ============================================================
   Voice AI — LIVE data from the Vapi API (not demo data).
   Ported from the original vanilla app.js with identical behaviour.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CONFIG } from "../../config.js";
import {
  fetchAssistants, fetchCalls, prettyReason, reasonTone,
  trackUrl, isRecordingCached, availableTracks,
} from "../lib/vapi.js";
import {
  usd, durationText, minutesText, fmtDate, fmtTime, downloadCsv,
} from "../lib/format.js";
import { Stats, Panel, Badge, Loading, ErrorState, EmptyState } from "../components/ui.jsx";

const { options } = CONFIG;
const $ = (n) => usd(n, options?.vapiCurrencySymbol || "RM ");

/* ---------------- recording player ---------------- */

/* <audio> cannot send an Authorization header, and the recording bucket
   rejects unauthenticated requests — so the file is fetched with the
   secret key and handed over as a blob URL. The promise cache lives in
   lib/vapi.js at module scope, so it survives re-renders and route changes. */
function RecordingPlayer({ row, autoplay }) {
  const tracks = useMemo(() => availableTracks(row), [row]);
  const [track, setTrack] = useState(tracks[0]?.[1] || null);
  const [url, setUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const wantPlay = useRef(autoplay);

  useEffect(() => {
    if (!track) return;
    let cancelled = false;

    setError(null);
    setStatus(isRecordingCached(row.id, track) ? "Loading…" : "Fetching recording…");

    trackUrl(row.id, track)
      .then((u) => {
        if (cancelled) return;
        setUrl(u);
        setStatus(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus(null);
        setError(
          `Could not load this recording (${e.message}). The secret key in config.js needs recording access on this account.`
        );
      });

    return () => { cancelled = true; };
  }, [row.id, track]);

  // Play once the blob is attached, for both autoplay and track switches.
  useEffect(() => {
    if (url && wantPlay.current && audioRef.current) {
      wantPlay.current = false;
      audioRef.current.play().catch(() => {});
    }
  }, [url]);

  if (!tracks.length) {
    return <p className="empty-note">No recording available for this call.</p>;
  }

  return (
    <>
      <div className="rec-tabs">
        {tracks.map(([label, key]) => (
          <button
            key={key}
            className={`rec-tab${key === track ? " active" : ""}`}
            onClick={() => {
              if (key === track) return;
              wantPlay.current = true;
              setUrl(null);
              setTrack(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <audio ref={audioRef} controls preload="none" src={url || undefined} />

      {status && <div className="audio-status">{status}</div>}
      {error && <div className="audio-error">{error}</div>}

      {url && (
        <div className="rec-links">
          <a href={url} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
          <a href={url} download={`voice-call-${row.id.slice(0, 8)}-${track}.wav`}>Download .wav</a>
        </div>
      )}
    </>
  );
}

/* ---------------- detail row ---------------- */

function CallDetail({ row, autoplay }) {
  const b = row.costBreakdown;
  const costRows = [
    ["Transport", b.transport],
    ["Speech-to-text", b.stt],
    ["LLM", b.llm],
    ["Text-to-speech", b.tts],
    ["Platform & Telephony", b.vapi],
    ["Analysis", b.analysisCostBreakdown?.summary],
  ].filter(([, v]) => typeof v === "number" && v > 0);

  const convo = row.messages.filter(
    (m) => (m.role === "bot" || m.role === "user") && m.message
  );

  return (
    <tr className="detail">
      <td colSpan={9}>
        <div className="detail-inner">
          <div className="detail-grid">
            <div className="panel">
              <h4>Call Details</h4>
              <dl className="kv">
                <dt>Call ID</dt><dd className="mono">{row.id}</dd>
                <dt>Assistant</dt><dd>{row.assistantLabel}</dd>
                <dt>Type</dt><dd>{row.type}</dd>
                <dt>Status</dt><dd>{row.status}</dd>
                <dt>Ended Reason</dt><dd>{prettyReason(row.endedReason)}</dd>
                <dt>Started</dt><dd>{row.startedDate.toLocaleString()}</dd>
                <dt>Duration</dt><dd>{durationText(row.duration)}</dd>
                {row.customer && (<><dt>Customer</dt><dd>{row.customer}</dd></>)}
                {row.phoneNumber && (<><dt>Number</dt><dd>{row.phoneNumber}</dd></>)}
              </dl>
            </div>

            <div className="panel">
              <h4>Cost Breakdown</h4>
              <dl className="kv">
                {costRows.map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt><dd>{$(v)}</dd>
                  </div>
                ))}
                <div className="rule" />
                <dt><strong>Total</strong></dt>
                <dd className="total">{$(row.cost)}</dd>
              </dl>
            </div>

            <div className="panel">
              <h4>Recording</h4>
              <RecordingPlayer row={row} autoplay={autoplay} />
            </div>
          </div>

          <div className="panel">
            <h4>Transcript{row.summary ? " & Summary" : ""}</h4>
            {row.summary && (
              <p style={{ margin: "0 0 12px", fontSize: 13 }}>{row.summary}</p>
            )}
            {convo.length ? (
              <div className="transcript">
                {convo.map((m, i) => (
                  <div className={`msg ${m.role === "bot" ? "bot" : "user"}`} key={i}>
                    <div className="who">{m.role === "bot" ? "Agent" : "Caller"}</div>
                    <div className="text">{m.message}</div>
                  </div>
                ))}
              </div>
            ) : row.transcript ? (
              <div className="msg"><div className="text">{row.transcript}</div></div>
            ) : (
              <p className="empty-note">No transcript recorded.</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ---------------- page ---------------- */

const EMPTY_FILTERS = { q: "", assistant: "", type: "", reason: "", from: "", to: "" };

export default function VoiceAI() {
  const [calls, setCalls] = useState([]);
  const [assistants, setAssistants] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exhausted, setExhausted] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ key: "startedAt", dir: "desc" });
  const [expanded, setExpanded] = useState(new Set());
  const [autoplayFor, setAutoplayFor] = useState(null);

  const load = useCallback(async ({ append = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const map = assistants.size ? assistants : await fetchAssistants();
      if (!assistants.size) setAssistants(map);

      const before = append && calls.length ? calls[calls.length - 1].createdAt : null;
      const { rows, rawCount } = await fetchCalls({ before });

      setCalls((prev) => {
        if (!append) return rows;
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setExhausted(rawCount < CONFIG.options.pageSize);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [assistants, calls]);

  useEffect(() => {
    load();
    // Initial load only; refresh is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelled = useMemo(
    () =>
      calls.map((c) => ({
        ...c,
        assistantLabel:
          c.assistantName ||
          assistants.get(c.assistantId) ||
          (c.assistantId ? c.assistantId.slice(0, 8) + "…" : "—"),
      })),
    [calls, assistants]
  );

  const rows = useMemo(() => {
    const f = filters;
    const from = f.from ? new Date(f.from + "T00:00:00") : null;
    const to = f.to ? new Date(f.to + "T23:59:59.999") : null;

    const out = labelled.filter((r) => {
      if (f.assistant && r.assistantId !== f.assistant) return false;
      if (f.type && r.type !== f.type) return false;
      if (f.reason && r.endedReason !== f.reason) return false;
      if (from && r.startedDate < from) return false;
      if (to && r.startedDate > to) return false;
      if (f.q) {
        const hay = `${r.id} ${r.transcript} ${r.summary} ${r.customer}`.toLowerCase();
        if (!hay.includes(f.q.toLowerCase())) return false;
      }
      return true;
    });

    const mul = sort.dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = sort.key === "startedAt" ? a.startedDate.getTime() : a[sort.key];
      const bv = sort.key === "startedAt" ? b.startedDate.getTime() : b[sort.key];
      return av === bv ? 0 : (av > bv ? 1 : -1) * mul;
    });
  }, [labelled, filters, sort]);

  const totals = useMemo(() => {
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const secs = rows.reduce((s, r) => s + r.duration, 0);
    const withRec = rows.filter((r) => r.recordings.mono || r.recordings.stereo).length;
    return { cost, secs, withRec, avg: rows.length ? secs / rows.length : 0 };
  }, [rows]);

  const opts = useMemo(() => ({
    assistant: [...new Set(calls.map((c) => c.assistantId).filter(Boolean))],
    type: [...new Set(calls.map((c) => c.type).filter(Boolean))],
    reason: [...new Set(calls.map((c) => c.endedReason).filter(Boolean))],
  }), [calls]);

  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  function toggle(id, fromPlay) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (fromPlay) setAutoplayFor(id);
      }
      return next;
    });
  }

  function sortBy(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? "▴" : "▾") : "");

  function exportCsv() {
    downloadCsv(
      `voice-calls-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Call ID", "Started", "Assistant", "Type", "Status", "Ended reason", "Duration (s)", "Cost (RM)", "Recording URL"],
      rows.map((r) => [
        r.id, r.startedDate.toISOString(), r.assistantLabel, r.type, r.status,
        r.endedReason, Math.round(r.duration), r.cost,
        r.recordings.mono || r.recordings.stereo || "",
      ])
    );
  }

  return (
    <>
      <div className="callout">
        <strong>Live Data.</strong> This page reads live telephony call records directly
        using the connection key in <code>config.js</code> — it is not demo data. All costs
        across the dashboard are unified in RM.
      </div>

      <Stats cards={[
        { label: "Calls", value: rows.length, sub: `${totals.withRec} with recording` },
        { label: "Total Cost", value: $(totals.cost), sub: `${$(rows.length ? totals.cost / rows.length : 0)} avg / call` },
        { label: "Talk Time", value: minutesText(totals.secs), sub: `${durationText(totals.avg)} avg / call` },
        { label: "Cost Per Minute", value: totals.secs ? $(totals.cost / (totals.secs / 60)) : "—", sub: "across filtered calls" },
      ]} />

      <section className="filters">
        <div className="fx grow">
          <label htmlFor="q">Search</label>
          <input id="q" type="search" placeholder="Call ID, transcript or summary…"
                 value={filters.q} onChange={(e) => setF("q", e.target.value)} />
        </div>
        <div className="fx">
          <label htmlFor="fa">Assistant</label>
          <select id="fa" value={filters.assistant} onChange={(e) => setF("assistant", e.target.value)}>
            <option value="">All</option>
            {opts.assistant.map((id) => (
              <option key={id} value={id}>{assistants.get(id) || id.slice(0, 8) + "…"}</option>
            ))}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="ft">Type</label>
          <select id="ft" value={filters.type} onChange={(e) => setF("type", e.target.value)}>
            <option value="">All</option>
            {opts.type.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="fr">Ended Reason</label>
          <select id="fr" value={filters.reason} onChange={(e) => setF("reason", e.target.value)}>
            <option value="">All</option>
            {opts.reason.map((r) => <option key={r} value={r}>{prettyReason(r)}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="ff">From</label>
          <input id="ff" type="date" value={filters.from} onChange={(e) => setF("from", e.target.value)} />
        </div>
        <div className="fx">
          <label htmlFor="fto">To</label>
          <input id="fto" type="date" value={filters.to} onChange={(e) => setF("to", e.target.value)} />
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={() => { setExpanded(new Set()); load(); }} disabled={loading}>
            Refresh
          </button>
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th className="sortable" onClick={() => sortBy("startedAt")}>
                Started <span className="arrow">{arrow("startedAt")}</span>
              </th>
              <th>Assistant</th>
              <th>Type</th>
              <th className="sortable num" onClick={() => sortBy("duration")}>
                Duration <span className="arrow">{arrow("duration")}</span>
              </th>
              <th>Outcome</th>
              <th className="sortable num" onClick={() => sortBy("cost")}>
                Cost <span className="arrow">{arrow("cost")}</span>
              </th>
              <th>Recording</th>
              <th>Call ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = expanded.has(r.id);
              const hasRec = r.recordings.mono || r.recordings.stereo;
              return [
                <tr
                  key={r.id}
                  className={`row${open ? " open" : ""}`}
                  onClick={() => toggle(r.id, false)}
                >
                  <td><span className="chev">▶</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{fmtDate(r.startedDate)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{fmtTime(r.startedDate)}</div>
                  </td>
                  <td>{r.assistantLabel}</td>
                  <td><Badge tone="info">{r.type}</Badge></td>
                  <td className="num">{durationText(r.duration)}</td>
                  <td><Badge tone={reasonTone(r.endedReason)}>{prettyReason(r.endedReason)}</Badge></td>
                  <td className="num"><strong>{$(r.cost)}</strong></td>
                  <td>
                    {hasRec ? (
                      <button
                        className={`play-btn${open ? " playing" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggle(r.id, true); }}
                      >
                        {open ? "Open" : "Play"}
                      </button>
                    ) : <span className="dim">—</span>}
                  </td>
                  <td className="mono dim">{r.id.slice(0, 8)}…</td>
                </tr>,
                open && (
                  <CallDetail key={`${r.id}-d`} row={r} autoplay={autoplayFor === r.id} />
                ),
              ];
            })}
          </tbody>
        </table>

        {loading && !calls.length && <Loading>Loading call logs…</Loading>}
        {error && (
          <ErrorState title="Could not reach the Voice Telephony API">
            {error} — check the connection key in config.js.
          </ErrorState>
        )}
        {!loading && !error && !rows.length && (
          <EmptyState title="No calls match">
            {calls.length ? "Try clearing the filters." : "No calls found on this account yet."}
          </EmptyState>
        )}
      </div>

      <div className="footer-bar">
        <span>Showing {rows.length} of {calls.length} loaded call{calls.length === 1 ? "" : "s"}</span>
        {!exhausted && calls.length > 0 && (
          <button className="btn-ghost" onClick={() => load({ append: true })} disabled={loading}>
            Load older calls
          </button>
        )}
      </div>
    </>
  );
}
