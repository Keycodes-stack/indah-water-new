/* Netlify Function: the IWK mail / SMS bridge.

   Runs the SAME Express app as `npm run mail` (mail-service.cjs):
     POST /api/send-email           — SMTP email
     POST /api/send-sms             — Twilio SMS proxy
     GET  /api/fetch-inbound-emails — IMAP inbox for Support Email
     GET  /api/health               — SMTP / Twilio check (sends nothing)

   netlify.toml rewrites /api/* to this function, so the browser keeps calling
   the same /api/... paths it uses locally.

   The inbox is special: Gmail's IMAP is slow, and a normal function must answer within ~10s. So the
   inbox route answers instantly from a snapshot kept in Netlify Blobs and asks the background function
   (inbox-refresh-background) to refresh it. If Blobs is unavailable it falls back to reading IMAP directly. */

import serverless from "serverless-http";
import { connectLambda, getStore } from "@netlify/blobs";
import mailService from "../../mail-service.cjs";

const expressHandler = serverless(mailService.app);

const INBOX_PATH = "/api/fetch-inbound-emails";
const HEARTBEAT_MS = 90000; // the watcher writes a heartbeat every ~20s; older than this = it stopped
const START_LOCK_MS = 60000; // never start a second watcher while one was started within this window

async function serveInbox(event) {
  try {
    connectLambda(event);
    const store = getStore("iwk-inbox");

    const snapshot = (await store.get("latest", { type: "json" })) || null;
    const alive = (await store.get("alive", { type: "json" })) || null;
    const lock = (await store.get("lock", { type: "json" })) || null;
    const now = Date.now();
    const watching = !!alive && now - alive.at < HEARTBEAT_MS;
    const starting = !!lock && now - lock.at < START_LOCK_MS;

    if (!watching && !starting) {
      await store.setJSON("lock", { at: now });
      const base = process.env.URL || `https://${event.headers?.host}`;
      try {
        // The background function answers 202 immediately and keeps running (it holds the IMAP connection).
        await fetch(`${base}/.netlify/functions/inbox-refresh-background`, {
          method: "POST",
          signal: AbortSignal.timeout(4000),
        });
      } catch (err) {
        console.warn("[INBOX] could not start the background refresh:", err.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        emails: snapshot?.emails || [],
        ...(snapshot?.error ? { imap_error: snapshot.error } : {}),
        updatedAt: snapshot?.at || null,
        watching: watching || starting,
      }),
    };
  } catch (err) {
    console.warn("[INBOX] Blobs unavailable, reading IMAP directly:", err.message);
    return null;
  }
}

export const handler = async (event, context) => {
  // Netlify may hand us either the original path (/api/send-email) or the
  // rewritten function path (/.netlify/functions/api/send-email). Express
  // routes are registered as /api/*, so normalise both to that shape.
  let path = event.path || "/";
  path = path.replace(/^\/\.netlify\/functions\/api/, "");
  if (!path.startsWith("/api/")) path = `/api${path.startsWith("/") ? "" : "/"}${path}`;

  if (event.httpMethod === "GET" && path === INBOX_PATH) {
    const served = await serveInbox(event);
    if (served) return served;
  }

  return expressHandler({ ...event, path }, context);
};
