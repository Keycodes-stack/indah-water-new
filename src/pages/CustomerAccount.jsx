/* Customer account — laid out after the design reference, filled with its
   sample record (Wong Siew Mei). Static sample data, no backend calls. */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

import {
  PhoneIcon, UsersIcon, FileTextIcon, PlayIcon, PauseIcon, MicIcon, CheckIcon, XIcon,
} from "../components/icons.jsx";
import "../styles/customer-account.css";

const ACCOUNT = {
  status: "On a payment plan",
  name: "Wong Siew Mei",
  line: "Account 9934-2210-7765. Domestic, low-cost terrace.",
  flag: "Hardship confirmed 5 Oct",
  phone: "+60 3-6043 2495",
  details: [
    ["Arrears", "RM 165.00", "4 bills"],
    ["Next instalment", "RM 10.00", "Due 5 Nov"],
    ["Prefers", "WhatsApp", "Bahasa Malaysia"],
    ["Premise", "Pandan Indah", "Ampang, Selangor"],
    ["Registered owner", "Since 2014", "Lives at the premise"],
    ["Best time to reach", "Weekdays", "8pm to 9pm"],
  ],
};

const PROFILE = [
  { axis: "Pays regularly", you: 82, peers: 62 },
  { axis: "Keeps promises", you: 74, peers: 58 },
  { axis: "Responds to contact", you: 88, peers: 66 },
  { axis: "Uses digital channels", you: 79, peers: 62 },
  { axis: "Ability to pay", you: 34, peers: 55 },
  { axis: "Reachable", you: 91, peers: 60 },
  { axis: "Low dispute risk", you: 95, peers: 70 },
];

const OUTCOMES = [
  { label: "Pays the November instalment on time", pct: 78, tone: "good" },
  { label: "Reads a WhatsApp reminder within an hour", pct: 86, tone: "good" },
  { label: "Breaks the plan within 6 months", pct: 22, tone: "bad" },
  { label: "Raises a billing dispute this year", pct: 4, tone: "bad" },
];

const DRIVERS = [
  { label: "Paid every bill on time, 2019 to 2024", v: 18 },
  { label: "Paid the first instalment within minutes", v: 12 },
  { label: "Reads WhatsApp reminders quickly", v: 7 },
  { label: "Household income dropped in September", v: -21 },
];

const TRACK = [
  { date: "5 Oct", p: "Pays the first instalment within 24 hours", c: 69, o: "Paid 6 minutes after the link", ok: true },
  { date: "5 Oct", p: "Accepts RM10 a month", c: 81, o: "Accepted on the call", ok: true },
  { date: "5 Oct", p: "Hardship, from what she said on the call", c: 94, o: "Confirmed by Aida Rahman", ok: true },
  { date: "2 Oct", p: "No payment within 3 days of the reminder", c: 64, o: "No payment", ok: true },
  { date: "2 Oct", p: "Reads the reminder within an hour", c: 81, o: "Read in 17 minutes", ok: true },
  { date: "14 Aug", p: "Keeps her August promise to pay", c: 69, o: "No payment. The engine did not yet know about the job loss.", ok: false },
  { date: "12 Jul", p: "Replies to a part-payment thank-you", c: 64, o: "Replied the same day", ok: true },
  { date: "3 Jul", p: "Pays the July to December bill within 30 days", c: 72, o: "Paid only part, RM59", ok: false },
  { date: "20 Feb", p: "Prefers WhatsApp to SMS", c: 76, o: "Replied on WhatsApp", ok: true },
  { date: "12 Jan", p: "Pays the January to June bill within 30 days", c: 88, o: "Paid in 9 days", ok: true },
];

const GENERAL = [
  ["Account", "9934-2210-7765"],
  ["Region", "Ampang, Selangor"],
  ["Tariff", "RM 15 a month"],
  ["Billing cycle", "Every 6 months"],
  ["Customer since", "2014"],
  ["Tags", "Hardship, Plan"],
];

const TIMELINE = [
  { t: "RM10.00 paid by DuitNow QR. First instalment.", at: "5 Oct, 10:51" },
  { t: "Aina sent the plan and a payment link on WhatsApp. Read at 10:47.", at: "5 Oct, 10:45" },
  { t: "Farah Aziz approved the plan proposed by Nur. Record D-1005-0412.", at: "5 Oct, 10:44" },
  { t: "Call with Nur, 3 min 12 s. Hardship heard, collection paused, call handed to a person.", at: "5 Oct, 10:41" },
];

function AxisTick({ x, y, textAnchor, payload }) {
  const d = PROFILE.find((p) => p.axis === payload.value);
  const low = d && d.you < 50;
  return (
    <text x={x} y={y} textAnchor={textAnchor} fontSize={12} fill={low ? "#c23232" : "var(--text-dim)"}>
      <tspan>{payload.value}</tspan>
      <tspan dx={5} fontWeight={700} fill={low ? "#c23232" : "var(--text)"}>{d?.you}</tspan>
    </text>
  );
}

function RadarDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  const low = payload && payload.you < 50;
  return <circle cx={cx} cy={cy} r={4.5} fill="var(--surface)" stroke={low ? "#c23232" : "#0a6fc2"} strokeWidth={2} />;
}

export default function CustomerAccount() {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const maxDriver = Math.max(...DRIVERS.map((d) => Math.abs(d.v)));
  const hits = TRACK.filter((r) => r.ok).length;
  const avgConf = Math.round(TRACK.reduce((n, r) => n + r.c, 0) / TRACK.length);

  return (
    <div className="ca">
      <div className="ca-main">
        {/* Account header */}
        <section className="panel ca-head">
          <div className="ca-status"><span className="ca-bar" />{ACCOUNT.status}</div>
          <h1>{ACCOUNT.name}</h1>
          <p className="ca-line">{ACCOUNT.line}</p>
          <div className="ca-actions">
            <span className="ca-flag">{ACCOUNT.flag}</span>
            <a className="btn-ghost with-ico" href={`tel:${ACCOUNT.phone.replace(/\s|-/g, "")}`}>
              <PhoneIcon size={14} /> Call
            </a>
            <button type="button" className="btn-solid" onClick={() => navigate("/review-panel")}>
              Open task (1)
            </button>
          </div>

          <div className="ca-label">Account details</div>
          <div className="ca-details">
            {ACCOUNT.details.map(([k, v, s]) => (
              <div className="ca-detail" key={k}>
                <span>{k}</span>
                <b>{v}</b>
                <small>{s}</small>
              </div>
            ))}
          </div>
        </section>

        {/* Behaviour profile */}
        <section className="panel">
          <h3 className="ca-h">Behaviour profile</h3>
          <p className="ca-sub">Scored 0 to 100 from 7 years of bills, payments and contacts. Higher is better.</p>
          <div className="ca-legend">
            <span><i className="ca-key solid" /> Wong Siew Mei</span>
            <span><i className="ca-key dash" /> Similar accounts in Selangor</span>
          </div>
          <div className="ca-radar" role="img" aria-label="Behaviour profile radar chart">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={PROFILE} outerRadius="62%" margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="var(--border-strong)" />
                <PolarAngleAxis dataKey="axis" tick={<AxisTick />} />
                <Radar dataKey="peers" stroke="var(--text-faint)" strokeDasharray="4 4" fill="none" isAnimationActive={false} />
                <Radar dataKey="you" stroke="#0a6fc2" strokeWidth={2} fill="#0a6fc2" fillOpacity={0.12} dot={<RadarDot />} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="ca-note">
            A willing payer hit by a sudden loss of income. She is easier to reach and more reliable than most similar
            accounts. The only weak score is ability to pay, which fell from 71 to 34 after the 5 October call, so a
            small plan suits her better than reminders.
          </div>
        </section>

        {/* Predicted outcomes */}
        <section className="panel">
          <h3 className="ca-h">Predicted outcomes</h3>
          <p className="ca-sub">Updated after today&apos;s payment at 10:51</p>
          <div className="ca-outcomes">
            {OUTCOMES.map((o) => (
              <div key={o.label}>
                <div className="ca-out-line"><span>{o.label}</span><b className={o.tone}>{o.pct}%</b></div>
                <div className="ca-track"><div className={`ca-fill ${o.tone}`} style={{ width: `${o.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="ca-two">
            <div className="ca-box">
              <div className="ca-label">Next best action</div>
              <b className="ca-nba">Send the November payment link on 3 Nov</b>
              <div className="ca-tags"><span>WhatsApp</span><span>Weekdays, 8pm to 9pm</span></div>
            </div>
            <div className="ca-box">
              <div className="ca-label">Key drivers, November instalment</div>
              {DRIVERS.map((d) => (
                <div className="ca-driver" key={d.label}>
                  <span>{d.label}</span>
                  <i className={d.v > 0 ? "pos" : "neg"} style={{ width: `${(Math.abs(d.v) / maxDriver) * 56}px` }} />
                  <b className={d.v > 0 ? "pos" : "neg"}>{d.v > 0 ? `+${d.v}` : `−${Math.abs(d.v)}`}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Prediction track record */}
        <section className="panel ca-trackrec">
          <h3 className="ca-h">Prediction track record <span className="ca-count">{TRACK.length}</span></h3>
          <p className="ca-sub">Predictions actioned for this account in 2026, with outcomes</p>
          <div className="ca-tags">
            <span className="ok">{hits} of {TRACK.length} came true</span>
            <span>{avgConf}% average confidence</span>
          </div>
          <div className="table-wrap ca-table">
            <table>
              <thead>
                <tr><th>Date</th><th>Prediction</th><th className="num">Confidence</th><th>Outcome</th><th>Result</th></tr>
              </thead>
              <tbody>
                {TRACK.map((r, i) => (
                  <tr key={i} className={r.ok ? "" : "miss"}>
                    <td className="dim">{r.date}</td>
                    <td><b>{r.p}</b></td>
                    <td className="num">{r.c}%</td>
                    <td>{r.o}</td>
                    <td>
                      <span className={`ca-result ${r.ok ? "ok" : "bad"}`}>
                        {r.ok ? <CheckIcon size={13} /> : <XIcon size={13} />}
                        {r.ok ? "Came true" : "Wrong"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ca-foot">
            Both misses came before the engine knew about the job loss. The hardship signal is now part of every
            prediction for this account.{" "}
            <button type="button" className="link-btn" onClick={() => navigate("/fields-insights")}>
              See accuracy across all accounts
            </button>
          </p>
        </section>
      </div>

      <aside className="ca-side">
        <section className="panel">
          <div className="ca-side-head">
            <h3 className="ca-h">Linked premises</h3>
            <button type="button" className="link-btn" onClick={() => navigate("/customers")}>View ↗</button>
          </div>
          <div className="ca-premise">
            <span className="ca-pico"><UsersIcon size={18} /></span>
            <div>
              <b>Pandan Indah, Ampang</b>
              <small>Low-cost terrace, one household</small>
            </div>
            <span className="ca-chip">Domestic</span>
          </div>

          <div className="ca-label">General information</div>
          <dl className="ca-kv">
            {GENERAL.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
          </dl>

          <div className="ca-label">Payment plan</div>
          <div className="ca-plan">
            <div className="ca-plan-line"><b>RM10 a month</b><span>1 of 18 paid</span></div>
            <div className="ca-track"><div className="ca-fill good" style={{ width: `${(1 / 18) * 100}%` }} /></div>
            <p>Approved by Farah Aziz on 5 Oct. Cleared by March 2028. No other reminders while the plan is kept.</p>
          </div>

          <div className="ca-label">Documents</div>
          <div className="ca-doc">
            <span className="ca-pdf">PDF</span>
            <div><b>hardship-assessment.pdf</b><small>220 KB, 5 Oct</small></div>
          </div>
          <div className="ca-doc">
            <span className="ca-pico blue"><MicIcon size={15} /></span>
            <div><b>Call recording with Nur</b><small>3 min 12 s, 5 Oct 10:41</small></div>
            <button
              type="button"
              className="ca-play"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? "Pause recording" : "Play recording"}
              aria-pressed={playing}
            >
              {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
          </div>

          <div className="ca-side-head" style={{ marginTop: 18 }}>
            <div className="ca-label" style={{ margin: 0 }}>Activity timeline</div>
            <button type="button" className="link-btn" onClick={() => navigate("/call-logs")}>Audit trail</button>
          </div>
          <ol className="ca-timeline">
            {TIMELINE.map((e, i) => (
              <li key={i}><span>{e.t}</span><small>{e.at}</small></li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
