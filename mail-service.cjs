const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;

// ─── Prevent unhandled rejections from crashing the server ─────────────────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT ERROR]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Target Support Email Credentials
const GMAIL_USER = process.env.GMAIL_USER || 'coutomerr@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'evjhxxiytmeugnek';

// SMTP Transporter for Sending Real Emails
// Twilio defaults used by /api/send-sms when the browser does not pass its own credentials.
const TWILIO_DEFAULT_SID = 'AC4dd107dc736942e0474eb7e23e16e244';
const TWILIO_DEFAULT_TOKEN = 'e3bd880d4fee76e35a08d9c1c01a22f7';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
  // Fail fast with a clear error rather than hanging (Netlify Functions stop at ~10s).
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 20000,
});

// Endpoint: Send Real Email from coutomerr@gmail.com
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, inReplyTo, accountNo } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'Missing recipient or body' });
    }

    const mailOptions = {
      from: `"IWK Customer Support Desk" <${GMAIL_USER}>`,
      to: to,
      replyTo: GMAIL_USER,
      subject: subject || `IWK Support Response: Account ${accountNo || '6199-General'}`,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #333;">
          <div style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 style="color: #007bff; margin: 0;">Indah Water Konsortium (IWK)</h3>
            <p style="margin: 3px 0 0; font-size: 12px; color: #666;">Customer Care &amp; Support Services</p>
          </div>
          <p>${body.replace(/\n/g, '<br/>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #777;">
            This email was dispatched by IWK Customer Support Desk.<br/>
            You can reply directly to this email to continue the conversation.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Email sent to ${to}: ${info.messageId}`);
    return res.json({ success: true, messageId: info.messageId, to });
  } catch (err) {
    console.error('[SMTP ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: Send Real Twilio SMS (Backend Proxy to bypass Browser CORS)
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, body, accountSid, authToken, fromNumber } = req.body;
    // Env vars (set in Netlify) take priority, then what the browser sends, then the built-in default.
    const sid = (process.env.TWILIO_ACCOUNT_SID || accountSid || TWILIO_DEFAULT_SID).trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || authToken || TWILIO_DEFAULT_TOKEN).trim();
    const from = (process.env.TWILIO_FROM_NUMBER || fromNumber || '+19854652238').trim();

    if (!to || !body) {
      return res.status(400).json({ error: "Missing 'to' or 'body'" });
    }

    const cleanTo = to.replace(/\s+/g, '').replace(/-/g, '');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams();
    // Malaysia (+60): operators require the "RM 0.00" header and a brand name in every SMS, otherwise the
    // text is truncated or the message fails (Twilio error 30008). Added automatically; other countries untouched.
    let smsBody = body;
    if (cleanTo.startsWith('+60') && !/^\s*RM\s?0\.00/i.test(smsBody)) {
      smsBody = `RM 0.00 ${/iwk|indah\s*water/i.test(smsBody) ? '' : 'IWK: '}${smsBody}`;
    }

    params.append('To', cleanTo);
    params.append('From', from);
    params.append('Body', smsBody);

    const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
    const twilioRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error('[TWILIO ERROR]', data.message || data);
      return res.status(twilioRes.status).json({ error: data.message || 'Twilio dispatch failed' });
    }
    console.log(`[TWILIO SMS] Dispatched to ${cleanTo}, SID: ${data.sid}`);
    return res.json({ success: true, sid: data.sid, to: cleanTo });
  } catch (err) {
    console.error('[TWILIO EXCEPTION]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Running as a Netlify Function (AWS Lambda) the whole request must finish within ~10s.
const SERVERLESS = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const IMAP_DEADLINE_MS = SERVERLESS ? 8500 : 40000;
const INBOX_CACHE_MS = 10000;

// Endpoint: Health check — verifies SMTP login and the Twilio account WITHOUT sending anything.
app.get('/api/health', async (req, res) => {
  const out = { smtp: { ok: false }, twilio: { ok: false } };

  const smtp = (async () => {
    const t0 = Date.now();
    try {
      await transporter.verify();
      out.smtp = { ok: true, ms: Date.now() - t0 };
    } catch (e) {
      out.smtp = { ok: false, error: e.message };
    }
  })();

  const twilio = (async () => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      const sid = process.env.TWILIO_ACCOUNT_SID || TWILIO_DEFAULT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN || TWILIO_DEFAULT_TOKEN;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      const d = await r.json().catch(() => ({}));
      out.twilio = r.ok ? { ok: true, accountStatus: d.status } : { ok: false, error: d.message || `HTTP ${r.status}` };
    } catch (e) {
      out.twilio = { ok: false, error: e.message };
    }
  })();

  await Promise.all([smtp, twilio]);
  return res.json({ ok: out.smtp.ok && out.twilio.ok, ...out, mode: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'netlify-function' : 'local' });
});

// ─── IMAP Config with longer timeouts ──────────────────────────────────────
const IMAP_CONFIG = {
  imap: {
    user: GMAIL_USER,
    password: GMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: SERVERLESS ? 6000 : 15000,
    connTimeout: SERVERLESS ? 6000 : 20000,
  },
};

// Reads the newest inbound customer emails. `holder.connection` lets the caller close the
// IMAP connection if the deadline passes first.
async function readInbox(holder) {
    const pending = imaps.connect(IMAP_CONFIG);
    holder.pending = pending; // lets the caller close it even if the deadline passes mid-connect
    const connection = await pending;
    holder.connection = connection;
    await connection.openBox('INBOX');

    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
    };

    // Two steps so a big mailbox stays fast: first list only the UIDs (no message bodies),
    // then download the bodies of just the 10 newest. (Downloading every message in the
    // inbox and keeping 10 took minutes and timed out on Netlify.)
    const index = await connection.search(searchCriteria, { bodies: [], markSeen: false });
    const newestUids = index
      .map((m) => m.attributes.uid)
      .sort((a, b) => b - a)
      .slice(0, 10);

    let recent = [];
    if (newestUids.length > 0) {
      recent = await connection.search([['UID', newestUids.join(',')]], fetchOptions);
      recent.sort((a, b) => b.attributes.uid - a.attributes.uid);
    }

    const parsedEmails = [];

    for (const item of recent) {
      try {
        const allParts = item.parts.find((p) => p.which === '');
        if (allParts) {
          const mail = await simpleParser(allParts.body);
          const senderFrom = mail.from?.value?.[0]?.address || 'unknown';
          const senderName = mail.from?.value?.[0]?.name || senderFrom.split('@')[0];

          // Only process real customer emails (filter out google notifications, no-reply, self)
          const isSelf = senderFrom.toLowerCase() === GMAIL_USER.toLowerCase();
          const isGoogleOrSystem =
            senderFrom.includes('google.com') ||
            senderFrom.includes('no-reply') ||
            senderFrom.includes('noreply') ||
            senderFrom.includes('mailer-daemon');

          if (!isSelf && !isGoogleOrSystem) {
            // Clean reply text (remove quoted "On ... wrote:" history)
            let cleanText = (mail.text || '').trim();
            // Remove quoted reply chains
            cleanText = cleanText
              .replace(/On .+?wrote:/gs, '')
              .replace(/^>.*$/gm, '')
              .trim();

            // Fallback to first 160 chars of html text if empty
            if (!cleanText && mail.html) {
              cleanText = mail.html
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 160);
            }

            const emailDate = mail.date ? new Date(mail.date) : new Date();
            const timeStr = emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            parsedEmails.push({
              id: `REAL-EM-${item.attributes.uid}`,
              uid: item.attributes.uid,
              channel: 'Customer Email',
              customerName: senderName,
              senderEmail: senderFrom,
              handledBy: 'IWK Support Desk',
              accountNo: '6199-' + Math.floor(1000 + Math.random() * 9000) + '-LIVE',
              subject: mail.subject || 'Inbound Inquiry',
              sentDate: timeStr,
              inboundSnippet: cleanText.slice(0, 160) || 'Customer reply received',
              lastSnippet: cleanText.slice(0, 160) || 'Customer reply received',
              openStatus: 'Received (Inbound)',
              sentiment: 'Neutral',
              outcome: 'Awaiting Rep Reply',
              statusTone: 'warn',
              history: [
                {
                  sender: `Customer (${senderFrom})`,
                  text: cleanText || 'No content',
                  time: timeStr,
                },
              ],
            });
          }
        }
      } catch (parseErr) {
        console.warn('[IMAP PARSE WARN]', parseErr.message);
      }
    }

    return parsedEmails;
}

// One IMAP login at a time (shared by every browser tab polling), a short cache, and a hard
// deadline — a slow Gmail answers with an empty list instead of hanging the page or the function.
let inboxInFlight = null;
let inboxCache = { at: 0, emails: [] };
// Gmail allows only ~15 simultaneous IMAP sessions. When it says so, stop asking for a minute.
let inboxCooldownUntil = 0;

// Fully close an IMAP connection (LOGOUT + destroy the socket) so Gmail frees the session at once.
function closeImap(conn) {
  try { conn.end(); } catch (_) {}
  try { conn.imap && conn.imap.destroy(); } catch (_) {}
}

// Endpoint: Fetch Real Inbound Emails sent to coutomerr@gmail.com
app.get('/api/fetch-inbound-emails', async (req, res) => {
  if (Date.now() < inboxCooldownUntil) {
    return res.json({ success: true, emails: [], imap_error: 'Gmail IMAP is busy (too many connections) — retrying shortly', cooldown: true });
  }
  if (Date.now() - inboxCache.at < INBOX_CACHE_MS) {
    return res.json({ success: true, emails: inboxCache.emails, cached: true });
  }
  if (!inboxInFlight) {
    const holder = {};
    inboxInFlight = (async () => {
      let timer;
      try {
        const deadline = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`IMAP did not answer within ${IMAP_DEADLINE_MS / 1000}s`)), IMAP_DEADLINE_MS);
        });
        const emails = await Promise.race([readInbox(holder), deadline]);
        inboxCache = { at: Date.now(), emails };
        return { success: true, emails };
      } catch (err) {
        console.error('[IMAP ERROR]', err.message);
        if (/too many simultaneous/i.test(err.message)) inboxCooldownUntil = Date.now() + 60000;
        // Return empty success so the frontend polling doesn't show errors
        return { success: true, emails: [], imap_error: err.message };
      } finally {
        clearTimeout(timer);
        if (holder.connection) closeImap(holder.connection);
        else if (holder.pending) holder.pending.then(closeImap).catch(() => {});
        inboxInFlight = null;
      }
    })();
  }
  return res.json(await inboxInFlight);
});

// `npm run mail` runs this file directly and starts the bridge on port 3001.
// On Netlify the same app is imported by netlify/functions/api.mjs instead.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[MAIL SERVICE] IWK Email Bridge running on http://localhost:${PORT} with user ${GMAIL_USER}`);
  });
}

module.exports = { app };
