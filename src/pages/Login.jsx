import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login, isLoggedIn } from "../auth/session.js";
import { useData } from "../db/store.jsx";
import { getStoredTheme, applyTheme } from "../lib/theme.js";
import logoImg from "../assets/indah-water-logo.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useData();

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    applyTheme(next);
    setCurrentTheme(next);
  };

  if (isLoggedIn()) return <Navigate to="/" replace />;

  function onSubmit(e) {
    e.preventDefault();
    if (login(username.trim(), password)) {
      navigate(location.state?.from || "/", { replace: true });
    } else {
      setError("Incorrect username or password.");
      setPassword("");
    }
  }

  return (
    <div className="login-wrap" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <button
          className="btn-ghost"
          type="button"
          onClick={toggleTheme}
          style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}
          title={`Switch To ${currentTheme === "dark" ? "White Theme" : "Dark Theme"}`}
        >
          {currentTheme === "dark" ? "☀️ White Theme" : "🌙 Dark Theme"}
        </button>
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <img
            src={logoImg}
            alt="Indah Water"
            className="login-logo-img"
          />
          <p className="login-sub">Collections Dashboard</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn-primary" type="submit">Sign In</button>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "center" }}>Quick Demo Sign-In:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "7px 8px", textAlign: "left", display: "flex", flexDirection: "column", gap: 3, border: "1px solid var(--border)", borderRadius: "8px" }}
              onClick={() => {
                setUsername("admin");
                setPassword("Hello@123");
                setError("");
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text)" }}>👑 Admin</span>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>admin / Hello@123</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "7px 8px", textAlign: "left", display: "flex", flexDirection: "column", gap: 3, border: "1px solid var(--border)", borderRadius: "8px" }}
              onClick={() => {
                setUsername("supervisor");
                setPassword("Hello@123");
                setError("");
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text)" }}>🎧 Supervisor</span>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>supervisor / Hello@123</span>
            </button>
          </div>
        </div>

        <p className="login-hint" style={{ marginTop: 12 }}>Credentials are configurable in <code>config.js</code> &amp; Settings</p>
      </form>
    </div>
  );
}

