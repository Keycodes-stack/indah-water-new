/* Netlify Function: the IWK mail / SMS bridge.

   Runs the SAME Express app as `npm run mail` (mail-service.cjs):
     POST /api/send-email           — SMTP email
     POST /api/send-sms             — Twilio SMS proxy
     GET  /api/fetch-inbound-emails — IMAP inbox for Support Email

   netlify.toml rewrites /api/* to this function, so the browser keeps calling
   the same /api/... paths it uses locally. */

import serverless from "serverless-http";
import mailService from "../../mail-service.cjs";

const expressHandler = serverless(mailService.app);

export const handler = async (event, context) => {
  // Netlify may hand us either the original path (/api/send-email) or the
  // rewritten function path (/.netlify/functions/api/send-email). Express
  // routes are registered as /api/*, so normalise both to that shape.
  let path = event.path || "/";
  path = path.replace(/^\/\.netlify\/functions\/api/, "");
  if (!path.startsWith("/api/")) path = `/api${path.startsWith("/") ? "" : "/"}${path}`;

  return expressHandler({ ...event, path }, context);
};
