/* Call / Join — static placeholder. Live calling is not wired up. */

import { Link } from "react-router-dom";

export default function CallJoin() {
  return (
    <div className="gate">
      <div className="gate-icon" aria-hidden="true">🔒</div>
      <h2>Twilio paid subscription required</h2>
      <p>
        Placing and joining calls needs a phone number provisioned through Twilio.
        This feature is unavailable until a paid Twilio subscription is active.
      </p>
      <p className="gate-links">
        <Link to="/voice-ai">View call logs and recordings →</Link>
        <span style={{ margin: "0 10px", color: "var(--border-strong)" }}>|</span>
        <Link to="/tickets">📋 Return to CRM Tickets Kanban →</Link>
      </p>
    </div>
  );
}
