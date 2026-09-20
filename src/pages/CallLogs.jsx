import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
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
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            className="btn-solid"
            onClick={togglePlay}
            disabled={loading || !audioUrl}
            style={{
              background: isPlaying ? "#ef4444" : "#10b981",
              color: "#fff",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              padding: 0,
              cursor: loading || !audioUrl ? "wait" : "pointer",
              border: "none",
              boxShadow: "0 2px 6px rgba(16,185,129,0.3)",
            }}
            title={isPlaying ? "Pause Recording" : "Play Recording"}
          >
            {loading ? "⏳" : isPlaying ? "⏸" : "▶"}
          </button>

          {/* Rewind 10s */}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => skipTime(-10)}
            disabled={!audioUrl}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
            title="Rewind 10 seconds"
          >
            ↺ -10s
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => skipTime(10)}
            disabled={!audioUrl}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
            title="Forward 10 seconds"
          >
            ↻ +10s
          </button>

          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", marginLeft: 6, fontFamily: "var(--mono)" }}>
            {loading ? "Fetching signed audio stream..." : error ? error : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>
        </div>

        {/* Working Download Button */}
        <button
          type="button"
          className="btn-solid"
          onClick={handleDownload}
          disabled={downloading || !audioUrl}
          style={{
            fontSize: 12,
            fontWeight: 700,
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
            border: "1px solid rgba(16,185,129,0.3)",
            padding: "6px 14px",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: downloading || !audioUrl ? "wait" : "pointer",
          }}
        >
          <span>{downloading ? "⏳ Downloading..." : "⬇ Download .wav"}</span>
        </button>
      </div>

      {/* Scrub / Seek Progress Slider Bar */}
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
            height: 6,
            accentColor: "#10b981",
            cursor: "pointer",
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

export default function CallLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [intentFilter, setIntentFilter] = useState("ALL");
  const [situationFilter, setSituationFilter] = useState("ALL");

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Date Wise Filters & Sorting State (Default: Descending - Latest first)
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Audio Player State
  const [playingId, setPlayingId] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);
  const [presignedUrls, setPresignedUrls] = useState({});

  // Helper to fetch signed Vapi recording URL using config.vapi.secretKey
  const getPresignedAudioUrl = async (row) => {
    if (presignedUrls[row.call_id]) {
      return presignedUrls[row.call_id];
    }

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
            callData.presignedMonoUrl ||
            callData.presignedStereoUrl ||
            callData.recordingUrl ||
            callData.artifact?.recordingUrl;

          if (signedUrl) {
            setPresignedUrls((prev) => ({ ...prev, [row.call_id]: signedUrl }));
            return signedUrl;
          }
        }
      } catch (err) {
        console.warn("Could not retrieve presigned audio URL from Vapi API:", err);
      }
    }

    // Fallback to webhook transcript-audio-url
    return row["transcript-audio-url"];
  };

  // Audio Playback Handler
  const handlePlayAudio = async (row, e) => {
    if (e) e.stopPropagation();

    // Toggle pause if currently playing
    if (playingId === row.call_id && audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
      setPlayingId(null);
      return;
    }

    // Stop existing audio if any
    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
    }

    setLoadingAudioId(row.call_id);

    try {
      const audioUrl = await getPresignedAudioUrl(row);

      if (!audioUrl) {
        alert("No audio recording URL available for this call log.");
        setLoadingAudioId(null);
        return;
      }

      const audio = new Audio(audioUrl);
      
      const onCanPlay = () => {
        audio.play()
          .then(() => {
            setAudioPlayer(audio);
            setPlayingId(row.call_id);
            setLoadingAudioId(null);
          })
          .catch((err) => {
            console.error("Audio play error:", err);
            alert("Failed to play recording audio.");
            setPlayingId(null);
            setAudioPlayer(null);
            setLoadingAudioId(null);
          });
      };

      // Play audio directly
      audio.play()
        .then(() => {
          setAudioPlayer(audio);
          setPlayingId(row.call_id);
          setLoadingAudioId(null);
        })
        .catch(() => {
          // If immediate play pending, listen on play promise
        });

      audio.onended = () => {
        setPlayingId(null);
        setAudioPlayer(null);
        setLoadingAudioId(null);
      };

      audio.onerror = (err) => {
        console.error("Audio playback error event:", err);
        setPlayingId(null);
        setAudioPlayer(null);
        setLoadingAudioId(null);
      };
    } catch (err) {
      console.error("Audio handler error:", err);
      setLoadingAudioId(null);
    }
  };

  // Fetch data ONLY from the n8n webhook
  const fetchWebhookLogs = () => {
    setLoading(true);
    setError(null);
    fetch(WEBHOOK_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && (json.code === 200 || json.data)) {
          const rawData = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          setLogs(rawData);
        } else {
          setLogs([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Webhook fetch error:", err);
        setError(err.message || "Failed to load webhook logs.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
      }
    };
  }, [audioPlayer]);

  // Helper to sanitize strings (Replace any $ sign with RM)
  const sanitizeText = (str) => {
    if (!str) return "";
    return String(str).replace(/\$/g, "RM ");
  };

  // Helper to convert USD cost to RM currency (1 USD = ~4.50 RM)
  const formatCostInRM = (usdCost) => {
    if (usdCost === undefined || usdCost === null || isNaN(Number(usdCost))) {
      return "—";
    }
    const numCost = Number(usdCost);
    const rmVal = numCost * 4.50;
    return `RM ${rmVal.toFixed(4)}`;
  };

  // Helper to clean up situation string or array
  const formatSituationText = (rawSit) => {
    if (!rawSit) return "NO_REASON_GIVEN";
    if (Array.isArray(rawSit)) {
      return rawSit.length > 0 ? rawSit.join(", ") : "NO_REASON_GIVEN";
    }
    const str = String(rawSit).trim();
    if (str === "[]" || str === "" || str === "null") return "NO_REASON_GIVEN";
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.join(", ") : "NO_REASON_GIVEN";
      }
    } catch {
      // Return raw string if not JSON
    }
    return str;
  };

  // Filtered & Sorted logs (Descending order: latest / last entry first)
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const last7DaysStart = todayStart - 7 * 86400000;
    const last30DaysStart = todayStart - 30 * 86400000;

    const result = logs.filter((row) => {
      // Priority Filter
      if (priorityFilter !== "ALL" && row.handling_priority !== priorityFilter) {
        return false;
      }
      // Outcome Filter
      if (outcomeFilter !== "ALL" && row.call_outcome !== outcomeFilter) {
        return false;
      }
      // Intent Filter
      if (intentFilter !== "ALL" && row.customer_intent !== intentFilter) {
        return false;
      }
      // Situation Filter
      if (situationFilter !== "ALL") {
        const sitStr = formatSituationText(row.customer_situation);
        if (!sitStr.includes(situationFilter)) return false;
      }

      // Date Preset Filtering
      if (row.time_stamp) {
        const rowMs = new Date(row.time_stamp).getTime();
        if (!isNaN(rowMs)) {
          if (datePreset === "TODAY" && rowMs < todayStart) return false;
          if (datePreset === "YESTERDAY" && (rowMs < yesterdayStart || rowMs >= todayStart)) return false;
          if (datePreset === "LAST_7" && rowMs < last7DaysStart) return false;
          if (datePreset === "LAST_30" && rowMs < last30DaysStart) return false;
        }
      }

      // Custom Start Date Filter
      if (startDate) {
        const startMs = new Date(startDate).getTime();
        const rowMs = row.time_stamp ? new Date(row.time_stamp).getTime() : 0;
        if (!isNaN(startMs) && !isNaN(rowMs) && rowMs < startMs) return false;
      }

      // Custom End Date Filter
      if (endDate) {
        const endMs = new Date(endDate).setHours(23, 59, 59, 999);
        const rowMs = row.time_stamp ? new Date(row.time_stamp).getTime() : 0;
        if (!isNaN(endMs) && !isNaN(rowMs) && rowMs > endMs) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = row.customer_name?.toLowerCase().includes(q);
        const matchId = row.call_id?.toLowerCase().includes(q);
        const matchAssistant = row.assistant?.toLowerCase().includes(q);
        const matchSummary = row.summary?.toLowerCase().includes(q);
        const matchTranscript = row.transcript?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchAssistant && !matchSummary && !matchTranscript) {
          return false;
        }
      }
      return true;
    });

    // Sort in Descending order (latest / last entry first by default)
    result.sort((a, b) => {
      const timeA = a.time_stamp ? new Date(a.time_stamp).getTime() : 0;
      const timeB = b.time_stamp ? new Date(b.time_stamp).getTime() : 0;

      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
        return sortOrder === "DESC" ? timeB - timeA : timeA - timeB;
      }

      const rowA = Number(a.row_number) || 0;
      const rowB = Number(b.row_number) || 0;
      return sortOrder === "DESC" ? rowB - rowA : rowA - rowB;
    });

    return result;
  }, [logs, priorityFilter, outcomeFilter, intentFilter, situationFilter, datePreset, startDate, endDate, sortOrder, search]);

  const fmtDuration = (secs) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const priorityTone = (p) => {
    if (p === "GREEN") return "good";
    if (p === "RED") return "critical";
    return "warn";
  };

  // Intent POSITIVE should show GREEN (good tone)
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
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Call Logs</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Live call telemetry, transcripts and recording logs fetched directly from the n8n webhook.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            to="/fields-insights"
            className="btn-solid"
            style={{
              background: "#10b981",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📖 Fields &amp; Insights Structure →
          </Link>

          <button
            className="btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
            onClick={fetchWebhookLogs}
          >
            <RefreshIcon size={15} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
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
        {/* Search Bar */}
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <input
            type="text"
            placeholder="Search customer, assistant, call ID, summary..."
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

        {/* Handling Priority Filter */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Handling Priority
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="GREEN">🟢 GREEN (Normal)</option>
            <option value="GREY">🟡 GREY (Review)</option>
            <option value="RED">🔴 RED (Human Only)</option>
          </select>
        </div>

        {/* Intent Filter */}
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

        {/* Outcome Filter (All 16 Options) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Call Outcome (All 16)
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
              maxWidth: 200,
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

        {/* Sort Order Control (Descending: Latest First) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 3 }}>
            Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <option value="DESC">⬇ Latest First (Desc)</option>
            <option value="ASC">⬆ Oldest First (Asc)</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
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
            Loading webhook call logs from n8n…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--bad)", fontSize: 14 }}>
            ⚠️ Error loading webhook data: {error}
          </div>
        )}

        {!loading && !error && filteredLogs.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
            No call logs match the selected filters.
          </div>
        )}

        {!loading && !error && filteredLogs.length > 0 && (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Date &amp; Time</th>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Customer Name</th>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Assistant</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Intent</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Outcome</th>
                  <th style={{ textAlign: "left", padding: "12px 14px" }}>Situation</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Handling</th>
                  <th style={{ textAlign: "right", padding: "12px 14px" }}>Duration</th>
                  <th style={{ textAlign: "center", padding: "12px 14px" }}>Play Recording</th>
                  <th style={{ textAlign: "right", padding: "12px 14px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((row) => {
                  const isThisPlaying = playingId === row.call_id;
                  const situationStr = formatSituationText(row.customer_situation);

                  return (
                    <tr
                      key={row.call_id}
                      onClick={() => setSelectedLog(row)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                        background: isThisPlaying ? "rgba(16,185,129,0.06)" : "transparent",
                      }}
                      className="clickable-row"
                    >
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                        {row.time_stamp}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ color: "var(--text)", fontSize: 13.5 }}>{row.customer_name}</strong>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)" }}>
                        {row.assistant || "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        {/* POSITIVE intent shows GREEN tone */}
                        <Badge tone={intentTone(row.customer_intent)}>
                          {row.customer_intent || "UNKNOWN"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <Badge tone="info">
                          {row.call_outcome ? row.call_outcome.replace(/_/g, " ") : "PROCESSED"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: 12 }}>
                        {situationStr}
                      </td>
                      {/* Priority label updated to Handling */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <Badge tone={priorityTone(row.handling_priority)}>
                          {row.handling_priority || "GREEN"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--mono)" }}>
                        {fmtDuration(row.duration_seconds)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-solid"
                          onClick={(e) => handlePlayAudio(row, e)}
                          disabled={loadingAudioId === row.call_id}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            borderRadius: 20,
                            background: isThisPlaying ? "#ef4444" : "#10b981",
                            color: "#ffffff",
                            border: "none",
                            cursor: loadingAudioId === row.call_id ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 700,
                            opacity: loadingAudioId === row.call_id ? 0.7 : 1,
                          }}
                          title={isThisPlaying ? "Pause audio" : "Play recording audio"}
                        >
                          <span>
                            {loadingAudioId === row.call_id
                              ? "⏳ Loading..."
                              : isThisPlaying
                              ? "⏸ Pause"
                              : "▶ Play"}
                          </span>
                          {isThisPlaying && (
                            <span style={{ display: "inline-flex", gap: 2 }}>
                              <span style={{ width: 2, height: 10, background: "#fff" }} />
                              <span style={{ width: 2, height: 14, background: "#fff" }} />
                              <span style={{ width: 2, height: 8, background: "#fff" }} />
                            </span>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(row);
                          }}
                        >
                          View Log →
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

      {/* Selected Call Log Modal Window — Shows ALL Values */}
      {selectedLog && (
        <Modal
          title={`Call Log Details — ${selectedLog.customer_name} (${selectedLog.call_id})`}
          onClose={() => setSelectedLog(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-solid"
                style={{ background: "#10b981", color: "#ffffff" }}
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "75vh", overflowY: "auto" }}>
            {/* Header Metadata Summary (Shows Duration, Handling, RM Cost with no $ sign) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                background: "var(--surface-2)",
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Call ID</span>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", wordBreak: "break-all" }}>
                  {selectedLog.call_id}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Assistant</span>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedLog.assistant || "—"}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Duration</span>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)" }}>
                  {fmtDuration(selectedLog.duration_seconds)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Handling Priority</span>
                <div style={{ marginTop: 2 }}>
                  <Badge tone={priorityTone(selectedLog.handling_priority)}>
                    {selectedLog.handling_priority || "GREEN"}
                  </Badge>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Telephony Cost</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                  {formatCostInRM(selectedLog.cost)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Call End Reason</span>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedLog.ended_reason || "—"}</div>
              </div>
            </div>

            {/* Audio Recording Interactive Player Bar & Working Download Button */}
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Call Recording Player
              </h4>
              <AudioPlayerBar row={selectedLog} getPresignedAudioUrl={getPresignedAudioUrl} />
            </div>

            {/* Call Transcript WITHOUT Timestamps (With $ replaced by RM) */}
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Call Transcript <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-faint)" }}>(No Timestamps)</span>
              </h4>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 14,
                  maxHeight: 240,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {selectedLog.transcript ? (
                  sanitizeText(selectedLog.transcript)
                    .split("\n")
                    .filter((line) => line.trim().length > 0)
                    .map((line, idx) => {
                      const isAI = line.startsWith("AI:") || line.startsWith("Assistant:");
                      const isUser = line.startsWith("User:") || line.startsWith("Customer:");
                      const speakerLabel = isAI
                        ? selectedLog.assistant || "AI Assistant"
                        : isUser
                        ? selectedLog.customer_name || "Customer"
                        : line.split(":")[0] || "Speaker";

                      const contentText = line.includes(":")
                        ? line.substring(line.indexOf(":") + 1).trim()
                        : line;

                      return (
                        <div key={idx} style={{ fontSize: 13, lineHeight: 1.45 }}>
                          <strong style={{ color: isAI ? "#10b981" : "var(--brand)" }}>
                            {speakerLabel}:{" "}
                          </strong>
                          <span style={{ color: "var(--text)" }}>{contentText}</span>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No transcript available.</div>
                )}
              </div>
            </div>

            {/* Summary (With $ replaced by RM) */}
            {selectedLog.summary && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: "#10b981", marginBottom: 4 }}>
                  AI Call Summary
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                  {sanitizeText(selectedLog.summary)}
                </div>
              </div>
            )}

            {/* 4-Layer Taxonomy & ALL Fields Grid */}
            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Classification &amp; Webhook Fields
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: 12.5 }}>
                <div style={{ background: "var(--surface-2)", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: "var(--text-dim)", display: "block" }}>Customer Intent</strong>
                  <Badge tone={intentTone(selectedLog.customer_intent)} style={{ marginTop: 4 }}>
                    {selectedLog.customer_intent || "UNKNOWN"}
                  </Badge>
                  {selectedLog.intent_evidence && (
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                      Evidence: "{sanitizeText(selectedLog.intent_evidence)}"
                    </div>
                  )}
                </div>

                <div style={{ background: "var(--surface-2)", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: "var(--text-dim)", display: "block" }}>Call Outcome</strong>
                  <Badge tone="info" style={{ marginTop: 4 }}>
                    {selectedLog.call_outcome || "PROCESSED"}
                  </Badge>
                  {selectedLog.outcome_evidence && (
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                      Evidence: "{sanitizeText(selectedLog.outcome_evidence)}"
                    </div>
                  )}
                </div>

                <div style={{ background: "var(--surface-2)", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: "var(--text-dim)", display: "block" }}>Customer Situation</strong>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>
                    {formatSituationText(selectedLog.customer_situation)}
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: "var(--text-dim)", display: "block" }}>Frustration Level</strong>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>
                    {selectedLog.frustration_level || "NONE"}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete All Raw Webhook Key-Values Table */}
            <div>
              <h4 style={{ margin: "10px 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Complete Webhook Payload Fields
              </h4>
              <div className="table-wrap">
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Field Key</th>
                      <th style={{ textAlign: "left" }}>Webhook Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedLog).map(([k, v]) => {
                      if (k === "transcript" || k === "summary") return null;
                      let displayVal = typeof v === "object" ? JSON.stringify(v) : String(v ?? "—");
                      // Convert $ to RM
                      displayVal = sanitizeText(displayVal);
                      if (k === "cost") displayVal = formatCostInRM(v);

                      return (
                        <tr key={k}>
                          <td><code className="mono" style={{ color: "var(--brand)" }}>{k}</code></td>
                          <td style={{ color: "var(--text)" }}>{displayVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
