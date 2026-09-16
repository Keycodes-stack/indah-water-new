/* ============================================================
   Unified Inbox Store & Template Sequencer
   State management for omnichannel conversations, PDPA masking,
   file attachments, AI pause/play takeover, and automated templates.
   ============================================================ */

/** PDPA Privacy compliance: mask last 3 digits of phone number */
export function maskPhonePDPA(phone, masked = true) {
  if (!phone || typeof phone !== "string") return phone || "—";
  if (!masked) return phone;
  // If phone has digits, replace the last 3 digits with ***
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return phone;
  
  // Replace the last 3 numeric characters while keeping spacing/dashes
  let count = 0;
  return phone.split("").reverse().map((char) => {
    if (/\d/.test(char) && count < 3) {
      count++;
      return "*";
    }
    return char;
  }).reverse().join("");
}

/** Dynamic variable token interpolation */
export function renderTemplate(templateText, data = {}) {
  if (!templateText) return "";
  let rendered = templateText;
  const tokens = {
    customerName: data.customerName || "Encik / Puan",
    accountNo: data.accountNo || "6199-0000-0000",
    arrears: data.arrears != null ? Number(data.arrears).toFixed(2) : "0.00",
    dueDate: data.dueDate || "20 Sep 2026",
    billerCode: "8888",
    ref1: (data.accountNo || "619900000000").replace(/\D/g, ""),
    paymentLink: `https://pay.iwk.com.my/fpx/${(data.accountNo || "6199").slice(0, 4)}`,
  };

  Object.entries(tokens).forEach(([key, val]) => {
    const re = new RegExp(`\\{${key}\\}`, "g");
    rendered = rendered.replace(re, val);
  });

  return rendered;
}

/** 5 Automated Follow-up Sequence Templates */
export const DEFAULT_SEQUENCER_TEMPLATES = [
  {
    id: "TMPL-01",
    stage: "Pre-Due",
    title: "Stage 1: Pre-Due Courtesy Nudge",
    channel: "WhatsApp",
    timing: "Day -3 (3 days before due date)",
    body: "Salam sejahtera {customerName}. Peringatan mesra dari Indah Water Konsortium: Bil perkhidmatan pembetungan bagi No. Akaun {accountNo} berjumlah RM {arrears} akan genap tempoh pada {dueDate}.\n\nSila layari pautan rasmi untuk semakan e-bil: {paymentLink}\nTerima kasih atas kerjasama anda.",
    description: "Polite early courtesy notification encouraging on-time settlement before grace period elapses.",
    fallbackStrategy: "Standard SMS nudge sent if WhatsApp message fails delivery.",
  },
  {
    id: "TMPL-02",
    stage: "Due Date",
    title: "Stage 2: Due Date Notice with Dynamic QR",
    channel: "WhatsApp",
    timing: "Day 0 (Due Date morning 09:00 AM)",
    body: "Salam {customerName}. Hari ini adalah tarikh akhir pembayaran bil IWK bagi No. Akaun {accountNo} berjumlah RM {arrears}.\n\nImbas Kod DuitNow QR yang dilampirkan atau bayar segera melalui JomPAY (Biller Code: {billerCode}, Ref-1: {ref1}).\n\nResit boleh dimuat naik terus di sini untuk pengesahan segera.",
    description: "Official due date reminder with DuitNow dynamic QR code attachment for frictionless mobile settlement.",
    fallbackStrategy: "Auto-trigger Stage 4 (Missing QR Fallback) if dynamic QR generation fails.",
  },
  {
    id: "TMPL-03",
    stage: "Early Arrears",
    title: "Stage 3: Overdue Nudge & JomPAY Direct Pay",
    channel: "SMS",
    timing: "Day +7 (7 days after due date)",
    body: "IWK Peringatan: Akaun {accountNo} mempunyai baki tertunggak RM {arrears}. Sila jelaskan segera via JomPAY (Biller: {billerCode}, Ref1: {ref1}) atau {paymentLink} bg mengelakkan caj statutori.",
    description: "Short, direct SMS prompt highlighting JomPAY Biller Code 8888 and online link.",
    fallbackStrategy: "Switch to Voice AI telephone call if SMS is unresponded within 48 hours.",
  },
  {
    id: "TMPL-04",
    stage: "Corner Case Fallback",
    title: "Stage 4: Missing QR Code / System Lag Fallback",
    channel: "WhatsApp",
    timing: "Immediate Trigger (When QR generation fails or times out)",
    body: "Salam {customerName}. [Makluman Sistem: Penjanaan Kod QR Sementara Tergendala]\n\nJangan bimbang, anda boleh menjelaskan baki RM {arrears} bagi No. Akaun {accountNo} melalui saluran alternatif selamat berikut:\n\n1. JomPAY — Biller Code: {billerCode} | Ref-1: {ref1}\n2. Portal IWK Direct Pay: {paymentLink}\n3. Perbankan Internet (Maybank2u, CIMB Clicks, Bank Islam, RHB)\n\nSila lampirkan resit di sini selepas bayaran dibuat. Pasukan khidmat pelanggan kami bersedia membantu.",
    description: "High-priority corner case handler: guarantees debtors receive immediate clear payment steps if QR code generation fails.",
    fallbackStrategy: "Direct agent intervention and email statement delivery.",
  },
  {
    id: "TMPL-05",
    stage: "Formal",
    title: "Stage 5: Statutory Final Notice & Installment Option",
    channel: "Email",
    timing: "Day +21 (21 days overdue)",
    body: "Notis Peringatan Akhir & Tawaran Pelan Ansuran: No. Akaun {accountNo}\n\nPelanggan yang dihormati {customerName},\n\nRekod kami menunjukkan tunggakan perkhidmatan pembetungan berjumlah RM {arrears} masih belum diselesaikan. Di bawah Akta Perkhidmatan Industri Air (Akta 655), tindakan pemulihan undang-undang boleh dimulakan.\n\nSekiranya anda mengalami kekangan kewangan, pihak IWK berbesar hati menawarkan Pelan Ansuran Bulanan tanpa faedah tambahan.\n\nSila balas emel ini atau hubungi talian bantuan 03-20832828 sebelum tindakan lanjut diambil.",
    description: "Statutory notice balancing formal compliance with empathetic installment restructuring options.",
    fallbackStrategy: "Escalation to supervisor queue for personal officer outreach.",
  },
];

/** Rich Initial WhatsApp Conversations with Attachments and AI states */
export const INITIAL_WHATSAPP_CONVERSATIONS = [
  {
    id: "WA-001",
    customerName: "Rizal bin Abdullah",
    phone: "+60 18-680 2824",
    accountNo: "6199-1647-8082",
    arrears: 130.83,
    lastSnippet: "Saya sudah buat bayaran RM130.83 melalui JomPAY petang tadi. Resit ada di sini.",
    timestamp: "Today, 11:25 AM",
    sentiment: "Positive",
    ptpStatus: "Paid (Verified)",
    statusTone: "good",
    isAiPaused: false,
    history: [
      {
        sender: "AI Assistant",
        text: "Salam Encik Rizal. Peringatan mesra dari Indah Water Konsortium berkenaan tunggakan bil RM130.83 bagi No. Akaun 6199-1647-8082.",
        time: "10:30 AM",
      },
      {
        sender: "Customer",
        text: "Waalaikumsalam. Boleh bayar guna JomPAY ke?",
        time: "10:42 AM",
      },
      {
        sender: "AI Assistant",
        text: "Boleh Tuan. Biller Code: 8888, Ref-1: 619916478082. Selepas bayar, hantar resit di sini ya.",
        time: "10:45 AM",
      },
      {
        sender: "Customer",
        text: "Saya sudah buat bayaran RM130.83 melalui JomPAY petang tadi. Resit ada di sini.",
        time: "11:25 AM",
        attachment: {
          type: "receipt",
          name: "JomPAY_Payment_Slip_RM130.83.pdf",
          size: "142 KB",
          previewUrl: "/receipt-thumb.png",
        },
      },
      {
        sender: "AI Assistant",
        text: "Terima kasih! Rekod pembayaran telah disahkan dan dikemas kini dalam sistem perakaunan IWK.",
        time: "11:28 AM",
      },
    ],
  },
  {
    id: "WA-002",
    customerName: "Siti Sarah binti Omar",
    phone: "+60 19-452 1198",
    accountNo: "4421-8890-1209",
    arrears: 245.5,
    lastSnippet: "Boleh saya mohon pelan ansuran RM50 sebulan? Bulan ini ada masalah kewangan sikit.",
    timestamp: "Today, 10:14 AM",
    sentiment: "Neutral",
    ptpStatus: "Installment Request",
    statusTone: "warn",
    isAiPaused: true, // Paused by human rep for credit review
    history: [
      {
        sender: "AI Assistant",
        text: "Assalamualaikum Puan Siti Sarah. Tunggakan bil pembetungan IWK anda adalah RM245.50.",
        time: "09:50 AM",
      },
      {
        sender: "Customer",
        text: "Boleh saya mohon pelan ansuran RM50 sebulan? Bulan ini ada masalah kewangan sikit.",
        time: "10:14 AM",
      },
      {
        sender: "Agent (@admin)",
        text: "Salam Puan Siti Sarah. Saya Pegawai Khidmat Pelanggan IWK telah mengambil alih perbualan ini. Permohonan ansuran RM50/bulan selama 5 bulan telah diluluskan untuk akaun anda.",
        time: "10:18 AM",
      },
    ],
  },
  {
    id: "WA-003",
    customerName: "Maju Food Processing",
    phone: "+60 10-343 8543",
    accountNo: "2268-3497-3412",
    arrears: 1280.0,
    lastSnippet: "Invois bulan lepas kami belum semak, tolong hantar semula penyata akaun lengkap.",
    timestamp: "Today, 09:40 AM",
    sentiment: "Neutral",
    ptpStatus: "Statement Sent",
    statusTone: "info",
    isAiPaused: false,
    history: [
      {
        sender: "AI Assistant",
        text: "Notis Peringatan Akaun Komersial Maju Food Processing: Tunggakan RM1,280.00.",
        time: "09:15 AM",
      },
      {
        sender: "Customer",
        text: "Invois bulan lepas kami belum semak, tolong hantar semula penyata akaun lengkap.",
        time: "09:40 AM",
      },
      {
        sender: "AI Assistant",
        text: "Penyata akaun rasmi telah dijana dan dilampirkan untuk semakan pihak pengurusan kewangan anda.",
        time: "09:43 AM",
        attachment: {
          type: "document",
          name: "IWK_Account_Statement_2268-3497.pdf",
          size: "284 KB",
        },
      },
    ],
  },
  {
    id: "WA-004",
    customerName: "Tan Wei Loon",
    phone: "+60 12-887 3491",
    accountNo: "7731-5520-9943",
    arrears: 185.2,
    lastSnippet: "Kenapa bil naik mendadak bulan ni? Premis saya dah lama tutup dan tiada orang!",
    timestamp: "Yesterday, 4:20 PM",
    sentiment: "Negative",
    ptpStatus: "Dispute Flagged",
    statusTone: "bad",
    isAiPaused: true,
    history: [
      {
        sender: "AI Assistant",
        text: "Peringatan Tunggakan Bil Premis 7731-5520-9943 berjumlah RM185.20.",
        time: "03:45 PM",
      },
      {
        sender: "Customer",
        text: "Kenapa bil naik mendadak bulan ni? Premis saya dah lama tutup dan tiada orang!",
        time: "04:20 PM",
      },
      {
        sender: "Agent (@kamil)",
        text: "Salam Encik Tan. Kami telah merekodkan pertikaian premis kosong (#DSP-9921). Pasukan teknikal IWK akan menyemak semula status penyambungan.",
        time: "04:24 PM",
      },
    ],
  },
  {
    id: "WA-005",
    customerName: "Kumar a/l Subramaniam",
    phone: "+60 17-234 9012",
    accountNo: "3390-1124-7832",
    arrears: 420.0,
    lastSnippet: "Okay terima kasih atas peringatan, saya akan jelaskan sebelum 20hb ini ya.",
    timestamp: "Yesterday, 2:10 PM",
    sentiment: "Positive",
    ptpStatus: "PTP 20 Sep 2026",
    statusTone: "good",
    isAiPaused: false,
    history: [
      {
        sender: "AI Assistant",
        text: "Salam sejahtera Encik Kumar. Mohon jelaskan baki tertunggak RM420.00 bagi mengelakkan tindakan statutori.",
        time: "01:30 PM",
      },
      {
        sender: "Customer",
        text: "Okay terima kasih atas peringatan, saya akan jelaskan sebelum 20hb ini ya.",
        time: "02:10 PM",
      },
      {
        sender: "AI Assistant",
        text: "Janji bayar (PTP) pada 20 September 2026 telah direkodkan. Terima kasih atas komitmen anda.",
        time: "02:13 PM",
      },
    ],
  },
  {
    id: "WA-006",
    customerName: "Wong Siew Mei",
    phone: "+60 14-554 3210",
    accountNo: "9934-2210-7765",
    arrears: 175.0,
    lastSnippet: "Boleh kirim pautan pembayaran FPX terus ke WhatsApp saya?",
    timestamp: "10 Sep 2026",
    sentiment: "Positive",
    ptpStatus: "Payment Link Sent",
    statusTone: "good",
    isAiPaused: false,
    history: [
      {
        sender: "AI Assistant",
        text: "Salam Puan Wong. Bil IWK tertunggak RM175.00 bagi No. Akaun 9934-2210-7765.",
        time: "02:00 PM",
      },
      {
        sender: "Customer",
        text: "Boleh kirim pautan pembayaran FPX terus ke WhatsApp saya?",
        time: "02:15 PM",
      },
      {
        sender: "AI Assistant",
        text: "Berikut pautan FPX segera anda: https://pay.iwk.com.my/fpx/993422. Anda juga boleh imbas kod QR yang dilampirkan.",
        time: "02:18 PM",
        attachment: {
          type: "qrcode",
          name: "DuitNow_QR_9934-2210.png",
          size: "48 KB",
        },
      },
    ],
  },
];
