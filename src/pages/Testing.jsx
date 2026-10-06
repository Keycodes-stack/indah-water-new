import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import Vapi from "@vapi-ai/web";
import { PhoneCallIcon } from "../components/icons.jsx";
import { CONFIG } from "../../config.js";
import {
  runWorkflow,
  detectDistress,
  getWorkflowSettings,
  DEMO_WORKFLOWS,
} from "../lib/workflowEngine.js";

const AGENTS = [
  {
    id: "aina-en",
    name: "Aina (Manglish)",
    language: "Manglish",
    number: CONFIG.vapi.callerNumber || "+60 3-6043 2495",
    formattedNumber: CONFIG.vapi.callerNumber || "+60 3-6043 2495",
    assistantId: CONFIG.vapi.assistantId,
    color: "#10b981", // Emerald Green
    description: "Courteous Careline tone, bilingual English & Malay mix.",
    voice: CONFIG.vapi.voices?.manglish || {
      id: "D1360BR3zCp9v0EXUpO4",
      label: "Manglish",
      provider: "11labs",
      model: "eleven_v3",
    },
  },
  {
    id: "aina-my",
    name: "Aina (Malay)",
    language: "Bahasa Melayu (Malay)",
    number: CONFIG.vapi.callerNumber || "+60 3-6043 2495",
    formattedNumber: CONFIG.vapi.callerNumber || "+60 3-6043 2495",
    assistantId: CONFIG.vapi.assistantMalayId || "9352cbc1-be19-4f45-9af4-e5980bb9f5de",
    color: "#0b7fc4", // IWK Blue
    description: "Natural formal & colloquial Malaysian Malay recovery agent.",
    voices: CONFIG.vapi.voices?.malay || [
      { id: "w2dXNwje6o73fWGIO6CD", label: "Malay 1", provider: "11labs", model: "eleven_multilingual_v2" },
      { id: "kXQ1ZZosnfmkUToBIGhN", label: "Malay 2", provider: "11labs", model: "eleven_multilingual_v2" },
    ],
  },
];

export default function Testing() {
  const location = useLocation();
  const selectedLead = location.state?.lead || null;

  const [activeAgentId, setActiveAgentId] = useState(null);
  const [selectedVoiceIds, setSelectedVoiceIds] = useState({
    "aina-my": "w2dXNwje6o73fWGIO6CD",
  });
  const [customVoiceInputs, setCustomVoiceInputs] = useState({});
  const [callStatus, setCallStatus] = useState("idle"); // 'idle' | 'connecting' | 'active' | 'ended' | 'error'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [duration, setDuration] = useState(0);

  // Live distress alert (workflow: "Live Distress Call Email")
  const [distressAlert, setDistressAlert] = useState(null); // { level: 'ok' | 'err' | 'warn', text }
  const distressSentRef = useRef(false);
  const transcriptTextRef = useRef([]);

  const vapiRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Clean up Vapi on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Runs the "Live Distress Call Email" workflow once per call.
  const fireDistressWorkflow = async (trigger, agent) => {
    if (distressSentRef.current) return;
    distressSentRef.current = true;

    const settings = getWorkflowSettings();
    if (settings.distressActive === false) {
      setDistressAlert({ level: "warn", text: "Distress detected, but the \"Live Distress Call Email\" workflow is unpublished (Workflows page), so no email was sent." });
      return;
    }
    if (!settings.testEmail) {
      distressSentRef.current = false;
      setDistressAlert({ level: "warn", text: "Distress detected, but no test email is set. Open Workflows → Live Distress Call Email → Run Workflow and enter the test email once." });
      return;
    }

    setDistressAlert({ level: "warn", text: `Distress detected ("${trigger}") — sending alert email to ${settings.testEmail}…` });
    const wf = DEMO_WORKFLOWS.find((w) => w.liveTrigger);
    const failures = [];
    await runWorkflow(wf, {
      customers: [],
      settings,
      updateCustomer: () => {},
      live: {
        callId: `LIVE-${String(Date.now()).slice(-6)}`,
        customerName: `Live test caller (${agent?.name || "Voice AI"})`,
        reason: `Caller said "${trigger}" during live call testing with ${agent?.name || "the AI agent"}.`,
        transcript: transcriptTextRef.current.slice(-8).join("\n"),
      },
      onLog: (e) => {
        if (e.level === "err") failures.push(e.text);
      },
    });

    if (failures.length) {
      distressSentRef.current = false; // allow a retry on the next distressed sentence
      setDistressAlert({ level: "err", text: failures[0] });
    } else {
      setDistressAlert({ level: "ok", text: `Distress alert email sent to ${settings.testEmail}.` });
    }
  };

  const handleStartCall = (agent) => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {}
    }

    setActiveAgentId(agent.id);
    setCallStatus("connecting");
    setIsSpeaking(false);
    setIsMuted(false);
    setTranscript([]);
    setErrorMessage("");
    setDuration(0);
    setDistressAlert(null);
    distressSentRef.current = false;
    transcriptTextRef.current = [];

    try {
      const vapi = new Vapi(CONFIG.vapi.publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setCallStatus("active");
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      });

      vapi.on("call-end", () => {
        setCallStatus("ended");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      vapi.on("speech-start", () => {
        setIsSpeaking(true);
      });

      vapi.on("speech-end", () => {
        setIsSpeaking(false);
      });

      vapi.on("volume-level", (vol) => {
        setVolumeLevel(vol);
      });

      vapi.on("message", (msg) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          setTranscript((prev) => [
            ...prev,
            { role: msg.role === "assistant" ? "bot" : "user", text: msg.transcript },
          ]);
          transcriptTextRef.current.push(`${msg.role === "assistant" ? "Agent" : "Caller"}: ${msg.transcript}`);
          if (msg.role !== "assistant") {
            const hit = detectDistress(msg.transcript);
            if (hit) fireDistressWorkflow(hit, agent);
          }
        }
      });

      vapi.on("error", (e) => {
        console.error("Voice AI Call Error:", e);
        const msg =
          e?.error?.message ||
          e?.message ||
          e?.error ||
          "Failed to establish voice connection";
        setErrorMessage(typeof msg === "object" ? JSON.stringify(msg) : msg);
        setCallStatus("error");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      // Prepare assistant voice override if selected / configured
      let assistantOverrides = undefined;
      if (agent.voice) {
        assistantOverrides = {
          voice: {
            provider: agent.voice.provider || "11labs",
            voiceId: agent.voice.id,
            model: agent.voice.model || "eleven_v3",
          },
        };
      } else if (agent.voices && agent.voices.length > 0) {
        const chosenVoiceId = selectedVoiceIds[agent.id] || agent.voices[0]?.id;
        const chosenVoiceObj = agent.voices.find((v) => v.id === chosenVoiceId) || agent.voices[0];
        if (chosenVoiceObj) {
          assistantOverrides = {
            voice: {
              provider: chosenVoiceObj.provider || "11labs",
              voiceId: chosenVoiceObj.id,
              model: chosenVoiceObj.model || "eleven_multilingual_v2",
            },
          };
        }
      }

      vapi.start(agent.assistantId || CONFIG.vapi.assistantId, assistantOverrides).catch((err) => {
        console.error("Vapi Start Error:", err);
        const msg =
          err?.error?.message ||
          err?.message ||
          err?.error ||
          "Microphone permission denied or connection issue";
        setErrorMessage(typeof msg === "object" ? JSON.stringify(msg) : msg);
        setCallStatus("error");
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to initialize Vapi instance");
      setCallStatus("error");
    }
  };

  const handleEndCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {}
    }
    setCallStatus("ended");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  };

  const fmtDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ padding: "20px 0", maxWidth: 960, margin: "0 auto" }}>
      {/* Target Lead Context Banner (if navigated from Outbound Queue) */}
      {selectedLead && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--brand)",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 4px 16px rgba(11, 127, 196, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--brand-soft, rgba(11, 127, 196, 0.15))",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Outbound Queue Target
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {selectedLead.name} <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-dim)" }}>({selectedLead.phone})</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Account: </span>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13 }}>{selectedLead.accountNo}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Arrears: </span>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--danger, #ef4444)" }}>
                RM {Number(selectedLead.arrears || 0).toFixed(2)}
              </span>
            </div>
            <Link to="/outbound-caller" className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
              ← Return To Queue
            </Link>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        {AGENTS.map((agent) => {
          const isThisAgentActive = activeAgentId === agent.id;
          const isConnecting = isThisAgentActive && callStatus === "connecting";
          const isLive = isThisAgentActive && callStatus === "active";
          const isEnded = isThisAgentActive && callStatus === "ended";
          const hasError = isThisAgentActive && callStatus === "error";

          return (
            <div
              key={agent.id}
              style={{
                background: "var(--surface)",
                border: isLive ? `2px solid ${agent.color}` : "1px solid var(--border)",
                borderRadius: 18,
                padding: 32,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: isLive ? `0 12px 32px ${agent.color}30` : "var(--shadow)",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {/* Animated / Active Status Ring */}
              <div
                style={{
                  position: "relative",
                  width: 80,
                  height: 80,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {isLive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -8,
                      borderRadius: "50%",
                      border: `2px solid ${agent.color}`,
                      opacity: isSpeaking ? 0.9 : 0.3 + volumeLevel * 0.7,
                      transform: `scale(${isSpeaking ? 1.15 : 1 + volumeLevel * 0.3})`,
                      transition: "transform 0.15s ease, opacity 0.15s ease",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: isLive
                      ? `linear-gradient(135deg, ${agent.color} 0%, #0b7fc4 100%)`
                      : agent.color + "18",
                    color: isLive ? "#ffffff" : agent.color,
                    display: "grid",
                    placeItems: "center",
                    boxShadow: isLive ? `0 8px 24px ${agent.color}50` : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <PhoneCallIcon size={36} />
                </div>
              </div>

              {/* Agent Name & Language */}
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "var(--text)" }}>
                {agent.name}
              </h2>
              <span
                style={{
                  background: agent.color + "15",
                  color: agent.color,
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "inline-block",
                }}
              >
                {agent.language}
              </span>

              {/* Phone Number */}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "var(--mono)",
                  color: "var(--text)",
                  marginBottom: 16,
                  letterSpacing: "0.5px",
                }}
              >
                {agent.formattedNumber}
              </div>

              {/* Dynamic Voice Option Selector */}
              {agent.voices && agent.voices.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Select Voice Model ({agent.voices.length} Options)
                    </span>
                  </div>

                  <select
                    value={selectedVoiceIds[agent.id] || agent.voices[0]?.id}
                    onChange={(e) =>
                      setSelectedVoiceIds((prev) => ({
                        ...prev,
                        [agent.id]: e.target.value,
                      }))
                    }
                    disabled={isLive || isConnecting}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: isLive || isConnecting ? "not-allowed" : "pointer",
                      marginBottom: 6,
                    }}
                  >
                    {agent.voices.map((v, idx) => (
                      <option key={v.id} value={v.id}>
                        {v.label || `Option ${idx + 1}: ${v.id}`}
                      </option>
                    ))}
                  </select>

                  <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <span>Active Voice ID:</span>
                    <code style={{ fontSize: 10.5, color: agent.color, fontWeight: 700 }}>
                      {selectedVoiceIds[agent.id] || agent.voices[0]?.id}
                    </code>
                  </div>
                </div>
              )}

              {/* Live Status Message & Timer */}
              {isLive && (
                <div style={{ marginBottom: 16, width: "100%" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10b981",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#10b981",
                        boxShadow: "0 0 8px #10b981",
                      }}
                    />
                    <span>{isSpeaking ? `${agent.name.split(" ")[0]} is speaking...` : "Listening to you..."}</span>
                    <span style={{ fontFamily: "var(--mono)", marginLeft: 4 }}>({fmtDuration(duration)})</span>
                  </div>
                </div>
              )}

              {isConnecting && (
                <div style={{ marginBottom: 16, color: "var(--warning)", fontWeight: 600, fontSize: 13 }}>
                  Connecting to Voice AI...
                </div>
              )}

              {hasError && (
                <div style={{ marginBottom: 16, color: "var(--danger, #ef4444)", fontSize: 12.5, fontWeight: 500 }}>
                  {errorMessage}
                </div>
              )}

              {isEnded && !isConnecting && (
                <div style={{ marginBottom: 16, color: "var(--text-dim)", fontSize: 13 }}>
                  Call completed.
                </div>
              )}

              {distressAlert && (
                <div
                  role="status"
                  style={{
                    width: "100%",
                    marginBottom: 14,
                    padding: "9px 12px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textAlign: "left",
                    background: distressAlert.level === "ok" ? "rgba(16,185,129,0.12)" : distressAlert.level === "err" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.14)",
                    color: distressAlert.level === "ok" ? "#10b981" : distressAlert.level === "err" ? "#ef4444" : "#d99000",
                    border: "1px solid currentColor",
                  }}
                >
                  🚨 {distressAlert.text}
                </div>
              )}

              {/* Live Real-Time Subtitles / Transcript Box */}
              {isLive && (
                <div
                  style={{
                    width: "100%",
                    maxHeight: 110,
                    overflowY: "auto",
                    background: "var(--surface-2, rgba(255,255,255,0.04))",
                    borderRadius: 10,
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    textAlign: "left",
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    marginBottom: 20,
                  }}
                >
                  {transcript.length === 0 ? (
                    <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
                      Speak into your microphone to start talking with {agent.name.split(" ")[0]}...
                    </span>
                  ) : (
                    transcript.map((t, idx) => (
                      <div key={idx} style={{ marginBottom: 6 }}>
                        <strong style={{ color: t.role === "bot" ? agent.color : "var(--brand)" }}>
                          {t.role === "bot" ? `${agent.name.split(" ")[0]}: ` : "You: "}
                        </strong>
                        <span style={{ color: "var(--text)" }}>{t.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ width: "100%", display: "flex", gap: 10, justifyContent: "center" }}>
                {isLive ? (
                  <>
                    <button
                      onClick={handleToggleMute}
                      className="btn-ghost"
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13.5,
                        background: isMuted ? "rgba(245, 158, 11, 0.15)" : undefined,
                        color: isMuted ? "#f59e0b" : undefined,
                      }}
                    >
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={handleEndCall}
                      className="btn-solid"
                      style={{
                        flex: 1,
                        background: "#ef4444",
                        borderColor: "#ef4444",
                        color: "#ffffff",
                        padding: "12px 16px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13.5,
                        boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                      }}
                    >
                      End Call
                    </button>
                  </>
                ) : isConnecting ? (
                  <button
                    onClick={handleEndCall}
                    className="btn-ghost"
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      borderRadius: 10,
                      color: "var(--text-dim)",
                    }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartCall(agent)}
                    className="btn-solid"
                    style={{
                      background: agent.color,
                      borderColor: agent.color,
                      color: "#ffffff",
                      fontSize: 15,
                      fontWeight: 700,
                      padding: "14px 28px",
                      borderRadius: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      justifyContent: "center",
                      boxShadow: `0 4px 14px ${agent.color}40`,
                      cursor: "pointer",
                    }}
                  >
                    <PhoneCallIcon size={18} />
                    <span>Call {agent.name.split(" ")[0]} Now</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
