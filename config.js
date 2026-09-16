/* ============================================================
   Indah Water Dashboard — configuration
   Edit this file to change login credentials or API keys.
   ============================================================ */

export const CONFIG = {
  // --- Login page credentials -------------------------------
  username: "admin",
  password: "Hello@123",

  // --- Vapi API keys (Voice AI page — live data) ------------
  vapi: {
    secretKey: "e71a863d-db51-4a9a-8f6d-8099f13bd4d4",
    publicKey: "4440b6a1-4ea4-47ab-a837-7d623172b038",
    assistantId: "59567db0-c442-4ddf-b34a-cefa922bdca7",
    baseUrl: "https://api.vapi.ai",
  },

  // --- Call Alerts feed (n8n webhook, GET) ------------------
  alerts: {
    webhookUrl: "https://praeco.app.n8n.cloud/webhook/fetch-alerts",
  },

  // --- Dashboard behaviour ----------------------------------
  options: {
    // Calls fetched per request (Vapi max is 1000).
    pageSize: 100,
    // true  -> only show calls made by vapi.assistantId
    // false -> show every call in the account
    onlyConfiguredAssistant: false,
    // Currency symbol for Voice AI costs, unified to RM.
    vapiCurrencySymbol: "RM ",
  },
};

export default CONFIG;
