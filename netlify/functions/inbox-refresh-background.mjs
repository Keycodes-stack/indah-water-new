/* Netlify BACKGROUND function (the "-background" suffix gives it up to 15 minutes).

   Gmail's IMAP can take well over the 10s a normal function is allowed, so the slow part runs here:
   it reads the newest inbound emails and stores the result in Netlify Blobs. The /api/fetch-inbound-emails
   route (api.mjs) answers instantly from that stored snapshot and triggers this function when it is stale. */

import { connectLambda, getStore } from "@netlify/blobs";
import mailService from "../../mail-service.cjs";

export const handler = async (event) => {
  connectLambda(event);
  const store = getStore("iwk-inbox");

  try {
    const result = await mailService.loadInbox({ deadlineMs: 120000, slow: true });
    const failed = !!result.imap_error;
    const previous = (await store.get("latest", { type: "json" }).catch(() => null)) || {};
    await store.setJSON("latest", {
      at: Date.now(),
      // keep the last good emails if this refresh failed
      emails: failed ? previous.emails || [] : result.emails,
      error: failed ? result.imap_error : null,
    });
  } catch (err) {
    await store.setJSON("latest", { at: Date.now(), emails: [], error: err.message }).catch(() => {});
  } finally {
    await store.delete("lock").catch(() => {});
  }

  return { statusCode: 202 };
};
