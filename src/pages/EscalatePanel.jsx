import { useState, useEffect, useMemo, useRef } from "react";
import { Badge, Modal } from "../components/ui.jsx";
import { RefreshIcon } from "../components/icons.jsx";
import config from "../../config.js";

const WEBHOOK_URL = config.n8nWebhookUrl || "https://praeco.app.n8n.cloud/webhook/fetch-logs";

const ALL_OUTCOMES = [
  "ALL",
  "PTP_AGREED",
  "PTP_DISPUTED",
  "REFUSED_PAYMENT",
  "DISPUTING_BILL",
  "FINANCIAL_HARDSHIP",
  "PROMISE_TO_PAY",
  "NEEDS_INSTALMENTS",
  "UNREACHABLE",
  "CALLBACK_REQUESTED",
  "VOICEMAIL",
  "WRONG_NUMBER",
  "ALREADY_PAID",
  "THIRD_PARTY_ANSWERED",
  "LANGUAGE_BARRIER",
  "BUSY_NO_ANSWER",
  "CALL_DROPPED",
];

const ALL_SITUATIONS = [
  "ALL",
  "FINANCIAL_HARDSHIP",
  "JOB_LOSS_UNEMPLOYMENT",
  "MEDICAL_EMERGENCY",
  "BUSINESS_FAILURE",
  "PENDING_INSURANCE_CLAIM",
  "FAMILY_BREADWINNER_PASSED",
  "BILLING_DISPUTE_DISCREPANCY",
  "ACCOUNT_DISPUTE_PREVIOUS_OWNER",
  "UNREACHABLE_NO_ANSWER",
  "WRONG_NUMBER_NOT_OCCUPANT",
];

// Audio Scrubber Component
function AudioPlayerBar({ row, getPresignedAudioUrl }) {
  const [audioUrl, setAudioUrl] = useState(row["transcript-audio-url"] || "");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (row.call_id) {
      setLoadingAudio(true);
      getPresignedAudioUrl(row).then((url) => {
        if (active && url) {
          setAudioUrl(url);
          setLoadingAudio(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [row.call_id]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeName = (row.customer_name || "escalated_call").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
      a.download = `recording_${safeName}_${(row.call_id || "escalate").substring(0, 8)}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      window.open(audioUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--surface-2)",
        padding: "6px 12px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        maxWidth: 320,
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        preload="metadata"
      />
      <button
        type="button"
        className="btn-solid"
        onClick={togglePlay}
        disabled={loadingAudio || !audioUrl}
        style={{
          padding: "4px 10px",
          fontSize: 11.5,
          fontWeight: 700,
          borderRadius: 6,
          background: playing ? "#ef4444" : "#10b981",
          color: "#fff",
          border: "none",
          cursor: loadingAudio || !audioUrl ? "not-allowed" : "pointer",
          minWidth: 54,
        }}
      >
        {loadingAudio ? "⏳" : playing ? "⏸ Pause" : "▶ Play"}
      </button>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          disabled={!audioUrl}
          style={{ width: "100%", height: 4, cursor: "pointer", accentColor: "#ef4444" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)" }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-ghost"
        onClick={handleDownload}
        disabled={downloading || !audioUrl}
        title="Download Wav Recording"
        style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}
      >
        {downloading ? "⏳" : "⬇ Wav"}
      </button>
    </div>
  );
}

function formatTimestamp(row) {
  const ts = row.call_timestamp || row.created_at || row.date || row.time_stamp;
  if (!ts) return "Recently";
  const dateObj = new Date(ts);
  if (isNaN(dateObj.getTime())) return String(ts);
  return dateObj.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function EscalatePanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Filters State
  const [intentFilter, setIntentFilter] = useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [situationFilter, setSituationFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Action Modal State
  const [actionLog, setActionLog] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("Hakim AI agent (Legal & Severe Collections)");
  const [selectedTeam, setSelectedTeam] = useState("Legal & Recovery Desk");

  // DND Modal State
  const [dndType, setDndType] = useState("permanent");
  const [dndReason, setDndReason] = useState("Severe Refusal / Legal Escalation Pending");

  // Automation Workflows for Escalations
  const [workflows, setWorkflows] = useState({
    legalPreNotice: false,
    blockCallsDnd: false,
    disconnectionNotice: false,
    urgentSupervisorCallback: false,
  });
  const [customChannel, setCustomChannel] = useState("sms");
  const [customMessage, setCustomMessage] = useState("");

  // Independent Action States
  const [isRunningAiAgent, setIsRunningAiAgent] = useState(false);
  const [isMovingTeam, setIsMovingTeam] = useState(false);
  const [isRunningWorkflows, setIsRunningWorkflows] = useState(false);
  const [isApplyingDnd, setIsApplyingDnd] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Audio signed URL state
  const [presignedUrls, setPresignedUrls] = useState({});
  const [expandedSummary, setExpandedSummary] = useState(null);
  const [audioModalRow, setAudioModalRow] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    fetch(WEBHOOK_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        let rawData = [];
        if (Array.isArray(json)) {
          if (json[0] && Array.isArray(json[0].data)) {
            rawData = json[0].data;
          } else if (json[0] && json[0].body && Array.isArray(json[0].body.data)) {
            rawData = json[0].body.data;
          } else {
            rawData = json;
          }
        } else if (json && Array.isArray(json.data)) {
          rawData = json.data;
        } else if (json && json.data && Array.isArray(json.data)) {
          rawData = json.data;
        }

        // Filter ONLY records where handling priority is RED / CRITICAL / HIGH or Negative Intent or High Frustration
        const redRecords = rawData.filter((row) => {
          const hp = String(row.handling_priority || "").toUpperCase();
          const intent = String(row.customer_intent || "").toUpperCase();
          const frustration = String(row.frustration_level || row.frustration || "").toUpperCase();
          return (
            hp === "RED" ||
            hp === "CRITICAL" ||
            hp === "HIGH" ||
            intent === "NEGATIVE" ||
            frustration === "HIGH" ||
            frustration === "SEVERE"
          );
        });
        setLogs(redRecords);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Escalate Panel fetch error:", err);
        setError("Failed to load Red Zone escalation logs.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getPresignedAudioUrl = async (row) => {
    if (presignedUrls[row.call_id]) return presignedUrls[row.call_id];
    const vapiSecretKey = config?.vapi?.secretKey;
    if (vapiSecretKey && row.call_id) {
      try {
        const res = await fetch(`https://api.vapi.ai/call/${row.call_id}`, {
          headers: { Authorization: `Bearer ${vapiSecretKey}` },
        });
        if (res.ok) {
          const callData = await res.json();
          const signedUrl =
            callData.artifact?.presignedMonoUrl ||
            callData.artifact?.presignedStereoUrl ||
            callData.recordingUrl;
          if (signedUrl) {
            setPresignedUrls((prev) => ({ ...prev, [row.call_id]: signedUrl }));
            return signedUrl;
          }
        }
      } catch (err) {
        console.warn("Signed URL fetch failed:", err);
      }
    }
    return row["transcript-audio-url"];
  };

  // Direct Quick Action Handlers
  const handleQuickDND = (row) => {
    setToast(`🚫 Lead ${row.customer_name || row.call_id.substring(0, 8)} added directly to DND list!`);
    setTimeout(() => setToast(null), 4000);
  };

  const handleQuickCall = (row) => {
    setToast(`📞 Direct call dispatched to ${row.customer_name || "customer"} (${row.customer_phone || row.call_id.substring(0, 8)})!`);
    setTimeout(() => setToast(null), 4000);
  };

  // Open Take Action Modal
  const openActionModal = (row) => {
    setActionLog(row);
    setSelectedAgent("Hakim AI agent (Legal & Severe Collections)");
    setSelectedTeam("Legal & Recovery Desk");
    setDndType("permanent");
    setDndReason("Customer Refused Payment / Dispute Escalation Pending");
    setWorkflows({
      legalPreNotice: false,
      blockCallsDnd: false,
      disconnectionNotice: false,
      urgentSupervisorCallback: false,
    });
    setCustomMessage(
      `PERINGATAN MESRA IWK: Akaun anda (${row.call_id.substring(0, 8)}) telah dimajukan ke Unit Tindakan Khas berikutan tunggakan belum dijelaskan. Sila jelaskan bayaran tunggakan atau hubungi kami di talian khas 03-20803888.`
    );
  };

  // Dedicated Handler: Run AI Agent Direct Call
  const handleRunAiAgent = () => {
    setIsRunningAiAgent(true);
    setTimeout(() => {
      setIsRunningAiAgent(false);
      setToast(`✓ High-Priority Call dispatched to ${selectedAgent} for ${actionLog?.customer_name || "customer"}!`);
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Move to Escalation Team
  const handleMoveToTeam = () => {
    setIsMovingTeam(true);
    setTimeout(() => {
      setIsMovingTeam(false);
      setToast(`✓ Case escalated to ${selectedTeam} for ${actionLog?.customer_name || "customer"}!`);
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Run Escalation Workflows
  const handleRunWorkflows = () => {
    const selectedList = Object.entries(workflows)
      .filter(([_, active]) => active)
      .map(([key]) => key);

    if (selectedList.length === 0) {
      alert("Please select at least one escalation workflow checkbox to run.");
      return;
    }

    setIsRunningWorkflows(true);
    setTimeout(() => {
      setIsRunningWorkflows(false);
      setToast(`✓ ${selectedList.length} escalation workflow(s) executed for ${actionLog?.customer_name || "customer"}!`);
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Apply DND Registry
  const handleApplyDnd = () => {
    setIsApplyingDnd(true);
    setTimeout(() => {
      setIsApplyingDnd(false);
      setToast(`🚫 Lead ${actionLog?.customer_name || "customer"} registered under ${dndType.toUpperCase()} DND!`);
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Standalone Custom Notice Send
  const handleSendMessage = () => {
    if (!customMessage.trim()) return;
    setIsSendingMessage(true);
    setTimeout(() => {
      setIsSendingMessage(false);
      setToast(`✓ Escalation Notice sent via ${customChannel.toUpperCase()} to ${actionLog?.customer_name || "customer"}!`);
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  const formatSituationText = (rawSit) => {
    if (!rawSit) return "REFUSED PAYMENT";
    let text = "";
    if (Array.isArray(rawSit)) {
      text = rawSit.length > 0 ? rawSit.join(", ") : "REFUSED PAYMENT";
    } else {
      const str = String(rawSit).trim();
      if (str === "[]" || str === "" || str === "null") text = "REFUSED PAYMENT";
      else {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) text = parsed.length > 0 ? parsed.join(", ") : "REFUSED PAYMENT";
          else text = str;
        } catch {
          text = str;
        }
      }
    }
    return text.replace(/_/g, " ");
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((row) => {
      // Intent Filter
      if (intentFilter !== "ALL" && row.customer_intent !== intentFilter) {
        return false;
      }
      // Outcome Filter
      if (outcomeFilter !== "ALL" && row.call_outcome !== outcomeFilter) {
        return false;
      }
      // Situation Filter
      if (situationFilter !== "ALL") {
        const sitStr = formatSituationText(row.customer_situation);
        if (!sitStr.includes(situationFilter)) return false;
      }

      // Date Filter Preset & Custom Range
      if (datePreset !== "ALL" || startDate || endDate) {
        const rowDateStr = row.call_timestamp || row.created_at || row.date;
        if (rowDateStr) {
          const rowMs = new Date(rowDateStr).getTime();
          if (!isNaN(rowMs)) {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const yesterdayStart = todayStart - 86400000;
            const last7DaysStart = todayStart - 6 * 86400000;
            const last30DaysStart = todayStart - 29 * 86400000;

            if (datePreset === "TODAY" && rowMs < todayStart) return false;
            if (datePreset === "YESTERDAY" && (rowMs < yesterdayStart || rowMs >= todayStart)) return false;
            if (datePreset === "LAST_7" && rowMs < last7DaysStart) return false;
            if (datePreset === "LAST_30" && rowMs < last30DaysStart) return false;

            if (startDate) {
              const startMs = new Date(startDate).getTime();
              if (!isNaN(startMs) && rowMs < startMs) return false;
            }
            if (endDate) {
              const endMs = new Date(endDate).getTime() + 86400000 - 1;
              if (!isNaN(endMs) && rowMs > endMs) return false;
            }
          }
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = row.customer_name?.toLowerCase().includes(q);
        const matchId = row.call_id?.toLowerCase().includes(q);
        const matchOutcome = row.call_outcome?.toLowerCase().includes(q);
        const matchSummary = row.summary?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchOutcome && !matchSummary) return false;
      }
      return true;
    });
  }, [logs, intentFilter, outcomeFilter, situationFilter, datePreset, startDate, endDate, search]);

  const intentTone = (i) => {
    if (i === "POSITIVE") return "good";
    if (i === "NEGATIVE") return "critical";
    if (i === "CONDITIONAL") return "warn";
    return "info";
  };

  const frustrationTone = (f) => {
    const upper = String(f || "").toUpperCase();
    if (upper === "HIGH" || upper === "SEVERE") return "critical";
    if (upper === "MODERATE") return "warn";
    if (upper === "LOW") return "info";
    return "neutral";
  };

  const getFrustrationVal = (row) => {
    if (!row) return "NONE";
    if (row.frustration_level) return String(row.frustration_level).toUpperCase();
    if (row.frustration) return String(row.frustration).toUpperCase();
    if (String(row.handling_priority).toUpperCase() === "RED" || String(row.customer_intent).toUpperCase() === "NEGATIVE") return "HIGH";
    return "NONE";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Escalate Panel</h1>
            <Badge tone="critical" style={{ fontSize: 12, padding: "3px 10px" }}>
              🔴 Red Zone Escalations Only
            </Badge>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Manage severe refusals, legal notices, DND compliance, and urgent supervisor escalation routing.
          </p>
        </div>

        <button
          className="btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
          onClick={fetchLogs}
        >
          <RefreshIcon size={15} /> Refresh Red Zone Cases
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}

      {/* Filter and Search Bar Options */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <input
            type="text"
            placeholder="Search customer, call ID, outcome, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-faint)" }}>
            🔍
          </span>
        </div>

        {/* Customer Intent Filter */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Customer Intent
          </label>
          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
            }}
          >
            <option value="ALL">All Intents</option>
            <option value="POSITIVE">POSITIVE (Green)</option>
            <option value="NEGATIVE">NEGATIVE (Red)</option>
            <option value="CONDITIONAL">CONDITIONAL (Amber)</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>

        {/* Call Outcome Filter */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Call Outcome
          </label>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
              maxWidth: 190,
            }}
          >
            {ALL_OUTCOMES.map((oc) => (
              <option key={oc} value={oc}>
                {oc === "ALL" ? "All Outcomes" : oc.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Situation Filter */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Situation
          </label>
          <select
            value={situationFilter}
            onChange={(e) => setSituationFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
              maxWidth: 190,
            }}
          >
            {ALL_SITUATIONS.map((sit) => (
              <option key={sit} value={sit}>
                {sit === "ALL" ? "All Situations" : sit.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Date Wise Filter Preset */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Date Filter
          </label>
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              if (e.target.value !== "CUSTOM") {
                setStartDate("");
                setEndDate("");
              }
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
            }}
          >
            <option value="ALL">📅 All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7">Last 7 Days</option>
            <option value="LAST_30">Last 30 Days</option>
          </select>
        </div>

        {/* Start Date Picker */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDatePreset("ALL");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12,
            }}
          />
        </div>

        {/* End Date Picker */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDatePreset("ALL");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12,
            }}
          />
        </div>
      </div>

      {/* Escalation Table View */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
            Loading Red Zone escalation logs…
          </div>
        )}

        {error && (
          <div style={{ padding: 20, color: "#ef4444", fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
            No Red Zone escalation records match the selected filters.
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Call ID &amp; Timestamp</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Priority &amp; Intent</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Frustration Level</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Outcome</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Hardship / Situation</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, minWidth: 320, maxWidth: 450 }}>Evidence / Summary</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Audio Recording</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((row, idx) => {
                  const situationStr = formatSituationText(row.customer_situation);
                  const frustVal = getFrustrationVal(row);
                  const isExpanded = expandedSummary === (row.call_id || idx);
                  return (
                    <tr
                      key={row.call_id || idx}
                      onClick={() => openActionModal(row)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                        cursor: "pointer",
                      }}
                    >
                      {/* Call ID & Timestamp */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 12.5, fontFamily: "var(--mono)" }}>
                          {(row.call_id || "ID-UNKNOWN").substring(0, 14)}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 3 }}>
                          📅 {formatTimestamp(row)}
                        </div>
                      </td>

                      {/* Handling Priority & Intent */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <Badge tone="critical" style={{ fontSize: 11, fontWeight: 800 }}>
                            🔴 {row.handling_priority || "RED"}
                          </Badge>
                          <Badge tone={intentTone(row.customer_intent)} style={{ fontSize: 11 }}>
                            {row.customer_intent || "UNKNOWN"}
                          </Badge>
                        </div>
                      </td>

                      {/* Frustration Level Column */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <Badge tone={frustrationTone(frustVal)} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px" }}>
                          {frustVal === "HIGH" || frustVal === "SEVERE"
                            ? "🔥 " + frustVal
                            : frustVal === "MODERATE"
                            ? "🟡 " + frustVal
                            : frustVal === "LOW"
                            ? "🔵 " + frustVal
                            : "⚪ " + frustVal}
                        </Badge>
                      </td>

                      {/* Outcome */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 12 }}>
                          {row.call_outcome || "REFUSED_PAYMENT"}
                        </div>
                      </td>

                      {/* Situation */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top", maxWidth: 160, wordBreak: "break-word", whiteSpace: "normal" }}>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, wordBreak: "break-word", lineHeight: 1.35 }}>
                          {situationStr}
                        </div>
                      </td>

                      {/* Evidence / Summary (Max 3 lines, click to expand) */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top", minWidth: 320, maxWidth: 450 }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSummary(isExpanded ? null : (row.call_id || idx));
                          }}
                          title="Click to view full text"
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-dim)",
                            lineHeight: 1.45,
                            cursor: "pointer",
                            display: "-webkit-box",
                            WebkitLineClamp: isExpanded ? "none" : 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            background: "var(--surface-2)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                          }}
                        >
                          "{row.summary || "No call summary provided."}"
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSummary(isExpanded ? null : (row.call_id || idx));
                          }}
                          style={{
                            fontSize: 10.5,
                            color: "#3b82f6",
                            fontWeight: 700,
                            cursor: "pointer",
                            marginTop: 4,
                            display: "inline-block",
                          }}
                        >
                          {isExpanded ? "▲ Collapse text" : "▼ Read full text"}
                        </span>
                      </td>

                      {/* Audio Recording Play Button */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAudioModalRow(row);
                          }}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.35)",
                            background: "rgba(16,185,129,0.08)",
                            borderRadius: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ▶ Play Audio
                        </button>
                      </td>

                      {/* Actions Column (Horizontal Alignment) */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexDirection: "row", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickDND(row);
                            }}
                            title="Directly add lead to DND"
                            style={{
                              padding: "5px 10px",
                              fontSize: 11.5,
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.3)",
                              borderRadius: 6,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            🚫 DND
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickCall(row);
                            }}
                            title="Direct call customer"
                            style={{
                              padding: "5px 10px",
                              fontSize: 11.5,
                              color: "#10b981",
                              border: "1px solid rgba(16,185,129,0.3)",
                              borderRadius: 6,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            📞 Call
                          </button>
                          <button
                            type="button"
                            className="btn-solid"
                            onClick={(e) => {
                              e.stopPropagation();
                              openActionModal(row);
                            }}
                            style={{
                              padding: "5px 12px",
                              fontSize: 11.5,
                              borderRadius: 6,
                              background: "#ef4444",
                              color: "#fff",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ⚡ Action
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audio Player Modal Window */}
      {audioModalRow && (
        <Modal
          title={`Audio Recording — ${audioModalRow.customer_name || "Customer Call"}`}
          onClose={() => setAudioModalRow(null)}
        >
          <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Call ID: <strong className="mono">{audioModalRow.call_id}</strong>
            </div>
            <AudioPlayerBar row={audioModalRow} getPresignedAudioUrl={getPresignedAudioUrl} />
          </div>
        </Modal>
      )}

      {/* Escalation Take Action Modal Window */}
      {actionLog && (
        <Modal
          title={`Escalation Action Panel — ${actionLog.customer_name || "Customer"}`}
          onClose={() => setActionLog(null)}
          wide
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Case Snapshot Bar */}
            <div
              style={{
                background: "var(--surface-2)",
                padding: 12,
                borderRadius: 10,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "var(--text-dim)" }}>Call ID</span>
                <div style={{ fontWeight: 700 }} className="mono">
                  {actionLog.call_id ? actionLog.call_id.substring(0, 12) : "N/A"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Intent</span>
                <div>
                  <Badge tone={intentTone(actionLog.customer_intent)}>
                    {actionLog.customer_intent}
                  </Badge>
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Frustration</span>
                <div>
                  <Badge tone={frustrationTone(getFrustrationVal(actionLog))}>
                    {getFrustrationVal(actionLog)}
                  </Badge>
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Outcome</span>
                <div style={{ fontWeight: 700, color: "#ef4444" }}>{actionLog.call_outcome}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Situation</span>
                <div style={{ fontWeight: 700 }}>{formatSituationText(actionLog.customer_situation)}</div>
              </div>
            </div>

            {/* Recording Audio Scrubber inside Action Modal */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                Listen to Escalation Audio Recording
              </label>
              <AudioPlayerBar row={actionLog} getPresignedAudioUrl={getPresignedAudioUrl} />
            </div>

            {/* Option 1: Direct Call / Move to AI Agent Card */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                📞 Direct Call / Run AI Agent Call
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              >
                <option value="Hakim AI agent (Legal & Severe Collections)">Hakim AI agent (Legal &amp; Severe Collections)</option>
                <option value="Aina AI agent (Mandatory Dispute Escalation)">Aina AI agent (Mandatory Dispute Escalation)</option>
                <option value="Mei Ling AI agent (Mandarin Senior Voice Assistant)">Mei Ling AI agent (Mandarin Senior Voice Assistant)</option>
              </select>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", marginTop: 4 }}>
                Directly dial or dispatch dedicated voice AI to handle high-friction call.
              </span>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isRunningAiAgent}
                  onClick={handleRunAiAgent}
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: isRunningAiAgent ? "wait" : "pointer",
                    opacity: isRunningAiAgent ? 0.7 : 1,
                  }}
                >
                  {isRunningAiAgent ? "⏳ Running..." : "▶ Run"}
                </button>
              </div>
            </div>

            {/* Option 2: Move to Escalation Team Card */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                👥 Move to Escalation Team
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              >
                <option value="Legal & Recovery Desk">Legal &amp; Recovery Desk</option>
                <option value="Supervisor Escalations Desk">Supervisor Escalations Desk</option>
                <option value="Field Audit & Enforcement Team">Field Audit &amp; Enforcement Team</option>
                <option value="Hardship & Financial Assistance Desk">Hardship &amp; Financial Assistance Desk</option>
              </select>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isMovingTeam}
                  onClick={handleMoveToTeam}
                  style={{
                    background: "#3b82f6",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: isMovingTeam ? "wait" : "pointer",
                    opacity: isMovingTeam ? 0.7 : 1,
                  }}
                >
                  {isMovingTeam ? "⏳ Moving..." : "↪ Move"}
                </button>
              </div>
            </div>

            {/* Option 3: Trigger High-Priority Workflows Card */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 }}>
                ⚡ Trigger High-Priority Workflows
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.legalPreNotice}
                    onChange={(e) => setWorkflows({ ...workflows, legalPreNotice: e.target.checked })}
                  />
                  <span>Send Legal Pre-Notice SMS</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.blockCallsDnd}
                    onChange={(e) => setWorkflows({ ...workflows, blockCallsDnd: e.target.checked })}
                  />
                  <span>Block Outbound Calls (DND)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.disconnectionNotice}
                    onChange={(e) => setWorkflows({ ...workflows, disconnectionNotice: e.target.checked })}
                  />
                  <span>Issue Disconnection Warning</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.urgentSupervisorCallback}
                    onChange={(e) => setWorkflows({ ...workflows, urgentSupervisorCallback: e.target.checked })}
                  />
                  <span>Schedule Urgent Supervisor Callback</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isRunningWorkflows}
                  onClick={handleRunWorkflows}
                  style={{
                    background: "#f59e0b",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: isRunningWorkflows ? "wait" : "pointer",
                    opacity: isRunningWorkflows ? 0.7 : 1,
                  }}
                >
                  {isRunningWorkflows ? "⏳ Running..." : "⚡ Run"}
                </button>
              </div>
            </div>

            {/* Option 4: Do Not Disturb (DND) Direct Registry */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 }}>
                🚫 Do Not Disturb (DND) Management
              </label>

              <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="dndType"
                    value="permanent"
                    checked={dndType === "permanent"}
                    onChange={(e) => setDndType(e.target.value)}
                  />
                  <span>Permanent DND</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="dndType"
                    value="temporary"
                    checked={dndType === "temporary"}
                    onChange={(e) => setDndType(e.target.value)}
                  />
                  <span>Temporary DND (30 Days)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="dndType"
                    value="opt-out"
                    checked={dndType === "opt-out"}
                    onChange={(e) => setDndType(e.target.value)}
                  />
                  <span>Opt-Out Request</span>
                </label>
              </div>

              <input
                type="text"
                value={dndReason}
                onChange={(e) => setDndReason(e.target.value)}
                placeholder="Reason for adding to DND list..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 12.5,
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isApplyingDnd}
                  onClick={handleApplyDnd}
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: isApplyingDnd ? "wait" : "pointer",
                    opacity: isApplyingDnd ? 0.7 : 1,
                  }}
                >
                  {isApplyingDnd ? "⏳ Registering..." : "🚫 Add to DND"}
                </button>
              </div>
            </div>

            {/* Option 5: Send Escalation Notice Message */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 }}>
                💬 Send Escalation Notice Message
              </label>

              <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="channel"
                    value="sms"
                    checked={customChannel === "sms"}
                    onChange={(e) => setCustomChannel(e.target.value)}
                  />
                  <span>SMS</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={customChannel === "email"}
                    onChange={(e) => setCustomChannel(e.target.value)}
                  />
                  <span>Email</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="channel"
                    value="whatsapp"
                    checked={customChannel === "whatsapp"}
                    onChange={(e) => setCustomChannel(e.target.value)}
                  />
                  <span>WhatsApp</span>
                </label>
              </div>

              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter escalation notice body..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 12.5,
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isSendingMessage || !customMessage.trim()}
                  onClick={handleSendMessage}
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: isSendingMessage || !customMessage.trim() ? "not-allowed" : "pointer",
                    opacity: isSendingMessage || !customMessage.trim() ? 0.7 : 1,
                  }}
                >
                  {isSendingMessage
                    ? "⏳ Sending..."
                    : `📤 Send ${customChannel.toUpperCase()} Notice`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
