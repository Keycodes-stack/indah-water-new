import { Stats, Panel, Badge } from "../components/ui.jsx";
import { PhoneCallIcon, MicIcon, ZapIcon } from "../components/icons.jsx";

const TEST_PHONE_NUMBER = "+13469986661";
const FORMATTED_PHONE = "+1 (346) 998-6661";
const VAPI_DEMO_URL =
  "https://vapi.ai?demo=true&shareKey=4440b6a1-4ea4-47ab-a837-7d623172b038&assistantId=59567db0-c442-4ddf-b34a-cefa922bdca7";

export default function Testing() {
  const handleDirectCall = () => {
    window.location.href = `tel:${TEST_PHONE_NUMBER}`;
  };

  return (
    <>
      <Stats cards={[
        { label: "AI Test Number", value: FORMATTED_PHONE, sub: "Direct SIM dialer entry point" },
        { label: "Trunk Status", value: "Active", sub: "Vapi AI Voice Engine online", tone: "good" },
        { label: "Protocol", value: "Tel / Cellular", sub: "Native mobile & desktop dialer" },
        { label: "Assistant", value: "Collections AI", sub: "Live English & Bahasa agent" },
      ]} />

      <div className="callout">
        <strong>Direct Telephony Testing.</strong> Use this page to test live voice AI agent capabilities directly from your mobile phone or desktop softphone. Clicking the direct call button launches your device SIM dialer.
      </div>

      <div className="grid c2">
        {/* Card 1: Direct SIM Call AI Agent */}
        <Panel
          title="Test AI agent"
          sub="give him a call directly"
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "24px 16px",
            background: "var(--surface-2)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            marginBottom: 16
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--good-soft)",
              color: "var(--good)",
              display: "grid",
              placeItems: "center",
              marginBottom: 12
            }}>
              <PhoneCallIcon size={32} />
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "var(--text)", fontFamily: "monospace" }}>
              {TEST_PHONE_NUMBER}
            </h3>
            <span className="badge good" style={{ fontSize: 11, marginBottom: 14 }}>
              ● Live Cellular SIM Direct Trunk
            </span>

            <p style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 360, margin: "0 0 20px" }}>
              Clicking below will redirect you to call <strong>{TEST_PHONE_NUMBER}</strong> directly on your SIM dialer.
            </p>

            <a
              href={`tel:${TEST_PHONE_NUMBER}`}
              onClick={handleDirectCall}
              className="btn-solid"
              style={{
                background: "var(--good)",
                borderColor: "var(--good)",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                padding: "12px 28px",
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 4px 14px rgba(12, 163, 12, 0.35)",
                textDecoration: "none"
              }}
            >
              <PhoneCallIcon size={18} />
              <span>Call +13469986661 directly</span>
            </a>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
            Opens phone SIM dialer on mobile (iOS/Android) or native desktop softphone.
          </div>
        </Panel>

        {/* Card 2: Vapi Web Browser Test Assistant */}
        <Panel
          title="Vapi Web Assistant Test"
          sub="Test the AI agent directly inside your web browser without using cellular SIM minutes"
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "24px 16px",
            background: "var(--surface-2)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            marginBottom: 16
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--brand-soft)",
              color: "var(--brand)",
              display: "grid",
              placeItems: "center",
              marginBottom: 12
            }}>
              <MicIcon size={32} />
            </div>

            <h3 style={{ fontSize: 18, margin: "0 0 6px", color: "var(--text)" }}>
              Web Microphone Demo
            </h3>
            <span className="badge info" style={{ fontSize: 11, marginBottom: 14 }}>
              WebRTC Audio Sandbox
            </span>

            <p style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 360, margin: "0 0 20px" }}>
              Test real-time conversation via browser microphone and speakers using Vapi WebRTC test mode.
            </p>

            <a
              href={VAPI_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-solid"
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 22px",
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none"
              }}
            >
              <ZapIcon size={16} />
              <span>Launch Web Test Assistant</span>
            </a>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
            Requires browser microphone permission.
          </div>
        </Panel>
      </div>

      {/* Panel 3: Dialing Instructions & Technical Details */}
      <Panel
        title="Direct SIM Calling Details & Instructions"
        sub="Technical parameters and expected telephony behavior"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Configuration Value</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Target Phone Number</strong></td>
                <td><code className="mono">{TEST_PHONE_NUMBER}</code></td>
                <td>Direct cellular number assigned to live Vapi agent trunk</td>
              </tr>
              <tr>
                <td><strong>URI Protocol</strong></td>
                <td><code className="mono">tel:+13469986661</code></td>
                <td>Standard RFC 3966 telecommunication URI handler</td>
              </tr>
              <tr>
                <td><strong>Device Compatibility</strong></td>
                <td>Mobile (iOS / Android), Desktop Softphone</td>
                <td>Opens default SIM dialer or registered VoIP application</td>
              </tr>
              <tr>
                <td><strong>Operating Hours</strong></td>
                <td>24 / 7 Live Online</td>
                <td>Automated AI response available anytime</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
