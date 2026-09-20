# 🚀 VPS Deployment & Project Architecture Guide

A complete, beginner-friendly guide to understanding the project stack, codebase structure, and deploying the **Indah Water AI Recovery Engine & Collections Dashboard** onto a Virtual Private Server (VPS).

---

## 🛠️ Technology Stack

This application is built as a **Single Page Application (SPA)** using modern web technologies:

- **Frontend Core**: React 18 (with React Hooks & Context API for state)
- **Build Tool & Dev Server**: Vite 5 (ultra-fast bundler)
- **Routing**: React Router DOM (v7)
- **Data Visualization**: Recharts (interactive collection & funnel charts)
- **Mapping Engine**: Leaflet (100% free, open-source GIS map with CARTO Dark & Voyager tiles)
- **Voice AI Integration**: Vapi WebRTC & REST API (Live call logs, recordings & softphone dialer)
- **Styling**: Vanilla CSS Design System with automatic Light / Dark mode CSS custom properties

---

## 📁 Project Structure

```text
water-dashboard/
├── config.js               # Central config (Login credentials, Vapi API keys, Webhooks)
├── index.html              # HTML entrypoint with font preloads & meta tags
├── package.json            # Node.js dependencies & scripts
├── vite.config.js          # Vite build & alias configuration
├── public/                 # Static assets (Favicons, logos)
├── DB/                     # Mock database seeds & JSON records
│   ├── customers.json      # Primary customer records seed
│   ├── movements.json      # Arrears movement logs
│   └── settings.json       # Default organization settings
└── src/
    ├── App.jsx             # Main router definition & Role-Based Access Control (RBAC)
    ├── main.jsx            # React root mount script
    ├── assets/             # Images & static branding assets
    ├── auth/
    │   └── session.js      # Session storage handler & RBAC role validator (Admin vs Supervisor)
    ├── components/
    │   ├── Layout.jsx      # App shell (Sidebar navigation, header, theme switcher)
    │   ├── AreaMap.jsx     # Interactive Leaflet GIS & Vector Map component
    │   ├── SegmentWorkflow.jsx # Customer recovery pipeline step editor
    │   ├── GlobalAlertManager.jsx # Background call alerts polling engine
    │   ├── charts.jsx      # Recharts wrapper components
    │   ├── icons.jsx       # SVG Icon library
    │   └── ui.jsx          # UI primitives (Panel, Badge, Modal, Stats cards)
    ├── db/
    │   ├── store.jsx       # Global React Context data provider
    │   ├── inboxStore.js   # Unified Inbox state & template sequencer store
    │   ├── tickets.js      # CRM Kanban ladder state
    │   └── selectors.js    # Data calculation & filtering helpers
    ├── lib/
    │   ├── format.js       # Currency (RM), date, number & CSV exporter utilities
    │   ├── vapi.js         # Vapi Voice AI API client & recording fetcher
    │   └── theme.js        # Light / Dark theme persistence switcher
    ├── pages/              # Dashboard Page Views
    │   ├── Overview.jsx          # Executive Dashboard
    │   ├── VoiceAI.jsx           # Live Vapi Voice AI Call Logs & Cost Analytics
    │   ├── OutboundCaller.jsx    # Automated Campaign Dialer & Lead Management
    │   ├── TicketsKanban.jsx     # CRM Ticketing Kanban Ladder
    │   ├── FollowUps.jsx         # Scheduled Cadence & Delivery Queue
    │   ├── Testing.jsx           # Live Voice AI Direct SIM Dialer (+13469986661)
    │   ├── CallJoin.jsx          # Softphone Web Dialer & Live Listening
    │   ├── CallAlerts.jsx        # Flagged Call Alerts Feed
    │   ├── UnifiedInbox.jsx      # Omnichannel Inbox (WhatsApp, Email, SMS) & Sequencer
    │   ├── BookPosition.jsx      # Arrears Ladder & Aging Breakdown
    │   ├── Segments.jsx          # Customer Behavioral Segments
    │   ├── Treatment.jsx         # Channel Touchpoint & Cost Analysis
    │   ├── Performance.jsx       # Conversion & Collection KPIs
    │   ├── Compliance.jsx        # Regulatory & Audit Governance
    │   ├── DcaLegal.jsx          # External Agency (DCA) & Statutory Action
    │   ├── Geography.jsx         # Regional GIS Map & State Breakdown
    │   ├── Customers.jsx         # Customer Records CRUD Table
    │   ├── Settings.jsx          # Organization Profile & Supervisor Account Manager
    │   └── Login.jsx             # User Authentication Screen
    └── styles/
        └── app.css         # Global design system stylesheet & CSS variables
```

---

## 📋 VPS Deployment Prerequisites

Before deploying to your Virtual Private Server (Ubuntu/Debian recommended), ensure you have:

1. **A Linux VPS** (Ubuntu 20.04/22.04/24.04 LTS recommended) with root or `sudo` access.
2. **A Domain Name** (e.g. `dashboard.yourcompany.com`) pointing to your VPS IP address via an A record.
3. **Ports Open**: Port 80 (HTTP) and Port 443 (HTTPS) enabled in firewall (`ufw`).

---

## ⚡ Step-by-Step VPS Deployment Guide

### Step 1: Update Server & Install Required Tools

Connect to your VPS via SSH and install Node.js 18+, npm, Nginx, and Git:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx

# Verify Node and npm versions
node -v # Should be >= 18.0.0
npm -v
```

---

### Step 2: Clone or Upload the Codebase

Create a directory for your application under `/var/www/`:

```bash
# Navigate to web root
cd /var/www

# Clone your repository (or upload project files)
sudo git clone https://github.com/your-org/indah-water-dashboard.git water-dashboard

# Change ownership to your user
sudo chown -R $USER:$USER /var/www/water-dashboard

# Move into project directory
cd /var/www/water-dashboard
```

---

### Step 3: Configure Environment & Credentials (`config.js`)

Open `config.js` to set your desired admin credentials, Vapi API keys, and webhook endpoints:

```bash
nano config.js
```

Ensure `config.js` contains your production keys:

```javascript
export const CONFIG = {
  // Login credentials for admin account
  username: "admin",
  password: "YourSecurePasswordHere",

  // Vapi API Keys for Voice AI live call logs
  vapi: {
    secretKey: "your-vapi-private-secret-key",
    publicKey: "your-vapi-public-key",
    assistantId: "your-vapi-assistant-id",
    baseUrl: "https://api.vapi.ai",
  },

  // n8n or custom webhook endpoint for call alerts
  alerts: {
    webhookUrl: "https://your-n8n-instance.cloud/webhook/fetch-alerts",
  },
};
```

---

### Step 4: Install Dependencies & Build Production Bundle

Run `npm install` and trigger Vite's production build:

```bash
# Install node packages
npm install

# Build static bundle for production
npm run build
```

This generates a optimized, compiled production bundle in the `/var/www/water-dashboard/dist` folder.

---

### Step 5: Configure Nginx Web Server

Create an Nginx configuration file for the application:

```bash
sudo nano /etc/nginx/sites-available/water-dashboard
```

Paste the following Nginx configuration (handles Single Page Application client-side routing with `try_files`):

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com; # Replace with your actual domain or VPS IP

    root /var/www/water-dashboard/dist;
    index index.html;

    # Serve static assets efficiently
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable Gzip Compression for fast page loading
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1000;

    # Cache static assets (images, JS, CSS)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

Enable the Nginx site configuration and test for syntax errors:

```bash
# Link to sites-enabled
sudo ln -s /etc/nginx/sites-available/water-dashboard /etc/nginx/sites-enabled/

# Remove default nginx site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Step 6: Secure with Free SSL Certificate (Certbot / HTTPS)

Run Certbot to generate a free SSL certificate from Let's Encrypt and automatically configure HTTPS:

```bash
sudo certbot --nginx -d dashboard.yourdomain.com
```

Certbot will automatically update your Nginx configuration to enable HTTPS and set up automatic 90-day renewal.

---

## 🔄 Updating & Redeploying the Dashboard

When you make changes or push updates in the future, redeploy in 3 simple commands:

```bash
cd /var/www/water-dashboard

# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies & build
npm install
npm run build

# 3. Reload Nginx (instant zero-downtime update)
sudo systemctl reload nginx
```

---

## ❓ Frequently Asked Questions & Troubleshooting

### 1. Page Refresh Returns `404 Not Found`
**Cause**: Client-side React Router routing needs Nginx to fallback to `index.html`.  
**Fix**: Ensure `try_files $uri $uri/ /index.html;` is present in your Nginx config block under `location /`.

### 2. Voice AI Calls / Recordings Not Loading
**Cause**: Incorrect Vapi API Key or CORS block.  
**Fix**: Verify your `secretKey` in `config.js` is correct and active in your Vapi Dashboard (`https://dashboard.vapi.ai`).

### 3. Permission Errors on Build (`EACCES`)
**Fix**: Fix file ownership:
```bash
sudo chown -R $USER:$USER /var/www/water-dashboard
```

---

🎉 **Congratulations!** Your Indah Water Collections & Voice AI Dashboard is now live and running securely on your VPS!
