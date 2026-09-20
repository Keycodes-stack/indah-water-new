import { PhoneCallIcon } from "../components/icons.jsx";

const AGENTS = [
  {
    id: "aina-en",
    name: "Aina (English)",
    language: "English",
    number: "+13469986661",
    formattedNumber: "+1 (346) 998-6661",
    color: "#10b981", // Emerald Green
  },
  {
    id: "aina-my",
    name: "Aina (Malay)",
    language: "Bahasa Melayu (Malay)",
    number: "+18594793156",
    formattedNumber: "+1 (859) 479-3156",
    color: "#0b7fc4", // IWK Blue
  },
];

export default function Testing() {
  return (
    <div style={{ padding: "20px 0", maxWidth: 960, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "var(--shadow)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            {/* Circle Phone Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: agent.color + "18",
                color: agent.color,
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
              }}
            >
              <PhoneCallIcon size={36} />
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
                marginBottom: 18,
                display: "inline-block",
              }}
            >
              {agent.language}
            </span>

            {/* Phone Number */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: "var(--text)",
                marginBottom: 24,
                letterSpacing: "0.5px",
              }}
            >
              {agent.formattedNumber}
            </div>

            {/* Call Action Button */}
            <a
              href={`tel:${agent.number}`}
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
                textDecoration: "none",
                boxShadow: `0 4px 14px ${agent.color}40`,
              }}
            >
              <PhoneCallIcon size={18} />
              <span>Call {agent.number}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
