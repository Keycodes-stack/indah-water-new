# Indah Water — Collections Dashboard.......

A Vite + React dashboard for **Indah Water Konsortium (IWK)**, Malaysia's national
sewerage company. Collections analytics run on demo data; the **Voice AI** page is
wired to the live Vapi API.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in with the credentials in [`config.js`](config.js) — `admin` / `Hello@123`.

| Script | What it does |
| --- | --- |
| `npm run dev` | dev server with HMR |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run seed` | regenerate every file in `DB/` |

## Configuration

Everything editable lives in [`config.js`](config.js): the login username and
password, the Vapi secret key, public key and assistant ID, and the Call Alerts
webhook URL (`alerts.webhookUrl`).

## Deploying to Netlify

[`netlify.toml`](netlify.toml) holds the whole configuration, so connecting the repo
is all that is needed — no build settings to fill in by hand:

1. Netlify → **Add new site → Import an existing project**
2. Pick this repository (Netlify supports private repos)
3. Build command and publish directory are read from `netlify.toml` — leave them
4. **Deploy**

Or from the CLI:

```bash
npx netlify-cli deploy --build --prod
```

What the config does:

- **`npm run build` → `dist/`**, on Node 22.
- **SPA fallback** (`/*` → `/index.html`, status 200). Without this a hard refresh
  or a shared link to `/customers` would 404, because React Router owns those paths
  and no such file exists on disk. Netlify serves real files first, so assets are
  unaffected.
- **`X-Robots-Tag: noindex`** plus `nosniff`, `DENY` framing and a strict referrer
  policy. The bundle contains a live Vapi secret key, so the site should not be
  indexed — see the note at the end of this file.
- **Cache headers**: fingerprinted assets forever, `index.html` never.

`config.js` and `DB/` are deliberately **not** in [`.gitignore`](.gitignore) — they
are part of this private repo. `node_modules/`, `dist/` and `.claude/` are ignored
(the last of those caches API keys inside local permission grants).

## Demo data — and why edits do not stick

The JSON files in [`DB/`](DB/) are the seed for every page except Voice AI.

**Add, edit or delete anything and the UI updates immediately — but the JSON files
are never written.** Reload the page, or open it as a different visitor, and the
original records are back. There is deliberately no `localStorage` and no
persistence layer; [`src/db/store.jsx`](src/db/store.jsx) seeds React state from the
JSON with `structuredClone`, and a reload re-imports the pristine modules.

A "Reset demo data" button appears in the sidebar once anything has changed.

### The files

| File | Role |
| --- | --- |
| `customers.json` | **the spine** — 900 accounts |
| `settings.json` | org profile, contact policy, channel unit costs, targets |
| `movements.json` | monthly stage-transition matrix |
| `channel-activity.json` | daily sends per channel with delivery status |
| `campaigns.json` | sequence/template cohorts |
| `collections-kpis.json` | weekly pilot KPIs |
| `compliance.json` | monthly conduct metrics + complaint register |
| `agencies.json` | DCA placements, recalls, legal pipeline |
| `areas.json` | static per-area attributes (totals are derived) |
| `_generate.mjs` | seeded generator — run once, never called at runtime |

`customers.json` is the single source of truth for every book, segment and geography
number: those are **derived at runtime**, not stored. That is what makes the demo
meaningful — delete a customer and the arrears total, stage distribution, segment
split, DCA placement counts and area rankings all move together.

Channel unit costs work the same way in the other direction: change one in
**Settings** and every cost figure on **Treatment & Channels** recalculates.

`_generate.mjs` emits all nine files in one seeded pass so the cross-references line
up — compliance contact counts equal channel-activity sends, KPI recovery tracks
treatment spend, and agency placements point at real customer IDs.

## Pages

| Group | Page | What it shows |
| --- | --- | --- |
| — | **Dashboard** | Combined stats: arrears, recovery, treatment spend, compliance, plus live Voice AI volume and cost |
| — | **Voice AI** | Live Vapi call logs, cost breakdown, transcripts and recordings |
| — | **Call / Join** | Static notice: outbound calling needs a paid Twilio subscription |
| — | **Call Alerts** | Live table of flagged calls from the n8n alerts webhook |
| Collections | **Book Position** | Arrears by category, stage distribution, movement over time, transition matrix |
| Collections | **Segments** | The four operating segments; special-routing populations tracked separately |
| Collections | **Treatment & Channels** | Contacts and delivery per channel, cost of a touch, cohort analytics |
| Collections | **Performance** | Section 10 pilot KPIs against target |
| Governance | **Compliance** | Complaints per 1,000, post-payment contact, cap and quiet-hours adherence |
| Governance | **DCA & Legal** | Agency performance, payment-triggered recalls, s.88(2) pipeline |
| Geography | **Areas** | Arrears concentration, ageing heat map, vacancy and coverage |
| Data | **Customers** | Full add / edit / delete |
| Data | **Settings** | Org profile, contact policy, channel costs, targets |

Two modelling choices worth knowing:

- **Special-routing accounts** (deceased estates, vacant premises, hardship/eKasih,
  open disputes) are excluded from the main segment funnel and counted separately,
  rather than mixed into treatment.
- **Post-payment contact** is reported against a target of zero rather than as a
  rate, because it is the trust metric.

## Voice AI — live data

This page reads the Vapi API directly with the secret key. Costs are reported in RM,
unified across the entire dashboard.

Recordings are **not** publicly readable — the storage bucket rejects
unauthenticated requests. Vapi exposes authenticated endpoints
([docs](https://docs.vapi.ai/assistants/retrieve-call-artifacts)):

```
GET /call/{id}/mono-recording        GET /call/{id}/assistant-recording
GET /call/{id}/stereo-recording      GET /call/{id}/customer-recording
```

Each returns `302` to a short-lived signed URL. Since an `<audio src>` cannot send an
`Authorization` header, [`src/lib/vapi.js`](src/lib/vapi.js) fetches with the secret
key and hands the result to the player as a blob URL. The promise (not the URL) is
cached at module scope, so a re-render mid-download reuses the in-flight request and
the cache survives route changes.

## Call Alerts

The **Call Alerts** page reads a live n8n webhook (`GET`, no auth) set in
`config.js`, and renders the rows in a sortable, searchable table:

```json
{ "code": 200, "data": [
  { "row_number": 2, "Call_id": "01a0a475-…", "Reason": "…", "Timestamp": "2026-09-15T09:46:51.841Z" }
] }
```

The webhook reflects whatever `Origin` it is called with, so it works from the
Netlify domain as well as localhost. The page tolerates the payload arriving either
wrapped in `data` or as a bare array, and has its own loading, empty and error
states — a failed fetch shows a message rather than an empty table.

## Charts

Chart colours are separate from the IWK brand: brand blue/green dresses the chrome,
while data marks use a palette validated for colour-vision deficiency against these
exact light and dark surfaces. Categorical hues are assigned in fixed slot order and
never cycled; the sequential blue ramp is used only for true heat encodings (the
ageing heat map and the stage-transition matrix). Ordered categories such as ladder
stages are a **single** colour, because position on the axis already carries the
meaning.

## A note on the secret key

`config.js` is bundled into the client, so anyone who can load the page can read the
Vapi secret key, and the login gate is a client-side convenience rather than real
security. Fine for local or trusted-network use; a backend proxy holding the key
server-side is the fix if this is ever hosted publicly.
