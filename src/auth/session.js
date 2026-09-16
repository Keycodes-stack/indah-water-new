/* ============================================================
   Session & RBAC (Role-Based Access Control) Handling
   Roles:
     - 'admin': Full access to all dashboard pages and supervisor management
     - 'supervisor': Restricted access to Dashboard, Voice AI, Outbound Caller,
                     Call / Join, and Call Alerts (scoped to supervisor)
   ============================================================ */

import { CONFIG } from "../../config.js";

const SESSION_KEY = "iwk_dashboard_session";
const SUPERVISORS_KEY = "iwk_supervisors_registry";

/* Initial default supervisor account */
const DEFAULT_SUPERVISOR = {
  username: "supervisor",
  password: "Hello@123",
  role: "supervisor",
  name: "Operations Supervisor",
  email: "supervisor@iwk.com.my",
  queue: "Operations Queue",
  createdAt: "2026-09-01",
  isDefault: true,
};

/**
 * Returns all registered supervisors (default + any created by admin).
 */
export function getSupervisors() {
  try {
    const raw = localStorage.getItem(SUPERVISORS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    // Ensure default supervisor is always present
    const hasDefault = custom.some((s) => s.username === DEFAULT_SUPERVISOR.username);
    if (!hasDefault) {
      return [DEFAULT_SUPERVISOR, ...custom];
    }
    return custom;
  } catch {
    return [DEFAULT_SUPERVISOR];
  }
}

/**
 * Creates and registers a new supervisor (Admin action).
 */
export function createSupervisor({ name, username, password, email, queue }) {
  const supervisors = getSupervisors();
  const cleanUname = username.trim().toLowerCase();

  if (cleanUname === "admin" || cleanUname === CONFIG.username.toLowerCase()) {
    throw new Error("Username 'admin' is reserved for system administrators.");
  }

  if (supervisors.some((s) => s.username.toLowerCase() === cleanUname)) {
    throw new Error(`Supervisor with username '${cleanUname}' already exists.`);
  }

  const newSupervisor = {
    username: cleanUname,
    password: password.trim(),
    role: "supervisor",
    name: name.trim() || `Supervisor ${cleanUname}`,
    email: email?.trim() || `${cleanUname}@iwk.com.my`,
    queue: queue?.trim() || "General Inbound / Voice Queue",
    createdAt: new Date().toISOString().slice(0, 10),
    isDefault: false,
  };

  const updated = [...supervisors, newSupervisor];
  localStorage.setItem(SUPERVISORS_KEY, JSON.stringify(updated));
  return newSupervisor;
}

/**
 * Deletes a custom supervisor (cannot delete default supervisor).
 */
export function deleteSupervisor(username) {
  if (username === DEFAULT_SUPERVISOR.username) {
    throw new Error("Cannot delete the primary default supervisor account.");
  }
  const supervisors = getSupervisors().filter((s) => s.username !== username);
  localStorage.setItem(SUPERVISORS_KEY, JSON.stringify(supervisors));
}

/**
 * Authenticates user credentials for both admin and supervisor accounts.
 */
export function login(username, password) {
  const cleanUname = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Check Admin Credentials
  const adminUname = (CONFIG.username || "admin").toLowerCase();
  const adminPass = CONFIG.password || "Hello@123";

  if (cleanUname === adminUname && cleanPass === adminPass) {
    const adminSession = {
      user: "admin",
      role: "admin",
      name: "System Administrator",
      queue: "All Queues (Global)",
      at: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminSession));
    return true;
  }

  // 2. Check Supervisor Accounts
  const supervisors = getSupervisors();
  const matchedSupervisor = supervisors.find(
    (s) => s.username.toLowerCase() === cleanUname && s.password === cleanPass
  );

  if (matchedSupervisor) {
    const supervisorSession = {
      user: matchedSupervisor.username,
      role: "supervisor",
      name: matchedSupervisor.name,
      queue: matchedSupervisor.queue,
      at: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(supervisorSession));
    return true;
  }

  return false;
}

/**
 * Returns active user session object or null.
 */
export function session() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export const isLoggedIn = () => !!session();

export const isAdmin = () => {
  const s = session();
  return s?.role === "admin";
};

export const isSupervisor = () => {
  const s = session();
  return s?.role === "supervisor";
};

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
