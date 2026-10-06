/* ============================================================
   Where the browser finds the mail / SMS backend (/api/*).

   • Local dev (localhost): the Express bridge started with `npm run mail`
     on http://localhost:3001 — exactly as before.
   • Deployed (Netlify): the same Express app runs as a Netlify Function and
     is reached on the SAME origin at /api/* (see netlify.toml), so nothing
     has to run on anyone's laptop.

   Override with `apiBase` in config.js (e.g. a VPS URL) if ever needed.
   ============================================================ */

import { CONFIG } from "../../config.js";

const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

export const API_BASE =
  typeof CONFIG.apiBase === "string" ? CONFIG.apiBase.replace(/\/$/, "") : isLocalHost ? "http://localhost:3001" : "";

export const IS_LOCAL_API = API_BASE.startsWith("http://localhost");

export const apiUrl = (path) => `${API_BASE}${path}`;
