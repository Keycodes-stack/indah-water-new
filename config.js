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
    assistantMalayId: "9352cbc1-be19-4f45-9af4-e5980bb9f5de",
    phoneNumberId: "49ae476e-9bd2-4749-8d39-b56cdd04f266",
    callerNumber: "+60 3-6043 2495",
    baseUrl: "https://api.vapi.ai",
    voices: {
      manglish: [
        {
          id: "2LyhoWYWTvmqt5r3iFg4",
          label: "Voice 1",
          provider: "11labs",
          model: "eleven_v3",
        },
        {
          id: "2k8RkyGz6ut0S9Qq5upN",
          label: "Voice 2",
          provider: "11labs",
          model: "eleven_turbo_v2_5",
        },
      ],
      malay: [
        {
          id: "w2dXNwje6o73fWGIO6CD",
          label: "Voice 1",
          provider: "11labs",
          model: "eleven_multilingual_v2",
        },
        {
          id: "kXQ1ZZosnfmkUToBIGhN",
          label: "Voice 2",
          provider: "11labs",
          model: "eleven_multilingual_v2",
        },
      ],
    },
  },

  // --- Call Alerts & Telemetry Webhooks (n8n) ---------------
  n8nWebhookUrl: "https://praeco.app.n8n.cloud/webhook/fetch-logs",
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
