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
import { rm, rmCompact, num, pct } from "../lib/format.js";
import {
  maskPhonePDPA,
  renderTemplate,
  DEFAULT_SEQUENCER_TEMPLATES,
  INITIAL_WHATSAPP_CONVERSATIONS,
} from "../db/inboxStore.js";

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

export default function UnifiedInbox() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Channel tab: 'all' | 'whatsapp' | 'email' | 'sms' | 'sequencer'
  const initialChannel = searchParams.get("channel") || "all";
  const [activeTab, setActiveTab] = useState(
    ["all", "whatsapp", "email", "sms", "sequencer"].includes(initialChannel?.toLowerCase() || "all")
      ? (initialChannel?.toLowerCase() || "all")
      : "all"
  );

  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [search, setSearch] = useState("");

  // PDPA Privacy Masking State (defaults to true)
  const [isPhoneMasked, setIsPhoneMasked] = useState(true);

  // Active Conversations State
  const [whatsappConversations, setWhatsappConversations] = useState(INITIAL_WHATSAPP_CONVERSATIONS);
  const [activeMessage, setActiveMessage] = useState(null);

  // Modal chat input and attachment state
  const [replyText, setReplyText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

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
    return EMAIL_MESSAGES.filter((msg) => {
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
    return SMS_MESSAGES.filter((msg) => {
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
  }, [sentimentFilter, search]);

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

    const newMsg = {
      sender: "Agent (@admin)",
      text: replyText.trim(),
      time: "Just now",
      attachment: selectedAttachment,
    };

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
    setActiveMessage((prev) => ({
      ...prev,
      lastSnippet: replyText.trim() || `Sent attachment: ${selectedAttachment?.name}`,
      history: [...prev.history, newMsg],
    }));

    setReplyText("");
    setSelectedAttachment(null);
    setShowAttachmentMenu(false);
  };

  // Simulate Natural Humanized AI Response with delay
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
            className={`inbox-tab-btn ${activeTab === "whatsapp" ? "active" : ""}`}
            onClick={() => handleTabChange("whatsapp")}
          >
            WhatsApp e-Bill ({whatsappConversations.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "email" ? "active" : ""}`}
            onClick={() => handleTabChange("email")}
          >
            Email ({EMAIL_MESSAGES.length})
          </button>
          <button
            className={`inbox-tab-btn ${activeTab === "sms" ? "active" : ""}`}
            onClick={() => handleTabChange("sms")}
          >
            SMS ({SMS_MESSAGES.length})
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
              {sequencerNotification}
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
          SUB-SECTION 1: WHATSAPP E-BILL CHAT THREADS TABLE
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
                            Human Takeover
                          </span>
                        ) : (
                          <span className="badge ok" style={{ fontSize: 11 }}>
                            AI Auto-Pilot
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

      {/* Sub-section 2: Email Campaign & Inbound Engagement Table */}
      {(activeTab === "all" || activeTab === "email") && (
        <Panel
          title="Email Engagement & Inbound Inquiries"
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

      {/* Sub-section 3: SMS Reminders & Reply Interactions Table */}
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
                      Pause AI (Take Over)
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
                    ? "AI Paused — Human Representative in Control (Manual replies enabled)"
                    : "AI Auto-Pilot Active — Conversational agent responding automatically"}
                </span>
                {!activeMessage.isAiPaused && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: "2px 6px" }}
                    onClick={handleTriggerAiReply}
                    disabled={isAiTyping}
                  >
                    Simulate AI Reply Now
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
                            {msg.attachment.type === "qrcode" ? "QR" : msg.attachment.type === "receipt" ? "Receipt" : "Document"}
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
                <span><strong>{selectedAttachment.name}</strong> ({selectedAttachment.size})</span>
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
                  Attach
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
    </div>
  );
}
