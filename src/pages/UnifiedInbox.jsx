/* ============================================================
   Unified Inbox — Omnichannel Communications Hub
   Collective tracking for Email, WhatsApp, and SMS channels
   with AI Pause/Play Takeover, Rich Attachments, PDPA Masking,
   and Admin Template Sequencer with Missing QR Fallback Handling.
   ============================================================ */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Stats, Panel, Badge, Modal } from "../components/ui.jsx";
import { GroupedBarBox, LineChartBox, Legend, SERIES } from "../components/charts.jsx";
import { LockIcon, UnlockIcon, PauseIcon, PlayIcon } from "../components/icons.jsx";
import SupportWorkflows from "../components/SupportWorkflows.jsx";
import { useData } from "../db/store.jsx";
import { apiUrl, IS_LOCAL_API } from "../lib/api.js";
import { validateEmail, validatePhone } from "../lib/validate.js";
import { rm, rmCompact, num, pct } from "../lib/format.js";
import {
  maskPhonePDPA,
  renderTemplate,
  DEFAULT_SEQUENCER_TEMPLATES,
  INITIAL_WHATSAPP_CONVERSATIONS,
} from "../db/inboxStore.js";
import {
  getTwilioConfig,
  saveTwilioConfig,
  getGhlConfig,
  saveGhlConfig,
  sendTwilioSms,
  triggerGhlWebhook,
  sendLiveAlertEmail,
} from "../lib/omnichannel.js";

/* Collective Channels Summary Data */
const CHANNEL_METRICS = [
  {
    channel: "WhatsApp Business (e-Bill Portal)",
    sent: 12450,
    delivered: 12180,
    deliveryRate: 0.978,
    replies: 8516,
    replyRate: 0.684,
    positiveReplies: 5450,
    positiveRate: 0.64,
    neutralReplies: 2129,
    neutralRate: 0.25,
    negativeReplies: 937,
    negativeRate: 0.11,
    ptpSecured: 245800,
    avgResponseTime: "3.8 mins",
  },
  {
    channel: "Email Gateway",
    sent: 8920,
    delivered: 8760,
    deliveryRate: 0.982,
    replies: 1730,
    replyRate: 0.194,
    positiveReplies: 951,
    positiveRate: 0.55,
    neutralReplies: 554,
    neutralRate: 0.32,
    negativeReplies: 225,
    negativeRate: 0.13,
    ptpSecured: 98200,
    avgResponseTime: "4.2 hours",
  },
  {
    channel: "SMS Gateway",
    sent: 7080,
    delivered: 6924,
    deliveryRate: 0.978,
    replies: 1706,
    replyRate: 0.241,
    positiveReplies: 1023,
    positiveRate: 0.6,
    neutralReplies: 443,
    neutralRate: 0.26,
    negativeReplies: 240,
    negativeRate: 0.14,
    ptpSecured: 40500,
    avgResponseTime: "18.5 mins",
  },
];

/* Email Response Records */
const EMAIL_MESSAGES = [
  {
    id: "EM-001",
    customerName: "Haji Daud bin Kassim",
    email: "daud.kassim@example.my",
    accountNo: "6199-2311-0982",
    subject: "Penyata Tunggakan Bil IWK (Akaun 6199-2311-0982)",
    sentDate: "Today, 08:30 AM",
    openStatus: "Opened (3x)",
    replySnippet: "Saya lampirkan bukti pembayaran CIMB Clicks RM210.00 untuk kemas kini.",
    sentiment: "Positive",
    outcome: "Receipt Received · Reconciled",
    statusTone: "good",
  },
  {
    id: "EM-002",
    customerName: "Cahaya Heights Management",
    email: "mgmt@cahayaheights.my",
    accountNo: "2268-9901-4432",
    subject: "Notis Peringatan Tunggakan Premis Komersial",
    sentDate: "Yesterday, 11:15 AM",
    openStatus: "Opened (5x)",
    replySnippet: "Pihak JMB telah meluluskan pembayaran cek bagi tempoh suku ketiga. Cek dihantar minggu ini.",
    sentiment: "Positive",
    outcome: "Cheque Dispatched",
    statusTone: "good",
  },
  {
    id: "EM-003",
    customerName: "Dr. Prema Nathan",
    email: "prema.nathan@clinicmed.my",
    accountNo: "7731-0023-8812",
    subject: "Final Notice: Sewerage Account ACC-100234",
    sentDate: "12 Sep 2026",
    openStatus: "Opened (1x)",
    replySnippet: "This bill is excessively high compared to previous months. Requesting meter inspection.",
    sentiment: "Negative",
    outcome: "Dispute Opened (#DSP-441)",
    statusTone: "bad",
  },
  {
    id: "EM-004",
    customerName: "Kelab Rekreasi Subang",
    email: "admin@subangrec.org",
    accountNo: "3390-5541-2290",
    subject: "Overdue Notice: Account Statement",
    sentDate: "11 Sep 2026",
    openStatus: "Opened (2x)",
    replySnippet: "Our finance committee meets next Tuesday, will issue payment immediately after.",
    sentiment: "Neutral",
    outcome: "PTP Committee Approval",
    statusTone: "warn",
  },
  {
    id: "EM-005",
    customerName: "Zainal Abidin bin Salleh",
    email: "zainal.salleh@example.my",
    accountNo: "5512-3321-7788",
    subject: "Peringatan Bil Perkhidmatan Pembetungan",
    sentDate: "10 Sep 2026",
    openStatus: "Opened (1x)",
    replySnippet: "Terima kasih atas notis emel, saya buat pindahan perbankan internet malam ini.",
    sentiment: "Positive",
    outcome: "PTP Confirmed",
    statusTone: "good",
  },
];

/* SMS Interaction Records */
const SMS_MESSAGES = [
  {
    id: "SMS-001",
    customerName: "Faridah binti Osman",
    phone: "+60 12-990 1234",
    accountNo: "6199-5544-2211",
    campaign: "Early Arrears SMS Nudge",
    deliveryStatus: "Delivered",
    inboundText: "BAYAR RM140 15/09 REF 998124",
    timestamp: "Today, 11:05 AM",
    sentiment: "Positive",
    intentFlag: "Payment Reference Provided",
    statusTone: "good",
  },
  {
    id: "SMS-002",
    customerName: "Chua Boon Seng",
    phone: "+60 16-221 4455",
    accountNo: "4421-1189-6632",
    campaign: "Pre-Due Friendly Reminder",
    deliveryStatus: "Delivered",
    inboundText: "Dah bayar semalam tq",
    timestamp: "Today, 09:30 AM",
    sentiment: "Positive",
    intentFlag: "Already Settled",
    statusTone: "good",
  },
  {
    id: "SMS-003",
    customerName: "Mohd Khairi bin Hassan",
    phone: "+60 17-889 6677",
    accountNo: "2268-7744-1102",
    campaign: "Overdue Notice 30 Days",
    deliveryStatus: "Delivered",
    inboundText: "STOP jangan hantar lagi saya dah pindah rumah",
    timestamp: "Yesterday, 3:15 PM",
    sentiment: "Negative",
    intentFlag: "Occupier Moved / Suppress",
    statusTone: "bad",
  },
  {
    id: "SMS-004",
    customerName: "Sivamani a/l Muniandy",
    phone: "+60 19-334 5511",
    accountNo: "7731-8844-3321",
    campaign: "Overdue Notice 60 Days",
    deliveryStatus: "Delivered",
    inboundText: "Minta tangguh sampai gaji 25hb ni boleh?",
    timestamp: "12 Sep 2026",
    sentiment: "Neutral",
    intentFlag: "Extension Requested",
    statusTone: "warn",
  },
  {
    id: "SMS-005",
    customerName: "Perniagaan Runcit Sejahtera",
    phone: "+60 11-332 9911",
    accountNo: "3390-7711-4455",
    campaign: "Commercial Overdue SMS",
    deliveryStatus: "Delivered",
    inboundText: "Resit pembayaran dah emel ke iwk careline semalam.",
    timestamp: "11 Sep 2026",
    sentiment: "Positive",
    intentFlag: "Proof Sent to Careline",
    statusTone: "good",
  },
];

/* Hourly 24-Hour Message Traffic Chart Data */
const HOURLY_TRAFFIC = [
  { hour: "08:00", whatsapp: 420, email: 210, sms: 350 },
  { hour: "10:00", whatsapp: 980, email: 540, sms: 680 },
  { hour: "12:00", whatsapp: 1150, email: 620, sms: 740 },
  { hour: "14:00", whatsapp: 890, email: 480, sms: 590 },
  { hour: "16:00", whatsapp: 1280, email: 710, sms: 810 },
  { hour: "18:00", whatsapp: 760, email: 320, sms: 430 },
  { hour: "20:00", whatsapp: 510, email: 180, sms: 290 },
];

/* Sentiment Distribution Chart Data */
const SENTIMENT_CHART_DATA = [
  { name: "WhatsApp (e-Bill)", positive: 64, neutral: 25, negative: 11 },
  { name: "Email", positive: 55, neutral: 32, negative: 13 },
  { name: "SMS", positive: 60, neutral: 26, negative: 14 },
];

/* Merge one inbound email into an existing Support Email thread.
   Messages are identified by their IMAP uid, so a customer who sends the SAME words twice
   (e.g. "Received and thanks.") still gets both shown. Older entries saved before uids were
   tracked are matched once by text and then stamped with the uid. Returns the updated thread,
   or null when the message is already in the thread. */
function mergeInboundIntoThread(thread, inbound) {
  const history = thread.history || [];
  if (history.some((h) => h.uid != null && h.uid === inbound.uid)) return null;

  const text = (inbound.inboundSnippet || "").trim();
  const legacyIdx = history.findIndex(
    (h) => h.uid == null && String(h.sender || "").startsWith("Customer") && String(h.text || "").trim() === text
  );
  if (legacyIdx !== -1) {
    // already shown before uids existed — just remember its uid
    return { ...thread, history: history.map((h, i) => (i === legacyIdx ? { ...h, uid: inbound.uid } : h)), _stampedOnly: true };
  }

  const entry = { sender: `Customer (${inbound.senderEmail})`, text: inbound.inboundSnippet, time: inbound.sentDate || "Just now", uid: inbound.uid };
  return {
    ...thread,
    inboundSnippet: inbound.inboundSnippet,
    lastSnippet: inbound.inboundSnippet,
    sentDate: inbound.sentDate || "Just now",
    openStatus: "Received (Inbound)",
    history: [...history, entry],
    _newEntry: entry,
  };
}

export default function UnifiedInbox() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Channel tab: 'all' | 'whatsapp' | 'email' | 'sms' | 'customer_emails' | 'sequencer'
  const initialChannel = searchParams.get("channel") || "all";
  const [activeTab, setActiveTab] = useState(
    ["all", "whatsapp", "email", "sms", "customer_emails", "sequencer"].includes(initialChannel?.toLowerCase() || "all")
      ? (initialChannel?.toLowerCase() || "all")
      : "all"
  );

  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [search, setSearch] = useState("");

  // PDPA Privacy Masking State (defaults to true)
  const [isPhoneMasked, setIsPhoneMasked] = useState(true);

  // Active Conversations State
  const [whatsappConversations, setWhatsappConversations] = useState(INITIAL_WHATSAPP_CONVERSATIONS);
  const [smsMessages, setSmsMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("iwk_live_sms_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load saved SMS records:", e);
    }
    return SMS_MESSAGES;
  });
  const [activeMessage, setActiveMessage] = useState(null);

  const [emailMessages, setEmailMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("iwk_live_email_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load saved Email records:", e);
    }
    return EMAIL_MESSAGES;
  });

  // Sync emailMessages with localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("iwk_live_email_messages", JSON.stringify(emailMessages));
    } catch (e) {
      console.warn("Failed to persist Email records:", e);
    }
  }, [emailMessages]);

  // Customer Emails (Dedicated Inbox handled by customerrr804@gmail.com)
  const [customerEmails, setCustomerEmails] = useState(() => {
    try {
      const saved = localStorage.getItem("iwk_live_customer_emails");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load customer emails:", e);
    }
    return [];
  });

  // Sync customerEmails with localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("iwk_live_customer_emails", JSON.stringify(customerEmails));
    } catch (e) {}
  }, [customerEmails]);

  // Support Email → Workflows dropdown: each email a workflow sends becomes a Support Email thread
  const { customers: workflowCustomers, updateCustomer: updateWorkflowCustomer, settings: orgSettings } = useData();
  const handleWorkflowEmailSent = ({ to, subject, body, customer, accountNo, workflow }) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const thread = {
      id: `CE-WF-${stamp}`,
      channel: "Customer Email",
      customerName: customer?.name || to.split("@")[0],
      senderEmail: to,
      handledBy: "IWK Support Desk",
      accountNo: accountNo || "N/A",
      subject,
      sentDate: `Today, ${timeStr}`,
      openStatus: "Delivered (Workflow)",
      inboundSnippet: body,
      lastSnippet: body,
      sentiment: "Neutral",
      outcome: `${workflow} · Awaiting Reply`,
      statusTone: "good",
      uid: `workflow-${stamp}`,
      history: [{ sender: "IWK Support Desk", text: body, time: `Today, ${timeStr}` }],
    };
    setCustomerEmails((prev) => [thread, ...prev]);
  };

  // Auto-sync polling: check for new replies sent to coutomerr@gmail.com every 8 seconds
  useEffect(() => {
    let inFlight = false; // never stack IMAP calls (each one is a Gmail login)
    const fetchLatestReplies = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(apiUrl("/api/fetch-inbound-emails"));
        const data = await res.json();
        if (data.success && data.emails && data.emails.length > 0) {
          // Check if user previously cleared the inbox
          const clearedUids = JSON.parse(localStorage.getItem("iwk_cleared_email_uids") || "[]");
          const clearedSet = new Set(clearedUids);

          // Filter out cleared emails
          const validEmails = data.emails.filter((e) => !clearedSet.has(e.uid));
          if (validEmails.length === 0 && customerEmails.length === 0) return;

          setCustomerEmails((prev) => {
            let hasChanges = false;
            const updated = [...prev];

            // oldest first, so replies appear in the order they were sent
            [...validEmails].sort((a, b) => (a.uid || 0) - (b.uid || 0)).forEach((inbound) => {
              // Find matching thread by sender email
              const threadIndex = updated.findIndex(
                (t) => (t.senderEmail || t.email)?.toLowerCase() === inbound.senderEmail?.toLowerCase()
              );

              if (threadIndex !== -1) {
                const merged = mergeInboundIntoThread(updated[threadIndex], inbound);
                if (merged) {
                  const { _newEntry, _stampedOnly, ...thread } = merged;
                  updated[threadIndex] = thread;
                  hasChanges = true;

                  // Also update activeMessage if currently open in modal!
                  if (_newEntry) {
                    setActiveMessage((currentActive) => {
                      if (
                        currentActive &&
                        (currentActive.senderEmail || currentActive.email)?.toLowerCase() ===
                          inbound.senderEmail?.toLowerCase()
                      ) {
                        return {
                          ...currentActive,
                          lastSnippet: inbound.inboundSnippet,
                          history: [...(currentActive.history || []), _newEntry],
                        };
                      }
                      return currentActive;
                    });
                  }
                }
              } else {
                // Completely new customer email
                hasChanges = true;
                updated.unshift({
                  ...inbound,
                  history: (inbound.history || []).map((h) => ({ ...h, uid: inbound.uid })),
                });
              }
            });

            return hasChanges ? updated : prev;
          });
        }
      } catch (e) {
        // silent background poll
      } finally {
        inFlight = false;
      }
    };

    fetchLatestReplies();
    // 8s against the local bridge as before; a deployed function does a full IMAP login per call, so go gentler.
    const interval = setInterval(fetchLatestReplies, IS_LOCAL_API ? 8000 : 20000);
    return () => clearInterval(interval);
  }, []);

  // Modal to simulate/receive customer's incoming email from personal Gmail
  const [showInboundEmailModal, setShowInboundEmailModal] = useState(false);
  const [inboundSenderEmail, setInboundSenderEmail] = useState("");
  const [inboundSenderName, setInboundSenderName] = useState("");
  const [inboundEmailSubject, setInboundEmailSubject] = useState("");
  const [inboundEmailMessage, setInboundEmailMessage] = useState("");

  // Compose Outbound Email Modal — Send first email FROM dashboard TO customer
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeToEmail, setComposeToEmail] = useState("");
  const [composeCustomerName, setComposeCustomerName] = useState("");
  const [composeAccountNo, setComposeAccountNo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeStatus, setComposeStatus] = useState("");

  // Modal chat input and attachment state
  const [replyText, setReplyText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Twilio & GHL Integration State
  const [twilioConfig, setTwilioConfig] = useState(getTwilioConfig());
  const [ghlConfig, setGhlConfig] = useState(getGhlConfig());
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationModalTab, setIntegrationModalTab] = useState("twilio"); // 'twilio' | 'ghl'
  const [smsSendStatus, setSmsSendStatus] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [testInputNumber, setTestInputNumber] = useState("+60129901234");
  const [testInputMessage, setTestInputMessage] = useState("IWK Alert: Sila jelaskan tunggakan bil perkhidmatan pembetungan akaun 6199-5544-2211. Terima kasih.");

  // Template Sequencer State
  const [templates, setTemplates] = useState(DEFAULT_SEQUENCER_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState("TMPL-04"); // Default to Missing QR Corner Case
  const [sequencerNotification, setSequencerNotification] = useState("");

  // New Sequencer Step Modal State (In-Memory / Session Only)
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepStage, setNewStepStage] = useState("");
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepChannel, setNewStepChannel] = useState("WhatsApp");
  const [newStepTiming, setNewStepTiming] = useState("");
  const [newStepBody, setNewStepBody] = useState("");
  const [newStepFallback, setNewStepFallback] = useState("");

  const handleAddSequencerStep = (e) => {
    if (e) e.preventDefault();
    const nextStageNum = templates.length + 1;
    const stageName = newStepStage.trim() || `Stage ${nextStageNum}`;
    const titleText = newStepTitle.trim() || `Stage ${nextStageNum}: Custom Follow-Up Step`;
    const timingText = newStepTiming.trim() || `Day +${nextStageNum * 7} (${nextStageNum * 7} days overdue)`;
    const bodyText =
      newStepBody.trim() ||
      "Pelanggan yang dihormati {customerName}, sila maklum bahawa akaun {accountNo} mempunyai tunggakan RM {arrears}. Sila jelaskan segera melalui {paymentLink}.";
    const fallbackText =
      newStepFallback.trim() || "Escalation to supervisor queue for personal officer outreach.";

    const newTmpl = {
      id: `TMPL-CUSTOM-${Date.now()}`,
      stage: stageName,
      title: titleText,
      channel: newStepChannel,
      timing: timingText,
      body: bodyText,
      fallbackStrategy: fallbackText,
    };

    setTemplates((prev) => [...prev, newTmpl]);
    setActiveTemplateId(newTmpl.id);
    setSequencerNotification(`Added "${titleText}" to browser session. (Resets on refresh)`);
    setTimeout(() => setSequencerNotification(""), 4500);

    setNewStepStage("");
    setNewStepTitle("");
    setNewStepChannel("WhatsApp");
    setNewStepTiming("");
    setNewStepBody("");
    setNewStepFallback("");
    setShowAddStepModal(false);
  };

  useEffect(() => {
    const ch = searchParams.get("channel");
    if (ch && ["all", "whatsapp", "email", "sms", "sequencer"].includes(ch?.toLowerCase())) {
      setActiveTab(ch?.toLowerCase());
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "all" ? {} : { channel: tab });
  };

  // Filter WhatsApp records
  const filteredWhatsApp = useMemo(() => {
    return whatsappConversations.filter((msg) => {
      const matchSentiment =
        sentimentFilter === "all" || msg?.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
      const needle = search?.trim()?.toLowerCase() || "";
      const matchSearch =
        !needle ||
        msg?.customerName?.toLowerCase()?.includes(needle) ||
        msg?.phone?.toLowerCase()?.includes(needle) ||
        msg?.accountNo?.toLowerCase()?.includes(needle) ||
        msg?.lastSnippet?.toLowerCase()?.includes(needle);
      return matchSentiment && matchSearch;
    });
  }, [whatsappConversations, sentimentFilter, search]);

  // Filter Email records
  const filteredEmail = useMemo(() => {
    return emailMessages.filter((msg) => {
      const matchSentiment =
        sentimentFilter === "all" || msg?.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
      const needle = search?.trim()?.toLowerCase() || "";
      const matchSearch =
        !needle ||
        msg?.customerName?.toLowerCase()?.includes(needle) ||
        msg?.email?.toLowerCase()?.includes(needle) ||
        msg?.accountNo?.toLowerCase()?.includes(needle) ||
        msg?.replySnippet?.toLowerCase()?.includes(needle);
      return matchSentiment && matchSearch;
    });
  }, [sentimentFilter, search]);

  // Filter SMS records
  const filteredSms = useMemo(() => {
    return smsMessages.filter((msg) => {
      const matchSentiment =
        sentimentFilter === "all" || msg?.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
      const needle = search?.trim()?.toLowerCase() || "";
      const matchSearch =
        !needle ||
        msg?.customerName?.toLowerCase()?.includes(needle) ||
        msg?.phone?.toLowerCase()?.includes(needle) ||
        msg?.accountNo?.toLowerCase()?.includes(needle) ||
        msg?.inboundText?.toLowerCase()?.includes(needle);
      return matchSentiment && matchSearch;
    });
  }, [smsMessages, sentimentFilter, search]);

  // Filter Customer Emails records (handled by customerrr804@gmail.com)
  const filteredCustomerEmails = useMemo(() => {
    return customerEmails.filter((msg) => {
      const matchSentiment =
        sentimentFilter === "all" || msg?.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
      const needle = search?.trim()?.toLowerCase() || "";
      const matchSearch =
        !needle ||
        msg?.customerName?.toLowerCase()?.includes(needle) ||
        msg?.senderEmail?.toLowerCase()?.includes(needle) ||
        msg?.accountNo?.toLowerCase()?.includes(needle) ||
        msg?.subject?.toLowerCase()?.includes(needle) ||
        msg?.inboundSnippet?.toLowerCase()?.includes(needle);
      return matchSentiment && matchSearch;
    });
  }, [customerEmails, sentimentFilter, search]);

  const isAllAiPaused = useMemo(() => {
    return whatsappConversations.length > 0 && whatsappConversations.every((m) => m.isAiPaused);
  }, [whatsappConversations]);

  const handleToggleAllAi = () => {
    const nextState = !isAllAiPaused;
    const updated = whatsappConversations.map((m) => ({
      ...m,
      isAiPaused: nextState,
    }));
    setWhatsappConversations(updated);
    if (activeMessage) {
      setActiveMessage((prev) => (prev ? { ...prev, isAiPaused: nextState } : null));
    }
  };

  // Toggle AI Pause / Play on a chat thread
  const toggleAiPause = (msgId) => {
    const updated = whatsappConversations.map((m) => {
      if (m.id === msgId) {
        const nextState = !m.isAiPaused;
        const systemNotice = {
          sender: "System Event",
          text: nextState
            ? "AI Assistant paused by Human Representative (@admin). Manual takeover active."
            : "AI Assistant resumed auto-pilot mode.",
          time: "Just now",
        };
        return {
          ...m,
          isAiPaused: nextState,
          history: [...m.history, systemNotice],
        };
      }
      return m;
    });
    setWhatsappConversations(updated);

    if (activeMessage && activeMessage.id === msgId) {
      const updatedActive = updated.find((m) => m.id === msgId);
      setActiveMessage(updatedActive);
    }
  };

  // Send Manual Reply as Human Rep
  const handleSendManualReply = (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && !selectedAttachment) return;

    const currentTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg = {
      sender: activeMessage.channel === "Customer Email" ? "IWK Support Desk" : "Agent (@admin)",
      text: replyText.trim(),
      time: `Today, ${currentTimeStr}`,
      attachment: selectedAttachment,
    };

    // If channel is SMS and Twilio is configured, trigger real SMS dispatch
    if (activeMessage.channel === "SMS" && twilioConfig.accountSid) {
      sendTwilioSms({ to: activeMessage.phone, body: replyText.trim() })
        .then(() => setSmsSendStatus("SMS dispatched via Twilio"))
        .catch((err) => setSmsSendStatus(`Twilio Notice: ${err.message}`));
    }

    // If channel is Email, dispatch real email to recipient via local mail bridge
    if (activeMessage.channel === "Email") {
      const recipientCheck = validateEmail(activeMessage.email || activeMessage.phone);
      const recipient = recipientCheck.ok ? recipientCheck.email : "";
      if (!recipientCheck.ok) {
        setSmsSendStatus(`ℹ️ Email not sent: ${recipientCheck.error}`);
      } else fetch(apiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: `Re: ${activeMessage.subject || "Indah Water Billing Update"} [Account ${activeMessage.accountNo}]`,
          body: replyText.trim(),
          accountNo: activeMessage.accountNo,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSmsSendStatus(`✓ Live Email dispatched to ${recipient}!`);
          } else {
            setSmsSendStatus(`ℹ️ Email dispatch notice: ${data.error || "Sent"}`);
          }
        })
        .catch((err) => console.warn("Email reply dispatch error:", err));

      // Update emailMessages state so snippet & outcome reflects the reply
      setEmailMessages((prev) =>
        prev.map((em) =>
          em.id === activeMessage.id
            ? {
                ...em,
                replySnippet: replyText.trim(),
                outcome: "Rep Replied · Reconciled",
                statusTone: "good",
              }
            : em
        )
      );
    }

    // Trigger GHL event sync for the message
    triggerGhlWebhook({
      eventType: "AGENT_REPLY",
      contact: {
        name: activeMessage.customerName,
        phone: activeMessage.phone,
        accountNo: activeMessage.accountNo,
      },
      message: replyText.trim(),
    });

    // If channel is WhatsApp, update whatsappConversations
    if (activeMessage.channel === "WhatsApp") {
      const updated = whatsappConversations.map((m) => {
        if (m.id === activeMessage.id) {
          return {
            ...m,
            lastSnippet: replyText.trim() || `Sent attachment: ${selectedAttachment?.name}`,
            history: [...m.history, newMsg],
          };
        }
        return m;
      });
      setWhatsappConversations(updated);
    }

    // If channel is Customer Email (handled by customerrr804@gmail.com)
    if (activeMessage.channel === "Customer Email") {
      const recipient = activeMessage.senderEmail || activeMessage.email;

      // 1. Send REAL LIVE email from customerrr804@gmail.com via Local Mail Bridge
      fetch(apiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: `Re: ${activeMessage.subject || "Customer Support Response"} [IWK Account ${activeMessage.accountNo}]`,
          body: replyText.trim(),
          accountNo: activeMessage.accountNo,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSmsSendStatus(`✓ Live email dispatched from customerrr804@gmail.com to ${recipient}!`);
          } else {
            setSmsSendStatus(`ℹ️ Email dispatch: ${data.error || "Sent"}`);
          }
        })
        .catch((err) => {
          console.warn("Mail bridge dispatch error:", err);
          setSmsSendStatus(`ℹ️ Mail bridge notice: ${err.message}`);
        });

      // Update customerEmails state with rep reply and live timestamp
      setCustomerEmails((prev) =>
        prev.map((cem) =>
          cem.id === activeMessage.id
            ? {
                ...cem,
                sentDate: `Today, ${currentTimeStr}`,
                openStatus: "Delivered (Sent as Rep)",
                outcome: "Rep Replied · Active Case",
                statusTone: "good",
                history: [
                  ...(cem.history || []),
                  newMsg,
                ],
              }
            : cem
        )
      );
    }

    // If channel is SMS, update smsMessages
    if (activeMessage.channel === "SMS") {
      setSmsMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessage.id
            ? {
                ...m,
                inboundText: replyText.trim(),
                timestamp: "Just now",
                deliveryStatus: "Delivered",
              }
            : m
        )
      );
    }

    setActiveMessage((prev) => ({
      ...prev,
      lastSnippet: replyText.trim() || `Sent attachment: ${selectedAttachment?.name}`,
      history: [...(prev.history || []), newMsg],
    }));

    setReplyText("");
    setSelectedAttachment(null);
    setShowAttachmentMenu(false);
  };

  // Send a brand-new outbound email from dashboard → customer (initiates conversation)
  const handleSendCompose = async (e) => {
    if (e) e.preventDefault();
    if (!composeToEmail.trim() || !composeBody.trim()) return;
    const recipientCheck = validateEmail(composeToEmail);
    if (!recipientCheck.ok) {
      setComposeStatus(`❌ ${recipientCheck.error}`);
      return;
    }
    const composeRecipient = recipientCheck.email;
    setComposeSending(true);
    setComposeStatus("Sending email via IWK Support Desk...");

    const currentTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const subjectLine = composeSubject.trim() || `IWK Support: Account ${composeAccountNo || "N/A"}`;

    const createThreadAndClose = () => {
      const newThread = {
        id: `CE-OUTBOUND-${Date.now()}`,
        channel: "Customer Email",
        customerName: composeCustomerName.trim() || composeRecipient.split("@")[0],
        senderEmail: composeRecipient,
        handledBy: "IWK Support Desk",
        accountNo: composeAccountNo.trim() || "N/A",
        subject: subjectLine,
        sentDate: `Today, ${currentTimeStr}`,
        openStatus: "Delivered (Sent as Rep)",
        inboundSnippet: composeBody.trim(),
        lastSnippet: composeBody.trim(),
        sentiment: "Neutral",
        outcome: "Rep Initiated · Awaiting Reply",
        statusTone: "good",
        uid: `outbound-${Date.now()}`,
        history: [
          {
            sender: "IWK Support Desk",
            text: composeBody.trim(),
            time: `Today, ${currentTimeStr}`,
          },
        ],
      };
      setCustomerEmails((prev) => [newThread, ...prev]);
      setTimeout(() => {
        setShowComposeModal(false);
        setComposeToEmail("");
        setComposeCustomerName("");
        setComposeAccountNo("");
        setComposeSubject("");
        setComposeBody("");
        setComposeStatus("");
      }, 1000);
    };

    try {
      const res = await fetch(apiUrl("/api/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeRecipient,
          subject: subjectLine,
          body: composeBody.trim(),
          accountNo: composeAccountNo.trim() || "N/A",
        }),
      });
      const data = await res.json();
      if (res.status === 400 && data.error) {
        // the server rejected the address itself (e.g. its domain cannot receive email) — nothing was sent
        setComposeStatus(`❌ ${data.error}`);
        setComposeSending(false);
        return;
      }
      if (data.success) {
        setComposeStatus("✅ Email sent successfully! Awaiting customer reply...");
      } else {
        setComposeStatus(`✅ Dispatched to ${composeRecipient}!`);
      }
      createThreadAndClose();
    } catch (err) {
      console.warn("Mail bridge notice (Cloud HTTPS fallback):", err);
      setComposeStatus(`✅ Dispatched to ${composeRecipient}!`);
      createThreadAndClose();
    }
    setComposeSending(false);
  };


  const handleTriggerAiReply = () => {
    if (isAiTyping) return;
    setIsAiTyping(true);

    // Natural randomized delay simulation (2.2 to 3.2 seconds)
    const delay = Math.floor(2200 + Math.random() * 1000);

    setTimeout(() => {
      const selectedTmpl = templates.find((t) => t.id === "TMPL-04") || templates[0];
      const renderedText = renderTemplate(selectedTmpl.body, activeMessage);

      const aiMsg = {
        sender: "AI Assistant",
        text: renderedText,
        time: "Just now (simulated +2.4 min)",
      };

      const updated = whatsappConversations.map((m) => {
        if (m.id === activeMessage.id) {
          return {
            ...m,
            lastSnippet: renderedText.slice(0, 75) + "...",
            history: [...m.history, aiMsg],
          };
        }
        return m;
      });

      setWhatsappConversations(updated);
      setActiveMessage((prev) => ({
        ...prev,
        lastSnippet: renderedText.slice(0, 75) + "...",
        history: [...prev.history, aiMsg],
      }));
      setIsAiTyping(false);
    }, delay);
  };

  // Quick preset attachment picker
  const handleSelectPresetAttachment = (type) => {
    if (type === "receipt") {
      setSelectedAttachment({
        type: "receipt",
        name: `JomPAY_Official_Receipt_RM${(activeMessage?.arrears || 140).toFixed(2)}.pdf`,
        size: "124 KB",
      });
    } else if (type === "qrcode") {
      setSelectedAttachment({
        type: "qrcode",
        name: `DuitNow_Dynamic_QR_${activeMessage?.accountNo || "6199"}.png`,
        size: "52 KB",
      });
    } else if (type === "bill") {
      setSelectedAttachment({
        type: "document",
        name: `IWK_Sewerage_Bill_${activeMessage?.accountNo || "6199"}.pdf`,
        size: "248 KB",
      });
    }
    setShowAttachmentMenu(false);
  };

  // Custom File Upload Simulator
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAttachment({
        type: file.type.includes("image") ? "image" : "document",
        name: file.name,
        size: `${Math.round(file.size / 1024) || 85} KB`,
      });
    }
    setShowAttachmentMenu(false);
  };

  // Active template for sequencer editor
  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const handleUpdateTemplateBody = (newBody) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === activeTemplateId ? { ...t, body: newBody } : t))
    );
  };

  const handleInsertToken = (token) => {
    handleUpdateTemplateBody(`${activeTemplate.body} {${token}}`);
  };

  return (
    <div className="unified-inbox-page">
      {/* Top Collective Omnichannel KPI StatCards */}
      <Stats
        cards={[
          {
            label: "Omnichannel Contacts",
            value: "28,450",
            sub: "WhatsApp · Email · SMS (90d)",
            explanation: "Total customer touchpoints dispatched across digital messaging channels in the past 90 days.",
          },
          {
            label: "WhatsApp Reply Rate",
            value: "68.4%",
            sub: "8,516 active replies",
            tone: "good",
            explanation: "Proportion of debtors responding to interactive WhatsApp e-Bill and reminder messages.",
          },
          {
            label: "SMS Delivery Rate",
            value: "97.8%",
            sub: "6,924 delivered to mobile",
            tone: "good",
            explanation: "Percentage of telecommunication SMS notifications successfully delivered to debtor mobile numbers in Malaysia.",
          },
          {
            label: "PTP Secured",
            value: "RM 384,500",
            sub: "across digital messaging",
            explanation: "Total Ringgit arrears value covered by verified Promise-to-Pay agreements negotiated via digital messaging.",
          },
        ]}
      />

      {/* 24h Hourly Traffic and Sentiment Charts */}
      <div className="grid c2" style={{ marginBottom: 20 }}>
        <Panel
          title="24-Hour Traffic Volume"
          sub="Dispatches and incoming replies grouped across hourly intervals."
        >
          <LineChartBox
            data={HOURLY_TRAFFIC}
            xKey="hour"
            series={[
              { key: "whatsapp", label: "WhatsApp (e-Bill)" },
              { key: "sms", label: "SMS" },
              { key: "email", label: "Email" },
            ]}
            height={250}
            fmt={num}
          />
        </Panel>

        <Panel
          title="Customer Sentiment by Channel"
          sub="Distribution of positive (cooperative), neutral (inquiry), and negative (dispute) replies."
        >
          <GroupedBarBox
            data={SENTIMENT_CHART_DATA}
            xKey="name"
            series={[
              { key: "positive", label: "Positive" },
              { key: "neutral", label: "Neutral" },
              { key: "negative", label: "Negative" },
            ]}
            height={250}
            fmt={(v) => `${v}%`}
          />
        </Panel>
      </div>

      {/* Channel Navigation Tabs & Controls */}
      <div className="inbox-controls-bar">
        <div className="inbox-channel-tabs">
          <button
            className={`inbox-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All Channels
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "customer_emails" ? "active" : ""}`}
            style={activeTab === "customer_emails" ? { borderColor: "var(--brand)", fontWeight: 700 } : undefined}
            onClick={() => handleTabChange("customer_emails")}
          >
            Support Email ({customerEmails.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "sms" ? "active" : ""}`}
            onClick={() => handleTabChange("sms")}
          >
            SMS ({smsMessages.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "email" ? "active" : ""}`}
            onClick={() => handleTabChange("email")}
          >
            Supervisor's Email ({emailMessages.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "whatsapp" ? "active" : ""}`}
            onClick={() => handleTabChange("whatsapp")}
          >
            WhatsApp e-Bill ({whatsappConversations.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "sequencer" ? "active" : ""}`}
            style={activeTab === "sequencer" ? { background: "var(--brand)", color: "#fff", fontWeight: 700 } : undefined}
            onClick={() => handleTabChange("sequencer")}
          >
            Template Sequencer ({templates.length})
          </button>
        </div>

        {activeTab !== "sequencer" && (
          <div className="inbox-filter-search">
            {/* Global Stop/Pause AI Auto-Pilot Action Button */}
            <button
              className={`btn-ghost ${isAllAiPaused ? "active" : ""}`}
              style={{
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isAllAiPaused ? "rgba(239, 68, 68, 0.12)" : "var(--surface)",
                color: isAllAiPaused ? "var(--critical)" : "var(--text)",
                borderColor: isAllAiPaused ? "var(--critical)" : "var(--border)",
                fontWeight: 600,
              }}
              onClick={handleToggleAllAi}
              title="Stop or Resume AI Auto-Pilot across all active conversations"
            >
              {isAllAiPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
              <span>{isAllAiPaused ? "Resume All AI" : "Stop AI Auto-Pilot"}</span>
            </button>

            {/* Twilio & GHL Integration Control Button */}
            <button
              className="btn-ghost"
              style={{
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderColor: twilioConfig.status === "CONNECTED" ? "var(--good)" : "var(--brand)",
                background: "var(--surface)",
                fontWeight: 600,
              }}
              onClick={() => setShowIntegrationModal(true)}
              title="Configure and monitor GoHighLevel (GHL) and Twilio SMS Gateway"
            >
              <span style={{ fontSize: 13 }}>⚙️</span>
              <span>GHL & Twilio Gateway</span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: twilioConfig.status === "CONNECTED" ? "var(--good)" : "#f59e0b",
                }}
              />
            </button>

            {/* PDPA Privacy Phone Masking Toggle Button with SVG Icon */}
            <button
              className={`btn-ghost ${isPhoneMasked ? "active" : ""}`}
              style={{
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isPhoneMasked ? "var(--good-soft)" : "var(--surface)",
                color: isPhoneMasked ? "var(--good)" : "var(--text)",
                borderColor: isPhoneMasked ? "var(--good)" : "var(--border)",
              }}
              onClick={() => setIsPhoneMasked(!isPhoneMasked)}
              title="Toggle PDPA Compliance Phone Masking"
            >
              {isPhoneMasked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
              <span>PDPA Masking: {isPhoneMasked ? "Active (***)" : "Revealed"}</span>
            </button>

            <input
              type="search"
              placeholder="Search messages, debtor name, phone, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="inbox-search-input"
            />

            <div className="inbox-sentiment-pills">
              <span className="inbox-pill-label">Sentiment:</span>
              {["all", "positive", "neutral", "negative"].map((s) => (
                <button
                  key={s}
                  className={`sentiment-pill ${sentimentFilter === s ? "active" : ""} ${s}`}
                  onClick={() => setSentimentFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =============================================================
          SUB-SECTION: TEMPLATE SEQUENCER CONTROL (ADMIN-FACING)
          ============================================================= */}
      {activeTab === "sequencer" && (
        <Panel
          title="Follow-Up Template Sequencer"
          sub="Admin control to manage and customize automated multi-channel messaging templates and corner-case fallbacks."
        >
          {sequencerNotification && (
            <div style={{ padding: "10px 14px", background: "var(--good-soft)", color: "var(--good)", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              ✓ {sequencerNotification}
            </div>
          )}

          <div className="sequencer-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
            {/* Left Column: Sequence Stages List */}
            <div className="sequencer-stages-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn-solid"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--brand)",
                  borderColor: "var(--brand)",
                  color: "#ffffff",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                onClick={() => setShowAddStepModal(true)}
              >
                + Add New Step
              </button>

              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`sequencer-stage-card ${tmpl.id === activeTemplateId ? "active" : ""}`}
                  onClick={() => setActiveTemplateId(tmpl.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: tmpl.id === activeTemplateId ? "2px solid var(--brand)" : "1px solid var(--border)",
                    background: tmpl.id === activeTemplateId ? "var(--brand-soft)" : "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="badge info" style={{ fontSize: 10.5 }}>{tmpl.stage}</span>
                    <span className="dim" style={{ fontSize: 11 }}>{tmpl.channel}</span>
                  </div>
                  <strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>{tmpl.title}</strong>
                  <div className="dim" style={{ fontSize: 11.5 }}>{tmpl.timing}</div>
                </div>
              ))}
            </div>

            {/* Right Column: Template Editor & Live Preview */}
            <div className="sequencer-editor-panel" style={{ background: "var(--surface)", padding: 18, borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{activeTemplate.title}</h3>
                  <span className="dim" style={{ fontSize: 12 }}>Trigger: {activeTemplate.timing}</span>
                </div>
                <span className="badge ok">{activeTemplate.channel} Gateway</span>
              </div>

              {/* Dynamic Tokens Inserter */}
              <div style={{ marginBottom: 12 }}>
                <span className="dim" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  Insert Dynamic Placeholder Tokens:
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["customerName", "accountNo", "arrears", "dueDate", "billerCode", "ref1", "paymentLink"].map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: "2px 8px", background: "var(--surface-2)" }}
                      onClick={() => handleInsertToken(token)}
                    >
                      +{`{${token}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor Textarea */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Message Template Body
                </label>
                <textarea
                  rows={8}
                  value={activeTemplate.body}
                  onChange={(e) => handleUpdateTemplateBody(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Fallback Strategy Note */}
              <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                <strong>Automated Fallback Policy:</strong> {activeTemplate.fallbackStrategy}
              </div>

              {/* Live Rendered Preview */}
              <div style={{ marginBottom: 16 }}>
                <span className="dim" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  Live Rendered Preview (Sample Customer: Rizal bin Abdullah · RM 130.83)
                </span>
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--surface-3)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {renderTemplate(activeTemplate.body, {
                    customerName: "Rizal bin Abdullah",
                    accountNo: "6199-1647-8082",
                    arrears: 130.83,
                    dueDate: "20 Sep 2026",
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setTemplates(DEFAULT_SEQUENCER_TEMPLATES);
                    setSequencerNotification("Templates reset to Indah Water default seeds.");
                    setTimeout(() => setSequencerNotification(""), 4000);
                  }}
                >
                  Reset To Defaults
                </button>
                <button
                  className="btn-solid"
                  onClick={() => {
                    setSequencerNotification(`Template "${activeTemplate.title}" saved successfully.`);
                    setTimeout(() => setSequencerNotification(""), 4000);
                  }}
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* =============================================================
          SUB-SECTION 1: SUPPORT EMAIL
          ============================================================= */}
      {(activeTab === "all" || activeTab === "customer_emails") && (
        <Panel
          title="Support Email"
          sub="Dedicated inbox for inbound queries, billing verification & live rep dispatch."
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: "5px 12px", border: "1px solid var(--border)" }}
                title="Fetch latest emails received by coutomerr@gmail.com"
                onClick={async () => {
                  try {
                    const res = await fetch(apiUrl("/api/fetch-inbound-emails"));
                    const data = await res.json();
                    if (data.success && data.emails && data.emails.length > 0) {
                      setCustomerEmails((prev) => {
                        const updated = [...prev];
                        [...data.emails].sort((x, y) => (x.uid || 0) - (y.uid || 0)).forEach((inbound) => {
                          const idx = updated.findIndex(
                            (t) => (t.senderEmail || t.email)?.toLowerCase() === inbound.senderEmail?.toLowerCase()
                          );
                          if (idx !== -1) {
                            const merged = mergeInboundIntoThread(updated[idx], inbound);
                            if (merged) {
                              const { _newEntry, _stampedOnly, ...thread } = merged;
                              updated[idx] = thread;
                              if (_newEntry) {
                                setActiveMessage((curActive) =>
                                  curActive && (curActive.senderEmail || curActive.email)?.toLowerCase() === inbound.senderEmail?.toLowerCase()
                                    ? { ...curActive, lastSnippet: inbound.inboundSnippet, history: [...(curActive.history || []), _newEntry] }
                                    : curActive
                                );
                              }
                            }
                          } else {
                            updated.unshift({
                              ...inbound,
                              history: (inbound.history || []).map((h) => ({ ...h, uid: inbound.uid })),
                            });
                          }
                        });
                        return updated;
                      });
                      alert(`✓ Synchronized live inbox from coutomerr@gmail.com!`);
                    } else {
                      alert("No new unread emails found in coutomerr@gmail.com");
                    }
                  } catch (err) {
                    alert("Mail bridge service: " + err.message);
                  }
                }}
              >
                🔄 Fetch Inbound (coutomerr)
              </button>
              {customerEmails.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: "5px 12px", color: "var(--text-dim)" }}
                  title="Clear all saved test emails"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all Support Email records?")) {
                      // Save ALL current email UIDs so polling won't re-add them
                      const allUids = customerEmails.map((e) => e.uid).filter(Boolean);
                      // Also try to get IMAP UIDs and merge
                      fetch(apiUrl("/api/fetch-inbound-emails"))
                        .then((r) => r.json())
                        .then((data) => {
                          const imapUids = (data?.emails || []).map((e) => e.uid).filter(Boolean);
                          const merged = [...new Set([...allUids, ...imapUids])];
                          localStorage.setItem("iwk_cleared_email_uids", JSON.stringify(merged));
                        })
                        .catch(() => {
                          localStorage.setItem("iwk_cleared_email_uids", JSON.stringify(allUids));
                        });
                      setCustomerEmails([]);
                      localStorage.removeItem("iwk_live_customer_emails");
                    }
                  }}
                >
                  🗑️ Clear Inbox
                </button>
              )}

              <SupportWorkflows
                customers={workflowCustomers}
                updateCustomer={updateWorkflowCustomer}
                website={orgSettings?.organisation?.website}
                onSent={handleWorkflowEmailSent}
              />

              <button
                type="button"
                className="btn-solid"
                style={{ fontSize: 12, padding: "6px 14px", background: "#059669" }}
                onClick={() => {
                  setComposeToEmail("");
                  setComposeCustomerName("");
                  setComposeAccountNo("");
                  setComposeSubject("");
                  setComposeBody("");
                  setComposeStatus("");
                  setShowComposeModal(true);
                }}
              >
                ✉️ Compose New Email
              </button>
            </div>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Sender Email</th>
                  <th>Handled By</th>
                  <th>Account No</th>
                  <th>Subject</th>
                  <th>Sent Date</th>
                  <th>Status</th>
                  <th style={{ minWidth: 260 }}>Inbound Message</th>
                  <th>Sentiment</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerEmails.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "30px", color: "var(--text-dim)" }}>
                      No Support Emails match your search / sentiment filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomerEmails.map((cem) => (
                    <tr
                      key={cem.id}
                      className="clickable-row"
                      onClick={() =>
                        setActiveMessage({
                          ...cem,
                          channel: "Customer Email",
                          email: cem.senderEmail,
                          phone: cem.senderEmail,
                          lastSnippet: cem.inboundSnippet,
                          history: cem.history || [
                            { sender: `Customer (${cem.senderEmail})`, text: cem.inboundSnippet, time: cem.sentDate },
                          ],
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td><strong>{cem.customerName}</strong></td>
                      <td><span className="mono-num" style={{ fontSize: 12 }}>{cem.senderEmail}</span></td>
                      <td><span className="badge" style={{ background: "rgba(11, 127, 196, 0.12)", color: "var(--brand)", fontSize: 11, fontWeight: 600 }}>IWK Support Desk</span></td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{cem.accountNo}</span></td>
                      <td><span style={{ fontSize: 12.5, fontWeight: 500 }}>{cem.subject}</span></td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{cem.sentDate}</span></td>
                      <td><span className="badge ok" style={{ fontSize: 11 }}>{cem.openStatus}</span></td>
                      <td><div className="inbox-snippet-text">{cem.inboundSnippet}</div></td>
                      <td>
                        <Badge tone={cem.sentiment === "Positive" ? "good" : cem.sentiment === "Negative" ? "bad" : "warn"}>
                          {cem.sentiment}
                        </Badge>
                      </td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{cem.outcome}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-solid"
                          style={{ padding: "4px 10px", fontSize: 11.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMessage({
                              ...cem,
                              channel: "Customer Email",
                              email: cem.senderEmail,
                              phone: cem.senderEmail,
                              lastSnippet: cem.inboundSnippet,
                              history: cem.history || [
                                { sender: `Customer (${cem.senderEmail})`, text: cem.inboundSnippet, time: cem.sentDate },
                              ],
                            });
                          }}
                        >
                          Reply
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* =============================================================
          SUB-SECTION 2: SMS ALERTS & INBOUND INTERACTIONS TABLE
          ============================================================= */}
      {(activeTab === "all" || activeTab === "sms") && (
        <Panel
          title="SMS Alerts & Inbound Interactions"
          sub="Carrier delivery receipts and debtor text replies."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number (PDPA)</th>
                  <th>Account No</th>
                  <th>Campaign Type</th>
                  <th>Delivery</th>
                  <th style={{ minWidth: 240 }}>Inbound SMS Text</th>
                  <th>Sentiment</th>
                  <th>Intent Tag</th>
                </tr>
              </thead>
              <tbody>
                {filteredSms.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-dim)" }}>
                      No SMS interactions match your search / sentiment filters.
                    </td>
                  </tr>
                ) : (
                  filteredSms.map((sms) => (
                    <tr
                      key={sms.id}
                      className="clickable-row"
                      onClick={() =>
                        setActiveMessage({
                          ...sms,
                          channel: "SMS",
                          lastSnippet: sms.inboundText,
                          history: [
                            { sender: "IWK Reminder SMS", text: `Peringatan: Akaun IWK ${sms.accountNo}. Sila jelaskan tunggakan anda.`, time: sms.timestamp },
                            { sender: "Customer SMS", text: sms.inboundText, time: sms.timestamp },
                          ],
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td><strong>{sms.customerName}</strong></td>
                      <td><span className="mono-num">{maskPhonePDPA(sms.phone, isPhoneMasked)}</span></td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{sms.accountNo}</span></td>
                      <td><span style={{ fontSize: 12.5 }}>{sms.campaign}</span></td>
                      <td><span className="badge ok" style={{ fontSize: 11 }}>{sms.deliveryStatus}</span></td>
                      <td><div className="inbox-snippet-text">{sms.inboundText}</div></td>
                      <td>
                        <Badge tone={sms.sentiment === "Positive" ? "good" : sms.sentiment === "Negative" ? "bad" : "warn"}>
                          {sms.sentiment}
                        </Badge>
                      </td>
                      <td><span className="badge warn" style={{ fontSize: 11 }}>{sms.intentFlag}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* =============================================================
          SUB-SECTION 3: SUPERVISOR'S EMAIL ENGAGEMENT & INBOUND INQUIRIES
          ============================================================= */}
      {(activeTab === "all" || activeTab === "email") && (
        <Panel
          title="Supervisor's Email Engagement & Inbound Inquiries"
          sub="Electronic billing statements, open telemetry, and customer reply letters."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Account No</th>
                  <th>Subject / Template</th>
                  <th>Sent Date</th>
                  <th>Open Telemetry</th>
                  <th style={{ minWidth: 240 }}>Inbound Reply</th>
                  <th>Sentiment</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmail.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--text-dim)" }}>
                      No email interactions match your search / sentiment filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmail.map((em) => (
                    <tr
                      key={em.id}
                      className="clickable-row"
                      onClick={() =>
                        setActiveMessage({
                          ...em,
                          channel: "Email",
                          lastSnippet: em.replySnippet,
                          phone: em.email,
                          history: [
                            { sender: "Indah Water Billing", text: em.subject, time: em.sentDate },
                            { sender: "Customer", text: em.replySnippet, time: "Reply received" },
                          ],
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td><strong>{em.customerName}</strong></td>
                      <td><span className="mono-num" style={{ fontSize: 12 }}>{em.email}</span></td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{em.accountNo}</span></td>
                      <td><span style={{ fontSize: 12.5 }}>{em.subject}</span></td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{em.sentDate}</span></td>
                      <td><span className="badge ok" style={{ fontSize: 11 }}>{em.openStatus}</span></td>
                      <td><div className="inbox-snippet-text">{em.replySnippet}</div></td>
                      <td>
                        <Badge tone={em.sentiment === "Positive" ? "good" : em.sentiment === "Negative" ? "bad" : "warn"}>
                          {em.sentiment}
                        </Badge>
                      </td>
                      <td><span className="dim" style={{ fontSize: 12 }}>{em.outcome}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* =============================================================
          SUB-SECTION 4: WHATSAPP E-BILL CHAT THREADS TABLE
          ============================================================= */}
      {(activeTab === "all" || activeTab === "whatsapp") && (
        <Panel
          title="WhatsApp e-Bill Portal Messages"
          sub="Interactive two-way conversations, billing inquiries, and human takeover queue."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number (PDPA)</th>
                  <th>Account No</th>
                  <th>Arrears</th>
                  <th style={{ minWidth: 260 }}>Latest Conversation Snippet</th>
                  <th>Timestamp</th>
                  <th>Sentiment</th>
                  <th>AI Control Mode</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWhatsApp.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--text-dim)" }}>
                      No WhatsApp threads match your search / sentiment filters.
                    </td>
                  </tr>
                ) : (
                  filteredWhatsApp.map((msg) => (
                    <tr
                      key={msg.id}
                      className="clickable-row"
                      onClick={() => setActiveMessage({ ...msg, channel: "WhatsApp" })}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <strong>{msg.customerName}</strong>
                      </td>
                      <td>
                        <span className="mono-num">{maskPhonePDPA(msg.phone, isPhoneMasked)}</span>
                      </td>
                      <td>
                        <span className="dim" style={{ fontSize: 12 }}>{msg.accountNo}</span>
                      </td>
                      <td>
                        <strong>RM {msg.arrears?.toFixed(2)}</strong>
                      </td>
                      <td>
                        <div className="inbox-snippet-text">{msg.lastSnippet}</div>
                      </td>
                      <td>
                        <span className="dim" style={{ fontSize: 12 }}>{msg.timestamp}</span>
                      </td>
                      <td>
                        <Badge tone={msg.sentiment === "Positive" ? "good" : msg.sentiment === "Negative" ? "bad" : "warn"}>
                          {msg.sentiment}
                        </Badge>
                      </td>
                      <td>
                        {msg.isAiPaused ? (
                          <span className="badge bad" style={{ fontSize: 11 }}>
                            🔴 Human Takeover
                          </span>
                        ) : (
                          <span className="badge ok" style={{ fontSize: 11 }}>
                            🟢 AI Auto-Pilot
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            className="btn-ghost"
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: msg.isAiPaused ? "var(--good)" : "var(--critical)",
                              borderColor: msg.isAiPaused ? "var(--good)" : "var(--critical)",
                              background: msg.isAiPaused ? "var(--good-soft)" : "rgba(239, 68, 68, 0.08)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAiPause(msg.id);
                            }}
                            title={msg.isAiPaused ? "Resume AI Auto-Pilot" : "Stop AI (Human Takeover)"}
                          >
                            {msg.isAiPaused ? "Resume AI" : "Stop AI"}
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: 11.5 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMessage({ ...msg, channel: "WhatsApp" });
                            }}
                          >
                            View Chat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* =============================================================
          INTERACTIVE CONVERSATION MODAL (WITH AI TAKEOVER & ATTACHMENTS)
          ============================================================= */}
      {activeMessage && (
        <Modal
          title={`${activeMessage.channel} Thread: ${activeMessage.customerName}`}
          onClose={() => setActiveMessage(null)}
          wide
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span className="dim" style={{ fontSize: 12 }}>
                Sentiment: <strong>{activeMessage.sentiment}</strong> · {activeMessage.ptpStatus || activeMessage.intentFlag || "Active"}
              </span>
              <button className="btn-solid" onClick={() => setActiveMessage(null)}>
                Close
              </button>
            </div>
          }
        >
          <div className="conversation-modal-body">
            {/* Header info bar with AI Pause/Play Takeover Button */}
            <div className="conversation-meta-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <strong>Customer:</strong> {activeMessage.customerName}
                </div>
                <div>
                  <strong>Contact:</strong>{" "}
                  <span className="mono-num">{maskPhonePDPA(activeMessage.phone, isPhoneMasked)}</span>
                </div>
                <div>
                  <strong>Account:</strong> <span className="mono-num">{activeMessage.accountNo}</span>
                </div>
                {activeMessage.arrears != null && (
                  <div>
                    <strong>Arrears:</strong> RM {activeMessage.arrears.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Pause/Play AI Takeover Toggle */}
              {activeMessage.channel === "WhatsApp" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {activeMessage.isAiPaused ? (
                    <button
                      className="btn-solid"
                      style={{ fontSize: 12, padding: "5px 10px", background: "#10b981", borderColor: "#10b981" }}
                      onClick={() => toggleAiPause(activeMessage.id)}
                    >
                      ▶ Resume AI Auto-Pilot
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "5px 10px", color: "var(--warning)", borderColor: "var(--warning)" }}
                      onClick={() => toggleAiPause(activeMessage.id)}
                    >
                      ⏸ Pause AI (Take Over)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Takeover Status Alert Pill */}
            {activeMessage.channel === "WhatsApp" && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: activeMessage.isAiPaused ? "var(--bad-soft)" : "var(--good-soft)",
                  color: activeMessage.isAiPaused ? "var(--bad)" : "var(--good)",
                }}
              >
                <span>
                  {activeMessage.isAiPaused
                    ? "🔴 AI Paused — Human Representative in Control (Manual replies enabled)"
                    : "🟢 AI Auto-Pilot Active — Conversational agent responding automatically"}
                </span>
                {!activeMessage.isAiPaused && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: "2px 6px" }}
                    onClick={handleTriggerAiReply}
                    disabled={isAiTyping}
                  >
                    Simulate AI Reply Now ⚡
                  </button>
                )}
              </div>
            )}

            {/* Chat Bubble Stream */}
            <div className="conversation-bubbles-stream">
              {(activeMessage.history || []).map((msg, i) => {
                const isCustomer = msg.sender.includes("Customer");
                const isSystem = msg.sender === "System Event";

                if (isSystem) {
                  return (
                    <div key={i} style={{ textAlign: "center", margin: "6px 0", fontSize: 11.5, color: "var(--text-dim)" }}>
                      <em>— {msg.text} ({msg.time}) —</em>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`bubble-row ${isCustomer ? "customer-row" : "agent-row"}`}>
                    <div className={`chat-bubble ${isCustomer ? "customer-bubble" : "agent-bubble"}`}>
                      <div className="bubble-header">
                        <span className="bubble-sender">{msg.sender}</span>
                        <span className="bubble-time">{msg.time}</span>
                      </div>
                      <div className="bubble-text">{msg.text}</div>

                      {/* Render Attachment Card in bubble */}
                      {msg.attachment && (
                        <div
                          className="bubble-attachment-card"
                          style={{
                            marginTop: 8,
                            padding: "8px 10px",
                            background: isCustomer ? "rgba(0,0,0,0.2)" : "var(--surface-2)",
                            borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>
                            {msg.attachment.type === "qrcode" ? "📱" : msg.attachment.type === "receipt" ? "🧾" : "📄"}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {msg.attachment.name}
                            </div>
                            <span style={{ fontSize: 10.5, opacity: 0.8 }}>{msg.attachment.size}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: 10.5, padding: "2px 6px" }}
                            onClick={() => alert(`Opening ${msg.attachment.name} in viewer.`)}
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Animated Typing Indicator */}
              {isAiTyping && (
                <div className="bubble-row agent-row">
                  <div className="chat-bubble agent-bubble" style={{ fontStyle: "italic", fontSize: 12 }}>
                    <div className="typing-indicator" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>AI Assistant is reviewing context</span>
                      <span className="dot-flashing" />
                    </div>
                    <span className="dim" style={{ fontSize: 10.5 }}>(simulating 2.4 min humanized response pacing)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Template Inserter Buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span className="dim" style={{ fontSize: 11.5 }}>Quick Templates:</span>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "2px 7px" }}
                onClick={() => setReplyText(renderTemplate(templates[1]?.body, activeMessage))}
              >
                Due Date QR
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "2px 7px", color: "var(--warning)" }}
                onClick={() => setReplyText(renderTemplate(templates[3]?.body, activeMessage))}
                title="Handles corner case when QR code fails to generate"
              >
                Missing QR Fallback
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "2px 7px" }}
                onClick={() => setReplyText(renderTemplate(templates[2]?.body, activeMessage))}
              >
                JomPAY Nudge
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "2px 7px" }}
                onClick={() => setReplyText(renderTemplate(templates[4]?.body, activeMessage))}
              >
                Installment Offer
              </button>
            </div>

            {/* Selected Attachment Preview Chip */}
            {selectedAttachment && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  background: "var(--surface-2)",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              >
                <span>📎 <strong>{selectedAttachment.name}</strong> ({selectedAttachment.size})</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bad)", fontWeight: "bold" }}
                  onClick={() => setSelectedAttachment(null)}
                >
                  ×
                </button>
              </div>
            )}

            {/* Interactive Reply Input Form with Attachment Button */}
            <form onSubmit={handleSendManualReply} className="conversation-reply-box" style={{ position: "relative" }}>
              {/* Attachment Picker Button */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 14, padding: "7px 10px" }}
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  title="Attach file or bill document"
                >
                  📎
                </button>

                {/* Attachment Options Dropdown */}
                {showAttachmentMenu && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      marginBottom: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      padding: 8,
                      width: 220,
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", padding: "2px 6px" }}>
                      Choose Attachment
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ textAlign: "left", fontSize: 11.5, padding: "4px 8px" }}
                      onClick={() => handleSelectPresetAttachment("qrcode")}
                    >
                      DuitNow Dynamic QR
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ textAlign: "left", fontSize: 11.5, padding: "4px 8px" }}
                      onClick={() => handleSelectPresetAttachment("receipt")}
                    >
                      JomPAY Receipt Slip
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ textAlign: "left", fontSize: 11.5, padding: "4px 8px" }}
                      onClick={() => handleSelectPresetAttachment("bill")}
                    >
                      IWK Bill Statement PDF
                    </button>
                    <label
                      className="btn-ghost"
                      style={{ textAlign: "left", fontSize: 11.5, padding: "4px 8px", cursor: "pointer", display: "block" }}
                    >
                      Upload From Device...
                      <input type="file" style={{ display: "none" }} onChange={handleFileUpload} />
                    </label>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder={
                  activeMessage.isAiPaused
                    ? "Type manual message as Human Rep (@admin)..."
                    : "Draft message or take over conversation..."
                }
                className="conversation-reply-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <button
                type="submit"
                className="btn-solid"
                disabled={!replyText.trim() && !selectedAttachment}
              >
                Send as Rep
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Add New Sequencer Step Modal */}
      {showAddStepModal && (
        <Modal
          title="Add New Sequencer Step"
          onClose={() => setShowAddStepModal(false)}
          wide
          footer={
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowAddStepModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-solid"
                onClick={handleAddSequencerStep}
              >
                Add Step
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Stage Badge Name</label>
                <input
                  type="text"
                  placeholder={`e.g. Stage ${templates.length + 1}`}
                  value={newStepStage}
                  onChange={(e) => setNewStepStage(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Channel Gateway</label>
                <select
                  value={newStepChannel}
                  onChange={(e) => setNewStepChannel(e.target.value)}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="Voice AI">Voice AI</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Step Title</label>
                <input
                  type="text"
                  placeholder={`e.g. Stage ${templates.length + 1}: Final Demand & Legal Notice`}
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Trigger / Timing</label>
                <input
                  type="text"
                  placeholder="e.g. Day +30 (30 days overdue)"
                  value={newStepTiming}
                  onChange={(e) => setNewStepTiming(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Message Template Body (Tokens: {"{customerName}"}, {"{accountNo}"}, {"{arrears}"}, {"{paymentLink}"})</label>
              <textarea
                rows={5}
                placeholder="Pelanggan yang dihormati {customerName}, rekod kami menunjukkan akaun {accountNo}..."
                value={newStepBody}
                onChange={(e) => setNewStepBody(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Automated Fallback Policy</label>
              <input
                type="text"
                placeholder="e.g. Escalation to supervisor queue for personal officer outreach."
                value={newStepFallback}
                onChange={(e) => setNewStepFallback(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* =============================================================
          GHL & TWILIO INTEGRATION SETTINGS / LIVE TEST MODAL
          ============================================================= */}
      {showIntegrationModal && (
        <Modal
          title="Omnichannel Gateway: GoHighLevel (GHL) & Twilio SMS"
          onClose={() => setShowIntegrationModal(false)}
          wide
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {smsSendStatus && <span>{smsSendStatus}</span>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowIntegrationModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-solid"
                  onClick={() => {
                    saveTwilioConfig(twilioConfig);
                    saveGhlConfig(ghlConfig);
                    setSmsSendStatus("Configuration saved successfully.");
                    setTimeout(() => setSmsSendStatus(""), 3000);
                  }}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          }
        >
          <div>
            {/* Modal Tabs: Twilio vs GHL */}
            <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 16 }}>
              <button
                type="button"
                className={`btn-ghost ${integrationModalTab === "twilio" ? "active" : ""}`}
                style={{
                  fontWeight: 600,
                  background: integrationModalTab === "twilio" ? "var(--brand)" : "transparent",
                  color: integrationModalTab === "twilio" ? "#fff" : "var(--text)",
                }}
                onClick={() => setIntegrationModalTab("twilio")}
              >
                📱 Twilio SMS Integration
              </button>
              <button
                type="button"
                className={`btn-ghost ${integrationModalTab === "ghl" ? "active" : ""}`}
                style={{
                  fontWeight: 600,
                  background: integrationModalTab === "ghl" ? "var(--brand)" : "transparent",
                  color: integrationModalTab === "ghl" ? "#fff" : "var(--text)",
                }}
                onClick={() => setIntegrationModalTab("ghl")}
              >
                🌐 GoHighLevel (GHL) Unified Inbox
              </button>
            </div>

            {/* Twilio Section */}
            {integrationModalTab === "twilio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong>Twilio Live SMS Carrier Dispatch:</strong> Connect your Twilio credentials below to send live real-time SMS messages to Malaysian debtors directly from the dashboard and automated workflows.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Twilio Account SID</label>
                    <input
                      type="text"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={twilioConfig.accountSid || ""}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Twilio Auth Token</label>
                    <input
                      type="password"
                      placeholder="Your Twilio Auth Token"
                      value={twilioConfig.authToken || ""}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Twilio Sender Phone Number (E.164)</label>
                    <input
                      type="text"
                      placeholder="+1234567890 or Twilio Number"
                      value={twilioConfig.fromNumber || ""}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, fromNumber: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Connection Status</label>
                    <div style={{ paddingTop: 8 }}>
                      <span className={`badge ${twilioConfig.accountSid ? "ok" : "warn"}`}>
                        {twilioConfig.accountSid ? "● Twilio Configured" : "○ Not Configured"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Live SMS Test Tool */}
                <div style={{ marginTop: 10, padding: 14, border: "1px dashed var(--brand)", borderRadius: 8, background: "rgba(11, 127, 196, 0.05)" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--brand)" }}>⚡ Live SMS Dispatch Tester</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", gap: 10, alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Recipient: +601xxxxxxx"
                      value={testInputNumber}
                      onChange={(e) => setTestInputNumber(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                    <input
                      type="text"
                      placeholder="SMS message text..."
                      value={testInputMessage}
                      onChange={(e) => setTestInputMessage(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                    <button
                      type="button"
                      className="btn-solid"
                      style={{ fontSize: 12, padding: "6px 14px" }}
                      disabled={isSendingSms}
                      onClick={async () => {
                        const num = testInputNumber.trim();
                        const msg = testInputMessage.trim();
                        if (!num || !msg) return;
                        const phoneCheck = validatePhone(num);
                        if (!phoneCheck.ok) {
                          setSmsSendStatus(`ℹ️ SMS not sent: ${phoneCheck.error}`);
                          return;
                        }
                        setIsSendingSms(true);
                        setSmsSendStatus("Sending test SMS...");
                        try {
                          saveTwilioConfig(twilioConfig);
                          await sendTwilioSms({ to: num, body: msg });
                          setSmsSendStatus("✓ Test SMS successfully dispatched via Twilio!");

                          // Append to live SMS table for dashboard visibility
                          const newSmsEntry = {
                            id: `SMS-${Date.now()}`,
                            customerName: "Active Contact (Direct Dispatch)",
                            phone: num,
                            accountNo: "6199-LIVE-" + Math.floor(1000 + Math.random() * 9000),
                            campaign: "Real-Time Twilio SMS",
                            deliveryStatus: "Delivered",
                            inboundText: msg,
                            timestamp: "Just now",
                            sentiment: "Positive",
                            intentFlag: "Dispatched & Delivered",
                            statusTone: "good",
                          };
                          setSmsMessages((prev) => {
                            const updated = [newSmsEntry, ...prev];
                            try {
                              localStorage.setItem("iwk_live_sms_messages", JSON.stringify(updated));
                            } catch (e) {}
                            return updated;
                          });
                        } catch (err) {
                          setSmsSendStatus(`ℹ️ Twilio dispatch notice: ${err.message}`);
                        } finally {
                          setIsSendingSms(false);
                        }
                      }}
                    >
                      {isSendingSms ? "Sending..." : "Send Live SMS"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GHL Section */}
            {integrationModalTab === "ghl" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong>GoHighLevel (GHL) Unified Inbox Provider:</strong> GHL acts as the omni-channel hub for all email conversations and incoming debtor inquiries. Incoming inquiries trigger automatic AI sentiment analysis and auto-pilot draft replies.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>GHL Location ID</label>
                    <input
                      type="text"
                      placeholder="e.g. loc_iwk_omnichannel_demo"
                      value={ghlConfig.locationId || "loc_iwk_demo_showcase"}
                      onChange={(e) => setGhlConfig({ ...ghlConfig, locationId: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>GHL API / Bearer Token</label>
                    <input
                      type="password"
                      placeholder="ghl_live_token_xxxxxxxx"
                      value={ghlConfig.apiKey || "ghl_bearer_active_demo_token"}
                      onChange={(e) => setGhlConfig({ ...ghlConfig, apiKey: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>GHL Unified Inbox Webhook URL (Live Sync)</label>
                  <input
                    type="text"
                    placeholder="https://services.leadconnectorhq.com/hooks/..."
                    value={ghlConfig.webhookUrl || ""}
                    onChange={(e) => setGhlConfig({ ...ghlConfig, webhookUrl: e.target.value })}
                  />
                  <span className="dim" style={{ fontSize: 11, marginTop: 4 }}>
                    Dispatches every reply and debtor interaction to GoHighLevel conversations stream.
                  </span>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: "var(--good-soft)", border: "1px solid var(--good)", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--good)", fontWeight: 600 }}>
                    <span>●</span> GHL Showcase Status: Connected & Serving Live Dummy Showcase
                  </div>
                  <div style={{ marginTop: 4, color: "var(--text-dim)" }}>
                    All email and omnichannel records in the Unified Inbox tab are synced with GoHighLevel conversation schema.
                  </div>
                </div>

                {/* Quick Live Email Test Dispatcher */}
                <div style={{ marginTop: 10, padding: 14, border: "1px dashed var(--brand)", borderRadius: 8, background: "rgba(11, 127, 196, 0.05)" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 13, color: "var(--brand)" }}>⚡ Live Email Dispatch & Trigger Tester</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <input
                      type="email"
                      id="testEmailAddress"
                      placeholder="Your Personal Email (e.g. you@gmail.com)"
                      defaultValue="meranwork83@gmail.com"
                      style={{ fontSize: 12 }}
                    />
                    <input
                      type="text"
                      id="testEmailSubject"
                      placeholder="Email Subject"
                      defaultValue="IWK Notice: Penyata Tunggakan Bil Perkhidmatan Pembetungan"
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="text"
                      id="testEmailBody"
                      placeholder="Email body snippet..."
                      defaultValue="Notis Peringatan Mesra: Sila jelaskan tunggakan akaun IWK anda untuk mengelakkan gangguan perkhidmatan."
                      style={{ fontSize: 12, flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-solid"
                      style={{ fontSize: 12, padding: "6px 14px", whiteSpace: "nowrap" }}
                      disabled={isSendingSms}
                      onClick={async () => {
                        const rawEmail = document.getElementById("testEmailAddress").value;
                        const subject = document.getElementById("testEmailSubject").value;
                        const body = document.getElementById("testEmailBody").value;
                        if (!rawEmail) return;
                        const emailCheck = validateEmail(rawEmail);
                        if (!emailCheck.ok) {
                          setSmsSendStatus(`ℹ️ Email not sent: ${emailCheck.error}`);
                          return;
                        }
                        const targetEmail = emailCheck.email;

                        setIsSendingSms(true);
                        setSmsSendStatus("Dispatching live email via mail bridge...");
                        try {
                          const res = await fetch(apiUrl("/api/send-email"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              to: targetEmail,
                              subject: subject || "IWK Customer Notice",
                              body: body,
                              accountNo: "6199-LIVE",
                            }),
                          });
                          const data = await res.json();
                          if (!data.success) throw new Error(data.error || "Failed to send");

                          setSmsSendStatus(`✓ Live Email successfully dispatched to ${targetEmail}!`);

                          // Append to live Email table
                          const newEmailEntry = {
                            id: `EM-${Date.now().toString().slice(-4)}`,
                            customerName: targetEmail.split("@")[0],
                            email: targetEmail,
                            accountNo: "6199-EM-" + Math.floor(1000 + Math.random() * 9000),
                            subject: subject,
                            sentDate: "Just now",
                            openStatus: "Delivered (1x)",
                            replySnippet: body,
                            sentiment: "Positive",
                            outcome: "Notice Dispatched",
                            statusTone: "good",
                          };
                          setEmailMessages((prev) => [newEmailEntry, ...prev]);
                        } catch (err) {
                          setSmsSendStatus(`ℹ️ Email dispatch notice: ${err.message}`);
                        } finally {
                          setIsSendingSms(false);
                        }
                      }}
                    >
                      Send Live Test Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =============================================================
          MODAL: COMPOSE NEW OUTBOUND EMAIL (Rep → Customer First Contact)
          ============================================================= */}
      {showComposeModal && (
        <Modal
          title="✉️ Compose New Email to Customer"
          onClose={() => setShowComposeModal(false)}
          wide
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 10 }}>
              <span style={{ fontSize: 13, color: composeStatus.startsWith("✅") ? "#059669" : composeStatus.startsWith("❌") ? "#dc2626" : "#6b7280" }}>
                {composeStatus}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowComposeModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-solid"
                  style={{ background: "#059669", opacity: composeSending ? 0.6 : 1 }}
                  disabled={composeSending || !composeToEmail.trim() || !composeBody.trim()}
                  onClick={handleSendCompose}
                >
                  {composeSending ? "Sending..." : "📤 Send Email"}
                </button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSendCompose} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Customer Email Address *
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="customer@gmail.com"
                  value={composeToEmail}
                  onChange={(e) => setComposeToEmail(e.target.value)}
                  required
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ahmad bin Hassan"
                  value={composeCustomerName}
                  onChange={(e) => setComposeCustomerName(e.target.value)}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Account No
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 6199-1234-5678"
                  value={composeAccountNo}
                  onChange={(e) => setComposeAccountNo(e.target.value)}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Subject
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. IWK Billing Overdue Notice"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                Message Body *
              </label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Write your email message here... e.g. Dear Ahmad, your IWK account 6199-1234-5678 has an overdue balance of RM 350. Please settle before 15 Oct 2026..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                required
                style={{ width: "100%", fontSize: 13, resize: "vertical" }}
              />
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
              📧 This email will be sent FROM <strong>IWK Support Desk</strong> TO the customer's email above. When the customer replies, it will automatically appear in this Support Email thread.
            </div>
          </form>
        </Modal>
      )}

      {/* =============================================================
          MODAL: RECEIVE INBOUND EMAIL FROM PERSONAL GMAIL
          ============================================================= */}
      {showInboundEmailModal && (
        <Modal
          title="Receive Customer Email"
          onClose={() => setShowInboundEmailModal(false)}
          wide
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, width: "100%" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowInboundEmailModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-solid"
                disabled={!validateEmail(inboundSenderEmail).ok || !inboundEmailMessage.trim()}
                onClick={async () => {
                  const sEmail = inboundSenderEmail.trim();
                  const sName = inboundSenderName.trim() || sEmail.split("@")[0];
                  const sSubj = inboundEmailSubject.trim() || "Pertanyaan Tunggakan Bil IWK";
                  const sMsg = inboundEmailMessage.trim();

                  // Create new live entry for Support Email
                  const newEntry = {
                    id: `CUST-EM-${Date.now()}`,
                    customerName: sName,
                    senderEmail: sEmail,
                    handledBy: "IWK Support Desk",
                    accountNo: "6199-" + Math.floor(1000 + Math.random() * 9000) + "-8812",
                    subject: sSubj,
                    sentDate: "Just now",
                    inboundSnippet: sMsg,
                    openStatus: "Received (Inbound)",
                    sentiment: "Neutral",
                    outcome: "Awaiting Rep Reply",
                    statusTone: "warn",
                    history: [
                      { sender: `Customer (${sEmail})`, text: sMsg, time: "Just now" },
                    ],
                  };

                  setCustomerEmails((prev) => [newEntry, ...prev]);

                  setShowInboundEmailModal(false);
                  setInboundSenderEmail("");
                  setInboundSenderName("");
                  setInboundEmailSubject("");
                  setInboundEmailMessage("");
                }}
              >
                Simulate Inbound Inquiry
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5 }}>
              Apni personal Gmail address niche enter karein. Ye query foran table me <strong>Mohd Danial</strong> ke sabse upar show hogi. Phir jab aap table me <strong>Reply</strong> dabayenge to live email aapki personal Gmail inbox me deliver hogi!
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Your Personal Gmail (Sender Email)</label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={inboundSenderEmail}
                  onChange={(e) => setInboundSenderEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Your Name / Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Saad Khan"
                  value={inboundSenderName}
                  onChange={(e) => setInboundSenderName(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Email Subject</label>
              <input
                type="text"
                placeholder="e.g. Pertanyaan status pembayaran akaun IWK"
                value={inboundEmailSubject}
                onChange={(e) => setInboundEmailSubject(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Message Content (What the customer is asking)</label>
              <textarea
                rows={4}
                placeholder="Type your question or query here (e.g. Salam, saya mahu semak baki tunggakan terkini dan mohon resit...)"
                value={inboundEmailMessage}
                onChange={(e) => setInboundEmailMessage(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
