/* ============================================================
   Vapi API access — the Voice AI page runs on LIVE data.

   Ported unchanged in behaviour from the original app.js.
   ============================================================ */

import { CONFIG } from "../../config.js";

const { vapi, options } = CONFIG;

export async function api(path, params = {}) {
  const url = new URL(vapi.baseUrl + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${vapi.secretKey}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
    );
  }
  return res.json();
}

export async function fetchAssistants() {
  try {
    const list = await api("/assistant", { limit: 100 });
    return new Map(list.map((a) => [a.id, a.name || "Untitled"]));
  } catch {
    // Names are cosmetic — fall back to raw ids.
    return new Map();
  }
}

export async function fetchCalls({ before = null } = {}) {
  const params = { limit: options.pageSize };
  if (options.onlyConfiguredAssistant) params.assistantId = vapi.assistantId;
  if (before) params.createdAtLt = before;

  const raw = await api("/call", params);
  return { rows: raw.map(normalise), rawCount: raw.length };
}

export function normalise(c) {
  const started = c.startedAt ? new Date(c.startedAt) : null;
  const ended = c.endedAt ? new Date(c.endedAt) : null;
  const duration = started && ended ? Math.max(0, (ended - started) / 1000) : 0;

  const rec = c.artifact?.recording || {};
  const mono = rec.mono || {};

  return {
    id: c.id,
    createdAt: c.createdAt,
    startedAt: c.startedAt || c.createdAt,
    startedDate: started || new Date(c.createdAt),
    duration,
    type: c.type || "—",
    status: c.status || "—",
    endedReason: c.endedReason || "",
    assistantId: c.assistantId || "",
    assistantName:
      c.assistant?.name ||
      c.messages?.find((m) => m.assistantName)?.assistantName ||
      "",
    cost: typeof c.cost === "number" ? c.cost : 0,
    costBreakdown: c.costBreakdown || {},
    transcript: c.transcript || "",
    summary: c.summary || "",
    messages: Array.isArray(c.messages) ? c.messages : [],
    customer: c.customer?.number || c.customer?.name || "",
    phoneNumber: c.phoneNumber?.number || "",
    recordings: {
      mono: c.recordingUrl || mono.combinedUrl || "",
      stereo: c.stereoRecordingUrl || rec.stereoUrl || "",
      assistant: mono.assistantUrl || "",
      customer: mono.customerUrl || "",
    },
  };
}

export function prettyReason(reason) {
  if (!reason) return "—";
  return reason.replace(/[-.]/g, " ").replace(/\s+/g, " ").trim();
}

export function reasonTone(reason) {
  if (!reason) return "mute";
  if (/error|failed|no-answer|busy|voicemail/i.test(reason)) return "err";
  if (/hangup|ended-call|completed/i.test(reason)) return "ok";
  return "warn";
}

/* ---------------- recordings ---------------- */

/* Recording files are NOT publicly readable — the bucket rejects
   unauthenticated requests. Vapi exposes authenticated endpoints that 302
   to a short-lived signed URL, so audio must be fetched with the secret
   key and handed to <audio> as a blob: an <audio src> cannot send an
   Authorization header.

   This cache is module-level on purpose, so it survives component
   re-renders AND route changes. It caches the PROMISE, not the URL, so a
   re-render mid-download reuses the in-flight request rather than
   starting a second one. */
const recordingCache = new Map(); // "callId:track" -> Promise<object URL>

export const isRecordingCached = (callId, track) =>
  recordingCache.has(`${callId}:${track}`);

export function trackUrl(callId, track) {
  const key = `${callId}:${track}`;

  if (!recordingCache.has(key)) {
    const p = (async () => {
      const res = await fetch(
        `${vapi.baseUrl}/call/${callId}/${track}-recording`,
        { headers: { Authorization: `Bearer ${vapi.secretKey}` } }
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return URL.createObjectURL(await res.blob());
    })().catch((e) => {
      recordingCache.delete(key); // let the next attempt retry
      throw e;
    });
    recordingCache.set(key, p);
  }

  return recordingCache.get(key);
}

export const TRACK_LABELS = [
  ["Combined", "mono"],
  ["Stereo", "stereo"],
  ["Assistant only", "assistant"],
  ["Customer only", "customer"],
];

export function availableTracks(row) {
  return TRACK_LABELS.filter(([, key]) => row.recordings[key]);
}
