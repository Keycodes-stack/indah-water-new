import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useData } from "../db/store.jsx";
import { logout, session } from "../auth/session.js";
import { getStoredTheme, applyTheme } from "../lib/theme.js";
import logoImg from "../assets/indah-water-logo.png";
import {
  DashboardIcon,
  VoiceIcon,
  PhoneCallIcon,
  TicketIcon,
  RefreshIcon,
  PhoneIcon,
  AlertTriangleIcon,
  InboxIcon,
  BarChartIcon,
  PieChartIcon,
  LayersIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  ScaleIcon,
  MapPinIcon,
  UsersIcon,
  SettingsIcon,
  TestIcon,
  SunIcon,
  MoonIcon,
} from "./icons.jsx";

const NAV = [
  {
    group: null,
    items: [
      { to: "/", label: "Dashboard", icon: <DashboardIcon size={16} />, end: true },
      { to: "/voice-ai", label: "Voice AI", icon: <VoiceIcon size={16} /> },
      { to: "/outbound-caller", label: "Outbound Caller", icon: <PhoneCallIcon size={16} /> },
      { to: "/tickets", label: "CRM Tickets", icon: <TicketIcon size={16} /> },
      { to: "/follow-ups", label: "Follow-Ups Queue", icon: <RefreshIcon size={16} /> },
      { to: "/testing", label: "Testing", icon: <TestIcon size={16} /> },
      { to: "/call/join", label: "Call / Join", icon: <PhoneIcon size={16} /> },
      { to: "/call-alerts", label: "Call Alerts", icon: <AlertTriangleIcon size={16} /> },
    ],
  },
  {
    group: "Collections",
    items: [
      { to: "/unified-inbox", label: "Unified Inbox", icon: <InboxIcon size={16} /> },
      { to: "/book-position", label: "Book Position", icon: <BarChartIcon size={16} /> },
      { to: "/segments", label: "Segments", icon: <PieChartIcon size={16} /> },
      { to: "/treatment", label: "Treatment & Channels", icon: <LayersIcon size={16} /> },
      { to: "/performance", label: "Performance", icon: <TrendingUpIcon size={16} /> },
    ],
  },
  {
    group: "Governance",
    items: [
      { to: "/compliance", label: "Compliance", icon: <ShieldCheckIcon size={16} /> },
      { to: "/dca-legal", label: "DCA & Legal", icon: <ScaleIcon size={16} /> },
    ],
  },
  {
    group: "Geography",
    items: [{ to: "/geography", label: "Areas", icon: <MapPinIcon size={16} /> }],
  },
  {
    group: "Data",
    items: [
      { to: "/customers", label: "Customers", icon: <UsersIcon size={16} /> },
      { to: "/settings", label: "Settings", icon: <SettingsIcon size={16} /> },
    ],
  },
];

const TITLES = {
  "/": ["Dashboard", "Collections And Voice AI At A Glance"],
  "/voice-ai": ["Voice AI", "Live Call Logs, Cost And Recordings From Vapi"],
  "/outbound-caller": ["Outbound Caller", "Automated AI Outbound Campaign Dialing"],
  "/tickets": ["Ticketing & CRM Kanban", "Account Tickets Organized By Collection Ladder Stages"],
  "/follow-ups": ["Follow-Ups Queue", "Scheduled Future Cadence & Delivery Log"],
  "/testing": ["Testing & Live Agent Dialing", "Test Voice AI Assistant & Direct SIM Calling"],
  "/unified-inbox": ["Unified Inbox", "Omnichannel Messaging, Sentiment Analysis And Channel Reply Rates"],
  "/call/join": ["Call / Join", "Place An Outbound Call Or Join A Live One"],
  "/call-alerts": ["Call Alerts", "Flagged Calls From The Alerts Webhook"],
  "/book-position": ["Book Position & Movement", "Arrears By Category And Ladder Stage"],
  "/segments": ["Segment Breakdown", "Operating Segments And Special-Routing Populations"],
  "/treatment": ["Treatment & Channel Activity", "Contacts, Delivery And The Cost Of A Touch"],
  "/performance": ["Conversion & Collections Performance", "Performance KPIs"],
  "/compliance": ["Compliance & Conduct", "Governance View"],
  "/dca-legal": ["DCA & Legal Handover", "Agency Placement And Statutory Action"],
  "/geography": ["Geographic Layer", "Arrears Concentration And Ageing By Area"],
  "/customers": ["Customers", "Account Records — Add, Edit And Delete"],
  "/settings": ["Settings", "Organisation Profile, Contact Policy And Channel Costs"],
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());
  const { settings, dirty, resetAll, customers, seedCount } = useData();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    applyTheme(next);
    setCurrentTheme(next);
  };

  const userSession = session();
  const isSupervisor = userSession?.role === "supervisor";

  const visibleNav = isSupervisor ? [NAV[0]] : NAV;

  const [title, sub] = TITLES[pathname] || ["Dashboard", ""];
  const org = settings.organisation;

  const close = () => setOpen(false);

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={close} />}

      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand-lockup">
            <img
              src={logoImg}
              alt="Indah Water"
              className="brand-logo-img"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "space-between" }}>
              <span className="brand-badge">{isSupervisor ? "Supervisor" : "AI Recovery Engine"}</span>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Dashboard</span>
            </div>
          </div>
        </div>

        <nav className="nav">
          {visibleNav.map((g, i) => (
            <div className="nav-group" key={g.group || i}>
              {g.group && <div className="nav-group-label">{g.group}</div>}
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={close}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  <span className="ico" aria-hidden="true">{it.icon}</span>
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          {isSupervisor ? (
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "center", padding: "6px 0" }}>
              Queue: <strong>{userSession?.queue || "Voice Ops"}</strong>
            </div>
          ) : (
            dirty && (
              <button className="btn-ghost" style={{ width: "100%" }} onClick={resetAll}>
                Reset Demo Data
              </button>
            )
          )}
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <button
            className="btn-ghost menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle Navigation"
          >
            ☰
          </button>
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <p className="sub">{sub}</p>}
          </div>
          <div className="spacer" />
          <button
            className="btn-ghost"
            onClick={toggleTheme}
            title={`Switch To ${currentTheme === "dark" ? "White Theme" : "Dark Theme"}`}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            {currentTheme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
            <span>{currentTheme === "dark" ? "White Theme" : "Dark Theme"}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dim" style={{ fontSize: 12.5 }}>
              {userSession?.name || userSession?.user || "admin"}
            </span>
            <span
              className={`badge ${isSupervisor ? "info" : "good"}`}
              style={{ fontSize: 11, padding: "2px 8px", textTransform: "capitalize" }}
            >
              {userSession?.role || "admin"}
            </span>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Sign Out
          </button>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


