/* ============================================================
   Settings — editable in memory only.

   Channel unit costs feed the Treatment page maths, so changing one
   here visibly moves the cost figures there.
   ============================================================ */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useData } from "../db/store.jsx";
import { getSupervisors, createSupervisor, deleteSupervisor } from "../auth/session.js";
import { getStoredTheme, applyTheme } from "../lib/theme.js";
import { rm, rmUnit, pct } from "../lib/format.js";
import { Panel, Field, Badge, Modal } from "../components/ui.jsx";
import logoImg from "../assets/iwk-logo.png";

/* Where call alerts get delivered. Static for now — only email is live. */
const ALERT_CHANNELS = [
  {
    key: "email",
    name: "Email",
    detail: "Alerts are delivered to the operations inbox.",
    connected: true,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 6 10-6" />
      </svg>
    ),
  },
  {
    key: "sms",
    name: "SMS",
    detail: "Send alerts as text messages.",
    connected: false,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.4-.6L3 21l1.7-5a8.2 8.2 0 0 1-.7-3.4 8.4 8.4 0 0 1 8.4-8.4h.5A8.4 8.4 0 0 1 21 11.5Z" />
      </svg>
    ),
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    detail: "Send alerts through WhatsApp Business.",
    connected: false,
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12s-.64.8-.79.97c-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07s.89 2.4 1.01 2.560c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
      </svg>
    ),
  },
];

export default function Settings() {
  const { settings, updateSettings, resetAll, dirty } = useData();

  const [org, setOrg] = useState(settings.organisation);
  const [policy, setPolicy] = useState(settings.contactPolicy);
  const [costs, setCosts] = useState(settings.channelCosts);
  const [targets, setTargets] = useState(settings.targets);
  const [saved, setSaved] = useState(false);
  const [alertChannel, setAlertChannel] = useState(null);

  // Supervisor Management State
  const [supervisors, setSupervisors] = useState(getSupervisors());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSupervisor, setNewSupervisor] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    queue: "Operations Queue",
  });
  const [supervisorError, setSupervisorError] = useState("");
  const [supervisorSuccess, setSupervisorSuccess] = useState("");

  const refreshSupervisors = () => {
    setSupervisors(getSupervisors());
  };

  const handleCreateSupervisor = (e) => {
    if (e) e.preventDefault();
    setSupervisorError("");
    try {
      if (!newSupervisor.username.trim() || !newSupervisor.password.trim()) {
        throw new Error("Username and password are required.");
      }
      createSupervisor(newSupervisor);
      refreshSupervisors();
      setShowCreateModal(false);
      setNewSupervisor({
        name: "",
        username: "",
        password: "",
        email: "",
        queue: "Operations Queue",
      });
      setSupervisorSuccess(`Supervisor @${newSupervisor.username.trim().toLowerCase()} created successfully.`);
      setTimeout(() => setSupervisorSuccess(""), 4000);
    } catch (err) {
      setSupervisorError(err.message || "Failed to create supervisor.");
    }
  };

  const handleDeleteSupervisor = (uname) => {
    if (window.confirm(`Are you sure you want to remove supervisor @${uname}?`)) {
      try {
        deleteSupervisor(uname);
        refreshSupervisors();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());

  // Re-sync when the store is reset from the sidebar.
  useEffect(() => {
    setOrg(settings.organisation);
    setPolicy(settings.contactPolicy);
    setCosts(settings.channelCosts);
    setTargets(settings.targets);
  }, [settings]);

  function save() {
    updateSettings({
      organisation: org,
      contactPolicy: policy,
      channelCosts: Object.fromEntries(
        Object.entries(costs).map(([k, v]) => [k, Number(v) || 0])
      ),
      targets: Object.fromEntries(
        Object.entries(targets).map(([k, v]) => [k, Number(v) || 0])
      ),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  }

  const handleThemeChange = (newTheme) => {
    applyTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  return (
    <>
      <div className="callout">
        <strong>In-Memory Settings.</strong> Saving updates the dashboard immediately
        but does not write to <code>DB/settings.json</code>.
      </div>

      <div className="grid c2">
        <Panel title="Organisation" sub="Shown in the sidebar, login screen and reports.">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <img src={logoImg} alt="Indah Water" style={{ maxHeight: 38, maxWidth: 160, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{org.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Brand logo active across dashboard</div>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Name">
              <input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </Field>
            <Field label="Short Name">
              <input value={org.shortName} onChange={(e) => setOrg({ ...org, shortName: e.target.value })} />
            </Field>
            <Field label="Website">
              <input value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
            </Field>
            <Field label="Currency Symbol">
              <input value={org.currencySymbol}
                     onChange={(e) => setOrg({ ...org, currencySymbol: e.target.value })} />
            </Field>
          </div>
          <p className="empty-note" style={{ marginTop: 12 }}>
            {org.description}
          </p>
        </Panel>

        <Panel
          title="Appearance & UI Theme"
          sub="Toggle between White (Lite) Theme and Dark Theme across the application."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleThemeChange("light")}
              style={{
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                borderRadius: "10px",
                border: currentTheme === "light" ? "2px solid var(--brand)" : "1px solid var(--border)",
                background: currentTheme === "light" ? "var(--brand-soft)" : "var(--surface)",
              }}
            >
              <span style={{ fontSize: 24 }}>☀️</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>White Theme (Lite)</span>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)", textAlign: "center" }}>Clean white surfaces &amp; light background</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleThemeChange("dark")}
              style={{
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                borderRadius: "10px",
                border: currentTheme === "dark" ? "2px solid var(--brand)" : "1px solid var(--border)",
                background: currentTheme === "dark" ? "var(--brand-soft)" : "var(--surface)",
              }}
            >
              <span style={{ fontSize: 24 }}>🌙</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>Dark Theme</span>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)", textAlign: "center" }}>Sleek dark mode for low-light environments</span>
            </button>
          </div>
        </Panel>
      </div>

      <Panel
        title="Supervisor & Team Access Management"
        sub="Create and manage supervisor logins. Supervisors have restricted access to Dashboard, Voice AI, Outbound Caller, Call / Join, and Call Alerts."
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Active Supervisors: <strong>{supervisors.length}</strong> accounts registered
          </div>
          <button
            type="button"
            className="btn-solid"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              setSupervisorError("");
              setShowCreateModal(true);
            }}
          >
            <span>+</span> Create New Supervisor
          </button>
        </div>

        {supervisorSuccess && (
          <div style={{ padding: "8px 14px", background: "var(--good-soft)", color: "var(--good)", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
            ✓ {supervisorSuccess}
          </div>
        )}

        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Supervisor Name</th>
                <th style={{ textAlign: "left" }}>Username</th>
                <th style={{ textAlign: "left" }}>Email</th>
                <th style={{ textAlign: "left" }}>Queue / Desk</th>
                <th style={{ textAlign: "left" }}>Created</th>
                <th style={{ textAlign: "center" }}>Role</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map((s) => (
                <tr key={s.username}>
                  <td>
                    <strong>{s.name}</strong>
                    {s.isDefault && (
                      <span className="badge" style={{ marginLeft: 6, fontSize: 10, padding: "1px 5px" }}>Primary</span>
                    )}
                  </td>
                  <td><code>{s.username}</code></td>
                  <td style={{ color: "var(--text-dim)" }}>{s.email || "—"}</td>
                  <td>{s.queue || "Operations Queue"}</td>
                  <td style={{ color: "var(--text-dim)" }}>{s.createdAt || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <Badge tone="info">Supervisor</Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {s.isDefault ? (
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Default Account</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ color: "var(--bad)", fontSize: 12, padding: "2px 8px" }}
                        onClick={() => handleDeleteSupervisor(s.username)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {showCreateModal && (
        <Modal
          title="Create New Supervisor"
          onClose={() => setShowCreateModal(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-solid" onClick={handleCreateSupervisor}>
                Create Supervisor
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateSupervisor}>
            {supervisorError && (
              <div style={{ padding: "8px 12px", background: "var(--bad-soft)", color: "var(--bad)", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
                ⚠ {supervisorError}
              </div>
            )}
            <div className="form-grid" style={{ gap: 12 }}>
              <Field label="Full Name">
                <input
                  type="text"
                  placeholder="e.g. Sarah Tan"
                  value={newSupervisor.name}
                  onChange={(e) => setNewSupervisor({ ...newSupervisor, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Username">
                <input
                  type="text"
                  placeholder="e.g. sarahtan"
                  value={newSupervisor.username}
                  onChange={(e) => setNewSupervisor({ ...newSupervisor, username: e.target.value })}
                  required
                />
              </Field>
              <Field label="Initial Password">
                <input
                  type="text"
                  placeholder="e.g. Hello@123"
                  value={newSupervisor.password}
                  onChange={(e) => setNewSupervisor({ ...newSupervisor, password: e.target.value })}
                  required
                />
              </Field>
              <Field label="Work Email">
                <input
                  type="email"
                  placeholder="e.g. sarahtan@iwk.com.my"
                  value={newSupervisor.email}
                  onChange={(e) => setNewSupervisor({ ...newSupervisor, email: e.target.value })}
                />
              </Field>
              <Field label="Assigned Queue / Desk">
                <input
                  type="text"
                  placeholder="e.g. Commercial Recovery Team"
                  value={newSupervisor.queue}
                  onChange={(e) => setNewSupervisor({ ...newSupervisor, queue: e.target.value })}
                />
              </Field>
            </div>
            <p className="empty-note" style={{ marginTop: 12, fontSize: 12 }}>
              The supervisor will be able to log in immediately with their assigned username &amp; password.
            </p>
          </form>
        </Modal>
      )}

      <div className="footer-bar">
        <span>
          {dirty ? (
            <Badge tone="warn">Unsaved demo changes are active</Badge>
          ) : (
            <span className="dim">Showing the original seed values.</span>
          )}
          {saved && <> <Badge tone="ok">Saved to memory</Badge></>}
        </span>
        <span style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={resetAll}>Reset To Seed</button>
          <button className="btn-solid" onClick={save}>Save Settings</button>
        </span>
      </div>
    </>
  );
}

