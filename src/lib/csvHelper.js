/* ============================================================
   CSV Parser, Validator, and Water Utility Schema Helper
   Designed for Government Water Supply / Sewerage Utilities (e.g. Indah Water Konsortium)
   ============================================================ */

export const WATER_SUPPLY_COLUMNS = [
  {
    key: "accountNo",
    label: "Account Number",
    required: true,
    description: "Official water utility account number (e.g. 9934-2210-7765)",
    example: "9934-2210-7765",
    aliases: ["accountno", "account_no", "account_number", "account", "acc_no", "accno", "account_id", "no_akaun", "akaun"],
  },
  {
    key: "name",
    label: "Customer Name",
    required: true,
    description: "Registered premise owner or commercial business entity",
    example: "Wong Siew Mei",
    aliases: ["name", "customer_name", "customer", "full_name", "client_name", "nama", "nama_pelanggan"],
  },
  {
    key: "idNumber",
    label: "IC / SSM Reg No",
    required: false,
    description: "MyKad / NRIC for individuals or SSM registration for businesses",
    example: "850412-10-5422",
    aliases: ["id_number", "idnumber", "ic_number", "ic", "mykad", "ssm", "ssm_no", "nric", "passport", "no_kp", "registration_no"],
  },
  {
    key: "category",
    label: "Customer Category",
    required: false,
    description: "Domestic, Commercial, Industrial, or Government",
    example: "Domestic",
    aliases: ["category", "customer_category", "type", "account_type", "kategori", "customer_type"],
  },
  {
    key: "propertyType",
    label: "Premise / Property Type",
    required: false,
    description: "Low-cost terrace, High-rise residential, Commercial shop lot, Factory",
    example: "Low-cost terrace",
    aliases: ["property_type", "premise_type", "property", "premise", "jenis_premis", "tipe_premis"],
  },
  {
    key: "meterNo",
    label: "Water Meter Serial",
    required: false,
    description: "Physical water meter identifier installed at premise",
    example: "MTR-881204",
    aliases: ["meter_no", "meter_number", "meter", "water_meter", "no_meter", "meter_id"],
  },
  {
    key: "tariff",
    label: "Tariff Code / Rate",
    required: false,
    description: "Water sewerage tariff scheme (e.g. RM 15.00/mo, Tariff D1)",
    example: "RM 15.00/mo",
    aliases: ["tariff", "tariff_code", "tariff_rate", "monthly_tariff", "tarif", "rate"],
  },
  {
    key: "billingCycle",
    label: "Billing Cycle",
    required: false,
    description: "Billing interval: Monthly, Every 2 months, or Every 6 months",
    example: "Every 6 months",
    aliases: ["billing_cycle", "cycle", "kitaran_bil", "frequency"],
  },
  {
    key: "arrearsAmount",
    label: "Arrears Amount (RM)",
    required: true,
    description: "Total outstanding overdue balance in Ringgit Malaysia",
    example: "165.00",
    aliases: ["arrearsamount", "arrears_amount", "arrears", "balance", "outstanding", "amount_due", "tunggakan", "jumlah_tunggakan", "amount"],
  },
  {
    key: "arrearsDays",
    label: "Days Overdue",
    required: false,
    description: "Elapsed days since the oldest unpaid bill was issued",
    example: "45",
    aliases: ["arrearsdays", "arrears_days", "days_overdue", "overdue_days", "days", "hari_tunggakan"],
  },
  {
    key: "unpaidBills",
    label: "Unpaid Bills Count",
    required: false,
    description: "Number of unpaid billing cycles",
    example: "4",
    aliases: ["unpaid_bills", "bills_count", "number_of_bills", "bill_count", "bilangan_bil", "bills"],
  },
  {
    key: "waterConsumptionM3",
    label: "Consumption (m³)",
    required: false,
    description: "Average monthly discharge or water consumption in cubic meters",
    example: "18.5",
    aliases: ["water_consumption", "consumption", "consumption_m3", "penggunaan_air", "usage_m3"],
  },
  {
    key: "address",
    label: "Address",
    required: false,
    description: "Street and premise location address",
    example: "24, Jalan Pandan Indah 1/2",
    aliases: ["address", "premise_address", "street", "alamat"],
  },
  {
    key: "area",
    label: "Area / District",
    required: true,
    description: "Operational area / municipality (e.g. Ampang, Klang, Petaling Jaya)",
    example: "Ampang",
    aliases: ["area", "district", "city", "town", "daerah", "kawasan"],
  },
  {
    key: "state",
    label: "State / Region",
    required: false,
    description: "Malaysian state (e.g. Selangor, Johor, Kuala Lumpur, Pulau Pinang)",
    example: "Selangor",
    aliases: ["state", "negeri", "region"],
  },
  {
    key: "postcode",
    label: "Postcode",
    required: false,
    description: "Postal code",
    example: "55100",
    aliases: ["postcode", "postal_code", "zip", "poskod"],
  },
  {
    key: "occupancyStatus",
    label: "Occupancy Status",
    required: false,
    description: "Owner Occupied, Tenant, or Vacant Premise",
    example: "Owner Occupied",
    aliases: ["occupancy_status", "occupancy", "owner_status", "status_penghuni"],
  },
  {
    key: "phone",
    label: "Phone Number",
    required: false,
    description: "Mobile or landline phone number for Voice AI & messaging",
    example: "+60123456789",
    aliases: ["phone", "phone_number", "mobile", "contact", "telefon", "no_telefon"],
  },
  {
    key: "email",
    label: "Email Address",
    required: false,
    description: "Customer email for electronic billing notifications",
    example: "customer@example.my",
    aliases: ["email", "email_address", "emel"],
  },
  {
    key: "preferredChannel",
    label: "Preferred Channel",
    required: false,
    description: "WhatsApp, AI Call, SMS, or Email (from IWK Recovery Engine)",
    example: "WhatsApp",
    aliases: ["preferred_channel", "channel", "saluran_pilihan", "contact_channel"],
  },
  {
    key: "preferredLanguage",
    label: "Preferred Language",
    required: false,
    description: "Bahasa Malaysia, English, Mandarin, or Tamil",
    example: "Bahasa Malaysia",
    aliases: ["preferred_language", "language", "bahasa"],
  },
  {
    key: "bestTimeToReach",
    label: "Best Time to Reach",
    required: false,
    description: "Calling hours window (e.g. Weekdays 8pm-9pm, Weekdays 9am-5pm)",
    example: "Weekdays 8pm-9pm",
    aliases: ["best_time_to_reach", "contact_time", "calling_hours", "masa_sesuai"],
  },
  {
    key: "stage",
    label: "Collection Stage",
    required: false,
    description: "Bill Presented, Pre-Due, Early Arrears, Committed Arrears, Formal, Residual",
    example: "Early Arrears",
    aliases: ["stage", "ladder_stage", "collection_stage", "peringkat"],
  },
  {
    key: "segment",
    label: "Customer Segment",
    required: false,
    description: "Friction Payers, Refusers, Constrained, Non-viable",
    example: "Friction Payers",
    aliases: ["segment", "customer_segment", "segmen"],
  },
  {
    key: "specialRouting",
    label: "Special Routing / Tag",
    required: false,
    description: "Hardship/eKasih, Vacant Premise, Open Dispute, Deceased Estate, None",
    example: "Hardship/eKasih",
    aliases: ["special_routing", "specialrouting", "routing", "tag", "tags", "laluan_khas"],
  },
  {
    key: "propensityScore",
    label: "Propensity Score",
    required: false,
    description: "AI model likelihood score (0 to 100)",
    example: "78",
    aliases: ["propensity_score", "propensity", "propensity_to_pay", "ptp_score", "score"],
  },
  {
    key: "customerSince",
    label: "Customer Since",
    required: false,
    description: "Year or date account was activated",
    example: "2014",
    aliases: ["customer_since", "registered_year", "since", "pelanggan_sejak"],
  },
];

/**
 * Standard RFC 4180 compliant CSV line tokenizer
 */
export function parseCsvRows(text) {
  if (!text) return [];
  // Strip UTF-8 BOM if present
  const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter out empty rows
  return rows.filter((r) => r.some((c) => c !== ""));
}

/**
 * Maps raw CSV headers to canonical keys in WATER_SUPPLY_COLUMNS
 */
function mapHeaders(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "")
  );

  normalizedHeaders.forEach((nh, colIndex) => {
    for (const def of WATER_SUPPLY_COLUMNS) {
      if (def.aliases.includes(nh) || def.key.toLowerCase() === nh) {
        mapping[colIndex] = def.key;
        break;
      }
    }
    // If not matched, try looser sub-matching
    if (!mapping[colIndex]) {
      if (nh.includes("account") || nh.includes("acc")) mapping[colIndex] = "accountNo";
      else if (nh.includes("name") || nh.includes("customer")) mapping[colIndex] = "name";
      else if (nh.includes("arrear") || nh.includes("balance") || nh.includes("due")) mapping[colIndex] = "arrearsAmount";
      else if (nh.includes("meter")) mapping[colIndex] = "meterNo";
      else if (nh.includes("tariff")) mapping[colIndex] = "tariff";
      else if (nh.includes("channel")) mapping[colIndex] = "preferredChannel";
    }
  });

  return mapping;
}

/**
 * Smart value cleaners & standardizers
 */
function cleanNumeric(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function cleanCategory(v) {
  if (!v) return "Domestic";
  const str = String(v).toLowerCase();
  if (str.includes("gov") || str.includes("kerajaan")) return "Government";
  if (str.includes("ind") || str.includes("kilang") || str.includes("factory")) return "Industrial";
  if (str.includes("com") || str.includes("kom") || str.includes("perniagaan") || str.includes("kedai")) return "Commercial";
  return "Domestic";
}

function cleanStage(stageVal, arrearsDays) {
  if (stageVal && ["Bill Presented", "Pre-Due", "Early Arrears", "Committed Arrears", "Formal", "Residual"].includes(stageVal)) {
    return stageVal;
  }
  const days = Number(arrearsDays) || 0;
  if (days <= 0) return "Pre-Due";
  if (days <= 30) return "Early Arrears";
  if (days <= 90) return "Committed Arrears";
  if (days <= 180) return "Formal";
  return "Residual";
}

function cleanRouting(v) {
  if (!v) return null;
  const str = String(v).toLowerCase();
  if (str.includes("hardship") || str.includes("kasih") || str.includes("b40")) return "Hardship/eKasih";
  if (str.includes("vacant") || str.includes("kosong") || str.includes("empty")) return "Vacant Premise";
  if (str.includes("dispute") || str.includes("pertikaian")) return "Open Dispute";
  if (str.includes("deceased") || str.includes("meninggal")) return "Deceased Estate";
  if (str === "none" || str === "main funnel" || str === "") return null;
  return v;
}

/**
 * Main parser function to import and validate customer CSV data
 */
export function parseCustomerCsv(csvText, existingCustomers = []) {
  const rows = parseCsvRows(csvText);
  if (!rows || rows.length < 2) {
    return {
      success: false,
      error: "CSV file is empty or does not contain header and data rows.",
      records: [],
      summary: null,
    };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  const colMap = mapHeaders(headerRow);

  const mappedKeys = Object.values(colMap);
  const hasAccountOrName = mappedKeys.includes("accountNo") || mappedKeys.includes("name");

  if (!hasAccountOrName) {
    return {
      success: false,
      error: "Could not recognize required columns. CSV must include at least 'Account Number' or 'Customer Name'.",
      records: [],
      summary: null,
    };
  }

  // Calculate highest existing ID index
  let maxIdNum = existingCustomers.reduce((max, c) => {
    const n = Number(String(c.id || "").replace(/\D/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 100000);

  const existingAccountSet = new Set(
    existingCustomers.map((c) => (c.accountNo || "").trim()).filter(Boolean)
  );

  const records = [];
  const errors = [];
  let updateCount = 0;
  let newCount = 0;
  let totalArrearsSum = 0;
  const categoryCounts = { Domestic: 0, Commercial: 0, Industrial: 0, Government: 0 };

  dataRows.forEach((row, rowIndex) => {
    const rawObj = {};
    row.forEach((cellVal, colIndex) => {
      const fieldKey = colMap[colIndex];
      if (fieldKey) rawObj[fieldKey] = cellVal;
    });

    const name = (rawObj.name || "").trim();
    let accountNo = (rawObj.accountNo || "").trim();

    if (!name && !accountNo) {
      errors.push(`Row ${rowIndex + 2}: Skipped because both Name and Account Number are missing.`);
      return;
    }

    if (!accountNo) {
      maxIdNum++;
      accountNo = `99${String(maxIdNum).padStart(4, "0").slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const isUpdate = existingAccountSet.has(accountNo);
    if (isUpdate) updateCount++;
    else newCount++;

    const arrearsAmount = Math.max(0, cleanNumeric(rawObj.arrearsAmount));
    const arrearsDays = Math.max(0, Math.round(cleanNumeric(rawObj.arrearsDays)));
    const category = cleanCategory(rawObj.category);
    const stage = cleanStage(rawObj.stage, arrearsDays);
    const segment = rawObj.segment || (arrearsDays > 60 ? "Refusers" : "Friction Payers");
    const specialRouting = cleanRouting(rawObj.specialRouting);

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    totalArrearsSum += arrearsAmount;

    maxIdNum++;
    const id = rawObj.id || `ACC-${maxIdNum}`;

    const record = {
      id,
      accountNo,
      name: name || `Customer ${accountNo}`,
      idNumber: rawObj.idNumber || "",
      category,
      propertyType: rawObj.propertyType || (category === "Domestic" ? "Terrace House" : category === "Commercial" ? "Shoplot" : "Industrial Plant"),
      meterNo: rawObj.meterNo || `MTR-${Math.floor(100000 + Math.random() * 900000)}`,
      tariff: rawObj.tariff || (category === "Domestic" ? "RM 15.00/mo" : "Commercial Tariff A"),
      billingCycle: rawObj.billingCycle || "Every 6 months",
      arrearsAmount,
      arrearsDays,
      unpaidBills: rawObj.unpaidBills ? Math.round(cleanNumeric(rawObj.unpaidBills)) : (arrearsDays > 0 ? Math.max(1, Math.ceil(arrearsDays / 60)) : 0),
      waterConsumptionM3: rawObj.waterConsumptionM3 ? cleanNumeric(rawObj.waterConsumptionM3) : null,
      address: rawObj.address || "Main Street Address",
      area: rawObj.area || "Klang",
      state: rawObj.state || "Selangor",
      postcode: rawObj.postcode || "41200",
      occupancyStatus: rawObj.occupancyStatus || (specialRouting === "Vacant Premise" ? "Vacant Premise" : "Owner Occupied"),
      phone: rawObj.phone || "+601" + Math.floor(10000000 + Math.random() * 90000000),
      email: rawObj.email || `acct${maxIdNum}@example.my`,
      preferredChannel: rawObj.preferredChannel || "WhatsApp",
      preferredLanguage: rawObj.preferredLanguage || "Bahasa Malaysia",
      bestTimeToReach: rawObj.bestTimeToReach || "Weekdays 8pm-9pm",
      contactable: rawObj.contactable != null ? (String(rawObj.contactable).toLowerCase() !== "no" && String(rawObj.contactable).toLowerCase() !== "false") : true,
      stage,
      segment,
      specialRouting,
      propensityScore: rawObj.propensityScore ? Math.round(cleanNumeric(rawObj.propensityScore)) : 75,
      lastBillDate: rawObj.lastBillDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      lastPaymentDate: rawObj.lastPaymentDate || null,
      customerSince: rawObj.customerSince || "2020",
      promiseToPay: null,
      instalmentPlan: rawObj.planMonthlyAmount ? { active: true, monthlyAmount: cleanNumeric(rawObj.planMonthlyAmount) } : null,
      dcaPlacement: null,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    records.push(record);
  });

  return {
    success: true,
    records,
    errors,
    summary: {
      totalRows: dataRows.length,
      validRecords: records.length,
      newAccounts: newCount,
      updatedAccounts: updateCount,
      totalArrears: totalArrearsSum,
      categoryCounts,
      detectedColumns: Object.values(colMap),
    },
  };
}

/**
 * Generates an authentic sample CSV reflecting a major government water utility
 * based on the Indah Water Konsortium operations in the reference document.
 */
export function generateSampleCsv() {
  const headers = [
    "Account Number",
    "Customer Name",
    "IC / SSM No",
    "Category",
    "Premise Type",
    "Water Meter Serial",
    "Tariff Rate",
    "Billing Cycle",
    "Arrears (RM)",
    "Days Overdue",
    "Unpaid Bills",
    "Consumption (m3)",
    "Address",
    "Area",
    "State",
    "Postcode",
    "Occupancy Status",
    "Phone Number",
    "Email Address",
    "Preferred Channel",
    "Preferred Language",
    "Best Time to Reach",
    "Collection Stage",
    "Customer Segment",
    "Special Routing",
    "Propensity Score",
    "Customer Since",
  ];

  const sampleData = [
    [
      "9934-2210-7765",
      "Wong Siew Mei",
      "850412-10-5422",
      "Domestic",
      "Low-cost terrace",
      "MTR-881204",
      "RM 15.00/mo",
      "Every 6 months",
      "165.00",
      "45",
      "4",
      "14.5",
      "24, Jalan Pandan Indah 1/2",
      "Ampang",
      "Selangor",
      "55100",
      "Owner Occupied",
      "+60128841920",
      "siewmei.wong@example.my",
      "WhatsApp",
      "Bahasa Malaysia",
      "Weekdays 8pm-9pm",
      "Early Arrears",
      "Friction Payers",
      "Hardship/eKasih",
      "78",
      "2014",
    ],
    [
      "4471-0932-5518",
      "Kilang Papan Bestari Sdn Bhd",
      "201201094821",
      "Industrial",
      "Sawmill & Timber Plant",
      "MTR-004910",
      "Industrial Category 2",
      "Monthly",
      "186400.00",
      "930",
      "31",
      "480.0",
      "Lot 1082, Kawasan Perindustrian Bandar Sultan Suleiman",
      "Klang",
      "Selangor",
      "42000",
      "Owner Occupied",
      "+60193321900",
      "finance@kilangpapan.my",
      "AI Call",
      "English",
      "Weekdays 9am-5pm",
      "Formal",
      "Refusers",
      "None",
      "68",
      "2018",
    ],
    [
      "3381-9021-4412",
      "Cahaya Heights Management",
      "201902881022",
      "Commercial",
      "High-rise Commercial Complex",
      "MTR-491024",
      "Commercial Band A",
      "Monthly",
      "12640.00",
      "68",
      "3",
      "120.0",
      "Persiaran Cahaya Heights, Seksyen 14",
      "Petaling Jaya",
      "Selangor",
      "46100",
      "Tenant",
      "+60162208119",
      "management@cahayaheights.com.my",
      "Email",
      "English",
      "Weekdays 9am-5pm",
      "Committed Arrears",
      "Friction Payers",
      "None",
      "82",
      "2019",
    ],
    [
      "5510-8832-1920",
      "Syarikat Kejuruteraan Dinamik",
      "201601004912",
      "Industrial",
      "Engineering Workshop",
      "MTR-772109",
      "Industrial Category 1",
      "Monthly",
      "3450.00",
      "75",
      "3",
      "85.2",
      "12, Jalan Tebrau 4, Kawasan Perindustrian Tebrau",
      "Johor Bahru",
      "Johor",
      "81100",
      "Owner Occupied",
      "+60177728104",
      "admin@dinamik-eng.my",
      "AI Call",
      "Bahasa Malaysia",
      "Weekdays 9am-5pm",
      "Committed Arrears",
      "Refusers",
      "None",
      "45",
      "2016",
    ],
    [
      "8821-4910-3329",
      "Kumar a/l Subramaniam",
      "780918-07-5511",
      "Domestic",
      "Single Storey Terrace",
      "MTR-339102",
      "RM 15.00/mo",
      "Every 6 months",
      "420.00",
      "60",
      "2",
      "22.4",
      "88, Jalan Air Itam",
      "Georgetown",
      "Pulau Pinang",
      "11500",
      "Owner Occupied",
      "+60124419820",
      "kumar78@example.my",
      "WhatsApp",
      "English",
      "Weekdays 6pm-8pm",
      "Committed Arrears",
      "Friction Payers",
      "None",
      "84",
      "2012",
    ],
    [
      "6619-3381-0021",
      "Perniagaan Runcit Sejahtera",
      "002198421-V",
      "Commercial",
      "Retail Shoplot",
      "MTR-661208",
      "Commercial Band B",
      "Monthly",
      "2960.00",
      "95",
      "4",
      "35.0",
      "15, Jalan Silibin",
      "Ipoh",
      "Perak",
      "30100",
      "Tenant",
      "+60135529104",
      "sejahtera.runcit@gmail.com",
      "SMS",
      "Bahasa Malaysia",
      "Weekdays 10am-2pm",
      "Formal",
      "Constrained",
      "None",
      "52",
      "2017",
    ],
    [
      "1190-4428-9912",
      "Jabatan Kerja Raya Cawangan Selangor",
      "GOV-SEL-JKR-01",
      "Government",
      "Government Office Building",
      "MTR-110924",
      "Government Institutional",
      "Monthly",
      "45200.00",
      "120",
      "4",
      "340.0",
      "Kompleks Pentadbiran Kerajaan Negeri, Persiaran Masjid",
      "Shah Alam",
      "Selangor",
      "40000",
      "Owner Occupied",
      "+60355102000",
      "kewangan@jkr.selangor.gov.my",
      "Email",
      "Bahasa Malaysia",
      "Weekdays 8am-4pm",
      "Formal",
      "Constrained",
      "None",
      "71",
      "2010",
    ],
    [
      "7721-0042-8819",
      "Tan Wei Loon",
      "910304-05-5911",
      "Commercial",
      "Commercial Shoplot Ground Floor",
      "MTR-994102",
      "Commercial Band A",
      "Monthly",
      "185.20",
      "40",
      "1",
      "0.0",
      "42, Jalan Tuanku Munawir",
      "Seremban",
      "Negeri Sembilan",
      "70000",
      "Vacant Premise",
      "+60196612984",
      "weiloon.tan@example.com",
      "WhatsApp",
      "Mandarin",
      "Weekdays 8pm-9pm",
      "Early Arrears",
      "Friction Payers",
      "Vacant Premise",
      "95",
      "2021",
    ],
  ];

  const escapeCell = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csvContent = [headers.map(escapeCell).join(",")]
    .concat(sampleData.map((row) => row.map(escapeCell).join(",")))
    .join("\r\n");

  return csvContent;
}
