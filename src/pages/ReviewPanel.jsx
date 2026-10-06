import { useState, useEffect, useMemo, useRef } from "react";
import { Badge, Modal } from "../components/ui.jsx";
import { RefreshIcon } from "../components/icons.jsx";
import config from "../../config.js";

const WEBHOOK_URL = "https://praeco.app.n8n.cloud/webhook/fetch-logs";

const ALL_OUTCOMES = [
  "ALL",
  "PAYMENT_COMMITTED",
  "PAYMENT_LATER",
  "PAYMENT_METHOD_REQUESTED",
  "PAYMENT_ALREADY_MADE",
  "PAYMENT_REFUSED",
  "BILL_DISPUTE",
  "FINANCIAL_HARDSHIP",
  "SUBSIDY_INQUIRY",
  "HUMAN_REQUESTED",
  "CALLBACK_REQUESTED",
  "WRONG_CONTACT",
  "NO_ACCOUNT_HOLDER",
  "CALL_DISCONNECTED",
  "NO_RESPONSE",
  "OTHER",
];

const ALL_SITUATIONS = [
  "ALL",
  "LOW_INCOME",
  "UNEMPLOYED",
  "TEMPORARY_FINANCIAL_DIFFICULTY",
  "REQUESTS_INSTALLMENT",
  "REQUESTS_SUBSIDY",
  "BILL_TOO_HIGH",
  "BILL_PERIOD_CONFUSION",
  "BILL_CALCULATION_DISPUTE",
  "PAYMENT_RECORD_MISMATCH",
  "SERVICE_COMPLAINT",
  "UNWILLING_TO_PAY",
  "NEEDS_PAYMENT_GUIDANCE",
  "LANGUAGE_BARRIER",
  "TRUST_OR_AUTHENTICITY_CONCERN",
  "NO_REASON_GIVEN",
];

function AudioPlayerBar({ row, getPresignedAudioUrl }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (!row) return;
    setLoading(true);
    setError(null);
    getPresignedAudioUrl(row)
      .then((url) => {
        if (isMounted) {
          if (url) {
            setAudioUrl(url);
          } else {
            setError("No recording URL available.");
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Failed to fetch recording.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [row?.call_id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime || 0);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const skipTime = (seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration || 0, (audioRef.current.currentTime || 0) + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
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
      const safeName = (row.customer_name || "call").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
      a.download = `recording_${safeName}_${(row.call_id || "log").substring(0, 8)}.wav`;
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
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn-solid"
            onClick={togglePlay}
            disabled={loading || !audioUrl}
            style={{
              background: isPlaying ? "#ef4444" : "#10b981",
              color: "#fff",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              padding: 0,
              cursor: loading || !audioUrl ? "wait" : "pointer",
              border: "none",
            }}
          >
            {loading ? "⏳" : isPlaying ? "⏸" : "▶"}
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => skipTime(-10)}
            disabled={!audioUrl}
            style={{ fontSize: 11.5, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
          >
            ↺ -10s
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => skipTime(10)}
            disabled={!audioUrl}
            style={{ fontSize: 11.5, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
          >
            ↻ +10s
          </button>

          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginLeft: 4, fontFamily: "var(--mono)" }}>
            {loading ? "Loading stream..." : error ? error : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>
        </div>

        <button
          type="button"
          className="btn-solid"
          onClick={handleDownload}
          disabled={downloading || !audioUrl}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
            border: "1px solid rgba(16,185,129,0.3)",
            padding: "5px 12px",
            borderRadius: 16,
          }}
        >
          {downloading ? "⏳ Downloading..." : "⬇ Download .wav"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          disabled={!audioUrl || loading}
          style={{
            width: "100%",
            height: 5,
            accentColor: "#10b981",
            cursor: "pointer",
            borderRadius: 4,
          }}
        />
      </div>
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

export default function ReviewPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedSummary, setExpandedSummary] = useState(null);

  // Filters State
  const [intentFilter, setIntentFilter] = useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [situationFilter, setSituationFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Action Modal State
  const [actionLog, setActionLog] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("Hakim AI agent");
  const [selectedTeam, setSelectedTeam] = useState("QA depart");

  // Unselected automation workflows by default
  const [workflows, setWorkflows] = useState({
    autoFollowUp: false,
    shareSms: false,
    sendInstallments: false,
  });
  const [customChannel, setCustomChannel] = useState("sms");
  const [customMessage, setCustomMessage] = useState("");

  // Independent Card Loading States
  const [isRunningAiAgent, setIsRunningAiAgent] = useState(false);
  const [isMovingTeam, setIsMovingTeam] = useState(false);
  const [isRunningWorkflows, setIsRunningWorkflows] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Audio signed URL state
  const [presignedUrls, setPresignedUrls] = useState({});

  // Success Notification
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

        // Filter ONLY records where handling is GREY
        const greyRecords = rawData.filter(
          (row) => String(row.handling_priority).toUpperCase() === "GREY"
        );
        setLogs(greyRecords);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Review Panel fetch error:", err);
        setError("Failed to load Grey Zone review logs.");
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

  // Open Take Action Modal
  const openActionModal = (row) => {
    setActionLog(row);
    setSelectedAgent("Hakim AI agent");
    setSelectedTeam("QA depart");
    setWorkflows({
      autoFollowUp: false,
      shareSms: false,
      sendInstallments: false,
    });
    setCustomMessage(
      `Salam ${row.customer_name}, regarding your IWK account (${row.call_id.substring(0, 8)}), we have reviewed your request and provided flexible installment options. Please reply or call us back.`
    );
  };

  // Dedicated Handler: Run AI Agent Call
  const handleRunAiAgent = () => {
    setIsRunningAiAgent(true);
    setTimeout(() => {
      setIsRunningAiAgent(false);
      setToast(
        `✓ AI Call dispatched to ${selectedAgent} for ${actionLog?.customer_name || "customer"}!`
      );
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Move to Team
  const handleMoveToTeam = () => {
    setIsMovingTeam(true);
    setTimeout(() => {
      setIsMovingTeam(false);
      setToast(
        `✓ Case successfully moved to ${selectedTeam} for ${actionLog?.customer_name || "customer"}!`
      );
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Run Automated Workflows
  const handleRunWorkflows = () => {
    const selectedList = Object.entries(workflows)
      .filter(([_, active]) => active)
      .map(([key]) => key);

    if (selectedList.length === 0) {
      alert("Please select at least one automated workflow checkbox to run.");
      return;
    }

    setIsRunningWorkflows(true);
    setTimeout(() => {
      setIsRunningWorkflows(false);
      setToast(
        `✓ ${selectedList.length} automated workflow(s) executed for ${actionLog?.customer_name || "customer"}!`
      );
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Dedicated Handler: Standalone Custom Message Send
  const handleSendMessage = () => {
    if (!customMessage.trim()) return;
    setIsSendingMessage(true);
    setTimeout(() => {
      setIsSendingMessage(false);
      setToast(
        `✓ ${customChannel.toUpperCase()} Message sent successfully to ${actionLog?.customer_name || "customer"}!`
      );
      setTimeout(() => setToast(null), 4000);
    }, 700);
  };

  // Handle Main Action Submit
  const handleApplyAction = () => {
    if (!actionLog) return;
    setToast(
      `✓ Action applied for ${actionLog.customer_name}! Case routed to ${selectedAgent} & ${selectedTeam}.`
    );
    setActionLog(null);
    setTimeout(() => setToast(null), 4000);
  };

  const formatSituationText = (rawSit) => {
    if (!rawSit) return "NO REASON GIVEN";
    let text = "";
    if (Array.isArray(rawSit)) {
      text = rawSit.length > 0 ? rawSit.join(", ") : "NO REASON GIVEN";
    } else {
      const str = String(rawSit).trim();
      if (str === "[]" || str === "" || str === "null") text = "NO REASON GIVEN";
      else {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) text = parsed.length > 0 ? parsed.join(", ") : "NO REASON GIVEN";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Review Panel</h1>
            <Badge tone="warn" style={{ fontSize: 12, padding: "3px 10px" }}>
              🟡 Grey Zone Cases Only
            </Badge>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Review financial hardship, dispute, or assistance cases requiring supervisor evaluation or automated workflow routing.
          </p>
        </div>

        <button
          className="btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
          onClick={fetchLogs}
        >
          <RefreshIcon size={15} /> Refresh Review Cases
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981",
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

        {/* Call Outcome Filter (All 16 Options) */}
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

      {/* Clean Table View */}
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
            Loading Grey Zone review cases…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--bad)", fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
            No Grey Zone review cases match the selected filters.
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Call ID &amp; Timestamp</th>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Customer Name</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Intent</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Outcome</th>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Situation / Reason</th>
                  <th style={{ textAlign: "left", padding: "12px 14px", minWidth: 320, maxWidth: 450 }}>Stated Evidence</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Handling</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Take Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((row, idx) => {
                  const situationStr = formatSituationText(row.customer_situation);
                  const evidenceStr =
                    row.priority_evidence ||
                    row.intent_evidence ||
                    row.outcome_evidence ||
                    row.summary ||
                    "—";
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

                      {/* Customer Name */}
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                        <strong style={{ color: "var(--text)", fontSize: 13.5 }}>{row.customer_name || "Unknown Customer"}</strong>
                        {row.customer_phone && (
                          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                            📞 {row.customer_phone}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "top" }}>
                        <Badge tone={intentTone(row.customer_intent)}>
                          {row.customer_intent || "UNKNOWN"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "top" }}>
                        <Badge tone="info">
                          {row.call_outcome ? row.call_outcome.replace(/_/g, " ") : "PROCESSED"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: 12.5, fontWeight: 600, verticalAlign: "top" }}>
                        {situationStr}
                      </td>

                      {/* Stated Evidence (Max 3 lines, click to expand) */}
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: 12, minWidth: 320, maxWidth: 450, verticalAlign: "top" }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSummary(isExpanded ? null : (row.call_id || idx));
                          }}
                          title="Click to view full text"
                          style={{
                            background: "var(--surface-2)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            fontSize: 12,
                            color: "var(--text-dim)",
                            lineHeight: 1.45,
                            cursor: "pointer",
                            display: "-webkit-box",
                            WebkitLineClamp: isExpanded ? "none" : 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          "{evidenceStr}"
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
                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "top" }}>
                        <Badge tone="warn">GREY</Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "top" }}>
                        <button
                          type="button"
                          className="btn-solid"
                          onClick={(e) => {
                            e.stopPropagation();
                            openActionModal(row);
                          }}
                          style={{
                            background: "#10b981",
                            color: "#ffffff",
                            padding: "6px 14px",
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 12,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          ⚡ Take Action
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Take Action Modal Window */}
      {actionLog && (
        <Modal
          title={`Take Action — ${actionLog.customer_name} (${actionLog.call_id.substring(0, 8)})`}
          onClose={() => setActionLog(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setActionLog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-solid"
                style={{ background: "#10b981", color: "#ffffff" }}
                onClick={handleApplyAction}
              >
                Apply Action &amp; Route
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "75vh", overflowY: "auto" }}>
            {/* Call Overview Header */}
            <div
              style={{
                background: "var(--surface-2)",
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--border)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "var(--text-dim)" }}>Customer</span>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{actionLog.customer_name}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Outcome</span>
                <div style={{ fontWeight: 700, color: "var(--brand)" }}>{actionLog.call_outcome}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Situation</span>
                <div style={{ fontWeight: 700 }}>{formatSituationText(actionLog.customer_situation)}</div>
              </div>
            </div>

            {/* Recording Audio Scrubber inside Action Modal */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                Listen to Audio Recording
              </label>
              <AudioPlayerBar row={actionLog} getPresignedAudioUrl={getPresignedAudioUrl} />
            </div>

            {/* Option 1: Move to AI Agent Card with Dedicated Run Button */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                🤖 Move to AI Agent
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
                <option value="Hakim AI agent">Hakim AI agent (Ai agent will handle and call)</option>
                <option value="Aina AI agent">Aina AI agent (English Voice Collections)</option>
                <option value="Mei Ling AI agent">Mei Ling AI agent (Mandarin Voice Assistant)</option>
              </select>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", marginTop: 4 }}>
                Selected AI agent will automatically dial and initiate dedicated resolution.
              </span>

              {/* Dedicated Run AI Agent Button */}
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

            {/* Option 2: Move to Team Card with Dedicated Move Button */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                👥 Move to Team
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
                <option value="QA depart">QA depart (records verify)</option>
                <option value="Hardship Review Desk">Hardship &amp; Financial Assistance Desk</option>
                <option value="Billing Dispute Team">Billing Calculations &amp; Dispute Team</option>
                <option value="Supervisor Escalations">Supervisor Escalations Desk</option>
              </select>

              {/* Dedicated Move to Team Button */}
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

            {/* Option 3: Trigger Workflows Card with Dedicated Run Button */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 }}>
                ⚡ Trigger Automated Workflows
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.autoFollowUp}
                    onChange={(e) => setWorkflows({ ...workflows, autoFollowUp: e.target.checked })}
                  />
                  <span>Auto Follow-Up</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.shareSms}
                    onChange={(e) => setWorkflows({ ...workflows, shareSms: e.target.checked })}
                  />
                  <span>Details Share on SMS</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={workflows.sendInstallments}
                    onChange={(e) => setWorkflows({ ...workflows, sendInstallments: e.target.checked })}
                  />
                  <span>Send Installment Details</span>
                </label>
              </div>

              {/* Dedicated Run Workflows Button */}
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

            {/* Option 4: Custom Message with Dedicated Send Button */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 8 }}>
                💬 Send Custom Message
              </label>

              {/* Channel Selector */}
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

              {/* Message Body Textarea */}
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter custom message body..."
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

              {/* Standalone Dedicated Send Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-solid"
                  disabled={isSendingMessage || !customMessage.trim()}
                  onClick={handleSendMessage}
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
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
                    : `📤 Send ${customChannel.toUpperCase()} Message`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
