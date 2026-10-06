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
const GMAIL_USER = 'coutomerr@gmail.com';
const GMAIL_PASS = 'wvofrlfpjwnmpbjn';

// SMTP Transporter for Sending Real Emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
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
    const sid = (accountSid || 'AC4dd107dc736942e0474eb7e23e16e244').trim();
    const token = (authToken || 'e3bd880d4fee76e35a08d9c1c01a22f7').trim();
    const from = (fromNumber || '+19854652238').trim();

    if (!to || !body) {
      return res.status(400).json({ error: "Missing 'to' or 'body'" });
    }

    const cleanTo = to.replace(/\s+/g, '').replace(/-/g, '');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', cleanTo);
    params.append('From', from);
    params.append('Body', body);

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

// ─── IMAP Config with longer timeouts ──────────────────────────────────────
const IMAP_CONFIG = {
  imap: {
    user: GMAIL_USER,
    password: GMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 15000,
    connTimeout: 20000,
  },
};

// Endpoint: Fetch Real Inbound Emails sent to coutomerr@gmail.com
app.get('/api/fetch-inbound-emails', async (req, res) => {
  let connection = null;
  try {
    connection = await imaps.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    // Sort newest first, take top 10
    messages.sort((a, b) => b.attributes.uid - a.attributes.uid);
    const recent = messages.slice(0, 10);

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

    try { connection.end(); } catch (_) {}
    return res.json({ success: true, emails: parsedEmails });

  } catch (err) {
    console.error('[IMAP ERROR]', err.message);
    if (connection) {
      try { connection.end(); } catch (_) {}
    }
    // Return empty success so the frontend polling doesn't show errors
    return res.json({ success: true, emails: [], imap_error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[MAIL SERVICE] IWK Email Bridge running on http://localhost:${PORT} with user ${GMAIL_USER}`);
});
