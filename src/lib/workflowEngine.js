/* ============================================================
   Workflow engine — actually runs the nodes of a workflow.

   Delivery goes through the integrations this project already has:
     • Email  → mail-service.cjs  (POST /api/send-email — localhost:3001 locally, a Netlify Function when deployed)
     • SMS    → sendTwilioSms()   (omnichannel.js)
     • Distress alert email → n8n "hard-customer-alert" webhook
                              (sendLiveAlertEmail() in omnichannel.js)

   DEMO SAFETY: every message is delivered to the TEST email / TEST phone
   entered in the Run dialog — never to the customer's own address. The
   intended recipient is written at the top of each message instead.
   ============================================================ */

import { sendTwilioSms, sendLiveAlertEmail, triggerGhlWebhook, getGhlConfig } from "./omnichannel.js";
import { apiUrl, IS_LOCAL_API } from "./api.js";

export const MAIL_SERVICE_URL = apiUrl("/api/send-email");
const SETTINGS_KEY = "iwk_workflow_settings";

const DEFAULTS = { testEmail: "", testPhone: "", limit: 3, distressActive: true };

export function getWorkflowSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — fall back to defaults */
  }
  return { ...DEFAULTS };
}

export function saveWorkflowSettings(patch) {
  const next = { ...getWorkflowSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/* ---------------- audiences ---------------- */

const addDays = (iso, n) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + n);
  return d;
};

const fmtDate = (d) =>
  d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtRm = (n) =>
  `RM ${Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AUDIENCES = {
  overdue: {
    label: "Overdue accounts",
    match: (c) => c.contactable && c.arrearsAmount > 0 && c.arrearsDays > 0 &&
      !["Pre-Due", "Bill Presented"].includes(c.stage),
  },
  upcoming: {
    label: "Bills falling due soon (Pre-Due / Bill Presented)",
    match: (c) => c.contactable && ["Pre-Due", "Bill Presented"].includes(c.stage),
  },
  all: {
    label: "All contactable customers",
    match: (c) => c.contactable,
  },
  hardship: {
    label: "Hardship accounts (Hardship / eKasih)",
    match: (c) => c.contactable && c.specialRouting === "Hardship/eKasih",
  },
  refusers: {
    label: "Refuser accounts (segment: Refusers)",
    match: (c) => c.contactable && c.segment === "Refusers",
  },
  dispute: {
    label: "Accounts with an open billing dispute",
    match: (c) => c.contactable && c.specialRouting === "Open Dispute",
  },
  ptp: {
    label: "Accounts with a promise to pay",
    match: (c) => c.contactable && !!c.promiseToPay,
  },
  live: {
    label: "The caller on the live call",
    match: () => false,
  },
};

export function audienceCount(kind, customers) {
  const a = AUDIENCES[kind];
  if (!a || kind === "live") return 0;
  return customers.filter(a.match).length;
}

function varsFor(c, extra = {}) {
  const billDate = c.lastBillDate;
  let due = addDays(billDate, 30);
  // The seed data is static, so a "bill falling due soon" can carry a due date that has
  // already passed. For reminders, roll such dates forward so the message reads correctly.
  if (extra.rollForward && (!due || due < new Date())) due = addDays(new Date().toISOString(), 7);
  return {
    customer_name: c.name,
    account_no: c.accountNo,
    bill_amount: fmtRm(c.arrearsAmount),
    due_date: fmtDate(due),
    days_overdue: String(c.arrearsDays ?? 0),
    installment_url: extra.website || "https://www.iwk.com.my/",
    paid_amount: fmtRm(c.promiseToPay && c.promiseToPay.amount ? c.promiseToPay.amount : 0),
    priority_level: c.stage || "—",
    call_summary: extra.callSummary || "",
    ...planVars(c),
  };
}

// A proposed instalment plan for the account's balance (or its active plan's monthly amount).
function planVars(c) {
  const balance = Number(c.arrearsAmount || 0);
  const active = c.instalmentPlan && c.instalmentPlan.active ? Number(c.instalmentPlan.monthlyAmount) : 0;
  const months = active > 0 ? Math.max(1, Math.ceil(balance / active)) : balance >= 600 ? 12 : balance >= 200 ? 6 : 3;
  const monthly = active > 0 ? active : balance / months;
  const first = addDays(new Date().toISOString(), 14);
  const lines = [];
  for (let i = 0; i < Math.min(months, 6); i += 1) {
    const d = new Date(first);
    d.setMonth(d.getMonth() + i);
    lines.push(`  ${i + 1}. ${fmtDate(d)}  —  ${fmtRm(Math.min(monthly, balance - monthly * i))}`);
  }
  if (months > 6) lines.push(`  … and ${months - 6} more monthly instalment(s)`);
  return {
    plan_months: String(months),
    plan_monthly: fmtRm(monthly),
    plan_total: fmtRm(balance),
    plan_start: fmtDate(first),
    plan_schedule: lines.join("\n"),
  };
}

const render = (tpl, vars) =>
  String(tpl || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, k) => (k in vars ? vars[k] : m));

/* ---------------- delivery ---------------- */

async function sendEmail({ to, subject, body, accountNo }) {
  let res;
  try {
    res = await fetch(MAIL_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, accountNo }),
    });
  } catch {
    throw new Error(
      IS_LOCAL_API
        ? "Mail service is not reachable on port 3001. Start it with: npm run mail"
        : "Mail service is not reachable. Check the Netlify function (/api/send-email) and its deploy log."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Mail service error ${res.status}`);
  return data;
}

/* ---------------- runner ---------------- */

/**
 * Runs `wf` node by node.
 * ctx: { customers, settings, updateCustomer, live, website, onLog }
 * Returns { recipients, sent, failed, skipped }.
 */
export async function runWorkflow(wf, ctx) {
  const { customers = [], settings, updateCustomer, live, website, onLog = () => {} } = ctx;
  const log = (level, text, nodeId) => onLog({ level, text, nodeId, at: new Date() });
  const tally = { recipients: 0, sent: 0, failed: 0, skipped: 0 };

  const audienceKind = wf.audience || "all";
  const dry = !!wf.placeholder; // visual placeholder workflow: walks the steps but sends / changes nothing
  let recipients = [];

  for (const node of wf.nodes) {
    try {
      switch (node.type) {
        case "TRIGGER": {
          if (audienceKind === "live" || live) {
            const l = live || {};
            recipients = [{
              id: "live-call",
              name: l.customerName || "Live test caller",
              accountNo: l.callId || "LIVE-TEST",
              email: "",
              phone: "",
              arrearsAmount: 0,
              arrearsDays: 0,
              stage: "LIVE",
              contactable: true,
              _live: l,
            }];
            log("info", `Trigger "${node.eventType}" — live call ${l.callId || "(test)"} detected.`, node.id);
          } else {
            const a = AUDIENCES[audienceKind] || AUDIENCES.all;
            const matched = customers.filter(a.match);
            recipients = matched.slice(0, Math.max(1, settings.limit || 1));
            log(
              "info",
              `Trigger "${node.eventType}" — audience: ${a.label}. ${matched.length.toLocaleString()} match, running for the first ${recipients.length}.`,
              node.id
            );
          }
          tally.recipients = recipients.length;
          if (recipients.length === 0) {
            log("warn", "No customers matched this workflow's audience. Nothing to do.", node.id);
            return tally;
          }
          break;
        }

        case "FETCH_BILL": {
          recipients.forEach((r) => {
            r._vars = varsFor(r, { website, rollForward: audienceKind === "upcoming" });
          });
          log(
            "ok",
            `Fetched bill details for ${recipients.length} account(s): ${recipients
              .map((r) => `${r.accountNo} ${fmtRm(r.arrearsAmount)}`)
              .join(", ")}.`,
            node.id
          );
          break;
        }

        case "VERIFY_BILL": {
          const before = recipients.length;
          recipients = recipients.filter((r) => r._live || r.arrearsAmount > 0);
          log("ok", `Ledger check: ${recipients.length} of ${before} account(s) still have an outstanding balance.`, node.id);
          break;
        }

        case "SEND_MESSAGE": {
          const channel = node.channel || "email";
          if (dry) {
            const sample = recipients[0];
            const preview = render(node.messagePrompt, sample._vars || varsFor(sample, { website })).replace(/\s+/g, " ").slice(0, 110);
            log("warn", `PLACEHOLDER — nothing was sent. A ${channel.toUpperCase()} would go to ${recipients.length} account(s): "${preview}…"`, node.id);
            tally.skipped += recipients.length;
            break;
          }
          for (const r of recipients) {
            const vars = r._vars || varsFor(r, { website, callSummary: r._live?.transcript });
            const body = render(node.messagePrompt, vars);
            const subject = render(node.subject || `IWK notice — account ${vars.account_no}`, vars);
            const intended = r._live ? "live test call" : `${r.name} <${r.email || "no email"}> / ${r.phone || "no phone"}`;

            try {
              if (channel === "email" && node.provider === "n8n-alert") {
                if (!settings.testEmail) throw new Error("Enter a test email first.");
                const res = await sendLiveAlertEmail({
                  recipientEmail: settings.testEmail,
                  subject,
                  reason: r._live?.reason || body,
                  customerName: r.name,
                  callId: r._live?.callId,
                  transcript: r._live?.transcript || body,
                });
                if (!res.ok) throw new Error(`n8n alert webhook returned ${res.status}`);
                if (res.simulated) {
                  tally.failed += 1;
                  r._sendOk = false;
                  log("err", `Distress alert was NOT delivered: the n8n webhook could not be reached from the browser.`, node.id);
                } else {
                  tally.sent += 1;
                  r._sendOk = true;
                  log("ok", `Distress alert email sent to ${settings.testEmail} via the n8n alert webhook.`, node.id);
                }
              } else if (channel === "email") {
                if (!settings.testEmail) throw new Error("Enter a test email first.");
                const sentSubject = `[Demo → ${r.email || r.name}] ${subject}`;
                const sentBody = `Demo delivery — intended for: ${intended}\n\n${body}`;
                await sendEmail({
                  to: settings.testEmail,
                  subject: sentSubject,
                  body: sentBody,
                  accountNo: vars.account_no,
                });
                ctx.onSent?.({
                  to: settings.testEmail,
                  subject: sentSubject,
                  body: sentBody,
                  customer: r,
                  accountNo: vars.account_no,
                  workflow: wf.name,
                });
                tally.sent += 1;
                r._sendOk = true;
                log("ok", `Email for ${r.name} (${vars.account_no}) sent to ${settings.testEmail}.`, node.id);
              } else if (channel === "sms") {
                if (!settings.testPhone) {
                  tally.skipped += 1;
                  log("warn", `SMS for ${r.name} skipped: no test phone number entered.`, node.id);
                  continue;
                }
                const res = await sendTwilioSms({
                  to: settings.testPhone,
                  body: `[Demo → ${r.name}] ${body}`,
                });
                if (res && res.carrier_dispatched && !res.account_sid) {
                  tally.failed += 1;
                  r._sendOk = false;
                  log("err", `SMS for ${r.name} was NOT delivered: the browser could not reach Twilio directly (the app falls back to a simulated result).`, node.id);
                } else {
                  tally.sent += 1;
                  r._sendOk = true;
                  log("ok", `SMS for ${r.name} sent to ${settings.testPhone} via Twilio.`, node.id);
                }
              } else if (channel === "whatsapp") {
                if (!getGhlConfig().webhookUrl) {
                  tally.skipped += 1;
                  log("warn", `WhatsApp for ${r.name} skipped: no GoHighLevel webhook is configured (Unified Inbox → settings).`, node.id);
                  continue;
                }
                await triggerGhlWebhook({
                  eventType: "workflow_whatsapp",
                  contact: { name: r.name, phone: settings.testPhone || r.phone, accountNo: vars.account_no },
                  message: body,
                });
                tally.sent += 1;
                r._sendOk = true;
                log("ok", `WhatsApp for ${r.name} handed to the GoHighLevel webhook.`, node.id);
              }
            } catch (err) {
              tally.failed += 1;
              r._sendOk = false;
              log("err", `${channel.toUpperCase()} for ${r.name} failed: ${err.message}`, node.id);
            }
          }
          break;
        }

        case "UPDATE_FIELDS": {
          if (dry) {
            log("warn", `PLACEHOLDER — ${node.fieldName} = ${node.fieldValue} was NOT written.`, node.id);
            break;
          }
          const eligible = recipients.filter((r) => !r._live && r._sendOk !== false);
          eligible.forEach((r) => updateCustomer?.(r.id, { [node.fieldName]: node.fieldValue }));
          const skippedN = recipients.filter((r) => !r._live).length - eligible.length;
          if (recipients.every((r) => r._live)) {
            log("info", `Field ${node.fieldName} = ${node.fieldValue} recorded for the live call (no customer record to update).`, node.id);
          } else {
            log(
              "ok",
              `Set ${node.fieldName} = ${node.fieldValue} on ${eligible.length} account(s)` +
                (skippedN ? ` (${skippedN} left unchanged because delivery failed)` : "") + ".",
              node.id
            );
          }
          break;
        }

        case "PUT_DND": {
          if (dry) {
            log("warn", "PLACEHOLDER — no account was added to the DND registry.", node.id);
            break;
          }
          recipients.filter((r) => !r._live).forEach((r) => updateCustomer?.(r.id, { contactable: false, dnd: true }));
          log("ok", `Added ${recipients.length} account(s) to the DND registry.`, node.id);
          break;
        }

        case "INTERNAL_TEAM": {
          log("ok", `Case(s) routed to "${node.team}" (${recipients.length} account(s)). Recorded in this run log.`, node.id);
          break;
        }

        case "CALL_AGENT": {
          log("warn", `AI agent call step skipped — outbound calls are started from the Outbound Caller page.`, node.id);
          tally.skipped += 1;
          break;
        }

        default:
          log("warn", `Unknown node type ${node.type} — skipped.`, node.id);
      }
    } catch (err) {
      log("err", `Node "${node.title}" failed: ${err.message}`, node.id);
      tally.failed += 1;
    }
  }

  return tally;
}

/* ---------------- live-call distress detection ---------------- */

const DISTRESS_PATTERNS = [
  /\b(suicid|bunuh diri|nak mati|want to die|end my life)\b/i,
  /\b(emergency|kecemasan|ambulan|ambulance|hospital|sakit teruk)\b/i,
  /\b(terdesak|desperate|distress|tolong saya, saya|saya dalam kesusahan)\b/i,
  /\b(kehilangan kerja|hilang kerja|lost my job|no income|tak mampu|cannot afford|can't afford)\b/i,
  /\b(ugut|threat|sue you|saman|lawyer|peguam|polis|police)\b/i,
  /\b(marah|angry|furious|frustrated|tak guna|useless|scam)\b/i,
];

/** Returns the matched phrase if the caller's words look like distress, else null. */
export function detectDistress(text) {
  for (const re of DISTRESS_PATTERNS) {
    const m = String(text || "").match(re);
    if (m) return m[0];
  }
  return null;
}

/* ---------------- the four demo workflows ---------------- */

const T = (id, x, eventType) => ({
  id, type: "TRIGGER", title: `⚡ Trigger: ${eventType}`, eventType, x, y: 180,
  filters: { intent: "ALL", priority: "ALL", outcome: "ALL", situation: "ALL" },
});

export const DEMO_WORKFLOWS = [
  {
    id: "wf-5",
    name: "Pending Overdue Bill Notice",
    description: "Finds overdue accounts, fetches the balance, and sends an overdue bill notice by email and SMS.",
    status: "ACTIVE",
    category: "Overdue Notices",
    audience: "overdue",
    nodes: [
      T("n-1", 80, "Payment Overdue Event"),
      { id: "n-2", type: "FETCH_BILL", title: "💲 Fetch Bill Amount", accountQuery: "Pull overdue balance & days overdue", x: 420, y: 180 },
      {
        id: "n-3", type: "SEND_MESSAGE", title: "💬 Send Overdue Notice Email", channel: "email",
        subject: "Overdue bill notice — IWK account {{account_no}}",
        messagePrompt:
          "Salam {{customer_name}},\n\nOur records show that your Indah Water Konsortium (IWK) account {{account_no}} has an overdue balance of {{bill_amount}}, outstanding for {{days_overdue}} days.\n\nPlease settle the amount as soon as possible to avoid further action. If you have already paid, please ignore this notice. If you need help with a payment arrangement, reply to this email.\n\nThank you,\nIWK Customer Care",
        x: 760, y: 180,
      },
      {
        id: "n-4", type: "SEND_MESSAGE", title: "💬 Send Overdue Notice SMS", channel: "sms",
        messagePrompt: "IWK: Salam {{customer_name}}, akaun {{account_no}} mempunyai baki tertunggak {{bill_amount}} ({{days_overdue}} hari). Sila jelaskan segera. Terima kasih.",
        x: 1100, y: 180,
      },
      { id: "n-5", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "notice_status", fieldValue: "OVERDUE_NOTICE_SENT", x: 1440, y: 180 },
      { id: "n-6", type: "INTERNAL_TEAM", title: "👥 Send to Internal Team", team: "QA depart (records verify)", x: 1780, y: 180 },
    ],
  },
  {
    id: "wf-6",
    name: "Reminder Of Upcoming Bill",
    description: "Reminds customers whose bill is about to fall due, by email and SMS, before it becomes overdue.",
    status: "ACTIVE",
    category: "Bill Reminders",
    audience: "upcoming",
    nodes: [
      T("n-1", 80, "Bill Due Soon (Scheduled)"),
      { id: "n-2", type: "FETCH_BILL", title: "💲 Fetch Bill Amount", accountQuery: "Pull current bill amount & due date", x: 420, y: 180 },
      {
        id: "n-3", type: "SEND_MESSAGE", title: "💬 Send Bill Reminder Email", channel: "email",
        subject: "Reminder: your IWK bill is due on {{due_date}}",
        messagePrompt:
          "Salam {{customer_name}},\n\nThis is a friendly reminder that your Indah Water Konsortium (IWK) bill for account {{account_no}} of {{bill_amount}} is due on {{due_date}}.\n\nPaying on time keeps your account in good standing. You can pay through JomPAY, online banking or at any IWK counter.\n\nThank you,\nIWK Customer Care",
        x: 760, y: 180,
      },
      {
        id: "n-4", type: "SEND_MESSAGE", title: "💬 Send Bill Reminder SMS", channel: "sms",
        messagePrompt: "IWK: Salam {{customer_name}}, peringatan bil akaun {{account_no}} berjumlah {{bill_amount}} perlu dijelaskan sebelum {{due_date}}. Terima kasih.",
        x: 1100, y: 180,
      },
      { id: "n-5", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "reminder_status", fieldValue: "UPCOMING_BILL_REMINDER_SENT", x: 1440, y: 180 },
    ],
  },
  {
    id: "wf-7",
    name: "Promos / Updates / Wishes",
    description: "Broadcasts service updates, payment-channel news and seasonal wishes to contactable customers.",
    status: "ACTIVE",
    category: "Customer Engagement",
    audience: "all",
    nodes: [
      T("n-1", 80, "Scheduled Broadcast"),
      {
        id: "n-2", type: "SEND_MESSAGE", title: "💬 Send Updates & Wishes Email", channel: "email",
        subject: "Updates and best wishes from IWK",
        messagePrompt:
          "Salam {{customer_name}},\n\nWishing you and your family good health and happiness from all of us at Indah Water Konsortium.\n\nA few updates for account {{account_no}}:\n- You can now pay your bill quickly through JomPAY, online banking or the IWK app.\n- Our Customer Care team is happy to help with payment arrangements.\n\nThank you for being a valued IWK customer.\n\nWarm regards,\nIWK Customer Care",
        x: 420, y: 180,
      },
      {
        id: "n-3", type: "SEND_MESSAGE", title: "💬 Send Wishes SMS", channel: "sms",
        messagePrompt: "IWK: Salam {{customer_name}}, semoga anda dan keluarga sentiasa sihat dan bahagia. Terima kasih kerana menjadi pelanggan IWK yang dihargai.",
        x: 760, y: 180,
      },
      { id: "n-4", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "last_broadcast", fieldValue: "PROMO_UPDATE_WISHES", x: 1100, y: 180 },
    ],
  },
  {
    id: "wf-8",
    name: "Live Distress Call Email",
    description: "During live call testing, emails an instant distress alert to the test inbox when the caller sounds distressed.",
    status: "ACTIVE",
    category: "Live Call Alerts",
    audience: "live",
    liveTrigger: true,
    nodes: [
      T("n-1", 80, "Live Call: Distress Detected"),
      {
        id: "n-2", type: "SEND_MESSAGE", title: "💬 Send Distress Alert Email", channel: "email", provider: "n8n-alert",
        subject: "URGENT: distressed customer on a live IWK call",
        messagePrompt: "A caller on a live IWK voice call sounds distressed. Reason: {{call_summary}}",
        x: 420, y: 180,
      },
      { id: "n-3", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "priority_tag", fieldValue: "RED_DISTRESS", x: 760, y: 180 },
      { id: "n-4", type: "INTERNAL_TEAM", title: "👥 Send to Internal Team", team: "Hardship & Financial Assistance Desk", x: 1100, y: 180 },
    ],
  },
];

/* ---------- upgrades for the four ORIGINAL workflows (wf-1 … wf-4) ----------
   Their steps and names are untouched. They gain: the right audience (instead of "everyone"), SMS text that
   Malaysian carriers will not block (no URL / phone number inside an SMS), and an email step where a workflow
   previously produced nothing. The email steps may contain phone numbers and links; SMS may not. */
const E = (id, title, subject, text) => ({ id, type: "SEND_MESSAGE", title, channel: "email", subject, messagePrompt: text });

const LEGACY_UPGRADES = {
  "wf-1": {
    audience: "hardship",
    patch: {
      "n-3": {
        messagePrompt:
          "IWK: Salam {{customer_name}}, akaun {{account_no}} mempunyai baki {{bill_amount}}. Kami boleh bantu dengan pelan ansuran. Sila hubungi pusat khidmat pelanggan IWK.",
      },
    },
    insert: [
      {
        after: "n-3",
        node: E(
          "n-e1",
          "💬 Send Instalment Options Email",
          "Instalment options for your IWK account {{account_no}}",
          "Salam {{customer_name}},\n\nWe understand that paying in one go can be difficult. Your Indah Water Konsortium (IWK) account {{account_no}} has an outstanding balance of {{bill_amount}}.\n\nWe can arrange an instalment plan, for example {{plan_months}} monthly payments of {{plan_monthly}}, starting {{plan_start}}. Please reply to this email or call IWK Customer Care on 03-20803888 and our Hardship & Financial Assistance Desk will help you.\n\nThank you,\nIWK Customer Care"
        ),
      },
    ],
  },
  "wf-2": {
    audience: "refusers",
    patch: {
      "n-3": {
        messagePrompt: "PERINGATAN MESRA IWK: Akaun {{account_no}} telah dimajukan ke Unit Tindakan Khas. Sila jelaskan tunggakan {{bill_amount}} secepat mungkin.",
      },
    },
    insert: [
      {
        after: "n-3",
        node: E(
          "n-e1",
          "💬 Send Formal Notice Email",
          "Formal notice — IWK account {{account_no}}",
          "Salam {{customer_name}},\n\nThis is a formal notice from Indah Water Konsortium (IWK). Account {{account_no}} has an unpaid balance of {{bill_amount}}, outstanding for {{days_overdue}} days, and the account has been referred to our Special Action Unit.\n\nPlease settle the amount, or contact IWK Customer Care on 03-20803888 to discuss your options, to avoid further action.\n\nIWK Legal & Recovery Desk"
        ),
      },
    ],
  },
  "wf-3": {
    audience: "dispute",
    insert: [
      {
        after: "n-3",
        node: E(
          "n-e1",
          "💬 Send Dispute Acknowledgement Email",
          "We have received your billing query — account {{account_no}}",
          "Salam {{customer_name}},\n\nThank you for raising a query about your Indah Water Konsortium (IWK) bill for account {{account_no}} (current balance {{bill_amount}}).\n\nOur QA team is verifying your payment records and the itemised charges, and will contact you with the outcome. You do not need to do anything further for now.\n\nIWK Customer Care"
        ),
      },
    ],
  },
  "wf-4": {
    audience: "ptp",
    insert: [
      {
        after: "n-3",
        node: {
          id: "n-e1",
          type: "SEND_MESSAGE",
          title: "💬 Send Payment Receipt SMS",
          channel: "sms",
          messagePrompt: "IWK: Terima kasih {{customer_name}}! Pembayaran {{paid_amount}} untuk akaun {{account_no}} telah diterima.",
        },
      },
      {
        after: "n-e1",
        node: E(
          "n-e2",
          "💬 Send Payment Receipt Email",
          "Payment received — IWK account {{account_no}}",
          "Salam {{customer_name}},\n\nThank you. We have received your payment of {{paid_amount}} for Indah Water Konsortium (IWK) account {{account_no}}.\n\nIWK Customer Care"
        ),
      },
    ],
  },
};

/** Returns the workflow with its upgrade applied (or unchanged if it has none). */
export function upgradeLegacyWorkflow(wf) {
  const up = LEGACY_UPGRADES[wf.id];
  if (!up) return wf;
  let nodes = wf.nodes.map((n) => (up.patch && up.patch[n.id] ? { ...n, ...up.patch[n.id] } : n));
  for (const ins of up.insert || []) {
    const at = nodes.findIndex((n) => n.id === ins.after);
    nodes.splice(at + 1, 0, { ...ins.node, y: 180 });
  }
  nodes = nodes.map((n, i) => ({ ...n, x: 80 + i * 340, y: typeof n.y === "number" ? n.y : 180 }));
  return { ...wf, audience: up.audience, nodes };
}

/* ---------- the two workflows from the demo list that are not part of the first four ---------- */
DEMO_WORKFLOWS.push(
  {
    id: "wf-9",
    name: "QR Payment Sticker (SMS / Email)",
    description: "Placeholder: tells overdue customers by SMS and email that a DuitNow QR payment sticker is ready. Visual only — no QR is generated or sent.",
    status: "ACTIVE",
    category: "Payment Notifications",
    audience: "overdue",
    placeholder: true,
    nodes: [
      T("n-1", 80, "Payment Overdue Event"),
      { id: "n-2", type: "FETCH_BILL", title: "💲 Fetch Bill Amount", accountQuery: "Pull overdue balance & account reference", x: 420, y: 180 },
      {
        id: "n-3", type: "SEND_MESSAGE", title: "💬 Send QR Payment Sticker SMS", channel: "sms",
        messagePrompt: "IWK: Salam {{customer_name}}, pelekat QR pembayaran untuk akaun {{account_no}} ({{bill_amount}}) telah sedia. Imbas untuk bayar dengan mudah.",
        x: 760, y: 180,
      },
      {
        id: "n-4", type: "SEND_MESSAGE", title: "💬 Send QR Payment Sticker Email", channel: "email",
        subject: "Your IWK QR payment sticker — account {{account_no}}",
        messagePrompt: "Salam {{customer_name}},\n\nYour payment QR sticker for Indah Water Konsortium (IWK) account {{account_no}} (balance {{bill_amount}}) is ready. Scan it with your banking app or e-wallet to pay quickly.\n\nIWK Customer Care",
        x: 1100, y: 180,
      },
      { id: "n-5", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "qr_sticker_status", fieldValue: "QR_STICKER_SENT", x: 1440, y: 180 },
    ],
  },
  {
    id: "wf-10",
    name: "Instalment Plan Breakdown Email (for approval)",
    description: "Builds an instalment plan for an overdue account and emails the full breakdown for approval (to the test email during demos).",
    status: "ACTIVE",
    category: "Instalment Approvals",
    audience: "overdue",
    nodes: [
      T("n-1", 80, "Manual Escalation Trigger"),
      { id: "n-2", type: "FETCH_BILL", title: "💲 Fetch Bill Amount", accountQuery: "Pull outstanding balance to build the plan", x: 420, y: 180 },
      {
        id: "n-3", type: "SEND_MESSAGE", title: "💬 Send Plan Breakdown for Approval", channel: "email",
        subject: "For approval: instalment plan for account {{account_no}} ({{customer_name}})",
        messagePrompt:
          "Instalment plan for approval\n\nCustomer: {{customer_name}}\nAccount: {{account_no}}\nOutstanding balance: {{plan_total}} ({{days_overdue}} days overdue)\n\nProposed plan: {{plan_months}} monthly instalments of {{plan_monthly}}, first payment {{plan_start}}.\n\nSchedule:\n{{plan_schedule}}\n\nPlease review and reply APPROVE or REJECT.\n\nIWK Collections",
        x: 760, y: 180,
      },
      { id: "n-4", type: "INTERNAL_TEAM", title: "👥 Send to Internal Team", team: "Collections Manager (plan approval)", x: 1100, y: 180 },
      { id: "n-5", type: "UPDATE_FIELDS", title: "🏷️ Update Customer Fields", fieldName: "plan_status", fieldValue: "PENDING_APPROVAL", x: 1440, y: 180 },
    ],
  }
);
