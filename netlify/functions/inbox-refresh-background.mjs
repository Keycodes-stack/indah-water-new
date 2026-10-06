/* Netlify BACKGROUND function (the "-background" suffix gives it up to 15 minutes).

   Gmail's IMAP answers slowly (~20s per command), far beyond the 10s a normal function may run.
   This function therefore keeps ONE IMAP connection open (IDLE): Gmail pushes new mail to it, it fetches the
   newest messages and stores the result in Netlify Blobs. It also writes a heartbeat every ~20s.

   /api/fetch-inbound-emails (api.mjs) just reads the stored snapshot instantly and starts this function
   again whenever the heartbeat has stopped (e.g. after the ~13 minute run ends). */

import { connectLambda, getStore } from "@netlify/blobs";
import mailService from "../../mail-service.cjs";

const MAX_RUN_MS = 13 * 60 * 1000; // stay safely under the 15-minute limit

export const handler = async (event) => {
  connectLambda(event);
  const store = getStore("iwk-inbox");

  try {
    await mailService.watchInbox({
      maxMs: MAX_RUN_MS,
      onHeartbeat: () => store.setJSON("alive", { at: Date.now() }),
      onSnapshot: (emails) => store.setJSON("latest", { at: Date.now(), emails, error: null }),
    });
  } catch (err) {
    // keep the last good emails, record why we stopped; the next poll starts a new watcher
    const previous = (await store.get("latest", { type: "json" }).catch(() => null)) || {};
    await store
      .setJSON("latest", { at: Date.now(), emails: previous.emails || [], error: err.message })
      .catch(() => {});
  } finally {
    await store.delete("alive").catch(() => {});
    await store.delete("lock").catch(() => {});
  }

  return { statusCode: 202 };
};
