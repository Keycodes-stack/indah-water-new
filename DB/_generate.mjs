/* ============================================================
   DB/_generate.mjs — one-off demo data generator for Indah Water.

   Run with:  npm run seed

   The dashboard NEVER calls this at runtime; it only reads the JSON
   files this writes. Regenerate when you want different volumes.

   Everything is driven by one seeded PRNG so the output is
   reproducible, and the files are emitted in a single pass so the
   cross-references between them stay consistent:
     - compliance contact counts  == channel-activity sends
     - KPI recovery              tracks treatment spend
     - agency placements         point at real customer ids
   ============================================================ */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/* ---------------- seeded PRNG (mulberry32) ---------------- */

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260915);

const rand = (min, max) => min + rnd() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const round2 = (n) => Math.round(n * 100) / 100;

/* Weighted pick: [[value, weight], ...] */
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) {
    r -= w;
    if (r <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
}

/* ---------------- reference data ---------------- */

/* Real IWK operating areas. `weight` drives how many accounts land in
   each one, so the geography page has a believable concentration. */
const AREAS = [
  { area: "Kuala Lumpur", state: "W.P. Kuala Lumpur", postcode: "50450", weight: 16, coverage: 0.91 },
  { area: "Shah Alam", state: "Selangor", postcode: "40150", weight: 13, coverage: 0.88 },
  { area: "Petaling Jaya", state: "Selangor", postcode: "46000", weight: 12, coverage: 0.9 },
  { area: "Klang", state: "Selangor", postcode: "41200", weight: 10, coverage: 0.81 },
  { area: "Johor Bahru", state: "Johor", postcode: "80100", weight: 9, coverage: 0.79 },
  { area: "Ipoh", state: "Perak", postcode: "30000", weight: 7, coverage: 0.76 },
  { area: "Seremban", state: "Negeri Sembilan", postcode: "70100", weight: 6, coverage: 0.74 },
  { area: "Melaka", state: "Melaka", postcode: "75000", weight: 5, coverage: 0.77 },
  { area: "Kuantan", state: "Pahang", postcode: "25000", weight: 5, coverage: 0.7 },
  { area: "Kota Kinabalu", state: "Sabah", postcode: "88000", weight: 4, coverage: 0.63 },
  { area: "Kuching", state: "Sarawak", postcode: "93000", weight: 4, coverage: 0.66 },
  { area: "Alor Setar", state: "Kedah", postcode: "05100", weight: 3, coverage: 0.68 },
  { area: "Georgetown", state: "Pulau Pinang", postcode: "10200", weight: 6, coverage: 0.85 },
];

const STAGES = [
  "Bill Presented",
  "Pre-Due",
  "Early Arrears",
  "Committed Arrears",
  "Formal",
  "Residual",
];

const SEGMENTS = ["Friction Payers", "Refusers", "Constrained", "Non-viable"];

const SPECIAL_ROUTING = [
  "Deceased Estate",
  "Vacant Premise",
  "Hardship/eKasih",
  "Open Dispute",
];

const CATEGORIES = ["Domestic", "Commercial", "Government", "Industrial"];

const CHANNELS = ["WhatsApp/EWP", "SMS/IVR", "Email", "Print"];

/* Malay, Chinese and Indian name pools — Malaysia's actual mix. */
const MALAY_FIRST_M = ["Ahmad", "Mohd", "Muhammad", "Faizal", "Hafiz", "Rizal", "Azman", "Shahrul", "Amir", "Zulkifli", "Iskandar", "Haziq"];
const MALAY_FIRST_F = ["Nurul", "Siti", "Aina", "Farah", "Zaleha", "Noraini", "Hasnah", "Syafiqah", "Aishah", "Rohana"];
const MALAY_LAST = ["Rahman", "Ibrahim", "Hassan", "Yusof", "Osman", "Karim", "Salleh", "Abdullah", "Razak", "Mahmud"];
const CHINESE_FIRST = ["Wei Ming", "Li Hua", "Chee Keong", "Mei Ling", "Jia Hui", "Kok Wai", "Siew Lan", "Yong Sheng"];
const CHINESE_LAST = ["Tan", "Lim", "Lee", "Wong", "Ng", "Chong", "Goh", "Teoh"];
const INDIAN_FIRST_M = ["Ramesh", "Suresh", "Anand", "Rajesh", "Kumar", "Ganesan"];
const INDIAN_FIRST_F = ["Priya", "Kavitha", "Devi", "Shanti", "Latha", "Meena"];
const INDIAN_LAST = ["Subramaniam", "Nair", "Pillai", "Krishnan", "Raju", "Menon"];

const COMMERCIAL_NAMES = ["Sdn Bhd", "Enterprise", "Trading", "Holdings Bhd", "Resources Sdn Bhd"];
const COMMERCIAL_PREFIX = ["Maju", "Perdana", "Bistari", "Gemilang", "Suria", "Harmoni", "Cahaya", "Restu", "Mutiara", "Seri"];
const GOV_BODIES = ["Jabatan Kerja Raya", "Majlis Perbandaran", "Klinik Kesihatan", "Sekolah Kebangsaan", "Pejabat Daerah", "Balai Bomba"];
const INDUSTRIAL_KIND = ["Manufacturing", "Logistics Hub", "Food Processing", "Textile Mill", "Packaging Plant"];

const STREETS = ["Jalan Ampang", "Jalan Bukit Bintang", "Persiaran Kayangan", "Lorong Maarof", "Jalan Tun Razak", "Jalan Sultan Ismail", "Persiaran Bestari", "Jalan Meru", "Lebuh Raya Kemuning", "Jalan Damai"];

function personName() {
  const kind = weighted([["malay", 60], ["chinese", 24], ["indian", 16]]);
  if (kind === "malay") {
    const female = rnd() < 0.5;
    const first = female ? pick(MALAY_FIRST_F) : pick(MALAY_FIRST_M);
    return `${first} ${female ? "binti" : "bin"} ${pick(MALAY_LAST)}`;
  }
  if (kind === "chinese") return `${pick(CHINESE_LAST)} ${pick(CHINESE_FIRST)}`;
  // a/l = anak lelaki (son of), a/p = anak perempuan (daughter of)
  const female = rnd() < 0.5;
  const first = female ? pick(INDIAN_FIRST_F) : pick(INDIAN_FIRST_M);
  return `${first} ${female ? "a/p" : "a/l"} ${pick(INDIAN_LAST)}`;
}

function entityName(category) {
  if (category === "Domestic") return personName();
  if (category === "Commercial") return `${pick(COMMERCIAL_PREFIX)} ${pick(COMMERCIAL_NAMES)}`;
  if (category === "Government") return `${pick(GOV_BODIES)} ${pick(AREAS).area}`;
  return `${pick(COMMERCIAL_PREFIX)} ${pick(INDUSTRIAL_KIND)}`;
}

/* ---------------- dates ---------------- */

const TODAY = new Date("2026-09-15T00:00:00Z");
const DAY = 86400000;

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n) => iso(TODAY.getTime() - n * DAY);

/* ---------------- customers (the spine) ---------------- */

const CUSTOMER_COUNT = 900;

/* Arrears days decide the ladder stage, so ageing and stage never
   contradict each other on the book-position page. */
function stageForDays(days) {
  if (days <= 0) return "Bill Presented";
  if (days <= 14) return "Pre-Due";
  if (days <= 60) return "Early Arrears";
  if (days <= 120) return "Committed Arrears";
  if (days <= 240) return "Formal";
  return "Residual";
}

/* Typical bill size differs sharply by customer category. */
function baseAmountFor(category) {
  switch (category) {
    case "Domestic": return rand(28, 320);
    case "Commercial": return rand(240, 2600);
    case "Government": return rand(900, 7400);
    default: return rand(1800, 14500);
  }
}

const customers = [];

for (let i = 0; i < CUSTOMER_COUNT; i++) {
  const category = weighted([
    ["Domestic", 72], ["Commercial", 18], ["Government", 4], ["Industrial", 6],
  ]);

  const loc = weighted(AREAS.map((a) => [a, a.weight]));

  const arrearsDays = weighted([
    [randInt(-20, 0), 14],   // billed, not yet due
    [randInt(1, 14), 13],
    [randInt(15, 60), 26],
    [randInt(61, 120), 21],
    [randInt(121, 240), 16],
    [randInt(241, 900), 10],
  ]);

  const stage = stageForDays(arrearsDays);

  // The longer it runs, the more months pile up.
  const months = Math.max(1, Math.ceil(Math.max(arrearsDays, 0) / 30));
  const arrearsAmount = round2(baseAmountFor(category) * Math.min(months, 9) * rand(0.75, 1.2));

  /* Segment correlates with stage: fresh debt skews to friction payers,
     aged debt to refusers and non-viable. */
  const segment =
    arrearsDays <= 14
      ? weighted([["Friction Payers", 78], ["Constrained", 14], ["Refusers", 7], ["Non-viable", 1]])
      : arrearsDays <= 60
      ? weighted([["Friction Payers", 58], ["Constrained", 24], ["Refusers", 15], ["Non-viable", 3]])
      : arrearsDays <= 120
      ? weighted([["Friction Payers", 33], ["Constrained", 31], ["Refusers", 29], ["Non-viable", 7]])
      : arrearsDays <= 240
      ? weighted([["Friction Payers", 16], ["Constrained", 30], ["Refusers", 38], ["Non-viable", 16]])
      : weighted([["Friction Payers", 6], ["Constrained", 22], ["Refusers", 38], ["Non-viable", 34]]);

  /* Special-routing cases are pulled out of the main funnel downstream. */
  const specialRouting =
    rnd() < 0.12
      ? weighted([
          ["Hardship/eKasih", 38],
          ["Vacant Premise", 27],
          ["Open Dispute", 22],
          ["Deceased Estate", 13],
        ])
      : null;

  const contactable = specialRouting === "Deceased Estate" ? false : rnd() < 0.78;

  /* A promise to pay only exists once someone has actually engaged. */
  const hasPromise = contactable && arrearsDays > 14 && rnd() < 0.34;
  const promiseToPay = hasPromise
    ? {
        date: daysAgo(randInt(1, 45)),
        amount: round2(arrearsAmount * rand(0.25, 1)),
        kept: rnd() < 0.64,
      }
    : null;

  const hasPlan = contactable && arrearsDays > 45 && rnd() < 0.22;
  const instalmentPlan = hasPlan
    ? {
        active: true,
        monthlyAmount: round2(arrearsAmount / randInt(3, 12)),
        adherence: round2(rand(0.42, 1)),
        startedAt: daysAgo(randInt(30, 180)),
      }
    : null;

  customers.push({
    id: `ACC-${100000 + i}`,
    accountNo: `${randInt(1000, 9999)}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
    name: entityName(category),
    category,
    address: `${randInt(1, 240)}, ${pick(STREETS)}`,
    area: loc.area,
    state: loc.state,
    postcode: loc.postcode,
    phone: `+601${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    email: `acct${100000 + i}@example.my`,
    arrearsAmount,
    arrearsDays,
    lastBillDate: daysAgo(Math.max(arrearsDays, 0) + randInt(0, 6)),
    lastPaymentDate: rnd() < 0.86 ? daysAgo(Math.max(arrearsDays, 0) + randInt(5, 120)) : null,
    stage,
    segment,
    specialRouting,
    contactable,
    promiseToPay,
    instalmentPlan,
    dcaPlacement: null, // filled in once agencies exist
    createdAt: daysAgo(randInt(400, 2200)),
  });
}

/* ---------------- agencies, placements, legal ---------------- */

const AGENCY_DEFS = [
  { id: "DCA-01", name: "Perdana Recovery Sdn Bhd", quality: 0.92 },
  { id: "DCA-02", name: "Amanah Collections Bhd", quality: 0.81 },
  { id: "DCA-03", name: "Sentosa Debt Services", quality: 0.7 },
  { id: "DCA-04", name: "Bumi Kredit Management", quality: 0.61 },
];

/* Only late-stage, contactable, non-special accounts get placed. */
const placeable = customers.filter(
  (c) => (c.stage === "Formal" || c.stage === "Residual") && !c.specialRouting
);

const placements = [];
placeable.forEach((c) => {
  if (rnd() < 0.55) {
    const agency = pick(AGENCY_DEFS);
    c.dcaPlacement = { agencyId: agency.id, placedAt: daysAgo(randInt(5, 260)) };
    placements.push({ customerId: c.id, agencyId: agency.id, value: c.arrearsAmount });
  }
});

const agencies = AGENCY_DEFS.map((a) => {
  const mine = placements.filter((p) => p.agencyId === a.id);
  const valuePlaced = round2(mine.reduce((s, p) => s + p.value, 0));
  const contactRate = round2(0.4 + a.quality * rand(0.2, 0.32));
  const collectionRate = round2(0.08 + a.quality * rand(0.1, 0.2));
  return {
    id: a.id,
    name: a.name,
    activeSince: daysAgo(randInt(400, 1400)),
    accountsPlaced: mine.length,
    valuePlaced,
    contactRate,
    collectionRate,
    amountCollected: round2(valuePlaced * collectionRate),
    complaintsPer1000: round2((1 - a.quality) * rand(2, 5.5)),
    sameDayRecalls: randInt(4, 38),
  };
});

/* Recalls: payment landed, so the account is pulled back the same day. */
const recalls = [];
placements.slice(0, 70).forEach((p) => {
  if (rnd() < 0.42) {
    recalls.push({
      date: daysAgo(randInt(1, 90)),
      customerId: p.customerId,
      agencyId: p.agencyId,
      amountPaid: round2(p.value * rand(0.3, 1)),
      reason: "Payment received",
      sameDay: rnd() < 0.88,
    });
  }
});
recalls.sort((a, b) => (a.date < b.date ? 1 : -1));

const residualCount = customers.filter((c) => c.stage === "Residual").length;

const agenciesFile = {
  agencies,
  recalls,
  legal: {
    demandPacksGenerated: Math.round(residualCount * 0.62),
    demandPacksServed: Math.round(residualCount * 0.48),
    pendingLegalReview: Math.round(residualCount * 0.21),
    writeOffRecommended: Math.round(residualCount * 0.17),
    writeOffApproved: Math.round(residualCount * 0.07),
    statuteReference: "s.88(2) Water Services Industry Act 2006",
  },
};

/* ---------------- channel activity (daily, 90 days) ---------------- */

/* Unit costs live in settings.json; duplicated here only to derive the
   historic spend that was actually incurred per day. */
const UNIT_COST = {
  "WhatsApp/EWP": 0.08,
  "SMS/IVR": 0.05,
  Email: 0.002,
  Print: 1.85,
};

const channelActivity = [];
for (let d = 89; d >= 0; d--) {
  const date = daysAgo(d);
  const dow = new Date(date).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  // Campaigns ramp up over the pilot window.
  const ramp = 0.6 + (89 - d) / 89 * 0.8;

  CHANNELS.forEach((channel) => {
    const base =
      channel === "WhatsApp/EWP" ? 1700
      : channel === "SMS/IVR" ? 1200
      : channel === "Email" ? 900
      : 260;

    const sent = Math.round(base * ramp * (weekend ? 0.25 : 1) * rand(0.82, 1.18));
    const deliveryRate =
      channel === "Print" ? rand(0.9, 0.97)
      : channel === "Email" ? rand(0.86, 0.94)
      : rand(0.93, 0.985);

    const delivered = Math.round(sent * deliveryRate);
    const failed = sent - delivered;
    const readRate = channel === "WhatsApp/EWP" ? rand(0.68, 0.82) : channel === "Print" ? 0 : rand(0.3, 0.52);
    const read = Math.round(delivered * readRate);
    const responded = Math.round(delivered * (channel === "WhatsApp/EWP" ? rand(0.12, 0.2) : channel === "Print" ? rand(0.01, 0.03) : rand(0.04, 0.09)));

    channelActivity.push({
      date, channel, sent, delivered, failed, read, responded,
      cost: round2(sent * UNIT_COST[channel]),
    });
  });
}

/* ---------------- campaigns / cohort analytics ---------------- */

const CAMPAIGN_DEFS = [
  ["SEQ-011", "Pre-Due Courtesy Reminder", "v4", "Friction Payers", ["WhatsApp/EWP", "SMS/IVR"]],
  ["SEQ-014", "Early Arrears Nudge", "v3", "Friction Payers", ["WhatsApp/EWP", "Email"]],
  ["SEQ-018", "Early Arrears Nudge", "v2", "Friction Payers", ["SMS/IVR"]],
  ["SEQ-022", "Instalment Offer", "v3", "Constrained", ["WhatsApp/EWP", "Email"]],
  ["SEQ-027", "Hardship Check-in", "v1", "Constrained", ["WhatsApp/EWP"]],
  ["SEQ-031", "Formal Notice Pre-warning", "v2", "Refusers", ["Print", "SMS/IVR"]],
  ["SEQ-035", "Final Demand Sequence", "v1", "Refusers", ["Print"]],
  ["SEQ-041", "Voice AI Outbound Reminder", "v2", "Friction Payers", ["Voice AI"]],
  ["SEQ-044", "Dormant Review", "v1", "Non-viable", ["Email"]],
];

const campaigns = CAMPAIGN_DEFS.map(([id, name, version, targetSegment, channelMix]) => {
  const accountsTreated = randInt(140, 2100);
  /* Later template versions resolve better — that is the point of the
     cohort view. */
  const versionLift = Number(version.slice(1)) * 0.045;
  const segmentBase =
    targetSegment === "Friction Payers" ? 0.34
    : targetSegment === "Constrained" ? 0.22
    : targetSegment === "Refusers" ? 0.11
    : 0.04;

  const resolutionRate = round2(Math.min(0.72, segmentBase + versionLift + rand(-0.03, 0.05)));
  const resolved = Math.round(accountsTreated * resolutionRate);
  const touchesPerAccount = rand(2.2, 5.1);
  const avgTouchCost =
    channelMix.includes("Print") ? 1.4
    : channelMix.includes("Voice AI") ? 0.14
    : channelMix.includes("WhatsApp/EWP") ? 0.07
    : 0.04;

  const cost = round2(accountsTreated * touchesPerAccount * avgTouchCost);
  const valueResolved = round2(resolved * rand(180, 1400));

  return {
    id, name, version, targetSegment, channelMix,
    startedAt: daysAgo(randInt(30, 120)),
    accountsTreated, resolved, resolutionRate, cost,
    costPerResolution: resolved ? round2(cost / resolved) : 0,
    valueResolved,
    costPerRinggitRecovered: valueResolved ? round2(cost / valueResolved * 1000) / 1000 : 0,
  };
});

/* ---------------- weekly KPI series ---------------- */

/* Spend is taken straight from channelActivity so the Performance page
   and the Treatment page agree. */
function weekKey(d) {
  const date = new Date(d);
  const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - jan1) / DAY + jan1.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const byWeek = new Map();
channelActivity.forEach((r) => {
  const k = weekKey(r.date);
  if (!byWeek.has(k)) byWeek.set(k, { week: k, sent: 0, delivered: 0, responded: 0, cost: 0 });
  const w = byWeek.get(k);
  w.sent += r.sent; w.delivered += r.delivered; w.responded += r.responded; w.cost += r.cost;
});

const collectionsKpis = [...byWeek.values()].map((w, i, arr) => {
  const progress = i / Math.max(1, arr.length - 1); // pilot improves over time
  const contactabilityRate = round2(0.63 + progress * 0.14 + rand(-0.02, 0.02));
  const responseRate = round2(w.responded / Math.max(1, w.delivered));
  const conversionRate = round2(responseRate * (0.5 + progress * 0.2) + rand(-0.01, 0.015));
  const accountsConverted = Math.round(w.delivered * conversionRate * 0.16);
  const amountRecovered = round2(accountsConverted * rand(210, 640));
  const treatmentCost = round2(w.cost);

  return {
    week: w.week,
    contactsSent: w.sent,
    contactabilityRate,
    responseRate,
    conversionRate,
    promiseKeptRate: round2(0.55 + progress * 0.13 + rand(-0.03, 0.03)),
    instalmentAdherence: round2(0.68 + progress * 0.11 + rand(-0.03, 0.03)),
    accountsConverted,
    amountRecovered,
    treatmentCost,
    costPerRinggitRecovered: amountRecovered ? round2(treatmentCost / amountRecovered * 1000) / 1000 : 0,
  };
});

/* ---------------- compliance ---------------- */

const COMPLAINT_CATEGORIES = ["Frequency", "Tone/Conduct", "Wrong Person", "Disputed Amount", "Quiet Hours", "Data Accuracy"];

/* Monthly contact totals come from channelActivity, so "complaints per
   1,000 contacts" is computed off real denominators. */
const byMonth = new Map();
channelActivity.forEach((r) => {
  const m = r.date.slice(0, 7);
  byMonth.set(m, (byMonth.get(m) || 0) + r.sent);
});

const complianceMonthly = [...byMonth.entries()]
  .sort()
  .map(([month, contacts], i, arr) => {
    const progress = i / Math.max(1, arr.length - 1);
    const complaints = Math.round(contacts / 1000 * (0.52 - progress * 0.16) * rand(0.85, 1.15));
    return {
      month,
      contacts,
      complaints,
      complaintsPer1000: round2(complaints / (contacts / 1000)),
      postPaymentContacts: i === arr.length - 1 ? 0 : weighted([[0, 78], [1, 16], [2, 6]]),
      frequencyCapBreaches: randInt(0, 5),
      quietHoursBreaches: randInt(0, 3),
      quietHoursAdherence: round2(1 - rand(0.0002, 0.0018)),
      frequencyCapAdherence: round2(1 - rand(0.0005, 0.004)),
    };
  });

const complaints = [];
const complaintCount = complianceMonthly.reduce((s, m) => s + m.complaints, 0);
for (let i = 0; i < Math.min(complaintCount, 140); i++) {
  const c = pick(customers);
  complaints.push({
    id: `CMP-${2000 + i}`,
    date: daysAgo(randInt(1, 89)),
    customerId: c.id,
    area: c.area,
    channel: pick(CHANNELS),
    category: pick(COMPLAINT_CATEGORIES),
    status: weighted([["Resolved", 68], ["In Review", 22], ["Escalated", 10]]),
    upheld: rnd() < 0.38,
  });
}
complaints.sort((a, b) => (a.date < b.date ? 1 : -1));

/* ---------------- stage movement (monthly) ---------------- */

/* Forward = ageing in, backward = converting out (paid/settled). */
const movements = [];
const monthKeys = [...byMonth.keys()].sort();
/* Prepend a little history so the movement chart has a run-up, without
   duplicating any month the channel data already covers. */
const extraMonths = ["2026-04", "2026-05", "2026-06"].filter(
  (m) => !monthKeys.includes(m)
);
[...extraMonths, ...monthKeys].forEach((month) => {
  const transitions = [];
  for (let i = 0; i < STAGES.length - 1; i++) {
    const forward = randInt(30, 190);
    transitions.push({
      from: STAGES[i], to: STAGES[i + 1],
      direction: "forward", accounts: forward,
      value: round2(forward * rand(120, 900)),
    });
    const backward = randInt(20, 150);
    transitions.push({
      from: STAGES[i + 1], to: "Resolved/Paid",
      direction: "resolved", accounts: backward,
      value: round2(backward * rand(140, 1100)),
    });
  }

  const stageCounts = {};
  STAGES.forEach((s) => {
    stageCounts[s] = customers.filter((c) => c.stage === s).length + randInt(-40, 40);
  });

  movements.push({ period: month, stageCounts, transitions });
});

/* ---------------- areas (static attributes only) ---------------- */

/* Totals are NOT stored here — the app derives them from customers so
   CRUD edits move the geography numbers too. */
const areas = AREAS.map((a) => ({
  area: a.area,
  state: a.state,
  treatmentCoverage: a.coverage,
  sewerageConnections: randInt(18000, 240000),
  treatmentPlants: randInt(3, 42),
  igisZoneId: `ZN-${randInt(100, 999)}`,
}));

/* ---------------- settings ---------------- */

const settings = {
  organisation: {
    name: "Indah Water Konsortium Sdn Bhd",
    shortName: "Indah Water",
    website: "https://www.iwk.com.my/",
    description: "Malaysia's national sewerage company.",
    currency: "MYR",
    currencySymbol: "RM",
    locale: "en-MY",
  },
  contactPolicy: {
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    maxContactsPerWeek: 3,
    maxContactsPerDay: 1,
    postPaymentContactBlockHours: 48,
    suppressOnOpenDispute: true,
    suppressOnDeceasedEstate: true,
  },
  /* Editing these live-recalculates the Treatment page cost figures. */
  channelCosts: {
    "WhatsApp/EWP": 0.08,
    "SMS/IVR": 0.05,
    Email: 0.002,
    Print: 1.85,
    "Voice AI": 0.14,
    "DCA Placement": 18.5,
    "Legal Demand Pack": 145,
  },
  ladder: {
    stages: STAGES,
    segments: SEGMENTS,
    specialRouting: SPECIAL_ROUTING,
  },
  targets: {
    contactabilityRate: 0.78,
    conversionRate: 0.22,
    promiseKeptRate: 0.7,
    complaintsPer1000: 0.4,
    postPaymentContacts: 0,
    costPerRinggitRecovered: 0.05,
  },
};

/* ---------------- write ---------------- */

const files = {
  "customers.json": customers,
  "settings.json": settings,
  "movements.json": movements,
  "channel-activity.json": channelActivity,
  "campaigns.json": campaigns,
  "collections-kpis.json": collectionsKpis,
  "compliance.json": { monthly: complianceMonthly, complaints },
  "agencies.json": agenciesFile,
  "areas.json": areas,
};

for (const [name, data] of Object.entries(files)) {
  const path = join(DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 1));
  const rows = Array.isArray(data) ? `${data.length} rows` : "object";
  console.log(`${name.padEnd(24)} ${rows}`);
}

console.log(`\nTotal arrears: RM ${customers.reduce((s, c) => s + c.arrearsAmount, 0).toLocaleString("en-MY", { maximumFractionDigits: 0 })}`);
console.log(`Placed with DCA: ${placements.length} accounts`);
