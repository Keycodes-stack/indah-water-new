const locationId = "P9PZtnmoYae3nDjPOKmd";

const headers = {
  Authorization: inputData.Authorization,
  Version: "v3"
};


// ============================================
// DATE RANGE — LAST 10 DAYS
// ============================================

const now = new Date();

const DAYS = 10;

const startDate = new Date(
  now.getTime() - (DAYS * 24 * 60 * 60 * 1000)
);

const startISO = startDate.toISOString();
const endISO = now.toISOString();


// Current date/time for report
const reportDate = now.toLocaleString("en-US", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true
});


console.log("========================================");
console.log("GHL PERFORMANCE REPORT");
console.log("========================================");
console.log("Report Date:", reportDate);
console.log("Start:", startISO);
console.log("End:", endISO);


// ============================================
// HELPER — CHECK TAG
// ============================================

function hasTag(contact, tagName) {

  return (
    Array.isArray(contact.tags) &&
    contact.tags.some(
      tag =>
        String(tag).toLowerCase() ===
        tagName.toLowerCase()
    )
  );

}


// ============================================
// 1. GET CONTACTS
// ============================================
// Fetch newest contacts first.
// Keep requesting pages until we reach contacts
// older than our reporting period.
//
// HighLevel allows up to 100 contacts per request.
// ============================================

console.log("\n========== CONTACTS ==========");

let allContacts = [];

let startAfter = null;
let startAfterId = null;

const MAX_CONTACT_PAGES = 100;

for (let page = 1; page <= MAX_CONTACT_PAGES; page++) {

  let contactsURL =
    `https://services.leadconnectorhq.com/contacts/` +
    `?locationId=${locationId}` +
    `&limit=100`;

  // Pagination
  if (startAfter) {
    contactsURL +=
      `&startAfter=${encodeURIComponent(startAfter)}`;
  }

  if (startAfterId) {
    contactsURL +=
      `&startAfterId=${encodeURIComponent(startAfterId)}`;
  }


  console.log(`Fetching contacts page ${page}...`);

  const contactsResponse =
    await customRequest.get(
      contactsURL,
      {
        headers: {
          ...headers,
          Version: "2023-02-21"
        }
      }
    );


  const pageContacts =
    contactsResponse.data.contacts || [];


  console.log(
    `Page ${page}: ${pageContacts.length} contacts`
  );


  if (pageContacts.length === 0) {
    break;
  }


  allContacts.push(...pageContacts);


  // Get last contact for pagination
  const lastContact =
    pageContacts[pageContacts.length - 1];


  // HighLevel pagination uses timestamp + ID
  if (lastContact.dateAdded) {

    startAfter =
      new Date(lastContact.dateAdded).getTime();

    startAfterId =
      lastContact.id;

  }


  // If less than 100, we've reached the end
  if (pageContacts.length < 100) {
    break;
  }


  // Stop if last contact is older than report period
  if (
    lastContact.dateAdded &&
    new Date(lastContact.dateAdded) < startDate
  ) {
    break;
  }

}


console.log(
  "Total contacts fetched:",
  allContacts.length
);


// ============================================
// TOTAL LEADS
// ============================================

const totalLeads = allContacts.length;


// ============================================
// NEW LEADS — LAST 10 DAYS
// ============================================

const newLeads =
  allContacts.filter(contact => {

    if (!contact.dateAdded) {
      return false;
    }

    const createdAt =
      new Date(contact.dateAdded);

    return (
      createdAt >= startDate &&
      createdAt <= now
    );

  });


const newLeadsCount =
  newLeads.length;


console.log("Total Leads:", totalLeads);
console.log("New Leads:", newLeadsCount);


// ============================================
// QUALIFIED LEADS
// ============================================

const qualifiedLeadsCount =
  newLeads.filter(contact =>
    hasTag(contact, "qualified")
  ).length;


// ============================================
// META LEADS
// ============================================

const metaLeadsCount =
  newLeads.filter(contact =>
    hasTag(contact, "meta 9 word")
  ).length;


// ============================================
// INSTA LEADS
// ============================================

const instaLeadsCount =
  newLeads.filter(contact =>
    hasTag(contact, "insta-dm")
  ).length;


// ============================================
// QUALIFICATION %
// ============================================

const qualificationRate =
  newLeadsCount === 0
    ? 0
    : (
        qualifiedLeadsCount /
        newLeadsCount
      ) * 100;


console.log("Qualified:", qualifiedLeadsCount);
console.log("Qualification %:", qualificationRate);
console.log("Meta:", metaLeadsCount);
console.log("Insta:", instaLeadsCount);


// ============================================
// 2. OPPORTUNITIES
// ============================================

console.log("\n========== OPPORTUNITIES ==========");

let opportunities = [];

let opportunityPage = 1;

const MAX_OPPORTUNITY_PAGES = 100;


// GHL opportunity search expects date/time
// in YYYY-MM-DD HH:mm:ss format

function ghlDate(date) {

  const year = date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate()
  ).padStart(2, "0");

  const hours = String(
    date.getUTCHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getUTCMinutes()
  ).padStart(2, "0");

  const seconds = String(
    date.getUTCSeconds()
  ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


const opportunityStart =
  ghlDate(startDate);

const opportunityEnd =
  ghlDate(now);


console.log(
  "Opportunity start:",
  opportunityStart
);

console.log(
  "Opportunity end:",
  opportunityEnd
);


for (
  opportunityPage = 1;
  opportunityPage <= MAX_OPPORTUNITY_PAGES;
  opportunityPage++
) {

  const opportunitiesURL =
    `https://services.leadconnectorhq.com/opportunities/search` +
    `?locationId=${locationId}` +
    `&startDate=${encodeURIComponent(opportunityStart)}` +
    `&endDate=${encodeURIComponent(opportunityEnd)}` +
    `&order=added_desc` +
    `&page=${opportunityPage}` +
    `&limit=100`;


  console.log(
    `Fetching opportunities page ${opportunityPage}...`
  );


  const opportunitiesResponse =
    await customRequest.get(
      opportunitiesURL,
      {
        headers: {
          ...headers,
          Version: "v3"
        }
      }
    );


  const pageOpportunities =
    opportunitiesResponse.data.opportunities || [];


  console.log(
    `Page ${opportunityPage}: ${pageOpportunities.length}`
  );


  if (
    pageOpportunities.length === 0
  ) {
    break;
  }


  opportunities.push(
    ...pageOpportunities
  );


  if (
    pageOpportunities.length < 100
  ) {
    break;
  }

}


console.log(
  "Total opportunities:",
  opportunities.length
);


// ============================================
// OPPORTUNITY STATS
// ============================================

const dealsCreated =
  opportunities.length;


const dealsWon =
  opportunities.filter(opportunity =>
    String(opportunity.status).toLowerCase() ===
    "won"
  ).length;


const dealsLost =
  opportunities.filter(opportunity =>
    String(opportunity.status).toLowerCase() ===
    "lost"
  ).length;


console.log(
  "Opportunities Created:",
  dealsCreated
);

console.log(
  "Opportunities Won:",
  dealsWon
);

console.log(
  "Opportunities Lost:",
  dealsLost
);





// ============================================
// 3. PAYMENTS / REVENUE
// ============================================

console.log("\n========== PAYMENTS ==========");

const paymentsURL =
  `https://services.leadconnectorhq.com/payments/transactions` +
  `?locationId=${locationId}` +
  `&altId=${locationId}` +
  `&altType=location` +
  `&startAt=${encodeURIComponent(startISO)}` +
  `&endAt=${encodeURIComponent(endISO)}` +
  `&limit=100` +
  `&offset=0`;


const paymentsResponse =
  await customRequest.get(
    paymentsURL,
    {
      headers: {
        ...headers,
        Version: "v3"
      }
    }
  );


const payments =
  paymentsResponse.data.data || [];


const successfulPayments =
  payments.filter(payment =>
    String(payment.status).toLowerCase() ===
    "succeeded"
  );


const paymentsCount =
  successfulPayments.length;


const totalRevenue =
  successfulPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );


console.log("Payments:", paymentsCount);
console.log("Revenue:", totalRevenue);


// ============================================
// 4. EMAIL ACTIVITY
// ============================================
// HighLevel's message export supports:
// channel=Email
// startDate
// endDate
// pagination via nextCursor
//
// We fetch email messages only.
// ============================================

console.log("\n========== EMAILS ==========");

let emailMessages = [];

let emailCursor = null;

const MAX_EMAIL_PAGES = 100;


for (
  let emailPage = 1;
  emailPage <= MAX_EMAIL_PAGES;
  emailPage++
) {

  let emailURL =
    `https://services.leadconnectorhq.com/conversations/messages/export` +
    `?locationId=${locationId}` +
    `&channel=Email` +
    `&startDate=${encodeURIComponent(startISO)}` +
    `&endDate=${encodeURIComponent(endISO)}` +
    `&sortBy=createdAt` +
    `&sortOrder=asc` +
    `&limit=1000`;


  if (emailCursor) {
    emailURL +=
      `&cursor=${encodeURIComponent(emailCursor)}`;
  }


  console.log(
    `Fetching email page ${emailPage}...`
  );


  const emailResponse =
    await customRequest.get(
      emailURL,
      {
        headers: {
          ...headers,
          Version: "v3"
        }
      }
    );


  const pageEmails =
    emailResponse.data.messages || [];


  console.log(
    `Email page ${emailPage}: ${pageEmails.length}`
  );


  emailMessages.push(
    ...pageEmails
  );


  emailCursor =
    emailResponse.data.nextCursor || null;


  if (
    !emailCursor ||
    pageEmails.length === 0
  ) {
    break;
  }

}


console.log(
  "Total email messages:",
  emailMessages.length
);


// ============================================
// EMAIL STATS
// ============================================

// Sent = outbound emails
const sentEmails =
  emailMessages.filter(message =>
    String(message.direction).toLowerCase() ===
    "outbound"
  ).length;


// Replies = inbound emails
const replyEmails =
  emailMessages.filter(message =>
    String(message.direction).toLowerCase() ===
    "inbound"
  ).length;


// Opened emails
const openEmails =
  emailMessages.filter(message =>
    String(message.status).toLowerCase() ===
    "opened"
  ).length;


console.log("Sent Emails:", sentEmails);
console.log("Reply Emails:", replyEmails);
console.log("Open Emails:", openEmails);


// ============================================
// 5. MEETINGS
// ============================================
// Still left at 0 until we connect the correct
// calendar/user IDs for this GHL location.
// ============================================

let meetingsBooked = 0;


// ============================================
// 6. SUMMARY
// ============================================

const summaryMessage =
`📊 *GHL Performance Report*
📅 ${reportDate}
_Last ${DAYS} Days_

👥 *Leads*
• Total Leads: ${totalLeads}
• New Leads: ${newLeadsCount}
• Qualified Leads: ${qualifiedLeadsCount}
• Qualification: ${qualificationRate.toFixed(1)}%
• 📣 Meta Leads: ${metaLeadsCount}
• 📸 Insta Leads: ${instaLeadsCount}

📅 *Sales Activity*
• Meetings Booked: ${meetingsBooked}
• Opportunities Created: ${dealsCreated}
• Opportunities Won: ${dealsWon}
• Opportunities Lost: ${dealsLost}

💰 *Revenue*
• Revenue: $${totalRevenue.toFixed(2)}

📧 *Email Activity*
• Sent Emails: ${sentEmails}
• Open Emails: ${openEmails}
• Reply Emails: ${replyEmails}`;


// ============================================
// OUTPUT
// ============================================

output = {

  result: summaryMessage,

  // Leads
  totalLeads,
  newLeadsCount,
  qualifiedLeadsCount,
  qualificationRate,

  metaLeadsCount,
  instaLeadsCount,

  // Opportunities
  meetingsBooked,
  dealsCreated,
  dealsWon,
  dealsLost,

  // Revenue
  paymentsCount,
  totalRevenue,

  // Emails
  sentEmails,
  openEmails,
  replyEmails,

  // Debug
  contactsReturned: allContacts.length,
  opportunitiesReturned: opportunities.length,
  paymentsReturned: payments.length,
  emailMessagesReturned: emailMessages.length,

  periodStart: startISO,
  periodEnd: endISO,

  reportDate

};