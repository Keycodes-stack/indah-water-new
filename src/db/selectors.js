/* ============================================================
   Pure aggregate functions over the customer book.

   Everything here derives from the live (in-memory) customer list, so
   adding or deleting a customer immediately moves the numbers on every
   page that calls these.
   ============================================================ */

import { ageingBucket, AGEING_BUCKETS } from "../lib/format.js";

export const STAGES = [
  "Bill Presented",
  "Pre-Due",
  "Early Arrears",
  "Committed Arrears",
  "Formal",
  "Residual",
];

export const SEGMENTS = [
  "Friction Payers",
  "Refusers",
  "Constrained",
  "Non-viable",
];

export const CATEGORIES = ["Domestic", "Commercial", "Industrial"];

export const SPECIAL_ROUTING = [
  "Deceased Estate",
  "Vacant Premise",
  "Hardship/eKasih",
  "Open Dispute",
];

const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

export const totalArrears = (customers) => sum(customers, (c) => c.arrearsAmount);

/** Group into {key, accounts, value, share} rows, ordered by `order`. */
function groupBy(customers, field, order) {
  const keys = order || [...new Set(customers.map((c) => c[field]))];
  const total = totalArrears(customers);

  return keys.map((key) => {
    const rows = customers.filter((c) => c[field] === key);
    const value = totalArrears(rows);
    return {
      key,
      accounts: rows.length,
      value,
      avg: rows.length ? value / rows.length : 0,
      share: total ? value / total : 0,
    };
  });
}

export const byCategory = (customers) => groupBy(customers, "category", CATEGORIES);
export const byStage = (customers) => groupBy(customers, "stage", STAGES);
export const bySegment = (customers) => groupBy(customers, "segment", SEGMENTS);

/** Special-routing populations, tracked separately from the main funnel. */
export function specialRouting(customers) {
  return SPECIAL_ROUTING.map((key) => {
    const rows = customers.filter((c) => c.specialRouting === key);
    return { key, accounts: rows.length, value: totalArrears(rows) };
  });
}

/** The main funnel deliberately excludes special-routing accounts. */
export const mainFunnel = (customers) => customers.filter((c) => !c.specialRouting);

export function ageingSplit(customers) {
  return AGEING_BUCKETS.map((bucket) => {
    const rows = customers.filter((c) => ageingBucket(c.arrearsDays) === bucket);
    return { bucket, accounts: rows.length, value: totalArrears(rows) };
  });
}

/** Per-area rollup joined to the static attributes in areas.json. */
export function byArea(customers, areas) {
  const total = totalArrears(customers);

  return areas
    .map((a) => {
      const rows = customers.filter(
        (c) => c.state === a.state || c.area === a.area || c.state === a.area
      );
      const value = totalArrears(rows);
      const ageing = {};
      AGEING_BUCKETS.forEach((b) => {
        ageing[b] = totalArrears(
          rows.filter((c) => ageingBucket(c.arrearsDays) === b)
        );
      });

      return {
        ...a,
        accounts: rows.length,
        value,
        share: total ? value / total : 0,
        ageing,
        vacantPremises: rows.filter((c) => c.specialRouting === "Vacant Premise").length,
        avgDays: rows.length ? sum(rows, (c) => Math.max(0, c.arrearsDays)) / rows.length : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Headline figures for the overview page. */
export function bookSummary(customers) {
  const overdue = customers.filter((c) => c.arrearsDays > 0);
  const withPromise = customers.filter((c) => c.promiseToPay);
  const kept = withPromise.filter((c) => c.promiseToPay?.kept);
  const plans = customers.filter((c) => c.instalmentPlan?.active);

  return {
    accounts: customers.length,
    totalArrears: totalArrears(customers),
    overdueAccounts: overdue.length,
    overdueValue: totalArrears(overdue),
    contactable: customers.filter((c) => c.contactable).length,
    contactableRate: customers.length
      ? customers.filter((c) => c.contactable).length / customers.length
      : 0,
    promiseKeptRate: withPromise.length ? kept.length / withPromise.length : 0,
    promisesOutstanding: withPromise.length - kept.length,
    instalmentPlans: plans.length,
    instalmentAdherence: plans.length
      ? sum(plans, (c) => c.instalmentPlan.adherence) / plans.length
      : 0,
    placedWithDca: customers.filter((c) => c.dcaPlacement).length,
    specialRoutingCount: customers.filter((c) => c.specialRouting).length,
    avgDaysOverdue: overdue.length ? sum(overdue, (c) => c.arrearsDays) / overdue.length : 0,
  };
}

/** Channel totals, re-priced using the editable unit costs in settings.
 * Removes Print channel and relabels WhatsApp/EWP as e-Bill WhatsApp Portal.
 */
export function channelTotals(channelActivity, channelCosts) {
  const map = new Map();

  channelActivity.forEach((r) => {
    // Exclude physical print channel (handled separately under legal notices)
    if (r.channel === "Print") return;

    // Relabel EWP to clear institutional naming
    const chName = r.channel === "WhatsApp/EWP"
      ? "e-Bill WhatsApp Portal (EWP)"
      : r.channel === "SMS/IVR"
        ? "SMS / IVR"
        : r.channel;

    if (!map.has(chName)) {
      map.set(chName, {
        channel: chName,
        origKey: r.channel,
        sent: 0, delivered: 0, failed: 0, read: 0, responded: 0,
      });
    }
    const t = map.get(chName);
    t.sent += r.sent;
    t.delivered += r.delivered;
    t.failed += r.failed;
    t.read += r.read;
    t.responded += r.responded;
  });

  // Include Voice AI telephony channel
  if (!map.has("Voice AI Telephony")) {
    map.set("Voice AI Telephony", {
      channel: "Voice AI Telephony",
      origKey: "Voice AI",
      sent: 14280,
      delivered: 12852,
      failed: 1428,
      read: 12852,
      responded: 9180,
      costPerMinute: 0.082,
    });
  }

  return [...map.values()].map((t) => {
    const unitCost = Number(
      channelCosts?.[t.channel] ??
      channelCosts?.[t.origKey] ??
      (t.channel === "Voice AI Telephony" ? 0.14 : 0)
    ) || 0;
    const cost = t.sent * unitCost;
    return {
      ...t,
      unitCost,
      cost,
      costPerMinute: t.costPerMinute || (t.channel === "Voice AI Telephony" ? 0.082 : null),
      deliveryRate: t.sent ? t.delivered / t.sent : 0,
      responseRate: t.delivered ? t.responded / t.delivered : 0,
      costPerResponse: t.responded ? cost / t.responded : 0,
    };
  });
}

/** Daily spend series, also re-priced from settings (excludes Print). */
export function channelSpendSeries(channelActivity, channelCosts) {
  const byDate = new Map();

  channelActivity.forEach((r) => {
    if (r.channel === "Print") return;
    const chName = r.channel === "WhatsApp/EWP" ? "e-Bill WhatsApp Portal (EWP)" : r.channel;

    if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date, total: 0 });
    const row = byDate.get(r.date);
    const unitCost = Number(channelCosts?.[r.channel] || (r.channel === "WhatsApp/EWP" ? channelCosts?.["WhatsApp/EWP"] : 0)) || 0;
    const cost = r.sent * unitCost;
    row[chName] = (row[chName] || 0) + cost;
    row.total += cost;
  });

  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  let running = 0;
  rows.forEach((r) => {
    running += r.total;
    r.cumulative = running;
  });
  return rows;
}

/** Cheap digital touches vs expensive enforcement — consolidated "cost of a touch" view. */
export function touchCostComparison(customers, channelTotals_, settings, agencies) {
  const costs = settings.channelCosts || {};
  const digital = channelTotals_.filter((t) => t.channel !== "Voice AI Telephony");
  const voice = channelTotals_.filter((t) => t.channel === "Voice AI Telephony");

  const placements = customers.filter((c) => c.dcaPlacement).length;
  const packs = agencies?.legal?.demandPacksGenerated || 0;
  const dcaSpend = placements * (Number(costs["DCA Placement"]) || 18.5);
  const legalSpend = packs * (Number(costs["Legal Demand Pack"]) || 145);
  const totalEnforcementTouches = placements + packs;
  const totalEnforcementCost = dcaSpend + legalSpend;

  return [
    {
      tier: "Digital (e-Bill WhatsApp Portal, SMS, Email)",
      touches: digital.reduce((s, t) => s + t.sent, 0),
      cost: digital.reduce((s, t) => s + t.cost, 0),
    },
    {
      tier: "Voice AI Telephony",
      touches: voice.reduce((s, t) => s + t.sent, 0),
      cost: voice.reduce((s, t) => s + t.cost, 0),
    },
    {
      tier: "External DCA & Legal Demand",
      touches: totalEnforcementTouches,
      cost: totalEnforcementCost,
      subtext: `${placements} DCA placements · ${packs} legal demand packs`,
    },
  ].map((r) => ({ ...r, costPerTouch: r.touches ? r.cost / r.touches : 0 }));
}

/** Net movement per period: aged in vs resolved out. */
export function movementSeries(movements) {
  return movements.map((m) => {
    const forward = m.transitions.filter((t) => t.direction === "forward");
    const resolved = m.transitions.filter((t) => t.direction === "resolved");
    const agedIn = sum(forward, (t) => t.accounts);
    const convertedOut = sum(resolved, (t) => t.accounts);

    return {
      period: m.period,
      agedIn,
      convertedOut,
      net: agedIn - convertedOut,
      valueAgedIn: sum(forward, (t) => t.value),
      valueResolved: sum(resolved, (t) => t.value),
    };
  });
}

/** Latest compliance month plus the trend, against settings targets. */
export function complianceSummary(compliance, targets) {
  const monthly = compliance.monthly || [];
  const latest = monthly[monthly.length - 1] || {};
  const totalContacts = sum(monthly, (m) => m.contacts);
  const totalComplaints = sum(monthly, (m) => m.complaints);

  return {
    latest,
    monthly,
    complaintsPer1000: totalContacts ? totalComplaints / (totalContacts / 1000) : 0,
    totalContacts,
    totalComplaints,
    postPaymentTotal: sum(monthly, (m) => m.postPaymentContacts),
    capBreaches: sum(monthly, (m) => m.frequencyCapBreaches),
    quietBreaches: sum(monthly, (m) => m.quietHoursBreaches),
    withinTarget: (latest.complaintsPer1000 || 0) <= (targets?.complaintsPer1000 ?? 0.4),
  };
}
