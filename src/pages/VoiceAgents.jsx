import { useState, useEffect } from "react";
import { Panel, Badge, Modal } from "../components/ui.jsx";

const DEFAULT_AGENTS = [
  {
    id: "aina",
    name: "Aina",
    avatar: "A",
    color: "#10b981", // Emerald Green
    status: "Live",
    role: "Domestic collections",
    description:
      "Sounds like a courteous Careline officer who has time for you. Never rushes, never argues, always offers a person. Built for households that owe two or three cycles and simply have not got round to it.",
    callsCount: 4120,
    resolvedPct: 31,
    handedPct: 9,
    complaintsPerK: 0.2,
    languages: ["Bahasa Malaysia", "English"],
    langCodes: "BM · EN",
    voiceId: "natural-bm",
    voices: [
      {
        id: "natural-bm",
        name: "Natural BM",
        inUse: true,
        desc: "Warm, mid register, slight Selangor lilt",
        audioUrl: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
        sampleText: "Salam, saya Aina daripada Indah Water Careline.",
      },
      {
        id: "softer",
        name: "Softer",
        inUse: false,
        desc: "Lower energy, for evening calls",
        audioUrl: "/voices/voice_preview_aisyah - animated, curious and clear.mp3",
        sampleText: "Salam sejahtera, Aina di sini untuk bantu semak bil pembetungan anda.",
      },
      {
        id: "brighter",
        name: "Brighter",
        inUse: false,
        desc: "Slightly faster, for pre-due courtesy",
        audioUrl: "/voices/malay-asistant.wav",
        sampleText: "Selamat pagi, peringatan mesra berkenaan bil Indah Water anda.",
      },
    ],
    manner: {
      warmth: 85,
      firmness: 45,
      formality: 55,
      pace: 60,
    },
    firstMessage:
      "Salam, saya Aina, pembantu automatik Indah Water. Saya hubungi berkenaan mesej WhatsApp semalam tentang bil pembetungan. Boleh saya teruskan, atau Encik lebih selesa bercakap dengan pegawai kami?",
    extraPromptInstructions:
      "Always acknowledge customer concerns first before stating the overdue balance. Offer flexible instalment options if customer mentions temporary hardship. Never use aggressive debt collection language.",
    systemRole: "Courteous Customer Careline & Recovery Assistant",
    offers: {
      maxDiscount: 10,
      maxInstalments: 6,
      escalationThreshold: 500,
    },
  },
  {
    id: "hakim",
    name: "Hakim",
    avatar: "H",
    color: "#0b7fc4", // IWK Blue
    status: "Live",
    role: "Commercial & SME",
    description:
      "Professional, structured corporate voice tailored for SME accounts and finance managers. Focuses on invoice reconciliation, e-invoicing and corporate payment portals.",
    callsCount: 860,
    resolvedPct: 27,
    handedPct: 14,
    complaintsPerK: 0.1,
    languages: ["English", "Bahasa Malaysia"],
    langCodes: "EN · BM",
    voiceId: "corporate-en",
    voices: [
      {
        id: "corporate-en",
        name: "Corporate Business EN",
        inUse: true,
        desc: "Clear, confident, neutral corporate accent",
        audioUrl: "/voices/voice_preview_jawid iqbal anwar - news anchor.mp3",
        sampleText: "Good day, this is Hakim from Indah Water Commercial Operations.",
      },
      {
        id: "formal-bm",
        name: "Formal Corporate BM",
        inUse: false,
        desc: "Polite business register for corporate accounts",
        audioUrl: "/voices/malay-zain-male-voice.mp3",
        sampleText: "Salam sejahtera, saya Hakim daripada Bahagian Komersial Indah Water.",
      },
    ],
    manner: {
      warmth: 60,
      firmness: 75,
      formality: 85,
      pace: 65,
    },
    firstMessage:
      "Good day, this is Hakim from Indah Water Commercial Operations. I'm reaching out regarding the outstanding balance on your commercial sewerage service account.",
    extraPromptInstructions:
      "Reference PO numbers and SST invoice numbers where available. Connect directly to finance supervisor if account claims billing discrepancy.",
    systemRole: "SME & Commercial Accounts Specialist",
    offers: {
      maxDiscount: 15,
      maxInstalments: 12,
      escalationThreshold: 1000,
    },
  },
  {
    id: "meiling",
    name: "Mei Ling",
    avatar: "M",
    color: "#d97706", // Amber / Orange
    status: "Live",
    role: "Domestic · Mandarin",
    description:
      "Friendly Mandarin & Cantonese speaking voice agent specialized in urban domestic accounts across Penang, KL and Ipoh.",
    callsCount: 1340,
    resolvedPct: 34,
    handedPct: 7,
    complaintsPerK: 0.1,
    languages: ["Mandarin", "English"],
    langCodes: "ZH · EN",
    voiceId: "natural-zh",
    voices: [
      {
        id: "natural-zh",
        name: "Natural Mandarin",
        inUse: true,
        desc: "Polite, clear cadence for urban domestic accounts",
        audioUrl: "/voices/voice_preview_aisyah - animated, curious and clear.mp3",
        sampleText: "Nǐ hǎo, wǒ shì Indah Water de zhìnéng zhùshǒu Mei Ling.",
      },
      {
        id: "gentle-cantonese",
        name: "Gentle Cantonese",
        inUse: false,
        desc: "Warm Cantonese register for senior account holders",
        audioUrl: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
        sampleText: "Nei hou, ngo si Indah Water ge Mei Ling.",
      },
    ],
    manner: {
      warmth: 80,
      firmness: 50,
      formality: 65,
      pace: 55,
    },
    firstMessage:
      "Nǐ hǎo, wǒ shì Indah Water de zhìnéng zhùshǒu Mei Ling. Wǒ lái diànhuà shì guānyú nín de páishuǐ fúwù zhàngdān, qǐngwèn xiànzài fāngbiàn shuōhuà ma?",
    extraPromptInstructions:
      "Provide options for JomPAY and Touch 'n Go eWallet payment links. Keep technical terminology simple and easy to understand.",
    systemRole: "Mandarin / Cantonese Multilingual Assistant",
    offers: {
      maxDiscount: 10,
      maxInstalments: 6,
      escalationThreshold: 500,
    },
  },
  {
    id: "priya",
    name: "Priya",
    avatar: "P",
    color: "#8b5cf6", // Purple
    status: "Offline",
    role: "Domestic · Tamil",
    description:
      "Courteous Tamil & English voice agent dedicated to localized domestic account assistance and payment plan setup.",
    callsCount: 520,
    resolvedPct: 29,
    handedPct: 11,
    complaintsPerK: 0.3,
    languages: ["Tamil", "English"],
    langCodes: "TA · EN",
    voiceId: "warm-ta",
    voices: [
      {
        id: "warm-ta",
        name: "Warm Tamil",
        inUse: true,
        desc: "Soft tone, patient delivery for domestic households",
        audioUrl: "/voices/malay-asistant.wav",
        sampleText: "Vanakkam, naan Indah Water kural uthaviyaalar Priya.",
      },
      {
        id: "clear-en",
        name: "Clear Accent EN",
        inUse: false,
        desc: "Friendly Malaysian English accent",
        audioUrl: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
        sampleText: "Hello, this is Priya calling from Indah Water Careline.",
      },
    ],
    manner: {
      warmth: 88,
      firmness: 40,
      formality: 50,
      pace: 50,
    },
    firstMessage:
      "Vanakkam, naan Indah Water-in kural uthaviyaalar Priya. Unggal kashivu neer kattanam thodarpaga pesugiren, ippothu pesa mudiyuma?",
    extraPromptInstructions:
      "Provide step-by-step guidance for online banking payments. Offer callback scheduling if customer is busy.",
    systemRole: "Tamil & English Community Care Assistant",
    offers: {
      maxDiscount: 10,
      maxInstalments: 6,
      escalationThreshold: 400,
    },
  },
  {
    id: "nur",
    name: "Nur",
    avatar: "N",
    color: "#dc2626", // Red / Brown
    status: "Live",
    role: "Hardship & welfare",
    description:
      "Empathetic specialist agent for BANTU and eKasih welfare-flagged households. Zero legal pressure, pure supportive guidance for government utility rebate applications.",
    callsCount: 410,
    resolvedPct: 42,
    handedPct: 22,
    complaintsPerK: 0.0,
    languages: ["Bahasa Malaysia"],
    langCodes: "BM",
    voiceId: "empathetic-bm",
    voices: [
      {
        id: "empathetic-bm",
        name: "Empathetic Soft BM",
        inUse: true,
        desc: "Gentle, supportive, low energy tone",
        audioUrl: "/voices/malay-asistant.wav",
        sampleText: "Salam sejahtera Encik/Puan, saya Nur daripada Unit Bantuan Indah Water.",
      },
      {
        id: "soft-aisyah",
        name: "Soft Careline BM",
        inUse: false,
        desc: "Clear and empathetic female voice",
        audioUrl: "/voices/voice_preview_aisyah - animated, curious and clear.mp3",
        sampleText: "Salam, saya Nur bersedia bantu anda.",
      },
    ],
    manner: {
      warmth: 95,
      firmness: 20,
      formality: 40,
      pace: 45,
    },
    firstMessage:
      "Salam sejahtera Encik/Puan, saya Nur daripada Unit Bantuan Indah Water. Kami ingin bantu semak kelayakan rebat eKasih dan jadual pembayaran khas untuk akaun pembetungan anda.",
    extraPromptInstructions:
      "Strictly supportive path. Inform customer about state welfare subsidy options and waive late charges automatically where eligible.",
    systemRole: "Welfare & Hardship Relief Specialist",
    offers: {
      maxDiscount: 25,
      maxInstalments: 12,
      escalationThreshold: 250,
    },
  },
];

export default function VoiceAgents() {
  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [activeId, setActiveId] = useState("aina");
  const [activeTab, setActiveTab] = useState("character"); // 'character' | 'conversation' | 'offers' | 'performance'
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showTalkModal, setShowTalkModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Call simulation state
  const [callState, setCallState] = useState({
    active: false,
    duration: 0,
    muted: false,
    transcript: [],
  });

  // Form state for creating a new agent
  const [newAgentData, setNewAgentData] = useState({
    name: "",
    role: "Domestic collections",
    language: "Bahasa Malaysia",
    description: "",
    firstMessage: "",
    extraPromptInstructions: "",
  });

  const activeAgent = agents.find((a) => a.id === activeId) || agents[0];

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
      }
    };
  }, [audioPlayer]);

  // Helper to update active agent fields
  const updateAgent = (field, value) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === activeId ? { ...a, [field]: value } : a))
    );
  };

  const updateManner = (mannerKey, val) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === activeId
          ? { ...a, manner: { ...a.manner, [mannerKey]: Number(val) } }
          : a
      )
    );
  };

  // Voice playback player with real MP3 support
  const handlePlayVoice = (voice) => {
    if (playingVoiceId === voice.id && audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
      setPlayingVoiceId(null);
      return;
    }

    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (voice.audioUrl) {
      const audio = new Audio(encodeURI(voice.audioUrl));
      audio.play().catch((err) => console.log("Audio play error:", err));
      setAudioPlayer(audio);
      setPlayingVoiceId(voice.id);

      audio.onended = () => {
        setPlayingVoiceId(null);
        setAudioPlayer(null);
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        setAudioPlayer(null);
      };
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);
      utterance.rate = (activeAgent.manner.pace / 100) * 0.4 + 0.8;
      utterance.pitch = (activeAgent.manner.warmth / 100) * 0.4 + 0.8;
      utterance.onend = () => setPlayingVoiceId(null);
      utterance.onerror = () => setPlayingVoiceId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingVoiceId(voice.id);
    } else {
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  const handlePublish = () => {
    setToastMessage(`Agent ${activeAgent.name} configuration published live to Voice AI Engine!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Call simulation timer
  useEffect(() => {
    let timer;
    if (callState.active) {
      timer = setInterval(() => {
        setCallState((s) => ({ ...s, duration: s.duration + 1 }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState.active]);

  const startTestCall = () => {
    setCallState({
      active: true,
      duration: 0,
      muted: false,
      transcript: [
        {
          speaker: activeAgent.name,
          text: activeAgent.firstMessage,
          time: "00:01",
        },
      ],
    });
    setShowTalkModal(true);

    // Play active agent's voice MP3 if available
    const activeVoice = activeAgent.voices.find((v) => v.id === activeAgent.voiceId) || activeAgent.voices[0];
    if (activeVoice) {
      handlePlayVoice(activeVoice);
    }

    // Simulate customer reply after 5 seconds
    setTimeout(() => {
      setCallState((s) => {
        if (!s.active) return s;
        return {
          ...s,
          transcript: [
            ...s.transcript,
            {
              speaker: "Customer (Encik Ahmad)",
              text: "Boleh, teruskan. Saya nak tahu berapa baki tunggakan saya sekarang.",
              time: "00:05",
            },
            {
              speaker: activeAgent.name,
              text: `Baki tunggakan akaun anda adalah RM90.00 untuk tempoh Julai hingga Disember. Boleh saya bantu sediakan pautan bayaran pantas menerusi WhatsApp?`,
              time: "00:08",
            },
          ],
        };
      });
    }, 5000);
  };

  const endTestCall = () => {
    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
    }
    setPlayingVoiceId(null);
    setCallState((s) => ({ ...s, active: false }));
    setShowTalkModal(false);
  };

  const handleCreateAgent = (e) => {
    e.preventDefault();
    if (!newAgentData.name.trim()) return;

    const newId = newAgentData.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const initials = newAgentData.name.charAt(0).toUpperCase();

    const created = {
      id: newId,
      name: newAgentData.name,
      avatar: initials,
      color: "#0b7fc4",
      status: "Live",
      role: newAgentData.role,
      description: newAgentData.description || "Custom recovery agent tailored for customer care.",
      callsCount: 0,
      resolvedPct: 0,
      handedPct: 0,
      complaintsPerK: 0.0,
      languages: [newAgentData.language],
      langCodes: newAgentData.language === "Bahasa Malaysia" ? "BM" : "EN",
      voiceId: "natural-bm",
      voices: [
        {
          id: "natural-bm",
          name: "Natural Voice",
          inUse: true,
          desc: "Warm mid register tone",
          audioUrl: "/voices/voice_preview_aisyah - expressive, engaging and clear.mp3",
          sampleText: `Salam, saya ${newAgentData.name} daripada Indah Water.`,
        },
      ],
      manner: { warmth: 75, firmness: 50, formality: 60, pace: 55 },
      firstMessage:
        newAgentData.firstMessage ||
        `Salam, saya ${newAgentData.name} daripada Indah Water Careline. Boleh saya bantu anda hari ini?`,
      extraPromptInstructions:
        newAgentData.extraPromptInstructions ||
        "Be polite, patient and helpful. State invoice details clearly.",
      systemRole: "Customer Care & Recovery Assistant",
      offers: { maxDiscount: 10, maxInstalments: 6, escalationThreshold: 500 },
    };

    setAgents((prev) => [...prev, created]);
    setActiveId(newId);
    setShowNewModal(false);
    setNewAgentData({
      name: "",
      role: "Domestic collections",
      language: "Bahasa Malaysia",
      description: "",
      firstMessage: "",
      extraPromptInstructions: "",
    });

    setToastMessage(`New agent "${created.name}" created successfully!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fmtSecs = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast notification */}
      {toastMessage && (
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
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Who calls, and how they speak</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            Configure Voice AI personas, speech voices, empathy sliders and conversation prompts.
          </p>
        </div>
        <button
          className="btn-solid"
          style={{
            background: "#10b981",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setShowNewModal(true)}
        >
          <span>+</span> New agent
        </button>
      </div>

      {/* Main Grid: Left Agent Selector + Right Customizer & Sample Conversation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "310px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left Column: 5 Agents List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {agents.map((agent) => {
            const isActive = agent.id === activeId;
            return (
              <div
                key={agent.id}
                onClick={() => {
                  if (audioPlayer) {
                    audioPlayer.pause();
                    setAudioPlayer(null);
                  }
                  setPlayingVoiceId(null);
                  setActiveId(agent.id);
                }}
                style={{
                  background: "var(--surface)",
                  border: isActive
                    ? "2px solid #10b981"
                    : "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive
                    ? "0 4px 14px rgba(16, 185, 129, 0.12)"
                    : "var(--shadow)",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar Circle */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: agent.color || "#10b981",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {agent.avatar}
                  </div>

                  {/* Name & Role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                        {agent.name}
                      </span>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: agent.status === "Live" ? "#10b981" : "#9ca3af",
                          display: "inline-block",
                        }}
                        title={agent.status}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-dim)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 1,
                      }}
                    >
                      {agent.role}
                    </div>
                  </div>
                </div>

                {/* Stats & Languages Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid var(--border)",
                    fontSize: 12,
                    color: "var(--text-dim)",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text)" }}>
                      {agent.callsCount ? agent.callsCount.toLocaleString() : "—"}
                    </strong>{" "}
                    calls
                  </div>
                  <div>
                    <strong style={{ color: "var(--text)" }}>
                      {agent.resolvedPct ? `${agent.resolvedPct}%` : "—"}
                    </strong>{" "}
                    resolved
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--text-faint)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {agent.langCodes}
                  </div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              padding: "12px 14px",
              background: "var(--surface-2)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--text-dim)",
              lineHeight: 1.5,
              border: "1px solid var(--border)",
            }}
          >
            💡 <strong>Journeys pick an agent by role and language.</strong> A Mandarin-flagged account gets Mei Ling; a BANTU reply gets Nur.
          </div>
        </div>

        {/* Right Column: Selected Agent Details + Customizer + Live Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Active Agent Header Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 22,
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: activeAgent.color,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  {activeAgent.avatar}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{activeAgent.name}</h2>
                    <span
                      style={{
                        background: activeAgent.status === "Live" ? "rgba(16,185,129,0.15)" : "rgba(156,163,175,0.15)",
                        color: activeAgent.status === "Live" ? "#10b981" : "#6b7280",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {activeAgent.status}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
                      {activeAgent.role}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13.5,
                      color: "var(--text-dim)",
                      maxWidth: 620,
                      lineHeight: 1.5,
                    }}
                  >
                    {activeAgent.description}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn-solid"
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    padding: "9px 16px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={startTestCall}
                >
                  <span>📞</span> Talk to {activeAgent.name}
                </button>
                <button
                  className="btn-ghost"
                  style={{
                    border: "1px solid var(--border-strong)",
                    padding: "9px 16px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={handlePublish}
                >
                  Publish
                </button>
              </div>
            </div>

            {/* Stat Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Calls · 30d</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                  {activeAgent.callsCount ? activeAgent.callsCount.toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Resolved on call</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                  {activeAgent.resolvedPct ? `${activeAgent.resolvedPct}%` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Handed to a person</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                  {activeAgent.handedPct ? `${activeAgent.handedPct}%` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Complaints / 1,000</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                  {activeAgent.complaintsPerK !== undefined ? activeAgent.complaintsPerK : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: 24,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 2,
            }}
          >
            {[
              { id: "character", label: "Character" },
              { id: "conversation", label: "Conversation" },
              { id: "offers", label: "Offers & limits" },
              { id: "performance", label: "Performance" },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "8px 0 12px",
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: 14,
                    color: isSelected ? "var(--text)" : "var(--text-dim)",
                    cursor: "pointer",
                    borderBottom: isSelected ? "2.5px solid #10b981" : "2.5px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content + Sample Conversation Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            {/* Left Box: Tab Specific Customizer Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {activeTab === "character" && (
                <>
                  {/* Voice Selector Card */}
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 18,
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 15, color: "var(--text)" }}>Voice</strong>{" "}
                        <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 6 }}>
                          Tap to hear a line
                        </span>
                      </div>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "#10b981",
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() => alert("Voice cloning drawer is available on Enterprise plan.")}
                      >
                        Clone a new voice
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {activeAgent.voices.map((voice) => {
                        const isSelected = activeAgent.voiceId === voice.id;
                        const isPlaying = playingVoiceId === voice.id;

                        return (
                          <div
                            key={voice.id}
                            onClick={() => updateAgent("voiceId", voice.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              borderRadius: 12,
                              border: isSelected
                                ? "2px solid #10b981"
                                : "1px solid var(--border)",
                              background: isSelected
                                ? "rgba(16,185,129,0.04)"
                                : "var(--surface)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayVoice(voice);
                                }}
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: isPlaying ? "#10b981" : "var(--surface-3)",
                                  color: isPlaying ? "#ffffff" : "var(--text)",
                                  border: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                                title="Play voice sample MP3"
                              >
                                {isPlaying ? "⏸" : "▶"}
                              </button>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <strong style={{ fontSize: 14, color: "var(--text)" }}>
                                    {voice.name}
                                  </strong>
                                  {voice.inUse && (
                                    <span
                                      style={{
                                        background: "rgba(16,185,129,0.15)",
                                        color: "#10b981",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                      }}
                                    >
                                      In use
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                                  {voice.desc}
                                </div>
                              </div>
                            </div>

                            {/* Waveform graphic */}
                            <div style={{ display: "flex", alignItems: "center", gap: 3, opacity: isPlaying ? 1 : 0.4 }}>
                              {[12, 18, 24, 14, 20, 10, 22, 16, 26, 12].map((h, i) => (
                                <span
                                  key={i}
                                  style={{
                                    width: 3,
                                    height: isPlaying ? Math.max(6, Math.floor(Math.random() * 26)) : h,
                                    background: isPlaying ? "#10b981" : "var(--text-faint)",
                                    borderRadius: 2,
                                    transition: "height 0.1s ease",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manner / Tone Sliders Card */}
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 18,
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <strong style={{ fontSize: 15, color: "var(--text)" }}>Manner</strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
                      {[
                        { key: "warmth", label: "Warmth" },
                        { key: "firmness", label: "Firmness" },
                        { key: "formality", label: "Formality" },
                        { key: "pace", label: "Pace" },
                      ].map((item) => (
                        <div
                          key={item.key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "90px 1fr 45px",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>
                            {item.label}
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={activeAgent.manner[item.key]}
                            onChange={(e) => updateManner(item.key, e.target.value)}
                            style={{
                              width: "100%",
                              accentColor: "#10b981",
                              cursor: "pointer",
                            }}
                          />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", textAlign: "right" }}>
                            {activeAgent.manner[item.key]}%
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12.5, color: "var(--text-dim)", fontWeight: 600 }}>Speaks: </span>
                      <div style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                        {activeAgent.languages.map((lang) => (
                          <span
                            key={lang}
                            style={{
                              background: "var(--surface-3)",
                              padding: "3px 10px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--text)",
                            }}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "conversation" && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                      First Message (Greeting)
                    </label>
                    <textarea
                      rows={4}
                      value={activeAgent.firstMessage}
                      onChange={(e) => updateAgent("firstMessage", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontSize: 13.5,
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4, display: "block" }}>
                      This message is spoken immediately when the call connects. Updates the sample conversation preview live.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                      Extra Prompt Instructions & Guidelines
                    </label>
                    <textarea
                      rows={5}
                      value={activeAgent.extraPromptInstructions}
                      onChange={(e) => updateAgent("extraPromptInstructions", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontSize: 13.5,
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4, display: "block" }}>
                      System prompt instructions, empathy constraints, and payment objection rules.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "offers" && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <strong style={{ fontSize: 15, color: "var(--text)" }}>Offers & Recovery Limits</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", marginBottom: 4 }}>
                        Max Discount / Rebate Authority
                      </label>
                      <select
                        value={activeAgent.offers?.maxDiscount || 10}
                        onChange={(e) =>
                          updateAgent("offers", { ...activeAgent.offers, maxDiscount: Number(e.target.value) })
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text)",
                        }}
                      >
                        <option value={5}>5% Fee Waiver</option>
                        <option value={10}>10% Rebate</option>
                        <option value={15}>15% Rebate</option>
                        <option value={25}>25% eKasih Rebate</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", marginBottom: 4 }}>
                        Max Instalment Tenure
                      </label>
                      <select
                        value={activeAgent.offers?.maxInstalments || 6}
                        onChange={(e) =>
                          updateAgent("offers", { ...activeAgent.offers, maxInstalments: Number(e.target.value) })
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border-strong)",
                          background: "var(--surface)",
                          color: "var(--text)",
                        }}
                      >
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "performance" && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <strong style={{ fontSize: 15, color: "var(--text)" }}>30-Day Performance Log</strong>
                  <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
                    Live telemetry for calls handled by <strong>{activeAgent.name}</strong>.
                  </p>

                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Outcome</th>
                          <th className="num">Duration</th>
                          <th className="num">Resolution</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>ACC-88301</strong></td>
                          <td>Promise to Pay</td>
                          <td className="num">1m 42s</td>
                          <td className="num"><Badge tone="ok">Resolved</Badge></td>
                        </tr>
                        <tr>
                          <td><strong>ACC-72109</strong></td>
                          <td>Instalment Plan Set</td>
                          <td className="num">2m 15s</td>
                          <td className="num"><Badge tone="ok">Resolved</Badge></td>
                        </tr>
                        <tr>
                          <td><strong>ACC-94812</strong></td>
                          <td>Handed to Supervisor</td>
                          <td className="num">3m 04s</td>
                          <td className="num"><Badge tone="warn">Escalated</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Live Sample Conversation Preview */}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 15, color: "var(--text)" }}>Sample conversation</strong>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 1 }}>
                    Generated inside the policy
                  </div>
                </div>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#10b981",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => alert("Refreshed conversation simulation.")}
                >
                  Regenerate
                </button>
              </div>

              {/* Chat Conversation Flow */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Agent Bubble 1 */}
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "12px 14px",
                    maxWidth: "92%",
                    alignSelf: "flex-start",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>
                    {activeAgent.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>
                    {activeAgent.firstMessage}
                  </div>
                </div>

                {/* Customer Bubble 1 */}
                <div
                  style={{
                    background: "var(--surface-3)",
                    borderRadius: "14px 14px 4px 14px",
                    padding: "10px 14px",
                    maxWidth: "85%",
                    alignSelf: "flex-end",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 2 }}>
                    Customer
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    Boleh, teruskan. Bil apa ni?
                  </div>
                </div>

                {/* Intent Tag */}
                <div style={{ textAlign: "center", margin: "2px 0" }}>
                  <span
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      color: "#059669",
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    Intent: confused · archetype Tak Faham → explain first
                  </span>
                </div>

                {/* Agent Bubble 2 */}
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "12px 14px",
                    maxWidth: "92%",
                    alignSelf: "flex-start",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>
                    {activeAgent.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>
                    Bil pembetungan RM90 untuk Julai hingga Disember, untuk rumah di Taman Sri Muda. Caj ini menampung rawatan kumbahan dari rumah Encik ke loji rawatan. Ia dibil setiap enam bulan, jadi ramai yang terlupa.
                  </div>
                </div>

                {/* Customer Bubble 2 */}
                <div
                  style={{
                    background: "var(--surface-3)",
                    borderRadius: "14px 14px 4px 14px",
                    padding: "10px 14px",
                    maxWidth: "85%",
                    alignSelf: "flex-end",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 2 }}>
                    Customer
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    Oh, yang tu. Saya ingat sudah bayar sekali dengan bil air.
                  </div>
                </div>

                {/* Intent Tag 2 */}
                <div style={{ textAlign: "center", margin: "2px 0" }}>
                  <span
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      color: "#059669",
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    Intent: will pay · move: send QR now
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Call Simulation Modal */}
      {showTalkModal && (
        <Modal
          title={`Live Test Call with ${activeAgent.name}`}
          onClose={endTestCall}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="btn-ghost"
                onClick={() => setCallState((s) => ({ ...s, muted: !s.muted }))}
              >
                {callState.muted ? "🔇 Unmute Mic" : "🎙 Mute Mic"}
              </button>
              <button
                className="btn-solid"
                style={{ background: "#dc2626", color: "#ffffff" }}
                onClick={endTestCall}
              >
                End Call
              </button>
            </div>
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "10px 0",
            }}
          >
            {/* Audio Waveform Equalizer animation */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: activeAgent.color,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
                boxShadow: "0 0 24px " + activeAgent.color + "66",
              }}
            >
              {activeAgent.avatar}
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{activeAgent.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
                Connected · {fmtSecs(callState.duration)}
              </div>
            </div>

            {/* Live Audio Waves */}
            <div style={{ display: "flex", gap: 4, height: 30, alignItems: "center" }}>
              {[14, 22, 30, 18, 26, 12, 28, 20, 16, 24, 12].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 4,
                    height: Math.max(6, Math.floor(Math.random() * 28)),
                    background: "#10b981",
                    borderRadius: 3,
                    transition: "height 0.15s ease",
                  }}
                />
              ))}
            </div>

            {/* Live Call Transcript */}
            <div
              style={{
                width: "100%",
                maxHeight: 220,
                overflowY: "auto",
                background: "var(--surface-2)",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                border: "1px solid var(--border)",
              }}
            >
              {callState.transcript.map((t, idx) => (
                <div key={idx} style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{t.speaker}: </span>
                  <span style={{ color: "var(--text-dim)" }}>{t.text}</span>
                  <span style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: 6 }}>
                    [{t.time}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* New Agent Modal */}
      {showNewModal && (
        <Modal
          title="Create New Voice AI Agent"
          onClose={() => setShowNewModal(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-solid"
                style={{ background: "#10b981", color: "#ffffff" }}
                onClick={handleCreateAgent}
              >
                Create Agent
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateAgent}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farhan"
                  value={newAgentData.name}
                  onChange={(e) => setNewAgentData({ ...newAgentData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Role & Queue Target
                </label>
                <select
                  value={newAgentData.role}
                  onChange={(e) => setNewAgentData({ ...newAgentData, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  <option value="Domestic collections">Domestic collections</option>
                  <option value="Commercial & SME">Commercial & SME</option>
                  <option value="Hardship & welfare">Hardship & welfare</option>
                  <option value="High Arrears Recovery">High Arrears Recovery</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Primary Language
                </label>
                <select
                  value={newAgentData.language}
                  onChange={(e) => setNewAgentData({ ...newAgentData, language: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  <option value="Bahasa Malaysia">Bahasa Malaysia</option>
                  <option value="English">English</option>
                  <option value="Mandarin">Mandarin</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  First Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Greeting message spoken on call connect..."
                  value={newAgentData.firstMessage}
                  onChange={(e) => setNewAgentData({ ...newAgentData, firstMessage: e.target.value })}
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
          </form>
        </Modal>
      )}
    </div>
  );
}
