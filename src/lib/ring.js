/* ============================================================
   Incoming-call ring tone.

   Synthesised with the Web Audio API rather than shipping an audio
   file, so there is no asset to load and nothing to 404.

   Browsers block audio until the user has interacted with the page.
   A manual page refresh does NOT count as an interaction, so start()
   can legitimately be refused — it reports that back instead of
   failing silently, and the caller offers an "Enable sound" button.
   ============================================================ */

/* Classic two-tone ring: 440Hz + 480Hz, 2s on / 1s off. */
const TONE_A = 440;
const TONE_B = 480;
const RING_ON = 2.0;
const RING_CYCLE = 3.0;

let ctx = null;
let stopTimer = null;
let active = null; // { gain, oscillators[] }

function audioContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** True when the browser will let us make sound right now. */
export function canPlay() {
  const c = audioContext();
  return !!c && c.state === "running";
}

/**
 * Play the ring for `seconds`, then stop on its own.
 * Resolves true if sound actually started, false if the browser blocked it.
 */
export async function start(seconds = 6) {
  const c = audioContext();
  if (!c) return false;

  // Suspended means no user gesture yet. resume() only succeeds if this
  // call is itself inside a gesture, so a refresh-triggered ring may fail.
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  if (c.state !== "running") return false;

  stop();

  const now = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);

  const oscillators = [TONE_A, TONE_B].map((freq) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start(now);
    osc.stop(now + seconds);
    return osc;
  });

  /* Envelope the master gain into ring bursts. Short ramps instead of
     instant jumps, otherwise each burst starts with an audible click. */
  const level = 0.18;
  for (let t = 0; t < seconds; t += RING_CYCLE) {
    const on = now + t;
    const off = Math.min(now + t + RING_ON, now + seconds);
    master.gain.setValueAtTime(0, on);
    master.gain.linearRampToValueAtTime(level, on + 0.04);
    master.gain.setValueAtTime(level, Math.max(on + 0.04, off - 0.06));
    master.gain.linearRampToValueAtTime(0, off);
  }

  active = { gain: master, oscillators };
  stopTimer = setTimeout(stop, seconds * 1000 + 120);
  return true;
}

/** Stop immediately and release the nodes. */
export function stop() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (!active) return;

  const { gain, oscillators } = active;
  active = null;
  try {
    // Fade out over 50ms so stopping never clicks.
    const c = audioContext();
    gain.gain.cancelScheduledValues(c.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, c.currentTime);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.05);
    oscillators.forEach((o) => o.stop(c.currentTime + 0.06));
    setTimeout(() => gain.disconnect(), 120);
  } catch {
    /* Already stopped — nothing to clean up. */
  }
}

/**
 * Unlock audio from inside a real user gesture (a click handler).
 * Returns true once the browser will allow sound.
 */
export async function unlock() {
  const c = audioContext();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}
