/* ============================================================
   Stat Tile Details & Explanations
   Provides 1-2 sentence metric explanations for the 'i' icon hover
   and rich domain-specific dummy breakdown data for the click popup modal.
   ============================================================ */

export const STAT_EXPLANATIONS = {
  // --- Overview & Book Position ---
  "Total arrears":
    "Cumulative outstanding debt across all accounts on the collections book. Represents the total unpaid sewerage service balances currently due to IWK.",
  "Overdue value":
    "Total balance that has officially passed the payment due date. Excludes newly presented bills that are still within the standard payment grace period.",
  "Overdue":
    "Total value of customer accounts that are past due date and currently subject to active collections workflows.",
  "Recovered (90d)":
    "Cumulative arrears successfully collected through all treatment sequences over the past 90 days. Measures overall cash recovery velocity.",
  "Amount recovered":
    "Total debt collected across all treated cohorts over time, verified against bank reconciliation statements.",
  "Treatment spend":
    "Total operational expenditure incurred across all outreach channels (WhatsApp, SMS, IVR, Print, DCA). Measures the cost of contacting debtors.",
  "Treatment cost":
    "Cumulative direct expense of running outreach treatments based on configured per-touch channel rates.",
  "Cost per RM recovered":
    "Operational efficiency metric showing how many cents or ringgit are spent to collect one Ringgit Malaysia of debt. Lower values indicate superior cost efficiency.",
  "Voice AI calls":
    "Total volume of live inbound and outbound calls handled by autonomous Voice AI agents. Demonstrates automation reach and call completion.",
  "Complaints / 1,000":
    "Measures customer dissatisfaction rate per 1,000 outreach touches. Primarily tracks timing concern complaints where customers feel the bill payment window elapsed too quickly before collection reminders began or during banking clearance lags.",
  "Timing concerns":
    "Customer grievances regarding collection touch timing, specifically notices arriving immediately after the bill pay due date has elapsed or during banking clearance.",
  "Avg days overdue":
    "Mean duration that invoices have remained past their due date across delinquent accounts, weighted by debt aging intervals.",
  "Avg balance":
    "Average outstanding arrears amount held per debtor account across the current portfolio view.",

  // --- Segments ---
  "In main funnel":
    "Debtor accounts eligible for standard progressive automated collection sequences, excluding protected or paused routing categories.",
  "Special routing":
    "Accounts intentionally diverted from standard automated contact due to registered hardship (eKasih), deceased estates, or open legal disputes.",
  "Friction Payers":
    "Debtors with financial ability to pay who delay due to procedural or digital channel friction. This cohort is resolved at the lowest touch cost.",
  "Non-viable":
    "Accounts where the probability of recovery is economically negligible, flagged for statutory write-off evaluation rather than further outreach spend.",

  // --- Treatment & Channels ---
  "Contacts sent":
    "Total communication touches dispatched across digital and postal channels over the trailing 90 days of collections activity.",
  "Responses":
    "Count of positive customer interactions triggered by outbound touches, including promise-to-pay pledges and payment portal visits.",
  "Failed delivery":
    "Number of undelivered notifications caused by invalid mobile numbers, SMS routing failures, or returned postal demand letters.",

  // --- Performance & KPIs ---
  "Conversion to payment":
    "Percentage of delinquent accounts that successfully settle their overdue balance within 14 calendar days of receiving a treatment touch.",
  "Promise-kept rate":
    "Proportion of formal payment commitments honoured by debtors on or before the agreed repayment date.",

  // --- Compliance ---
  "Post-payment contacts":
    "Strict zero-tolerance metric tracking erroneous outreach sent to customers who had already paid. Critical for protecting institutional reputation.",
  "Frequency cap breaches":
    "Occurrences where debtors were contacted more frequently than permitted under the statutory contact policy (max 1/day, 2/week).",
  "Quiet-hours breaches":
    "Number of messages or calls dispatched outside permissible operating hours (8:00 PM to 8:00 AM local time).",

  // --- DCA & Legal ---
  "Accounts placed":
    "Severely delinquent accounts formally assigned to external panel Debt Collection Agencies for third-party enforcement.",
  "Recovered by DCAs":
    "Total debt successfully reclaimed through external agency interventions before formal litigation.",
  "Same-day recalls":
    "Automated recall notices sent to collection agencies within 24 hours of customer payment to prevent wrongful continued pursuit.",
  "Placement + legal cost":
    "Combined expenditure on third-party agency placement fees and Section 88(2) statutory legal demand pack generation.",

  // --- Geography ---
  "Areas":
    "Number of distinct municipal operating operational zones tracked across Malaysian states and federal territories.",
  "Top area":
    "Municipal territory holding the single largest share of total outstanding sewerage arrears.",
  "Vacancy signals":
    "Properties flagged as unoccupied or abandoned, preventing ineffective automated outreach and requiring physical verification.",
  "Avg treatment coverage":
    "Average percentage of properties in tracked areas connected to centralized IWK sewerage treatment infrastructure.",

  // --- Customers ---
  "Accounts shown":
    "Number of customer records matching the active search query, category, stage, and geographic filters.",
  "Value shown":
    "Cumulative arrears amount across the customer accounts currently filtered and displayed.",

  // --- Voice AI ---
  "Calls":
    "Total volume of voice call sessions logged via the live telecommunication API within the active query window.",
  "Total cost":
    "Cumulative platform, telephony, LLM token, and speech synthesis fees incurred in Ringgit Malaysia (RM).",
  "Talk time":
    "Combined conversational call duration elapsed across all AI-driven customer dialogues.",
  "Cost per minute":
    "Normalized voice platform cost per minute of active conversation with customer callers.",

  // --- Call Alerts ---
  "Alerts":
    "Total suspicious or critical call events flagged by the n8n webhook workflow for supervisor review.",
  "Calls flagged":
    "Number of unique customer calls containing detected escalation triggers such as dispute, distress, or agent errors.",
  "Latest alert":
    "Timestamp and recency of the most recent anomaly detected in live Voice AI conversations.",
  "Feed checked":
    "Time of the latest polling synchronization with the automated n8n alert monitoring webhook.",

  // --- Unified Inbox & Omnichannel ---
  "Omnichannel Contacts":
    "Cumulative communication touchpoints dispatched across WhatsApp, Email, and SMS channels in the trailing 90-day window.",
  "WhatsApp Reply Rate":
    "Proportion of debtors who responded to conversational WhatsApp prompts, representing the highest engagement channel.",
  "SMS Delivery Rate":
    "Percentage of telecommunication SMS notifications successfully delivered to debtor mobile numbers in Malaysia.",
  "Email Open Rate":
    "Proportion of sent electronic billing and reminder emails opened by recipients, tracked via delivery telemetry.",
  "Positive Sentiment":
    "Percentage of customer message replies expressing cooperative intent, including payment confirmations and PTP pledges.",
  "PTP Secured":
    "Total ringgit arrears value covered by verified Promise-to-Pay agreements negotiated via digital messaging channels.",
};

/**
 * Returns a 1-2 sentence explanation for the given card label.
 */
export function getMetricExplanation(label) {
  if (!label) return "Key operational metric tracked in real-time across the collections dashboard.";
  const clean = label.trim();
  if (STAT_EXPLANATIONS[clean]) return STAT_EXPLANATIONS[clean];

  // Case-insensitive match attempt
  const foundKey = Object.keys(STAT_EXPLANATIONS).find(
    (k) => k.toLowerCase() === clean.toLowerCase()
  );
  if (foundKey) return STAT_EXPLANATIONS[foundKey];

  return `Key performance indicator measuring ${clean.toLowerCase()} across the Indah Water portfolio.`;
}

/**
 * Generates structured dummy detail data for the popup modal based on the card label and value.
 */
export function getMetricModalData(card) {
  const label = (card.label || "").trim();
  const value = card.value || "—";
  const sub = card.sub || "";

  // 0. Omnichannel & Messaging (Unified Inbox)
  if (/omnichannel|whatsapp|sms|email open|sentiment|ptp secured/i.test(label)) {
    if (/sentiment/i.test(label)) {
      return {
        title: "Customer Sentiment Breakdown",
        subtitle: "Inbound communication tone & debtor intent distribution",
        explanation: getMetricExplanation(label),
        kpis: [
          { name: "Positive Sentiment", value: "61.2%", note: "7,424 cooperative replies" },
          { name: "Neutral Sentiment", value: "26.4%", note: "3,126 inquiries / extensions" },
          { name: "Negative Sentiment", value: "12.4%", note: "1,402 disputes / refusals" },
          { name: "Avg Sentiment Score", value: "+0.48", note: "On scale of -1.0 to +1.0" },
        ],
        breakdownTitle: "Sentiment by Communication Channel",
        headers: ["Channel", "Inbound Replies", "Positive (%)", "Neutral (%)", "Negative (%)", "PTP Agreed (RM)"],
        rows: [
          ["WhatsApp Business", "8,516", "64.0% (5,450)", "25.0% (2,129)", "11.0% (937)", "RM 245,800"],
          ["SMS Gateway", "1,706", "60.0% (1,023)", "26.0% (443)", "14.0% (240)", "RM 40,500"],
          ["Email Gateway", "1,730", "55.0% (951)", "32.0% (554)", "13.0% (225)", "RM 98,200"],
        ],
        insight:
          "WhatsApp achieves the highest positive customer engagement (64.0%) and drives over 64% of total PTP commitment value due to instant interactive two-way messaging.",
      };
    }

    if (/ptp secured/i.test(label)) {
      return {
        title: "Promise-to-Pay (PTP) Secured Value",
        subtitle: "Debt commitments negotiated through digital messaging channels",
        explanation: getMetricExplanation(label),
        kpis: [
          { name: "Total PTP Secured", value: "RM 384,500", note: "Across 1,840 debtor agreements" },
          { name: "Adherence Rate", value: "79.2%", note: "Promises honoured on time" },
          { name: "Avg Commitment", value: "RM 208.97", note: "Per debtor agreement" },
          { name: "Collection Velocity", value: "8.4 days", note: "Avg time to settlement" },
        ],
        breakdownTitle: "PTP Value by Channel & Cohort",
        headers: ["Channel Source", "Agreements", "PTP Value (RM)", "Adherence Rate", "Paid to Date (RM)"],
        rows: [
          ["WhatsApp Automated Nudge", "1,180", "RM 245,800", "81.4%", "RM 200,081"],
          ["Email Formal Notice", "390", "RM 98,200", "75.8%", "RM 74,435"],
          ["SMS Quick Link", "270", "RM 40,500", "74.1%", "RM 30,010"],
        ],
        insight:
          "Over 81% of debtors committing to pay via WhatsApp successfully remit funds within the promised window, yielding the highest settlement reliability in the portfolio.",
      };
    }

    return {
      title: `${label} Overview`,
      subtitle: "Omnichannel channel telemetry and engagement performance",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Reported Value", value: String(value), note: sub || "Channel metric" },
        { name: "Total Dispatched", value: "28,450 touches", note: "Trailing 90 days" },
        { name: "Active Responders", value: "11,952 debtors", note: "Engaged in conversation" },
        { name: "Overall Response Rate", value: "42.0%", note: "Blended cross-channel" },
      ],
      breakdownTitle: "Channel Engagement Telemetry",
      headers: ["Channel", "Dispatched", "Delivered (%)", "Replies", "Reply Rate", "Avg Response Time"],
      rows: [
        ["WhatsApp Business", "12,450", "12,180 (97.8%)", "8,516", "68.4%", "3.8 mins"],
        ["SMS Gateway", "7,080", "6,924 (97.8%)", "1,706", "24.1%", "18.5 mins"],
        ["Email Gateway", "8,920", "8,760 (98.2%)", "1,730", "19.4%", "4.2 hours"],
      ],
      insight:
        "Conversational WhatsApp and SMS messaging deliver over 85% of total debtor replies, cutting collection turnaround from weeks to under 4 hours.",
    };
  }

  // 1. Arrears & Balance Metrics
  if (/arrears|overdue|balance/i.test(label)) {
    return {
      title: `${label} Breakdown`,
      subtitle: "Segmented portfolio distribution & aging analysis",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Current Reported", value: String(value), note: sub || "Live portfolio reading" },
        { name: "Active Accounts", value: "864", note: "Accounts currently monitored" },
        { name: "Average Days Overdue", value: "137 days", note: "Across past-due accounts" },
        { name: "Collection Priority", value: "High", note: "Tier 1 Focus Group" },
      ],
      breakdownTitle: "Distribution by Customer Category",
      headers: ["Category", "Accounts", "Arrears Value", "Share", "Avg Balance", "Status"],
      rows: [
        ["Domestic", "550", "RM 418,250", "16.9%", "RM 774", "Standard digital outreach"],
        ["Commercial", "218", "RM 824,600", "33.3%", "RM 3,926", "Formal reminder ladder"],
        ["Industrial", "96", "RM 1,230,400", "49.8%", "RM 13,671", "Dedicated account manager"],
      ],
      insight:
        "Industrial and commercial accounts account for over 83% of delinquent arrears value despite representing only one-third of the debtor count. Concentrating high-touch negotiations on these accounts yields optimal recovery.",
    };
  }

  // 2. Recovery & Conversion Metrics
  if (/recover|conversion|promise/i.test(label)) {
    return {
      title: `${label} Performance Details`,
      subtitle: "Weekly recovery trajectory and settlement conversion",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Metric Value", value: String(value), note: sub || "Settlement index" },
        { name: "Target Benchmark", value: "65.0%", note: "Target benchmark" },
        { name: "Settled In-Flight", value: "2,807", note: "Accounts converted" },
        { name: "Recovery Index", value: "+8.4%", note: "Versus baseline target" },
      ],
      breakdownTitle: "Weekly Recovery & Conversion Trend",
      headers: ["Week", "Contacts", "Promises Kept", "Payment Conversion", "RM Collected", "Audit Status"],
      rows: [
        ["Week 28", "21,450", "64.2%", "6.8%", "RM 88,400", "Reconciled"],
        ["Week 29", "23,100", "65.1%", "7.1%", "RM 94,200", "Reconciled"],
        ["Week 30", "22,800", "66.5%", "7.4%", "RM 101,600", "Reconciled"],
        ["Week 31", "24,500", "67.8%", "7.9%", "RM 108,500", "Audited"],
        ["Week 32 (Latest)", "25,200", "66.0%", "7.0%", "RM 98,300", "In Progress"],
      ],
      insight:
        "Debtors receiving interactive Voice AI calls combined with immediate payment link SMS achieve 2.4× higher promise-kept adherence compared to postal paper notices alone.",
    };
  }

  // 3. Spend, Costs & Channels
  if (/spend|cost|channel|contact/i.test(label)) {
    return {
      title: `${label} Cost & Volume Analysis`,
      subtitle: "Operational spend breakdown by treatment channel",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Current Spend", value: String(value), note: sub || "Total touches dispatched" },
        { name: "Unit Cost Avg", value: "RM 0.168", note: "Blended per contact" },
        { name: "Cost / RM Recovered", value: "RM 0.043", note: "Target: RM 0.050" },
        { name: "ROI Multiple", value: "23.2×", note: "Cash collected per RM spent" },
      ],
      breakdownTitle: "Channel Activity & Unit Cost Structure",
      headers: ["Channel Tier", "Dispatched", "Delivered", "Unit Cost", "Total Spend", "Cost / Response"],
      rows: [
        ["e-Bill WhatsApp Portal (EWP)", "119,833", "114,364 (95.4%)", "RM 0.080", "RM 9,586.64", "RM 0.52"],
        ["SMS / IVR", "85,248", "81,512 (95.6%)", "RM 0.050", "RM 4,262.40", "RM 0.82"],
        ["Email", "63,576", "57,286 (90.1%)", "RM 0.002", "RM 127.15", "RM 0.03"],
        ["Voice AI Telephony", "14,280", "12,852 (90.0%)", "RM 0.140", "RM 1,999.20", "RM 0.22"],
      ],
      insight:
        "Digital communications (e-Bill WhatsApp Portal, SMS, Email, Voice AI) deliver 100% automated debtor coverage at an average blended unit cost of under RM 0.06 per touch.",
    };
  }

  // 4. Voice AI & Telephony
  if (/voice|call|talk|minute|assistant/i.test(label)) {
    return {
      title: `${label} Telephony & AI Metrics`,
      subtitle: "Autonomous agent telecommunication diagnostics",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Voice AI Calls", value: String(value), note: sub || "Voice AI activity" },
        { name: "Resolution Rate", value: "71.4%", note: "Resolved without human transfer" },
        { name: "Payment Promise Pledged", value: "78 calls", note: "45.9% of connected calls" },
        { name: "Voicemail / Busy", value: "34 calls", note: "Auto-retry scheduled" },
      ],
      breakdownTitle: "Call Outcomes & Cost Distribution",
      headers: ["Outcome", "Call Count", "Avg Duration", "Cost (RM)", "Sentiment", "Action"],
      rows: [
        ["Payment Promise Pledged", "78", "2m 15s", "RM 0.22", "Positive (84%)", "Payment link sent"],
        ["Instalment Plan Inquired", "42", "3m 05s", "RM 0.31", "Neutral (62%)", "Application routed"],
        ["Dispute / Query Logged", "16", "2m 40s", "RM 0.26", "Escalated (38%)", "Supervisor ticket"],
        ["Voicemail / Busy", "34", "0m 18s", "RM 0.04", "Neutral", "Scheduled retry"],
      ],
      insight:
        "Autonomous Voice AI assistants have maintained a 71% first-call resolution rate, saving an estimated 145 human agent hours while lowering the cost per minute to under RM 0.08.",
    };
  }

  // 5a. Customer Complaints & Timing Concerns Log
  if (/complaint/i.test(label)) {
    return {
      title: "Customer Complaints & Timing Concerns Log",
      subtitle: "Grievance analysis: timing disputes, bill pay window elapsed & service feedback",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Reported Rate", value: String(value), note: sub || "Per 1,000 touches (Cap < 0.40)" },
        { name: "Timing Concern Complaints", value: "68.4%", note: "13 of 19 grievances logged" },
        { name: "Bill Pay Due Date Elapsed", value: "8 cases", note: "Notices sent right after due date" },
        { name: "Avg Resolution SLA", value: "3.2 hours", note: "Grace period & suppression applied" },
      ],
      breakdownTitle: "Timing Concerns & Customer Complaints Register",
      headers: [
        "Complaint Category",
        "Trigger / Issue Description",
        "Incidents",
        "Share (%)",
        "Customer Voice / Complaint Quote",
        "Action Taken / Status"
      ],
      rows: [
        [
          "Timing: Bill Pay Due Date Elapsed",
          "Reminder sent immediately after payment window expired without adequate grace period",
          "8",
          "42.1%",
          "\"The bill payment due date has just passed and we already received a reminder — please allow a reasonable grace period.\"",
          "7-day post-due-date grace window activated"
        ],
        [
          "Timing: Bank Clearance Lag",
          "Notice triggered while online payment (FPX / JomPAY) was clearing through banking gateway",
          "5",
          "26.3%",
          "\"I already settled the payment through online banking yesterday, why am I still receiving reminder messages?\"",
          "Instant payment webhook reconciliation connected"
        ],
        [
          "Timing: Delayed Bill Delivery",
          "Physical paper or e-bill delivered late so customer had only 2–3 days before payment due date elapsed",
          "3",
          "15.8%",
          "\"The bill arrived very late in the mail, leaving us almost no time to review and pay before the due date.\"",
          "Switched to instant WhatsApp digital bill dispatch"
        ],
        [
          "Customer: Outreach Tone Concern",
          "Customer felt automated voice / SMS reminder was too urgent or stern for an initial touch",
          "2",
          "10.5%",
          "\"The automated caller sounded overly stern and forceful for a first reminder call.\"",
          "AI voice prompt adjusted to polite informational tone"
        ],
        [
          "Customer: Billing Tariff Dispute",
          "Customer disputed tariff rate (asserting residential property was billed at commercial rate)",
          "1",
          "5.3%",
          "\"This property is a residential house, why was it charged under commercial tariff rates?\"",
          "Premise inspection & tariff verification ticket opened"
        ],
      ],
      insight:
        "Over 68% of customer complaints stem directly from timing concerns (notices sent immediately after the due date elapsed or bank clearance delays). Implementing an automated 7-day grace window before initial automated collection outreach eliminates more than 75% of customer friction while preserving debt recovery momentum.",
    };
  }

  // 5b. General Compliance & Conduct
  if (/conduct|breach|quiet|cap|post-payment/i.test(label)) {
    return {
      title: `${label} Governance & Conduct Audit`,
      subtitle: "Regulatory adherence and consumer protection register",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Audit Result", value: String(value), note: sub || "Current conduct status" },
        { name: "Customer Complaints", value: "0.35 / 1,000", note: "Regulatory threshold < 0.40" },
        { name: "Quiet Hours Adherence", value: "100.0%", note: "8:00 PM – 8:00 AM" },
        { name: "Post-Payment Target", value: "0 (Zero)", note: "Zero-tolerance breach policy" },
      ],
      breakdownTitle: "Compliance & Conduct Audit Register",
      headers: ["Audit Category", "Target", "Current Reading", "Breaches Logged", "Remediation Status"],
      rows: [
        ["Post-Payment Contact", "0 incidents", "0 incidents", "0", "Pass · Guardrail Active"],
        ["Frequency Cap (Weekly)", "Max 2 touches", "1.4 avg touches", "0", "Pass · Rules Enforced"],
        ["Quiet Hours Restriction", "100% adherence", "100% adherence", "0", "Pass · Scheduler Locked"],
        ["Consumer Complaints", "< 0.40 / 1,000", "0.35 / 1,000", "12", "Pass · Under Threshold"],
      ],
      insight:
        "Post-payment suppression blocks remain 100% effective with immediate financial ledger reconciliation, ensuring zero erroneous collections touches reach settled customers.",
    };
  }

  // 6. DCA, Legal & Recalls
  if (/dca|legal|recall|placed/i.test(label)) {
    return {
      title: `${label} Enforcement & DCA Oversight`,
      subtitle: "External agency placements and Section 88(2) legal pipeline",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Current Status", value: String(value), note: sub || "Placement monitoring" },
        { name: "Active Panels", value: "3 Agencies", note: "Amanah, Perdana, Zenith" },
        { name: "Avg Collection Rate", value: "18.4%", note: "On placed delinquent accounts" },
        { name: "Recall SLA", value: "< 24 Hours", note: "100% same-day adherence" },
      ],
      breakdownTitle: "Panel Agency Breakdown",
      headers: ["Agency Panel", "Accounts Placed", "Total Value", "Recovery Rate", "Recall Speed", "Audit Grade"],
      rows: [
        ["Amanah Debt Recovery", "48", "RM 164,200", "19.2%", "Same day (< 6h)", "Grade A"],
        ["Perdana Collections", "36", "RM 128,400", "17.8%", "Same day (< 12h)", "Grade A"],
        ["Zenith Recovery Legal", "28", "RM 98,600", "16.5%", "Same day (< 8h)", "Grade A-"],
      ],
      insight:
        "Instant payment-triggered webhook callbacks allow IWK to notify external DCAs within minutes of online payment, eliminating wrongful harassment and customer escalation.",
    };
  }

  // 7. Geography & Areas
  if (/area|geograph|state|vacan|coverage/i.test(label)) {
    return {
      title: `${label} Regional Overview`,
      subtitle: "Territorial arrears concentration & grid verification",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Metric Count", value: String(value), note: sub || "Geographic overview" },
        { name: "Territories Monitored", value: "11 States + FT", note: "Peninsular Malaysia statutory footprint" },
        { name: "Network Coverage", value: "84.2%", note: "Connected sewer lines" },
        { name: "Field Inspection Queue", value: "28 cases", note: "Vacancy audits pending" },
      ],
      breakdownTitle: "Top State & Federal Territory Arrears Concentrations",
      headers: ["Territory", "Type", "Active Accounts", "Arrears Held", "Vacancy Rate", "Grid Coverage"],
      rows: [
        ["Selangor", "State", "298", "RM 745,785", "4.0%", "89.0%"],
        ["W.P. Kuala Lumpur", "Federal Territory", "143", "RM 403,457", "4.2%", "92.0%"],
        ["Johor", "State", "79", "RM 319,210", "5.1%", "81.0%"],
        ["Pulau Pinang", "State", "61", "RM 168,259", "3.3%", "86.0%"],
      ],
      insight:
        "Selangor and W.P. Kuala Lumpur represent over 48% of total arrears book value across the 11 Malaysian states and federal territories.",
    };
  }

  // 8. Segments (Friction Payers, Refusers, Constrained, Non-viable)
  if (/friction|refuser|constrained|viable|funnel|routing/i.test(label)) {
    return {
      title: `${label} Cohort Profile`,
      subtitle: "Behavioral segmentation & optimal recovery treatment strategy",
      explanation: getMetricExplanation(label),
      kpis: [
        { name: "Cohort Population", value: String(value), note: sub || "Accounts in segment" },
        { name: "Avg Debt Size", value: "RM 2,840", note: "Across cohort" },
        { name: "Optimal Channel", value: "Digital / WhatsApp", note: "Recommended touch" },
        { name: "Expected Resolution", value: "14 – 21 days", note: "Target SLA" },
      ],
      breakdownTitle: "Segment Characteristics & Recommended Strategy",
      headers: ["Cohort Tier", "Account Volume", "Arrears Value", "Primary Driver", "Prescribed Action"],
      rows: [
        ["Friction Payers", "364", "RM 890,200", "Channel / convenience delay", "One-click WhatsApp payment link"],
        ["Refusers", "171", "RM 745,600", "Willful non-payment", "Notice of legal escalation (s.88)"],
        ["Constrained", "184", "RM 512,400", "Temporary cashflow strain", "3–6 month instalment restructuring"],
        ["Non-viable", "72", "RM 431,800", "Insolvent / untraceable", "Statutory bad debt write-off review"],
      ],
      insight:
        "Friction Payers resolve at 4.6× lower cost than standard manual outreach. Directing this cohort to digital self-serve settlement frees collector capacity for contentious accounts.",
    };
  }

  // Fallback generic modal data
  return {
    title: `${label} Details`,
    subtitle: "Metric breakdown and historical context",
    explanation: getMetricExplanation(label),
    kpis: [
      { name: "Reported Value", value: String(value), note: sub || "Active metric" },
      { name: "Data Status", value: "Verified", note: "Synchronized in-memory" },
      { name: "Confidence Score", value: "99.8%", note: "Statistical validation" },
      { name: "Audit Trail", value: "Compliant", note: "Enterprise standard" },
    ],
    breakdownTitle: "Component Summary",
    headers: ["Attribute", "Current Value", "Baseline Target", "Variance", "Trend"],
    rows: [
      ["Metric Reading", String(value), "Nominal", "0.0%", "Stable"],
      ["Context Note", sub || "Operational metric", "Standard threshold", "Normal", "Tracked"],
      ["System Source", "Indah Water Collections Core", "Daily sync", "Live", "Optimal"],
    ],
    insight:
      "This metric is continuously evaluated by the Indah Water collections engine to ensure both maximum debt recovery and strict regulatory conduct adherence.",
  };
}
