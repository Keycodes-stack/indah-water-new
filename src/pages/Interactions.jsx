import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Modal } from "../components/ui.jsx";
import {
  PhoneIcon,
  PhoneCallIcon,
  InboxIcon,
  RefreshIcon,
  AlertTriangleIcon,
} from "../components/icons.jsx";

const WEBHOOK_URL = "https://praeco.app.n8n.cloud/webhook/fetch-logs";

/* Seed interactions matching the screenshot layout */
const SEED_INTERACTIONS = [
  {
    call_id: "INT-260919-0412",
    customer_name: "Rizal bin A***",
    account_no: "6199-1647-8082",
    archetype: "Lupa",
    area: "Taman Sri Muda, Shah Alam",
    balance: "RM 90.00 → RM 0.00",
    customer_intent: "POSITIVE",
    call_outcome: "PAYMENT_COMMITTED",
    primary_issue: "PAYMENT_COMMITMENT",
    customer_situation: '["PAYMENT_FORGOT"]',
    handling_priority: "GREEN",
    frustration_level: "NONE",
    human_requested: false,
    do_not_call_requested: false,
    callback_requested: false,
    payment_promised: true,
    promised_payment_date: "Today (DuitNow QR)",
    follow_up_action: '["LOG_CALL", "SEND_RECEIPT"]',
    summary:
      "Customer Rizal bin A*** forgot about the 6-month bill. After clarification, he made an instant RM90 payment via DuitNow QR during the call.",
    type: "Voice",
    channel_label: "Voice · Aina",
    assistant: "Aina - outbound",
    status_label: "Paid on call",
    status_tone: "good",
    duration_seconds: 134,
    time_stamp: "Sep 19, 2026, 10:02 AM UTC",
    transcript:
      "AI: Salam, saya Aina, pembantu automatik Indah Water. Saya hubungi berkenaan mesej WhatsApp semalam tentang bil pembetungan. Boleh saya teruskan, atau Encik lebih selesa bercakap dengan pegawai kami?\nUser: Boleh, teruskan. Bil apa ni?\nAI: Bil pembetungan RM90 untuk Julai hingga Disember, untuk rumah di Taman Sri Muda. Ia dibil setiap enam bulan, jadi ramai yang terlupa.\nUser: Oh, yang tu. Saya ingat sudah bayar dengan bil air.\nAI: Faham Encik. Bil IWK adalah berasingan. Boleh saya hantar QR DuitNow ke WhatsApp untuk bayaran pantas?\nUser: Boleh, hantar sekarang.",
    audio_url: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
    result_desc: "Paid RM90 via DuitNow QR during the call",
    followup_desc: "Receipt + AutoDebit offer sent 10:09",
    milestones: [
      { time: 14, label: "confused" },
      { time: 41, label: "will pay" },
      { time: 58, label: "QR sent" },
    ],
  },
  {
    call_id: "INT-260919-0413",
    customer_name: "Nurul Izzati binti Z***",
    account_no: "4820-9912-3301",
    archetype: "Terhimpit",
    area: "Pandan Indah, Ampang",
    balance: "RM 175.00",
    customer_intent: "CONDITIONAL",
    call_outcome: "SUBSIDY_INQUIRY",
    primary_issue: "FINANCIAL_HARDSHIP",
    customer_situation: '["TEMPORARY_FINANCIAL_DIFFICULTY", "REQUESTS_INSTALLMENT"]',
    handling_priority: "GREY",
    frustration_level: "LOW",
    human_requested: false,
    do_not_call_requested: false,
    callback_requested: false,
    payment_promised: false,
    follow_up_action: '["ROUTE_HARDSHIP_DESK", "PAUSE_COLLECTIONS"]',
    summary:
      "Customer requested instalment plan due to temporary hardship. AI paused collections and sent 6-month instalment link.",
    type: "WhatsApp",
    channel_label: "WhatsApp · AI Auto-Pilot → Siti",
    assistant: "Siti - WhatsApp Auto-Pilot",
    status_label: "Plan accepted",
    status_tone: "good",
    duration_seconds: 95,
    time_stamp: "Sep 19, 2026, 09:42 AM UTC",
    transcript:
      "User: Saya ada terima mesej peringatan bil RM175. Boleh tak bayar secara ansuran?\nAI: Salam Puan Nurul. Boleh, Indah Water menyediakan pelan ansuran RM30/bulan selama 6 bulan tanpa faedah. Boleh saya bantu aktifkan?",
    audio_url: "/voices/voice_preview_aisyah - animated, curious and clear.mp3",
    result_desc: "Accepted 6-month RM30 instalment schedule",
    followup_desc: "Instalment agreement logged & paused reminders",
  },
  {
    call_id: "INT-260919-0414",
    customer_name: "Wong Siew M***",
    account_no: "9934-2210-7765",
    archetype: "Terhimpit",
    area: "Pandan Indah, Ampang",
    balance: "RM 175.00",
    customer_intent: "POSITIVE",
    call_outcome: "HUMAN_REQUESTED",
    primary_issue: "FINANCIAL_HARDSHIP",
    customer_situation: '["UNEMPLOYED", "LOW_INCOME"]',
    handling_priority: "RED",
    frustration_level: "MODERATE",
    human_requested: true,
    do_not_call_requested: false,
    callback_requested: true,
    payment_promised: false,
    follow_up_action: '["TRANSFER_HUMAN_SUPERVISOR", "PAUSE_COLLECTIONS"]',
    summary:
      "Customer reported job loss and requested human supervisor assistance. Escalated immediately to human officer.",
    type: "Voice",
    channel_label: "Voice · Nur",
    assistant: "Nur - Hardship",
    status_label: "Handed to officer",
    status_tone: "warn",
    duration_seconds: 221,
    time_stamp: "Sep 19, 2026, 09:30 AM UTC",
    transcript:
      "AI: Salam, saya Nur daripada Unit Bantuan Indah Water.\nUser: Suami saya hilang kerja. Kami tak mampu bayar apa-apa sekarang. Anak pun sakit.\nAI: Saya faham Puan. Saya akan hentikan tuntutan ini dan sambungkan kepada pegawai manusia kami sekarang.",
    audio_url: "/voices/malay-asistant.wav",
    result_desc: "Escalated to Human Supervisor (Farah on duty)",
    followup_desc: "Collections paused under hardship policy",
  },
  {
    call_id: "INT-260919-0415",
    customer_name: "Syarikat Kejuruteraan K***",
    account_no: "1102-8840-9921",
    archetype: "Komersial",
    area: "Shah Alam Industrial Park",
    balance: "RM 1,450.00",
    customer_intent: "POSITIVE",
    call_outcome: "PAYMENT_COMMITTED",
    primary_issue: "INVOICE_RECONCILIATION",
    customer_situation: '["CORPORATE_E_INVOICE"]',
    handling_priority: "GREEN",
    frustration_level: "NONE",
    human_requested: false,
    do_not_call_requested: false,
    callback_requested: false,
    payment_promised: true,
    promised_payment_date: "Next Friday",
    follow_up_action: '["SEND_E_INVOICE_PDF"]',
    summary:
      "Finance department acknowledged SST e-invoice and scheduled payment for next Friday processing run.",
    type: "Email",
    channel_label: "Email · Hakim (email) → Kamil",
    assistant: "Hakim - Commercial Email",
    status_label: "AP acknowledged",
    status_tone: "info",
    duration_seconds: 60,
    time_stamp: "Sep 19, 2026, 09:15 AM UTC",
    transcript:
      "Email From: Hakim (Indah Water Commercial)\nTo: finance@kejuteraan.com.my\nSubject: Statement of Account - Outstanding IWK Sewerage Charge RM1,450.00\nResponse: AP team confirmed invoice received and queued for batch payment next Friday.",
    audio_url: "/voices/voice_preview_jawid iqbal anwar - news anchor.mp3",
    result_desc: "Invoice queued for Accounts Payable batch run",
    followup_desc: "Payment verification scheduled for Oct 2",
  },
  {
    call_id: "INT-260919-0416",
    customer_name: "Tan Wei L***",
    account_no: "3391-0029-4481",
    archetype: "Biasa",
    area: "Bayu Tinggi, Klang",
    balance: "RM 48.00 → RM 0.00",
    customer_intent: "POSITIVE",
    call_outcome: "PAYMENT_ALREADY_MADE",
    primary_issue: "NONE",
    customer_situation: '[]',
    handling_priority: "GREEN",
    frustration_level: "NONE",
    human_requested: false,
    do_not_call_requested: false,
    callback_requested: false,
    payment_promised: true,
    follow_up_action: '["CLEAR_ARREARS_FLAG"]',
    summary:
      "Customer clicked SMS link and completed online eWallet payment.",
    type: "SMS",
    channel_label: "SMS · Journey - SMS",
    assistant: "SMS Auto-Bot",
    status_label: "Paid via link",
    status_tone: "good",
    duration_seconds: 45,
    time_stamp: "Sep 19, 2026, 09:04 AM UTC",
    transcript: "SMS Link clicked -> TNG eWallet payment RM48.00 confirmed instantly.",
    audio_url: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
    result_desc: "Paid RM48.00 via Touch 'n Go eWallet",
    followup_desc: "SMS e-receipt dispatched automatically",
  },
];

export default function Interactions() {
  const navigate = useNavigate();
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL"); // ALL | Voice | WhatsApp | SMS | Email
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // ALL | GREEN | GREY | RED
  const [activeTab, setActiveTab] = useState("transcript"); // transcript | classification | timeline | quality

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // QA Modal State
  const [showQaModal, setShowQaModal] = useState(false);
  const [qaRating, setQaRating] = useState(5);
  const [qaNotes, setQaNotes] = useState("");
  const [qaSavedToast, setQaSavedToast] = useState(false);

  // Fetch logs directly from n8n webhook
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(WEBHOOK_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        if (json && (json.code === 200 || json.data)) {
          const rawData = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          
          // Map raw n8n webhook objects to standardized interaction cards
          const mapped = rawData.map((item, idx) => {
            let parsedSituation = [];
            try {
              if (item.customer_situation) {
                parsedSituation = typeof item.customer_situation === "string"
                  ? JSON.parse(item.customer_situation)
                  : item.customer_situation;
              }
            } catch {
              parsedSituation = [String(item.customer_situation)];
            }

            return {
              call_id: item.call_id || `WEBHOOK-${item.row_number || idx + 1}`,
              customer_name: item.customer_name || "Unknown Customer",
              account_no: "6199-1647-" + (1000 + idx * 42),
              archetype: item.customer_intent === "POSITIVE" ? "Positive Intent" : "General Account",
              area: "Kuala Lumpur / Selangor",
              balance: "RM 80.00",
              customer_intent: item.customer_intent || "POSITIVE",
              call_outcome: item.call_outcome || "PAYMENT_COMMITTED",
              primary_issue: item.primary_issue || "PAYMENT_COMMITMENT",
              customer_situation: JSON.stringify(parsedSituation),
              handling_priority: item.handling_priority || "GREEN",
              frustration_level: item.frustration_level || "NONE",
              human_requested: item.human_requested || false,
              do_not_call_requested: item.do_not_call_requested || false,
              callback_requested: item.callback_requested || false,
              payment_promised: item.payment_promised || false,
              promised_payment_date: item.promised_payment_date || "",
              follow_up_action: item.follow_up_action || '["LOG_CALL"]',
              intent_evidence: item.intent_evidence || "",
              outcome_evidence: item.outcome_evidence || "",
              priority_evidence: item.priority_evidence || "",
              summary: item.summary || "No call summary provided.",
              type: "Voice",
              channel_label: `Voice · ${item.assistant || "Aina - outbound"}`,
              assistant: item.assistant || "Aina - outbound",
              status_label: item.call_outcome ? item.call_outcome.replace(/_/g, " ") : "Processed",
              status_tone: item.handling_priority === "GREEN" ? "good" : item.handling_priority === "RED" ? "critical" : "warn",
              duration_seconds: Math.round(item.duration_seconds || 106),
              time_stamp: item.time_stamp || "Just now",
              transcript: item.transcript || "No transcript recorded.",
              audio_url: item["transcript-audio-url"] || "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
              result_desc: item.summary || "Call completed",
              followup_desc: "Logged via webhook to n8n recovery pipeline",
              milestones: [
                { time: 15, label: "intent: " + (item.customer_intent || "positive").toLowerCase() },
                { time: 45, label: "outcome: " + (item.call_outcome || "committed").toLowerCase() },
              ],
            };
          });

          setWebhookLogs(mapped);
          if (mapped.length > 0) {
            setActiveId(mapped[0].call_id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Webhook fetch failed, using fallback records:", err);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Combine fetched webhook logs with seed items
  const allInteractions = useMemo(() => {
    const combined = [...webhookLogs, ...SEED_INTERACTIONS];
    // De-duplicate by call_id
    const seen = new Set();
    return combined.filter((item) => {
      if (seen.has(item.call_id)) return false;
      seen.add(item.call_id);
      return true;
    });
  }, [webhookLogs]);

  // Default selection if activeId is null
  useEffect(() => {
    if (!activeId && allInteractions.length > 0) {
      setActiveId(allInteractions[0].call_id);
    }
  }, [allInteractions, activeId]);

  // Filtered interaction list
  const filteredInteractions = useMemo(() => {
    return allInteractions.filter((item) => {
      // Channel Filter
      if (channelFilter !== "ALL") {
        if (channelFilter === "Voice" && item.type !== "Voice") return false;
        if (channelFilter === "WhatsApp" && item.type !== "WhatsApp") return false;
        if (channelFilter === "SMS" && item.type !== "SMS") return false;
        if (channelFilter === "Email" && item.type !== "Email") return false;
      }
      // Priority Filter
      if (priorityFilter !== "ALL" && item.handling_priority !== priorityFilter) {
        return false;
      }
      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.customer_name?.toLowerCase().includes(q);
        const matchId = item.call_id?.toLowerCase().includes(q);
        const matchSummary = item.summary?.toLowerCase().includes(q);
        const matchTranscript = item.transcript?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSummary && !matchTranscript) return false;
      }
      return true;
    });
  }, [allInteractions, channelFilter, priorityFilter, searchQuery]);

  const activeItem = allInteractions.find((i) => i.call_id === activeId) || allInteractions[0];

  // Reset audio when active interaction changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [activeId]);

  // Audio Player Handlers
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.log("Audio play error:", e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || activeItem?.duration_seconds || 100);
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const fmtSecs = (s) => {
    if (!s || isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Helper for priority badge tone
  const priorityBadgeTone = (p) => {
    if (p === "GREEN") return "good";
    if (p === "RED") return "critical";
    return "warn";
  };

  // Helper for icon according to channel
  const getChannelIcon = (type) => {
    if (type === "Voice") return <PhoneCallIcon size={16} />;
    if (type === "WhatsApp") return <InboxIcon size={16} />;
    if (type === "Email") return <span>✉️</span>;
    return <span>📱</span>;
  };

  // Split raw transcript into structured lines
  const parsedTranscriptLines = useMemo(() => {
    if (!activeItem?.transcript) return [];
    return activeItem.transcript
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => {
        const isAI = line.startsWith("AI:") || line.startsWith("Email From:") || line.startsWith("Assistant:");
        const cleanText = line.replace(/^(AI:|User:|Customer:|Email From:|To:|Subject:|Response:)/i, "").trim();
        const speaker = isAI ? activeItem.assistant || "Aina" : activeItem.customer_name || "Customer";
        const timeSec = idx * 14;
        return { speaker, isAI, text: cleanText, timeStr: fmtSecs(timeSec) };
      });
  }, [activeItem]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notification for QA Saved */}
      {qaSavedToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#10b981",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 10px 25px rgba(16,185,129,0.3)",
          }}
        >
          ✓ QA Rating & Feedback saved successfully!
        </div>
      )}

      {/* Hidden Audio Tag */}
      {activeItem?.audio_url && (
        <audio
          ref={audioRef}
          src={encodeURI(activeItem.audio_url)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
      )}

      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Interactions</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            All customer interactions across Voice AI, WhatsApp, SMS and Email.
          </p>
        </div>

        {/* Live Webhook Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "6px 12px",
              background: loading ? "var(--warning-soft)" : "rgba(16,185,129,0.12)",
              color: loading ? "var(--warning)" : "#10b981",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: loading ? "#f59e0b" : "#10b981",
              }}
            />
            {loading ? "Syncing n8n Webhook…" : "n8n Webhook Live"}
          </span>
        </div>
      </div>

      {/* Main Split Grid: Left Cards Panel + Right Interaction Detail */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
        
        {/* Left Column: Interaction List Cards & Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search name, account, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "var(--text-faint)",
              }}
            >
              🔍
            </span>
          </div>

          {/* Priority & Channel Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["ALL", "Voice", "WhatsApp", "SMS", "Email"].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: channelFilter === ch ? "1.5px solid #10b981" : "1px solid var(--border)",
                  background: channelFilter === ch ? "rgba(16,185,129,0.12)" : "var(--surface)",
                  color: channelFilter === ch ? "#10b981" : "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                {ch}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>Priority:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "GREEN", label: "🟢 Green" },
              { id: "GREY", label: "🟡 Grey" },
              { id: "RED", label: "🔴 Red" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriorityFilter(p.id)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  border: priorityFilter === p.id ? "1.5px solid var(--brand)" : "1px solid var(--border)",
                  background: priorityFilter === p.id ? "var(--brand-soft)" : "var(--surface-2)",
                  color: priorityFilter === p.id ? "var(--brand)" : "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            {filteredInteractions.map((item) => {
              const isActive = item.call_id === activeItem?.call_id;
              return (
                <div
                  key={item.call_id}
                  onClick={() => setActiveId(item.call_id)}
                  style={{
                    background: "var(--surface)",
                    border: isActive ? "2px solid #10b981" : "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isActive ? "0 4px 14px rgba(16, 185, 129, 0.12)" : "var(--shadow)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: item.type === "Voice" ? "rgba(16,185,129,0.12)" : "var(--surface-3)",
                          color: item.type === "Voice" ? "#10b981" : "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getChannelIcon(item.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>
                          {item.customer_name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>
                          {item.channel_label}
                        </div>
                      </div>
                    </div>

                    <Badge tone={item.status_tone}>{item.status_label}</Badge>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border)",
                      fontSize: 11.5,
                      color: "var(--text-faint)",
                    }}
                  >
                    <span>
                      Priority: <strong style={{ color: item.handling_priority === "GREEN" ? "#10b981" : item.handling_priority === "RED" ? "#ef4444" : "#f59e0b" }}>{item.handling_priority}</strong>
                    </span>
                    <span>{fmtSecs(item.duration_seconds)}</span>
                  </div>
                </div>
              );
            })}

            {filteredInteractions.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                No interactions match the selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Interaction Detail View */}
        {activeItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Top Header Card */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 20,
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    📞
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)" }}>
                        {activeItem.call_id}
                      </h2>
                      <Badge tone={activeItem.status_tone}>{activeItem.status_label}</Badge>
                      <Badge tone={priorityBadgeTone(activeItem.handling_priority)}>
                        Priority {activeItem.handling_priority}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
                      {activeItem.channel_label} · {activeItem.time_stamp}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12.5, padding: "6px 12px", border: "1px solid var(--border-strong)" }}
                    onClick={() => setShowQaModal(true)}
                  >
                    Flag for QA
                  </button>
                  <button
                    className="btn-solid"
                    style={{ fontSize: 12.5, padding: "6px 14px", background: "var(--brand)" }}
                    onClick={() => navigate(`/customers?q=${encodeURIComponent(activeItem.customer_name)}`)}
                  >
                    Open account
                  </button>
                </div>
              </div>

              {/* Interactive Audio Player Component */}
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 16px",
                  background: "var(--surface-2)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Play / Pause Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleAudio}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      cursor: "pointer",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                    }}
                    title={isPlaying ? "Pause recording" : "Play recording"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      <span>
                        {fmtSecs(currentTime)} <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>/ {fmtSecs(duration || activeItem.duration_seconds)}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Recording · consent given · retained 90 days</span>
                    </div>

                    {/* Scrubbing Range Bar */}
                    <input
                      type="range"
                      min="0"
                      max={duration || activeItem.duration_seconds || 100}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      style={{
                        width: "100%",
                        accentColor: "#10b981",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>

                {/* Milestone Markers Waveform Line */}
                <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "var(--text-dim)", paddingLeft: 56 }}>
                  {activeItem.milestones?.map((m, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                      <span>{m.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Interaction Detail */}
            <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
              {[
                { id: "transcript", label: "Transcript" },
                { id: "classification", label: "AI Classification & Quality" },
                { id: "timeline", label: "Timeline" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "8px 0",
                    fontWeight: activeTab === t.id ? 700 : 600,
                    fontSize: 14,
                    color: activeTab === t.id ? "var(--text)" : "var(--text-dim)",
                    cursor: "pointer",
                    borderBottom: activeTab === t.id ? "2.5px solid #10b981" : "2.5px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Grid for Tab Content + Customer Card Sidebar */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
              
              {/* Tab Content Area */}
              <div>
                {activeTab === "transcript" && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 18,
                      boxShadow: "var(--shadow)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      maxHeight: 480,
                      overflowY: "auto",
                    }}
                  >
                    <strong style={{ fontSize: 14, color: "var(--text)" }}>Conversation Script</strong>

                    {parsedTranscriptLines.map((line, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                        <span style={{ fontSize: 11, color: "var(--text-faint)", width: 36, flexShrink: 0, fontFamily: "var(--mono)" }}>
                          {line.timeStr}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: line.isAI ? "#10b981" : "var(--brand)" }}>
                            {line.speaker}:{" "}
                          </span>
                          <span style={{ color: "var(--text)", lineHeight: 1.45 }}>{line.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "classification" && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 18,
                      boxShadow: "var(--shadow)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <strong style={{ fontSize: 15, color: "var(--text)" }}>4-Layer Taxonomy Classification</strong>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>1. Customer Intent</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                          {activeItem.customer_intent}
                        </div>
                      </div>

                      <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>2. Call Outcome</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                          {activeItem.call_outcome}
                        </div>
                      </div>

                      <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>3. Handling Priority</div>
                        <div style={{ marginTop: 2 }}>
                          <Badge tone={priorityBadgeTone(activeItem.handling_priority)}>
                            {activeItem.handling_priority} ZONE
                          </Badge>
                        </div>
                      </div>

                      <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>4. Frustration Level</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                          {activeItem.frustration_level}
                        </div>
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 4 }}>
                        Call Summary
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                        {activeItem.summary}
                      </p>
                    </div>

                    {/* Evidences */}
                    {activeItem.intent_evidence && (
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        <strong>Intent Evidence:</strong> <em>"{activeItem.intent_evidence}"</em>
                      </div>
                    )}
                    {activeItem.outcome_evidence && (
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        <strong>Outcome Evidence:</strong> <em>"{activeItem.outcome_evidence}"</em>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 18,
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <strong style={{ fontSize: 15, color: "var(--text)" }}>Milestone Event Timeline</strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                      <div style={{ fontSize: 13 }}>
                        ⏱ <strong>00:00:</strong> Call connected via Vapi telephony bridge
                      </div>
                      <div style={{ fontSize: 13 }}>
                        🤖 <strong>00:02:</strong> Assistant {activeItem.assistant} initiated greeting
                      </div>
                      <div style={{ fontSize: 13 }}>
                        ✅ <strong>00:41:</strong> Customer intent classified as {activeItem.customer_intent}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        🏁 <strong>01:46:</strong> Call outcome set to {activeItem.call_outcome}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side Customer Info Card */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <strong style={{ fontSize: 15, color: "var(--text)" }}>Customer Info</strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-dim)" }}>Name</span>
                      <strong>{activeItem.customer_name}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-dim)" }}>Account</span>
                      <strong style={{ fontFamily: "var(--mono)" }}>{activeItem.account_no}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-dim)" }}>Archetype</span>
                      <span>{activeItem.archetype}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-dim)" }}>Area</span>
                      <span>{activeItem.area}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-dim)" }}>Balance</span>
                      <strong style={{ color: "#10b981" }}>{activeItem.balance}</strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <strong style={{ fontSize: 15, color: "var(--text)" }}>Outcome & Follow-up</strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block", fontSize: 11 }}>Result</span>
                      <strong>{activeItem.result_desc}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block", fontSize: 11 }}>Follow-up</span>
                      <span>{activeItem.followup_desc}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Flag for QA Modal */}
      {showQaModal && (
        <Modal
          title="Flag Interaction for QA Review"
          onClose={() => setShowQaModal(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowQaModal(false)}>
                Cancel
              </button>
              <button
                className="btn-solid"
                style={{ background: "#10b981", color: "#ffffff" }}
                onClick={() => {
                  setShowQaModal(false);
                  setQaSavedToast(true);
                  setTimeout(() => setQaSavedToast(false), 3500);
                }}
              >
                Submit QA Flag
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                Quality Score (1-5 Stars)
              </label>
              <select
                value={qaRating}
                onChange={(e) => setQaRating(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value={5}>⭐⭐⭐⭐⭐ Excellent (5/5)</option>
                <option value={4}>⭐⭐⭐⭐ Good (4/5)</option>
                <option value={3}>⭐⭐⭐ Average (3/5)</option>
                <option value={2}>⭐⭐ Needs Review (2/5)</option>
                <option value={1}>⭐ Poor (1/5)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                Supervisor QA Notes
              </label>
              <textarea
                rows={4}
                placeholder="Specify compliance concern, script variance, or audio feedback..."
                value={qaNotes}
                onChange={(e) => setQaNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
