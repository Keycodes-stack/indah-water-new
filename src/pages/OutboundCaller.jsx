/* ============================================================
   Outbound Caller — Automated Campaign Dialing & Lead Management
   ============================================================ */

import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Panel, Badge, Modal } from "../components/ui.jsx";

const VAPI_TEST_URL =
  "https://vapi.ai?demo=true&shareKey=4440b6a1-4ea4-47ab-a837-7d623172b038&assistantId=59567db0-c442-4ddf-b34a-cefa922bdca7";

const INITIAL_LEADS = [
  {
    id: "LEAD-101",
    accountNo: "6199-1647-8082",
    name: "Rizal bin Abdullah",
    phone: "+60 18-680 2824",
    arrears: 130.83,
    lastContacted: "Today, 10:45 AM",
    status: "In Queue",
  },
  {
    id: "LEAD-102",
    accountNo: "4421-8890-1209",
    name: "Siti Sarah binti Omar",
    phone: "+60 19-452 1198",
    arrears: 245.5,
    lastContacted: "Yesterday, 3:30 PM",
    status: "In Queue",
  },
  {
    id: "LEAD-103",
    accountNo: "2268-3497-3412",
    name: "Maju Food Processing",
    phone: "+60 10-343 8543",
    arrears: 1280.0,
    lastContacted: "Today, 09:15 AM",
    status: "Follow-up",
  },
  {
    id: "LEAD-104",
    accountNo: "7731-5520-9943",
    name: "Tan Wei Loon",
    phone: "+60 12-887 3491",
    arrears: 185.2,
    lastContacted: "12 Sep 2026",
    status: "In Queue",
  },
  {
    id: "LEAD-105",
    accountNo: "3390-1124-7832",
    name: "Kumar a/l Subramaniam",
    phone: "+60 17-234 9012",
    arrears: 420.0,
    lastContacted: "Yesterday, 11:20 AM",
    status: "Connected",
  },
  {
    id: "LEAD-106",
    accountNo: "5512-8743-6621",
    name: "Nurul Izzati binti Zulkifli",
    phone: "+60 13-908 6543",
    arrears: 95.6,
    lastContacted: "Never contacted",
    status: "In Queue",
  },
  {
    id: "LEAD-107",
    accountNo: "8823-9901-4412",
    name: "Syarikat Kejuruteraan Dinamik",
    phone: "+60 16-781 4432",
    arrears: 3450.0,
    lastContacted: "10 Sep 2026",
    status: "Follow-up",
  },
  {
    id: "LEAD-108",
    accountNo: "1198-4456-2389",
    name: "Lim Chee Keong",
    phone: "+60 11-209 8765",
    arrears: 310.4,
    lastContacted: "Today, 08:30 AM",
    status: "Unreachable",
  },
  {
    id: "LEAD-109",
    accountNo: "9934-2210-7765",
    name: "Wong Siew Mei",
    phone: "+60 14-554 3210",
    arrears: 175.0,
    lastContacted: "Never contacted",
    status: "In Queue",
  },
  {
    id: "LEAD-110",
    accountNo: "6645-3312-8876",
    name: "Ahmad Farhan bin Yusof",
    phone: "+60 18-332 9901",
    arrears: 540.25,
    lastContacted: "11 Sep 2026",
    status: "Connected",
  },
];

function statusTone(status) {
  switch (status) {
    case "Connected":
      return "good";
    case "In Queue":
      return "info";
    case "Follow-up":
      return "warn";
    case "Unreachable":
      return "bad";
    default:
      return "mute";
  }
}

export default function OutboundCaller() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [callingLead, setCallingLead] = useState(null);
  const [notification, setNotification] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const fileInputRef = useRef(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        search === "" ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.toLowerCase().includes(search.toLowerCase()) ||
        (lead.accountNo && lead.accountNo.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || lead.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const handleCallClick = (lead) => {
    navigate("/testing", { state: { lead } });
  };

  const proceedToVapi = () => {
    window.open(VAPI_TEST_URL, "_blank", "noopener,noreferrer");
    setCallingLead(null);
  };

  // Browser-based CSV lead upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") return;

      try {
        const lines = content
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setNotification({
            type: "error",
            message: "CSV file is empty or missing data rows.",
          });
          return;
        }

        // Parse header row
        const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

        const nameIdx = headers.findIndex((h) =>
          ["customer name", "name", "customer", "lead", "client"].includes(h)
        );
        const phoneIdx = headers.findIndex((h) =>
          ["number", "phone", "phone number", "mobile", "contact", "tel"].includes(h)
        );
        const lastContactedIdx = headers.findIndex((h) =>
          ["last contacted", "last_contacted", "contacted", "last call", "date"].includes(h)
        );
        const arrearsIdx = headers.findIndex((h) =>
          ["arrears", "arrears amount", "amount", "outstanding", "balance", "rm"].includes(h)
        );
        const accountIdx = headers.findIndex((h) =>
          ["account", "account no", "account number", "accountno", "id"].includes(h)
        );

        if (nameIdx === -1 && phoneIdx === -1) {
          setNotification({
            type: "error",
            message: "Could not find 'Customer Name' or 'Phone Number' columns in CSV.",
          });
          return;
        }

        const newLeads = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          if (cells.length === 0 || !cells.some((c) => c.trim())) continue;

          const name = nameIdx !== -1 ? cells[nameIdx]?.trim() || `Customer #${i}` : `Customer #${i}`;
          const phone = phoneIdx !== -1 ? cells[phoneIdx]?.trim() || "+60 10-000 0000" : "+60 10-000 0000";
          const lastContacted =
            lastContactedIdx !== -1 ? cells[lastContactedIdx]?.trim() || "Just imported" : "Never contacted";
          const arrearsRaw = arrearsIdx !== -1 ? parseFloat(cells[arrearsIdx]?.replace(/[^\d.]/g, "")) : 150.0;
          const accountNo =
            accountIdx !== -1 ? cells[accountIdx]?.trim() : `6199-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

          newLeads.push({
            id: `LEAD-CSV-${Date.now()}-${i}`,
            accountNo: accountNo || "6199-0000-0000",
            name,
            phone,
            arrears: isNaN(arrearsRaw) ? 120.0 : arrearsRaw,
            lastContacted,
            status: "In Queue",
          });
        }

        if (newLeads.length > 0) {
          setLeads((prev) => [...newLeads, ...prev]);
          setNotification({
            type: "success",
            message: `Successfully imported ${newLeads.length} lead${newLeads.length > 1 ? "s" : ""} from "${file.name}"!`,
          });
        } else {
          setNotification({
            type: "error",
            message: "No valid lead rows could be extracted from this CSV.",
          });
        }
      } catch (err) {
        setNotification({
          type: "error",
          message: `Failed to parse CSV file: ${err.message}`,
        });
      }

      // Reset file input value so user can upload same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  // Helper to parse CSV line with quoted comma support
  function parseCsvLine(text) {
    const result = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  // Generate and download a sample CSV template
  const downloadSampleCsv = () => {
    const csvContent =
      "Customer Name,Number,Last Contacted,Arrears Amount (RM),Account No\n" +
      '"Mohd Hafiz bin Razak","+60 19-332 1104","Never contacted",180.50,"6199-8821-4401"\n' +
      '"Chong Wei Ling","+60 12-445 9923","12 Sep 2026",340.00,"6199-4456-1198"\n' +
      '"Kavitha a/p Ganesan","+60 17-556 2234","Yesterday, 4:10 PM",95.20,"6199-9902-3341"\n' +
      '"Mega Hardware Sdn Bhd","+60 10-889 0044","Today, 11:00 AM",1850.00,"2268-1144-8832"\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_leads_indah_water.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="outbound-caller-page">
      {/* KPI Overview Cards */}
      <div className="caller-kpi-grid">
        <div className="caller-kpi-card">
          <div className="caller-kpi-label">Active Leads In Queue</div>
          <div className="caller-kpi-val">{leads.filter((l) => l.status === "In Queue").length}</div>
          <div className="caller-kpi-note">Scheduled for next 5-minute cycle</div>
        </div>
        <div className="caller-kpi-card">
          <div className="caller-kpi-label">Total Leads Loaded</div>
          <div className="caller-kpi-val">{leads.length}</div>
          <div className="caller-kpi-note">
            {leads.length - INITIAL_LEADS.length > 0
              ? `+${leads.length - INITIAL_LEADS.length} imported via CSV`
              : "Default test cohort"}
          </div>
        </div>
        <div className="caller-kpi-card">
          <div className="caller-kpi-label">Calls Dispatched Today</div>
          <div className="caller-kpi-val">42</div>
          <div className="caller-kpi-note">Across Klang & Selangor cohorts</div>
        </div>
        <div className="caller-kpi-card">
          <div className="caller-kpi-label">Connected / Conversion Rate</div>
          <div className="caller-kpi-val">78.5%</div>
          <div className="caller-kpi-note">Voice AI engagement target: &gt; 70%</div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`caller-notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button
            className="caller-notification-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss Notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Lead Management Panel */}
      <Panel
        title="Outbound Dialing Queue"
        sub="Debtor contact records scheduled for automated AI voice collections"
        actions={
          <div className="caller-actions-bar">
            {/* Hidden CSV file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            <button
              className="btn-ghost"
              onClick={downloadSampleCsv}
              title="Download CSV Template"
            >
              ⤓ Download Sample CSV
            </button>

            <button
              className="btn-solid caller-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload leads CSV from your browser"
            >
              ↑ Upload Lead From CSV
            </button>
          </div>
        }
      >
        {/* Filter and Search Controls */}
        <div className="caller-table-filters">
          <div className="caller-search-box">
            <input
              type="search"
              placeholder="Search by customer name, phone, or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="caller-search-input"
            />
          </div>

          <div className="caller-filter-group">
            <label className="caller-filter-label">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="caller-status-select"
            >
              <option value="all">All Statuses ({leads.length})</option>
              <option value="in queue">In Queue</option>
              <option value="connected">Connected</option>
              <option value="follow-up">Follow-up</option>
              <option value="unreachable">Unreachable</option>
            </select>

            {leads.length !== INITIAL_LEADS.length && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setLeads(INITIAL_LEADS);
                  setNotification({
                    type: "info",
                    message: "Reset queue back to default dummy leads.",
                  });
                }}
                style={{ fontSize: 12 }}
              >
                ↺ Reset To Defaults
              </button>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Number</th>
                <th>Account No</th>
                <th style={{ textAlign: "right" }}>Arrears (RM)</th>
                <th>Last Contacted</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "36px 16px",
                      color: "var(--text-dim)",
                    }}
                  >
                    No leads matching your search criteria. Upload a CSV or adjust filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.name}</strong>
                    </td>
                    <td>
                      <span className="mono-num">{lead.phone}</span>
                    </td>
                    <td>
                      <span className="dim" style={{ fontSize: 12 }}>
                        {lead.accountNo}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="mono-num">
                        RM{" "}
                        {Number(lead.arrears || 0).toLocaleString("en-MY", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                        {lead.lastContacted}
                      </span>
                    </td>
                    <td>
                      <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-solid caller-call-btn"
                        onClick={() => handleCallClick(lead)}
                        title={`Place call to ${lead.name}`}
                      >
                        Call Now
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="caller-table-footer">
          <span className="dim" style={{ fontSize: 12 }}>
            Showing {filteredLeads.length} of {leads.length} lead records
          </span>
          <span className="dim" style={{ fontSize: 12 }}>
            AI dialer rate: 1 call per lead every 5-minute cycle
          </span>
        </div>
      </Panel>

      {/* Static Interstitial Modal when 'Call now' is clicked */}
      {callingLead && (
        <Modal
          title="Twilio Setup Required"
          onClose={() => setCallingLead(null)}
          footer={
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button className="btn-ghost" onClick={() => setCallingLead(null)}>
                Cancel
              </button>
              <button className="btn-solid caller-proceed-btn" onClick={proceedToVapi}>
                Proceed To Test Mode ↗ {countdown !== null && countdown > 0 && `(${countdown}s)`}
              </button>
            </div>
          }
        >
          <div className="caller-redirect-modal">
            {/* Callout */}
            <div className="caller-modal-callout">
              <div className="caller-modal-callout-text">
                <h4>Direct Outbound Setup Notice</h4>
                <p>
                  Direct telecom dialing to Malaysian numbers (+60) requires an active carrier SIP trunk
                  and provisioned caller ID.
                </p>
              </div>
            </div>

            {/* Target Lead Summary */}
            <div className="caller-lead-preview-card">
              <div className="caller-preview-row">
                <span className="caller-preview-label">Target Customer:</span>
                <span className="caller-preview-val">
                  <strong>{callingLead.name}</strong>
                </span>
              </div>
              <div className="caller-preview-row">
                <span className="caller-preview-label">Phone Number:</span>
                <span className="caller-preview-val mono-num">{callingLead.phone}</span>
              </div>
              <div className="caller-preview-row">
                <span className="caller-preview-label">Outstanding Arrears:</span>
                <span className="caller-preview-val">
                  RM {Number(callingLead.arrears || 0).toFixed(2)}
                </span>
              </div>
              <div className="caller-preview-row">
                <span className="caller-preview-label">Test Mode Target:</span>
                <span className="caller-preview-val dim">Voice AI Web Assistant (Browser Demo)</span>
              </div>
            </div>

            <p className="caller-modal-footer-note">
              {countdown !== null && countdown > 0 ? (
                <>
                  Automatically connecting in <strong>{countdown} seconds</strong>, or click{" "}
                  <em>Proceed to Test Mode</em> now.
                </>
              ) : (
                <>Connecting to Voice AI browser test mode...</>
              )}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
