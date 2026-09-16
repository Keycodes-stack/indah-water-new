/* ============================================================
   Native Ticketing & Lightweight CRM Store
   Maps customer debtor accounts to interactive CRM tickets with
   full context: billing, collection stage, AI flag reasons,
   conversational transcripts, AI summaries, and rep notes.
   ============================================================ */

import customersSeed from "../../DB/customers.json";

export const TICKET_STAGES = [
  "Early Arrears",
  "Committed Arrears",
  "Formal",
  "Residual",
];

export const TICKET_STATUSES = [
  "Flagged (Needs Takeover)",
  "Agent Handling",
  "Open",
  "Follow-up",
  "Resolved",
];

// Pre-configured flagged ticket samples with detailed transcripts & AI summaries
const FLAGGED_TICKET_PROFILES = [
  {
    accountId: "ACC-100000",
    flagReason: "Customer dispute: payment made 2 days ago via FPX, billing reminder lag",
    priority: "High",
    status: "Flagged (Needs Takeover)",
    aiSummary:
      "Customer is agitated due to receiving collection reminder after completing online banking payment on 14 Sep. Banking reconciliation lag detected. Recommended action: verify FPX transaction reference and apply temporary reminder suppression.",
    sentiment: "Negative (Frustrated)",
    transcript: [
      { sender: "AI Voice Agent", text: "Salam sejahtera Rizal bin Abdullah, ini adalah panggilan mesra dari Indah Water Konsortium berkenaan akaun kumbahan anda.", time: "10:41 AM" },
      { sender: "Customer", text: "Eh saya dah buat bayaran kelmarin guna online banking FPX! Kenapa asyik call dan kacau saya lagi?", time: "10:42 AM" },
      { sender: "AI Voice Agent", text: "Kami memohon maaf atas sebarang kesulitan. Sistem mengambil masa 1 hingga 2 hari bekerja untuk pengesahan bank. Boleh saya dapatkan nombor rujukan transaksi?", time: "10:42 AM" },
      { sender: "Customer", text: "Saya tak ada masa nak cari resit sekarang! Sambungkan saya terus kepada pegawai atau supervisor sekarang juga!", time: "10:43 AM" },
    ],
    callHistory: [
      { date: "2026-09-16 10:41 AM", duration: "1m 45s", outcome: "Flagged for Supervisor", assistant: "Voice AI Tier-1" },
      { date: "2026-09-12 03:20 PM", duration: "0m 42s", outcome: "SMS Payment Link Sent", assistant: "Omnichannel Gateway" },
    ],
    notes: [
      { author: "System", text: "Flagged by n8n anomaly detection: Customer demanded supervisor escalation.", timestamp: "2026-09-16 10:43 AM" },
    ],
  },
  {
    accountId: "ACC-100001",
    flagReason: "Industrial tariff contention & corporate restructuring review",
    priority: "High",
    status: "Flagged (Needs Takeover)",
    aiSummary:
      "Maju Food Processing claims industrial effluent charges were miscalculated for July–August cycle. Threatening formal dispute under SPAN regulatory terms. Requires dedicated commercial account manager.",
    sentiment: "Negative (Formal Dispute)",
    transcript: [
      { sender: "AI Voice Agent", text: "Good morning, this is the Indah Water accounts department calling for Maju Food Processing mengenai tunggakan RM 44,630.", time: "09:14 AM" },
      { sender: "Customer", text: "We have already submitted a formal dispute letter to your Georgetown office regarding the commercial water volume multiplier. This amount is disputed.", time: "09:15 AM" },
      { sender: "AI Voice Agent", text: "Thank you for the notification. Our records show active notice stage for this commercial lot. Would you like to schedule an officer review?", time: "09:15 AM" },
      { sender: "Customer", text: "Yes, do not proceed with legal section 88 notice until your branch manager inspects the meter. Pass me to the collections team head.", time: "09:16 AM" },
    ],
    callHistory: [
      { date: "2026-09-16 09:14 AM", duration: "2m 10s", outcome: "Escalated: Legal Dispute", assistant: "Voice AI Commercial" },
      { date: "2026-09-08 11:30 AM", duration: "1m 15s", outcome: "Letter of Demand Dispatched", assistant: "Post Gateway" },
    ],
    notes: [
      { author: "System", text: "Industrial tariff dispute threshold exceeded (> RM 20k).", timestamp: "2026-09-16 09:16 AM" },
    ],
  },
  {
    accountId: "ACC-100003",
    flagReason: "Hardship & eKasih registered welfare beneficiary",
    priority: "Medium",
    status: "Flagged (Needs Takeover)",
    aiSummary:
      "Customer stated family is registered under eKasih national welfare hardship scheme. Automated digital reminder breached sensitivity guidelines. Recommended action: route to Special Routing Hardship cohort with 100% waiver/restructuring.",
    sentiment: "Distressed",
    transcript: [
      { sender: "AI Voice Agent", text: "Salam sejahtera, ini pesanan automatik Indah Water berkenaan tunggakan bayaran RM 185.20.", time: "11:20 AM" },
      { sender: "Customer", text: "Tolonglah encik, saya ibu tunggal dan kami tersenarai dalam bantuan eKasih. Pendapatan kami terjejas teruk bulan ini.", time: "11:21 AM" },
      { sender: "AI Voice Agent", text: "Kami memahami situasi anda. Maklumat bantuan eKasih boleh disahkan untuk pelan penstrukturan khas tanpa caj penalti.", time: "11:21 AM" },
      { sender: "Customer", text: "Boleh saya bercakap dengan pegawai bantuan kebajikan IWK?", time: "11:22 AM" },
    ],
    callHistory: [
      { date: "2026-09-16 11:20 AM", duration: "2m 04s", outcome: "Hardship Flagged", assistant: "Voice AI Tier-1" },
    ],
    notes: [
      { author: "System", text: "Social welfare trigger detected. Halting automated WhatsApp outreach.", timestamp: "2026-09-16 11:22 AM" },
    ],
  },
  {
    accountId: "ACC-100006",
    flagReason: "Customer contested billing due date elapsing without physical bill receipt",
    priority: "Medium",
    status: "Flagged (Needs Takeover)",
    aiSummary:
      "Customer asserts physical postal demand bill never arrived, leaving zero grace window before collection reminder call. Requested digital WhatsApp e-bill transition.",
    sentiment: "Neutral / Dissatisfied",
    transcript: [
      { sender: "AI Voice Agent", text: "Selamat pagi, ini peringatan mesra Indah Water bagi baki akaun di Shah Alam.", time: "08:50 AM" },
      { sender: "Customer", text: "Surat bil tak pernah sampai dalam peti surat, tiba-tiba telefon kata dah lepas tarikh due date. Macam mana nak bayar kalau tak dapat bil?", time: "08:51 AM" },
      { sender: "AI Voice Agent", text: "Kami boleh hantar salinan e-bil rasmi terus ke nombor WhatsApp anda sekarang juga berserta pautan pembayaran.", time: "08:51 AM" },
      { sender: "Customer", text: "Bagus, tapi saya nak pegawai pastikan alamat surat-menyurat dikemas kini supaya tak berulang.", time: "08:52 AM" },
    ],
    callHistory: [
      { date: "2026-09-16 08:50 AM", duration: "2m 15s", outcome: "Address Verification Required", assistant: "Voice AI Tier-1" },
    ],
    notes: [
      { author: "System", text: "Timing grievance logged: Bill pay window elapsed complaint.", timestamp: "2026-09-16 08:52 AM" },
    ],
  },
  {
    accountId: "ACC-100008",
    flagReason: "Instalment restructuring pledge (PTP RM 50/month) negotiated",
    priority: "Low",
    status: "Open",
    aiSummary:
      "Customer agreeable to settling total arrears of RM 420 via 3 consecutive monthly payments of RM 140 beginning end of month. Awaiting supervisor approval.",
    sentiment: "Positive / Cooperative",
    transcript: [
      { sender: "AI Voice Agent", text: "Salam sejahtera, ini susulan semakan akaun perkhidmatan pembetungan IWK anda.", time: "02:10 PM" },
      { sender: "Customer", text: "Saya nak bayar tapi tak mampu bayar sekali gus RM 420. Boleh tak bayar ansuran 3 kali?", time: "02:11 PM" },
      { sender: "AI Voice Agent", text: "Boleh, kami menyediakan pelan ansuran mudah tanpa sebarang faedah tambahan bagi meringankan komitmen anda.", time: "02:11 PM" },
      { sender: "Customer", text: "Baguslah kalau macam tu. Sila sediakan persetujuan untuk saya tandatangan.", time: "02:12 PM" },
    ],
    callHistory: [
      { date: "2026-09-15 02:10 PM", duration: "3m 12s", outcome: "PTP Restructuring Drafted", assistant: "Voice AI Inbound" },
    ],
    notes: [
      { author: "@kamil", text: "Drafted 3-month payment schedule. PTP secured for RM 420.", timestamp: "2026-09-15 02:15 PM" },
    ],
  },
];

// Supervisors list for default assignment
const SUPERVISORS = ["supervisor", "kamil", "farah", "rizwan", "noraini"];

/**
 * Initializes the ticket collection derived from customer accounts.
 */
export function buildInitialTickets() {
  const tickets = [];

  // Map each customer to a ticket record
  customersSeed.forEach((cust, idx) => {
    if (cust.category === "Government") return;

    // Check if this account has custom flagged profile
    const profile = FLAGGED_TICKET_PROFILES.find((p) => p.accountId === cust.id);

    const isFlagged = Boolean(profile);
    const assigned = profile?.assigned || SUPERVISORS[idx % SUPERVISORS.length];
    const ticketId = `TCK-${cust.id.replace("ACC-", "")}`;

    // Normalize collection ladder stage
    let stage = cust.stage || "Early Arrears";
    if (stage === "Bill Presented" || stage === "Pre-Due") {
      stage = "Early Arrears";
    }

    tickets.push({
      id: ticketId,
      customerId: cust.id,
      accountNo: cust.accountNo,
      name: cust.name,
      category: cust.category,
      address: cust.address,
      area: cust.area,
      state: cust.state,
      phone: cust.phone,
      email: cust.email,
      arrearsAmount: cust.arrearsAmount,
      arrearsDays: cust.arrearsDays,
      lastBillDate: cust.lastBillDate,
      lastPaymentDate: cust.lastPaymentDate,
      stage: stage,
      segment: cust.segment,
      priority: profile?.priority || (cust.arrearsAmount > 1000 ? "High" : cust.arrearsAmount > 300 ? "Medium" : "Low"),
      status: profile?.status || (cust.arrearsAmount > 500 ? "Open" : "Follow-up"),
      isFlagged: isFlagged,
      flagReason: profile?.flagReason || null,
      aiSummary:
        profile?.aiSummary ||
        `Account holding RM ${Number(cust.arrearsAmount).toFixed(2)} in ${stage}. Last touch via digital reminder channel. Customer is currently eligible for standard collection workflows.`,
      sentiment: profile?.sentiment || "Neutral",
      transcript: profile?.transcript || [
        { sender: "AI Voice Agent", text: `Salam sejahtera ${cust.name}, peringatan mesra berkenaan akaun IWK ${cust.accountNo}.`, time: "Yesterday, 11:00 AM" },
        { sender: "Customer", text: "Terima kasih atas makluman, saya akan semak dan jelaskan secepat mungkin.", time: "Yesterday, 11:01 AM" },
      ],
      callHistory: profile?.callHistory || [
        { date: "Yesterday, 11:00 AM", duration: "1m 12s", outcome: "Automated Reminder Delivered", assistant: "Voice AI Tier-1" },
      ],
      notes: profile?.notes || [
        { author: "System", text: `Ticket initialized in ${stage} tier.`, timestamp: cust.createdAt || "2026-08-01" },
      ],
      assignedSupervisor: assigned,
      updatedAt: new Date().toISOString(),
    });
  });

  return tickets;
}

// In-memory singleton cache of tickets so mutations persist within the user session
let currentTickets = null;

export function getTicketsStore() {
  if (!currentTickets) {
    currentTickets = buildInitialTickets();
  }
  return currentTickets;
}

export function resetTicketsStore() {
  currentTickets = buildInitialTickets();
  return currentTickets;
}

export function updateTicketInStore(ticketId, patch) {
  const store = getTicketsStore();
  const idx = store.findIndex((t) => t.id === ticketId || t.customerId === ticketId);
  if (idx !== -1) {
    store[idx] = {
      ...store[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return store[idx];
  }
  return null;
}

export function addTicketNoteInStore(ticketId, text, author = "Supervisor") {
  const store = getTicketsStore();
  const ticket = store.find((t) => t.id === ticketId || t.customerId === ticketId);
  if (ticket) {
    const newNote = {
      author,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", Today",
    };
    ticket.notes = [newNote, ...ticket.notes];
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
  return null;
}
