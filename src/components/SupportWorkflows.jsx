/* "Workflows ▾" dropdown for the Unified Inbox → Support Email panel.

   Runs the same workflows as the Workflows page, email steps only (SMS steps
   stay on the Workflows page). Each email sent is handed to `onSent` so the
   inbox can add it as a Support Email thread. Everything is delivered to the
   TEST email — never to the customer's own address. */

import { useMemo, useState } from "react";
import { Modal } from "./ui.jsx";
import { validateEmail } from "../lib/validate.js";
import {
  runWorkflow,
  DEMO_WORKFLOWS,
  AUDIENCES,
  audienceCount,
  getWorkflowSettings,
  saveWorkflowSettings,
} from "../lib/workflowEngine.js";

const SUPPORT_WORKFLOW_IDS = ["wf-5", "wf-6", "wf-7"];

export default function SupportWorkflows({ customers, updateCustomer, website, onSent }) {
  const workflows = useMemo(
    () =>
      DEMO_WORKFLOWS.filter((w) => SUPPORT_WORKFLOW_IDS.includes(w.id)).map((w) => ({
        ...w,
        // email steps only — SMS stays on the Workflows page
        nodes: w.nodes.filter((n) => !(n.type === "SEND_MESSAGE" && (n.channel || "email") !== "email")),
      })),
    []
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [wf, setWf] = useState(null);
  const [settings, setSettings] = useState(getWorkflowSettings());
  const [log, setLog] = useState([]);
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const open = (w) => {
    setMenuOpen(false);
    setWf(w);
    setSettings(getWorkflowSettings());
    setLog([]);
    setSummary(null);
    setError("");
  };

  const run = async () => {
    const emailCheck = validateEmail(settings.testEmail);
    if (!emailCheck.ok) {
      setError(`Test email: ${emailCheck.error} All emails from this workflow are delivered there.`);
      return;
    }
    setError("");
    const saved = saveWorkflowSettings({ ...settings, testEmail: emailCheck.email });
    setLog([]);
    setSummary(null);
    setRunning(true);
    try {
      const result = await runWorkflow(wf, {
        customers,
        settings: saved,
        updateCustomer,
        website,
        onSent: onSent,
        onLog: (e) => setLog((l) => [...l, e]),
      });
      setSummary(result);
    } catch (err) {
      setLog((l) => [...l, { level: "err", text: `Run stopped: ${err.message}` }]);
    } finally {
      setRunning(false);
    }
  };

  const color = (level) =>
    level === "err" ? "#ef4444" : level === "warn" ? "#f59e0b" : level === "ok" ? "#10b981" : "var(--text-faint)";
  const mark = (level) => (level === "err" ? "✕" : level === "warn" ? "!" : level === "ok" ? "✓" : "•");

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 12, padding: "5px 12px", border: "1px solid var(--border)", fontWeight: 700 }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Run an email workflow"
        >
          ⚡ Workflows ▾
        </button>

        {menuOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                zIndex: 41,
                width: 330,
                maxWidth: "86vw",
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                padding: 6,
              }}
            >
              {workflows.map((w) => (
                <button
                  type="button"
                  role="menuitem"
                  key={w.id}
                  onClick={() => open(w)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderRadius: 9,
                    padding: "10px 12px",
                    cursor: "pointer",
                    color: "var(--text)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>
                    {w.description.replace(" by email and SMS", " by email").replace(" and SMS", "")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 3, fontWeight: 600 }}>
                    {AUDIENCES[w.audience].label} · {audienceCount(w.audience, customers).toLocaleString()} accounts
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {wf && (
        <Modal
          wide
          title={`Run Workflow — ${wf.name}`}
          onClose={() => !running && setWf(null)}
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setWf(null)} disabled={running}>
                Close
              </button>
              <button type="button" className="btn-solid" onClick={run} disabled={running}>
                {running ? "Running…" : summary ? "▶ Run again" : "▶ Run now"}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>Audience:</strong> {AUDIENCES[wf.audience].label} —{" "}
              {audienceCount(wf.audience, customers).toLocaleString()} matching account(s).
              <br />
              Emails are sent through the IWK mail service to the test email below — never to the customer. Each one
              appears as a thread in Support Email, with the intended customer named at the top.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>
                Test email
                <input
                  type="email"
                  value={settings.testEmail}
                  onChange={(e) => setSettings({ ...settings, testEmail: e.target.value })}
                  placeholder="you@example.com"
                  disabled={running}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>
                Customers per run
                <select
                  value={settings.limit}
                  onChange={(e) => setSettings({ ...settings, limit: Number(e.target.value) })}
                  disabled={running}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12.5 }}
                >
                  {[1, 2, 3, 5, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>
                {error}
              </div>
            )}

            {(log.length > 0 || running) && (
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {log.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ flex: "none", fontWeight: 800, color: color(e.level) }}>{mark(e.level)}</span>
                    <span>{e.text}</span>
                  </div>
                ))}
                {running && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Running…</div>}
              </div>
            )}

            {summary && !running && (
              <div style={{ fontSize: 13, fontWeight: 700, color: summary.failed ? "#ef4444" : "#10b981" }}>
                Finished: {summary.sent} sent, {summary.failed} failed
                {summary.recipients ? ` · ${summary.recipients} account(s)` : ""}.
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
