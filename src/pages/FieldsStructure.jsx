import { Link } from "react-router-dom";
import { Panel, Badge } from "../components/ui.jsx";

export default function FieldsStructure() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Fields &amp; Insights Structure</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 13.5 }}>
            IWK AI Calling Agent — Post-Call Classification &amp; Outcome Framework Guidance.
          </p>
        </div>

        <Link to="/call-logs" className="btn-solid" style={{ background: "#10b981", color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "8px 16px", borderRadius: 8 }}>
          ← Return to Call Logs
        </Link>
      </div>

      {/* Overview Callout */}
      <div className="callout" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
        <strong>4-Layer Classification Architecture.</strong> Structured around two separate layers (Customer Intent and Call Outcome Classification) plus Situation and Handling Priority. This prevents confusing willing customers facing hardship with unwilling refusals, and ensures n8n triggers exact workflows.
      </div>

      {/* Section 1: Overall Classification Structure */}
      <Panel title="1. Overall Classification Structure" sub="4 core post-call classification fields captured after every call">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Purpose</th>
                <th>Example Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="mono" style={{ color: "#10b981", fontWeight: 700 }}>customer_intent</code></td>
                <td>Is the customer willing to pay?</td>
                <td><Badge tone="good">Positive</Badge></td>
              </tr>
              <tr>
                <td><code className="mono" style={{ color: "#0b7fc4", fontWeight: 700 }}>call_outcome</code></td>
                <td>What happened during the call?</td>
                <td><Badge tone="info">Payment promised</Badge></td>
              </tr>
              <tr>
                <td><code className="mono" style={{ color: "#f59e0b", fontWeight: 700 }}>customer_situation</code></td>
                <td>Why did the customer respond this way?</td>
                <td><Badge tone="warn">Financial hardship</Badge></td>
              </tr>
              <tr>
                <td><code className="mono" style={{ color: "#ef4444", fontWeight: 700 }}>handling_priority</code></td>
                <td>Does the case need special handling?</td>
                <td><Badge tone="warn">Grey Zone</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 2: Customer Intent */}
      <Panel title="2. Field 1 — Customer Intent" sub="Measures customer willingness to resolve the outstanding bill">
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Code</th>
                <th>Definition &amp; Criteria</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Positive</strong></td>
                <td><code className="mono">POSITIVE</code></td>
                <td>Agrees to pay, intends to pay later, or wants to arrange payment.</td>
              </tr>
              <tr>
                <td><strong>Negative</strong></td>
                <td><code className="mono">NEGATIVE</code></td>
                <td>Explicitly refuses to pay or rejects payment without a willingness to resolve.</td>
              </tr>
              <tr>
                <td><strong>Conditional</strong></td>
                <td><code className="mono">CONDITIONAL</code></td>
                <td>Will pay only if a condition is met, such as bill verification or subsidy eligibility.</td>
              </tr>
              <tr>
                <td><strong>Unknown</strong></td>
                <td><code className="mono">UNKNOWN</code></td>
                <td>Intent cannot be determined, such as when the call ends before the customer responds.</td>
              </tr>
              <tr>
                <td><strong>Not Applicable</strong></td>
                <td><code className="mono">NOT_APPLICABLE</code></td>
                <td>No meaningful payment intent can be established (e.g. wrong number or non-account holder).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
          <strong>Important Distinction:</strong> A customer who cannot afford the bill should <em>not</em> automatically be classified as Negative. They may still have Positive intent but require hardship assistance. Similarly, someone who disputes the bill amount may have Conditional intent rather than Negative intent.
        </div>
      </Panel>

      {/* Section 3: Call Outcome Categories */}
      <Panel title="3. Field 2 — Call Outcome Categories (16 Outcomes)" sub="Primary outcome of what actually happened during the conversation">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Call Outcome</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["PAYMENT_COMMITTED", "Payment Promised", "Customer agrees to pay."],
                ["PAYMENT_LATER", "Payment Deferred", "Customer says they will pay later or on a specific date."],
                ["PAYMENT_METHOD_REQUESTED", "Payment Method Inquiry", "Customer asks how to pay online or through another method."],
                ["PAYMENT_ALREADY_MADE", "Already Paid", "Customer claims payment has already been made."],
                ["PAYMENT_REFUSED", "Payment Refused", "Customer explicitly refuses to pay."],
                ["BILL_DISPUTE", "Bill Amount Disputed", "Customer believes the bill is incorrect, too high, or unexpected."],
                ["FINANCIAL_HARDSHIP", "Financial Difficulty", "Customer cannot currently afford the bill."],
                ["SUBSIDY_INQUIRY", "Subsidy / Assistance Inquiry", "Customer requests financial assistance, subsidy, or concession."],
                ["HUMAN_REQUESTED", "Human Assistance Requested", "Customer wants to speak to a human representative."],
                ["CALLBACK_REQUESTED", "Callback Requested", "Customer asks to be contacted at another time."],
                ["WRONG_CONTACT", "Wrong Person / Number", "The person answering is not the intended customer or account holder."],
                ["NO_ACCOUNT_HOLDER", "Account Holder Unavailable", "Someone answers but the account holder is unavailable."],
                ["CALL_DISCONNECTED", "Call Disconnected", "Call ends before the conversation reaches a meaningful outcome."],
                ["NO_RESPONSE", "No Meaningful Response", "No usable response or engagement from the customer."],
                ["OTHER", "Other", "A meaningful outcome occurred that does not fit the categories above."],
              ].map(([code, label, def]) => (
                <tr key={code}>
                  <td><code className="mono">{code}</code></td>
                  <td><strong>{label}</strong></td>
                  <td style={{ color: "var(--text-dim)" }}>{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 4: Customer Situation / Reason Categories */}
      <Panel title="4. Field 3 — Customer Situation / Reason Categories" sub="Captures why the customer responded in a particular way (16 Reason Codes)">
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Situation</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["LOW_INCOME", "Low Income / Poverty", "Customer states they have limited income or are struggling financially."],
                ["UNEMPLOYED", "Unemployed", "Customer says they are unemployed or have lost their job."],
                ["TEMPORARY_FINANCIAL_DIFFICULTY", "Temporary Financial Difficulty", "Customer cannot pay now due to a temporary financial issue."],
                ["REQUESTS_INSTALLMENT", "Installment Request", "Customer asks to pay the outstanding amount in installments."],
                ["REQUESTS_SUBSIDY", "Subsidy / Concession Request", "Customer believes they qualify for a subsidy or concession."],
                ["BILL_TOO_HIGH", "Bill Is Too High", "Customer feels the bill is unusually high."],
                ["BILL_PERIOD_CONFUSION", "Billing Period Confusion", "Customer does not understand that the bill covers six months."],
                ["BILL_CALCULATION_DISPUTE", "Bill Calculation Dispute", "Customer questions the amount or calculation."],
                ["PAYMENT_RECORD_MISMATCH", "Payment Record Mismatch", "Customer says payment was made but it is still showing as outstanding."],
                ["SERVICE_COMPLAINT", "Service Complaint", "Customer raises a complaint about the service."],
                ["UNWILLING_TO_PAY", "Unwilling to Pay", "Customer does not want to pay, without a more specific stated reason."],
                ["NEEDS_PAYMENT_GUIDANCE", "Needs Payment Guidance", "Customer needs help understanding how or where to pay."],
                ["LANGUAGE_BARRIER", "Language Barrier", "Customer cannot comfortably communicate in the current language."],
                ["TRUST_OR_AUTHENTICITY_CONCERN", "Trust / Authenticity Concern", "Customer questions whether the call or bill is legitimate."],
                ["NO_REASON_GIVEN", "Reason Not Specified", "Customer does not explain the reason."],
              ].map(([code, label, def]) => (
                <tr key={code}>
                  <td><code className="mono">{code}</code></td>
                  <td><strong>{label}</strong></td>
                  <td style={{ color: "var(--text-dim)" }}>{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "rgba(250, 178, 25, 0.1)", border: "1px solid rgba(250, 178, 25, 0.3)", padding: 14, borderRadius: 10, fontSize: 13, color: "var(--text)" }}>
          <strong>Important Data Rule:</strong> Do not classify someone as poor, unemployed, or financially distressed based on assumptions. The AI should only assign these labels when the customer explicitly states or clearly confirms the situation.
        </div>
      </Panel>

      {/* Section 5: Handling Priority Zones */}
      <Panel title="5. Field 4 — Handling Priority (Green, Grey & Red Zones)" sub="Directs n8n workflows on whether to continue normal automation or escalate">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          
          {/* Green Zone */}
          <div style={{ background: "var(--surface)", border: "2px solid #10b981", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="badge ok" style={{ fontSize: 11 }}>GREEN</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#10b981" }}>Green Zone — Normal Handling</h3>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 12px" }}>
              Customer engages normally; no indication of exceptional hardship, severe frustration, or special intervention.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recommended Handling:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
              <li>Send payment instructions if requested.</li>
              <li>Record promised payment date.</li>
              <li>Trigger standard automated follow-up.</li>
            </ul>
          </div>

          {/* Grey Zone */}
          <div style={{ background: "var(--surface)", border: "2px solid #f59e0b", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="badge warn" style={{ fontSize: 11 }}>GREY</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#d97706" }}>Grey Zone — Review Required</h3>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 12px" }}>
              Customer has barrier to payment, financial hardship, installment request, dispute, or billing confusion.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recommended Handling:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
              <li>Record customer's stated reason.</li>
              <li>Route case to review/hardship workflow.</li>
              <li>Pause or adjust routine reminders.</li>
            </ul>
          </div>

          {/* Red Zone */}
          <div style={{ background: "var(--surface)", border: "2px solid #ef4444", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="badge critical" style={{ fontSize: 11 }}>RED</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#dc2626" }}>Red Zone — Human-Only Handling</h3>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 12px" }}>
              Conversation reached high frustration, explicit do-not-call request, or serious complaint.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recommended Handling:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
              <li>Stop payment persuasion immediately.</li>
              <li>Flag account for human supervisor review.</li>
              <li>Apply contact suppression restrictions.</li>
            </ul>
          </div>

        </div>
      </Panel>

      {/* Section 6: Additional Flags & n8n Workflow Triggers */}
      <Panel title="6. Additional Flags &amp; n8n Workflow Triggers" sub="Tracked separately to trigger precise automation workflows">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Classification Flag</th>
                <th>Values</th>
                <th>n8n Workflow Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="mono">frustration_level</code></td>
                <td><code className="mono">NONE, LOW, MODERATE, HIGH</code></td>
                <td>Measures customer frustration score. High frustration triggers Red Zone escalation.</td>
              </tr>
              <tr>
                <td><code className="mono">human_requested</code></td>
                <td><code className="mono">true / false</code></td>
                <td>Creates human callback or live call takeover task for supervisor.</td>
              </tr>
              <tr>
                <td><code className="mono">do_not_call_requested</code></td>
                <td><code className="mono">true / false</code></td>
                <td>Triggers contact restriction / suppression process immediately.</td>
              </tr>
              <tr>
                <td><code className="mono">callback_requested</code></td>
                <td><code className="mono">true / false</code></td>
                <td>Schedules automated callback within customer requested timeframe.</td>
              </tr>
              <tr>
                <td><code className="mono">language_preference</code></td>
                <td><code className="mono">MS, EN, OTHER, UNKNOWN</code></td>
                <td>Updates account language preference for future voice/messaging routing.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
