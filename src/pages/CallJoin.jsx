import { useState, useEffect } from "react";
import { Badge } from "../components/ui.jsx";
import { PhoneIcon, PhoneCallIcon } from "../components/icons.jsx";

export default function CallJoin() {
  const [activeTab, setActiveTab] = useState("bill"); // 'bill' | 'history' | 'details'
  const [waitingTime, setWaitingTime] = useState(42);
  const [toastMessage, setToastMessage] = useState(null);

  // Timer countdown simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingTime((t) => (t > 0 ? t - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActionClick = (actionName) => {
    setToastMessage(`Feature Coming Soon — ${actionName} requires live Twilio/Vapi WebRTC bridge.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#0b7fc4",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13.5,
            boxShadow: "0 10px 25px rgba(11, 127, 196, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Live Call Status */}
      <div
        style={{
          background: "#1e293b",
          color: "#ffffff",
          borderRadius: 12,
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 8px #ef4444",
            }}
          />
          <strong style={{ fontWeight: 700 }}>Live call · Wong Siew M***</strong>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ fontSize: 13, opacity: 0.9 }}>
            Nur → you · handed over at 02:17
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15 }}>
            02:17
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.12)",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              opacity: 0.9,
            }}
          >
            Farah · on duty
          </span>
        </div>
      </div>

      {/* Main Container: Center Call Takeover Box + Right Customer Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Center Main Card: Call Takeover Request */}
        <div
          style={{
            background: "var(--surface)",
            border: "2px solid #10b981",
            borderRadius: 18,
            padding: 32,
            boxShadow: "0 6px 20px rgba(16, 185, 129, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            margin: "10px 0",
          }}
        >
          {/* Soft Green Icon Circle */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(16,185,129,0.12)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <PhoneCallIcon size={28} />
          </div>

          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>
            Nur needs you on a call
          </h2>

          <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 20 }}>
            Wong Siew M*** · waiting{" "}
            <strong style={{ color: "#ef4444", fontFamily: "var(--mono)" }}>
              0:{waitingTime < 10 ? `0${waitingTime}` : waitingTime}
            </strong>
          </div>

          {/* Hardship Reason Quote Box */}
          <div
            style={{
              background: "rgba(250, 178, 25, 0.12)",
              border: "1px solid rgba(250, 178, 25, 0.3)",
              borderRadius: 12,
              padding: "16px 20px",
              textAlign: "left",
              maxWidth: 540,
              width: "100%",
              marginBottom: 24,
            }}
          >
            <div style={{ fontWeight: 800, color: "#b45309", fontSize: 13, marginBottom: 4 }}>
              Hardship language.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5 }}>
              "Suami saya hilang kerja. Kami tak mampu bayar apa-apa sekarang. Anak pun sakit."{" "}
              <span style={{ color: "var(--text-dim)" }}>
                Nur has paused collections and told the customer a person is coming. Nothing about money was promised.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
              maxWidth: 540,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              className="btn-solid"
              style={{
                background: "#10b981",
                borderColor: "#10b981",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 14.5,
                padding: "12px 24px",
                borderRadius: 10,
                cursor: "pointer",
                flex: 1,
                minWidth: 150,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
              }}
              onClick={() => handleActionClick("Take the call")}
            >
              Take the call
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{
                border: "1px solid var(--border-strong)",
                fontWeight: 600,
                fontSize: 13.5,
                padding: "12px 18px",
                borderRadius: 10,
                cursor: "pointer",
              }}
              onClick={() => handleActionClick("Listen to call")}
            >
              Listen to call
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{
                border: "1px solid var(--border-strong)",
                fontWeight: 600,
                fontSize: 13.5,
                padding: "12px 18px",
                borderRadius: 10,
                cursor: "pointer",
              }}
              onClick={() => handleActionClick("Send to Aida (hardship)")}
            >
              Send to Aida (hardship)
            </button>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", maxWidth: 460 }}>
            If nobody takes it in 60 s, the customer is offered a callback and the account stays held.
          </div>

          {/* Feature Badge Note */}
          <div
            style={{
              marginTop: 24,
              padding: "6px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              fontSize: 11.5,
              color: "var(--text-dim)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Live Telephony Takeover & WebRTC Monitoring</span>
          </div>
        </div>

        {/* Right Sidebar: Customer CRM Record */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 18,
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Customer Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--surface-3)",
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              W
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
                Wong Siew M***
              </h3>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>
                9934-2210-7765 · +60 14-554 3*** · Pandan Indah, Ampang
              </div>
            </div>
          </div>

          {/* Customer Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              Terhimpit
            </span>
            <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              Hardship · set today
            </span>
            <span style={{ background: "rgba(16,185,129,0.12)", color: "#059669", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              Collections paused
            </span>
            <span style={{ background: "var(--surface-3)", color: "var(--text-dim)", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>
              Consent · WA, voice
            </span>
          </div>

          {/* Tabs Bar */}
          <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
            {[
              { id: "bill", label: "Bill & arrears" },
              { id: "history", label: "History" },
              { id: "details", label: "Details" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "6px 0",
                  fontSize: 12.5,
                  fontWeight: activeTab === t.id ? 700 : 600,
                  color: activeTab === t.id ? "var(--text)" : "var(--text-dim)",
                  cursor: "pointer",
                  borderBottom: activeTab === t.id ? "2px solid #10b981" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content: Bill & Arrears */}
          {activeTab === "bill" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Arrears & Last Payment Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Arrears</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                    RM 175.00
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                    240 days · 3 periods
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Last payment</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                    RM 59
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                    12 Jul · counter
                  </div>
                </div>
              </div>

              {/* Periods Table */}
              <div className="table-wrap">
                <table style={{ fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Jul–Dec 2026</td>
                      <td className="num">RM 90.00</td>
                      <td className="num" style={{ width: 60 }}>
                        <Badge tone="warn">Unpaid</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Jan–Jun 2026</td>
                      <td className="num">RM 72.00</td>
                      <td className="num">
                        <Badge tone="warn">Unpaid</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Jul–Dec 2025</td>
                      <td className="num">RM 13.00</td>
                      <td className="num">
                        <Badge tone="info">Part paid</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Jan–Jun 2025</td>
                      <td className="num">RM 0.00</td>
                      <td className="num">
                        <Badge tone="ok">Paid</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tariff & Plan */}
              <div style={{ fontSize: 12, borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-dim)" }}>Tariff</span>
                  <span style={{ fontWeight: 600 }}>Low-cost · RM4/month</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-dim)" }}>Plan</span>
                  <span style={{ fontWeight: 600 }}>None · eligible RM10 × 18</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 0" }}>
              • <strong>15 Sep:</strong> Vapi AI call answered (2m 14s)<br />
              • <strong>12 Jul:</strong> Counter payment RM59.00 received<br />
              • <strong>01 Jun:</strong> WhatsApp reminder sent
            </div>
          )}

          {activeTab === "details" && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 0" }}>
              • Account Type: Domestic Residential<br />
              • Zone: Selangor East / Ampang<br />
              • eKasih Status: Qualified for rebate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
