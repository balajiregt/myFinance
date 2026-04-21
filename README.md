# ₹ FinFolio — Complete Indian Portfolio Tracker

**Self-hosted, single-file, privacy-first portfolio tracker for Indian investors.**

Track Stocks, Mutual Funds, FDs, RDs, SGB Gold, Physical Gold, Post Office schemes, Retirement (EPF/NPS), Real Estate, Insurance, Loans, Company Share Plans (ESPP/RSU/ESOP), and more — all from one dashboard with AI-powered insights. Auto-track expenses from bank emails via Gmail API. Proactive alerts via Telegram/WhatsApp.

> **Self-hosted means YOU own it.** Fork this repo. Run it locally, or deploy to your own Fly.io instance. Cloud backup goes to your own Supabase instance. All data stays in your browser by default — no shared servers, no tracking, no accounts.

---

## Why FinFolio?

| Problem | FinFolio Solution |
|---------|-------------------|
| Groww/Zerodha only show what you buy through them | Tracks ALL assets — broker, manual, physical |
| INDMoney wants your bank login | Zero server-side data — 100% localStorage |
| No app tracks physical gold in your bank locker | Physical gold tracker with storage locations + photo links |
| No tracker covers EPF, NPS, or real estate | Retirement + Real Estate pages with projections and AI analysis |
| Can't see FDs, SGB, PPF, and stocks in one view | Unified dashboard with allocation donut + net worth (10 asset classes) |
| Generic "AI insights" from blog articles | AI assistant trained on YOUR actual portfolio data |
| No single view of insurance + loan dues | Reminders Hub auto-tracks premiums, EMIs, maturities, SIP dates |
| No proactive alerts — you have to check the app | Premium agent sends Telegram/WhatsApp alerts automatically |
| Can't feed your portfolio to local AI | Export Profile for AI — structured JSON for Ollama/LM Studio |
| Tied to one platform | Single HTML file — fork it, modify it, it's yours |

---

## Features

### Dashboard & Overview
- Real-time net worth calculation across all asset classes
- Allocation donut chart with diversification score
- Source badges: BROKER (auto-fetched) / MANUAL (user-entered)
- Dark / Light theme toggle
- Responsive layout

### Asset Trackers

| Asset Class | Features |
|------------|----------|
| **Stocks** | Auto-fetched from broker, live price via Finnhub |
| **Mutual Funds** | Broker-synced + manual entry, live NAV from AMFI, fund discovery with curated picks, custom fund entry with ISIN |
| **Fixed Deposits** | Multiple banks, maturity countdown, interest calc, bank name field |
| **Recurring Deposits** | Monthly tracking, maturity projection, multi-bank |
| **SGB Gold** | Tranche-based, live gold price (international spot → INR), 2.5% annual interest calc |
| **Physical Gold** | Jewellery/coins/bars with weight, purity (14K-24K), storage location (bank locker/home/worn daily), photo links |
| **Post Office** | PPF, SSY, NSC, MIS — with maturity and interest tracking |
| **Retirement** | EPF, VPF, NPS — monthly contribution tracking, employer match, compound growth projection |
| **Real Estate** | Plot/Flat/House/Commercial/Farmland — purchase price, current value, CAGR, Leaflet map with OpenStreetMap, AI geospatial analysis |
| **Company Shares** | ESPP/ShareSave, RSU, ESOP, Bonus — configurable dividends (USD/INR/GBP/EUR), vesting schedules |
| **Insurance** | Term Life, Endowment, ULIP, Money Back, Health, Whole Life — premium tracking, renewal alerts, nominee info |
| **Loans** | Home, Car, Education, Personal, Gold, LAP, Credit Card — EMI tracking, outstanding balance, prepayment calculator |
| **Budget** | Income/expense tracking with 5 sub-tabs (Overview, Transactions, Savings, Planning, Trends), Gmail expense sync |

### Broker Integration
- **HDFC Securities** — OAuth login, auto-fetch demat holdings
- Holdings auto-classified: Stocks vs MF vs SGB vs ETF
- API keys stored server-side only (Fly.io secrets)
- Token in sessionStorage (clears on tab close)
- Requires Fly.io deployment with static IP (SEBI mandate, effective April 2026)

### Gmail Expense Tracking
- **Auto-sync** bank transaction emails from HDFC Bank (InstaAlerts)
- Supports 3 email types: Bank A/c debits, UPI transactions, Credit Card charges
- **LLM-powered parsing** — AI extracts merchant, amount, date, payment method, and auto-categorizes
- Date range picker for selective sync (no full inbox scan)
- **Donut pie chart** with category-wise expense breakdown
- Category and payment method **filter dropdowns**
- **Budget vs Actual** comparison — planned budget vs real spending
- Deduplication by Gmail message ID
- Extensible bank config registry (add other banks easily)
- Requires: Google Cloud OAuth Client ID with Gmail readonly scope

### Supabase Cloud Backup
- Optional sign-up/login with email + password (Supabase Auth)
- Anonymous passphrase-based sync for no-account usage
- Auto-syncs on every portfolio change (3s debounce)
- Manual Push/Pull buttons
- Row Level Security (RLS) enforced
- All data including Gmail transactions synced

### AI Finance Assistant (✨ floating bubble)

Available on every page with 7 one-click analyses + free-text chat:

| Module | What It Does |
|--------|-------------|
| 📊 Portfolio Review | Analyses all holdings, gives verdicts, allocation advice |
| 📈 Market Mood | Nifty PE, FII/DII flows, VIX, sector trends, mood score |
| 💰 Lumpsum Timing | Deploy now vs STP vs wait — based on valuations |
| 🥇 Gold & Silver | SGB outlook, gold price trend, buy/hold/reduce |
| 🏦 FD vs Debt Funds | RBI rates, best FD rates, tax efficiency comparison |
| 📋 Tax Harvesting | LTCG harvesting, 80C, NPS, old vs new regime |
| 🏠 Real Estate | Geospatial analysis with investment grade, SWOT, micro-market scores — per-property or portfolio-wide |

- **AI Geospatial Analysis** — fetches nearby infrastructure (schools, hospitals, highways, bus stops, IT parks, railway stations) from OpenStreetMap via Overpass API and grades property investment potential
- **Ad-hoc location check** — paste coordinates in chat (e.g. "analyse 12.91, 77.64 for plot") to evaluate any location before buying
- Results cached locally — instant replay without re-running
- Export analyses as `.txt` files
- Multi-provider: Gemini 2.5 Flash (free) / Claude / OpenRouter / OpenAI

### Reminders & Alerts Hub
- Auto-generated reminders from insurance premiums, loan EMIs, FD/RD maturities, SIP dates
- Custom user-defined reminders with recurring support (monthly/quarterly/yearly)
- Filter by time (Overdue, Next 30 Days, Next 90 Days) or by type (Insurance, Loan, FD, RD, SIP, Custom)
- Priority badges: overdue (red), due soon (amber), upcoming (blue/green)
- Feeds into OpenClaw agent for proactive Telegram/WhatsApp notifications

### Export Profile for AI
- One-click export of complete financial snapshot as structured JSON
- Includes market context (Nifty, gold prices, RBI repo rate)
- Suggested prompts for local Ollama or any LLM
- All asset classes, insurance, loans, budget, expenses included

### Monthly Investment Planner
- Log SIP/lumpsum investments with fund selector
- Custom fund entry (any fund not in curated list) with ISIN tracking
- Dropdown shows: Portfolio picks + Broker-synced MFs + Custom funds
- Investment history tracking

---

## Proactive Alerts via Telegram / WhatsApp

> **Want FinFolio to message YOU?** Get morning portfolio digests, market crash alerts, FD maturity reminders, SIP nudges, and expense summaries — all delivered to your Telegram or WhatsApp automatically.

The **FinFolio Agent** is a premium add-on that turns your portfolio tracker into a proactive AI assistant. It reads your synced portfolio data (via Supabase cloud backup) and sends scheduled alerts through messaging channels.

**9 built-in agent tasks:**
- Morning Portfolio Digest (weekdays 9 AM)
- MF NAV Drop Alert (> 5% decline)
- Gold Price Movement
- Upcoming Reminders (insurance, loans, FD/RD maturities, SIPs, custom — configurable threshold via `FINFOLIO_REMINDER_DAYS`)
- Market Index Alert (Nifty/Sensex crash/rally detection)
- Market Mood Check (PE-based valuation)
- Expense Summary (Gmail transaction breakdown)
- Tax Harvesting Opportunities (Jan/March)

Built on [OpenClaw](https://openclaw.ai) — an AI gateway for Telegram/WhatsApp. Includes pre-configured skill definitions, cron schedules, and tested API integrations.

**Interested?** Reach out to get access to the agent setup package.

---

## Self-Hosting Guide

### Option A: Just Open the HTML (No Broker, No Deploy)

```bash
git clone https://github.com/balajiregt/myFinance.git
open myFinance/index.html
```

Everything works except broker integration: MF NAVs, gold prices, SGB, FD/RD, physical gold, post office, share plans, budget, and AI analysis (with your own Gemini key).

### Option B: Run Locally (No Broker)

Either open `index.html` directly in your browser (as in Option A), or run the bundled Node.js server for a local `http://localhost` origin:

```bash
git clone https://github.com/balajiregt/myFinance.git
cd myFinance
node server.js
```

Everything works — MF NAVs, gold prices, AI analysis, budget, Gmail sync, Supabase backup. Broker integration requires Fly.io (see Option C).

### Option C: Deploy to Fly.io (Enables Broker API — ~$3.60/month)

SEBI mandates static IP whitelisting for all Indian broker APIs (effective April 2026). Serverless platforms with dynamic IPs cannot satisfy this. Fly.io provides a static egress IP required for broker integration.

#### Step 1: Install Fly CLI & Login

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

#### Step 2: Launch & Allocate Static IP

```bash
cd myFinance
fly launch --name YOUR-APP-NAME --region bom
fly ips allocate-v4 --shared
# Note the static IP — you'll whitelist this on your broker's developer portal
```

#### Step 3: Configure Broker (HDFC Securities)

**Create API credentials:**
1. Go to [developer.hdfcsec.com](https://developer.hdfcsec.com)
2. Login → **Apps** → **Create New App**
3. Set **Redirect URL** to: `https://YOUR-APP-NAME.fly.dev/auth/callback`
4. Add the static IP from Step 2 to the IP whitelist
5. Note your **API Key** and **API Secret**

**Set secrets on Fly.io:**

```bash
fly secrets set HDFC_API_KEY=your_api_key HDFC_API_SECRET=your_api_secret URL=https://YOUR-APP-NAME.fly.dev
```

#### Step 4: Deploy

```bash
fly deploy
```

**Cost breakdown:** Static IPv4 ~$3.60/month + GST. Compute is free (machines auto-stop when idle, within free tier allowance).

### Option D: Deploy to Vercel

```bash
npm i -g vercel
cd myFinance
vercel
```

Note: Broker integration requires adapting the `api/` handlers to Vercel Serverless Functions, and Vercel's dynamic IPs cannot satisfy the SEBI static-IP mandate — broker APIs will only work on Fly.io.

### Option E: Deploy to GitHub Pages (Static Only)

1. Fork the repo
2. Go to Settings → Pages → Source: `main` branch
3. Your site is live at `https://yourusername.github.io/myFinance`

No broker integration (no serverless functions), but everything else works.

---

## Configure AI Provider

Go to **Settings** tab in the app → **AI Provider** section:

| Provider | Cost | Setup |
|----------|------|-------|
| **Gemini 2.5 Flash** (recommended) | Free — 1500 req/day | Get key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Claude Sonnet** | Paid — $3/$15 per M tokens | Get key at [console.anthropic.com](https://console.anthropic.com) |
| **OpenRouter** | Varies by model | Get key at [openrouter.ai](https://openrouter.ai) — access 100+ models |
| **OpenAI GPT** | Paid | Get key at [platform.openai.com](https://platform.openai.com) |
| **Ollama (local)** | Free — runs on your machine | Install [ollama.com](https://ollama.com), then `ollama pull qwen2.5:3b`. See *Optional: Ollama Mode* below. |

Paste your key in Settings → Save. The ✨ AI bubble is now active on every page.

### Optional: Ollama Mode (fully-local AI, one-click toggle)

If you want the chatbot to run on a local LLM (no API keys, no network), use the bundled `launch.command`:

```bash
chmod +x launch.command
open launch.command          # or double-click it in Finder
```

What it does:
- **First click:** starts Ollama + `node server.js` on port 8080 and opens `http://localhost:8080` (Ollama selectable in the chatbot's provider dropdown).
- **Second click:** stops the local server and opens `https://finfolio.fly.dev` (cloud mode).

Ollama only works when the page is served from `http://localhost` — browsers block `https://*.fly.dev → http://localhost:11434` as mixed content. That's why the local Node server exists. If you're happy with cloud AI providers, you don't need this.

Recommended model for 8 GB machines: `qwen2.5:3b` (~2 GB RAM). Larger models (`qwen2.5:7b`, `llama3.1:8b`) need 16 GB+ to avoid swap thrashing.

---

## Project Structure

```
myFinance/
├── index.html                    # The entire app (single file)
├── server.js                     # Zero-dependency Node.js server (local + Fly.io)
├── launch.command                # macOS one-click toggle: local Ollama ↔ cloud (fly.dev)
├── Dockerfile                    # Container image for Fly.io (~43MB)
├── fly.toml                      # Fly.io config: region, auto-stop, static IP
├── package.json                  # Project metadata
├── .gitignore                    # Blocks .env, node_modules
├── .dockerignore                 # Excludes .git, docs, .env from Docker builds
├── README.md
├── COMPLIANCE.md                 # API protocol compliance documentation
├── docs/
│   ├── gmail-sync-flow.svg       # Gmail parsing architecture diagram
│   ├── ARCHITECTURE.md           # Architecture flow diagrams (Mermaid)
│   ├── PRIVACY-POLICY.md         # Privacy policy
│   ├── TERMS-OF-SERVICE.md       # Terms of service
│   ├── DATA-STORAGE-DISCLOSURE.md # Data storage transparency
│   ├── COST-ANALYSIS.md           # AI + hosting cost breakdown
│   ├── SECURITY-AUDIT.md          # Security checklist with verification commands
│   ├── SECURITY.md                # Security policy and architecture
└── api/
    ├── broker-auth.js            # OAuth token exchange (server-side, keys never in browser)
    └── broker-proxy.js           # API proxy to broker endpoints
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR BROWSER                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              index.html (the entire app)          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │Overview│ │  Gold  │ │   MF   │ │ Budget │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │Retire  │ │ Realty │ │   PO   │ │Deposits│    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  │         ┌──────────────────────┐                  │   │
│  │         │  ✨ AI Floating Bubble │                │   │
│  │         └──────────────────────┘                  │   │
│  │                    │                              │   │
│  │            localStorage                           │   │
│  │     (ALL your data stays here)                    │   │
│  └──────────────────────────────────────────────────┘   │
│                    │                                     │
│         Direct API calls (from browser):                │
│         ├── AMFI (MF NAV) — free, no key                │
│         ├── Gold API (spot price) — free                 │
│         ├── Finnhub (stock price) — your key             │
│         ├── Gemini/Claude/OpenRouter (AI) — your key     │
│         ├── Forex API (USD/INR) — free                   │
│         ├── Overpass API (OSM infrastructure) — free      │
│         └── Leaflet + OSM tiles (map) — free             │
└─────────────────────────────────────────────────────────┘
                    │
          (Only for broker OAuth)
                    │
┌─────────────────────────────────────────────────────────┐
│        FLY.IO — Static IP (~$3.60/month)                 │
│        Required for broker API (SEBI static IP mandate)  │
│  ┌──────────────┐                                        │
│  │  server.js    │ Zero-dependency Node.js server         │
│  │  (adapter)    │ Routes requests to api/ handlers       │
│  └──────┬───────┘                                        │
│  ┌──────┴────────┐  ┌──────────────────┐                 │
│  │  broker-auth   │  │  broker-proxy     │                │
│  │  (token xchg)  │  │  (API proxy)      │                │
│  └────────┬──────┘  └────────┬─────────┘                 │
│           │                   │                           │
│     HDFC_API_KEY        HDFC_API_SECRET                   │
│     (fly secret)        (fly secret)                      │
│     NEVER in browser    NEVER in browser                  │
│                                                           │
│  Static egress IP → whitelisted on broker portal          │
└─────────────────────────────────────────────────────────┘
        OR (without broker)
┌─────────────────────────────────────────────────────────┐
│              LOCAL (free — no broker)                     │
│  Open index.html directly, or run `node server.js`        │
│  All data stays in your browser localStorage              │
└─────────────────────────────────────────────────────────┘
```

---

## Security

| Concern | How It's Handled |
|---------|-----------------|
| Portfolio data | 100% in browser localStorage — never sent anywhere (unless cloud sync is enabled) |
| Cloud sync | Opt-in only. Data stored in your own Supabase instance with Row Level Security. HTTPS only |
| Broker API keys | Server-side only (Fly.io secrets) — never in HTML |
| OAuth tokens | sessionStorage — cleared when tab closes (Gmail + Broker) |
| AI API keys | Stored client-side. Gemini key sent via `x-goog-api-key` header (not URL) |
| XSS prevention | AI responses HTML-escaped before rendering. Budget labels and transaction fields sanitized via `escHTML()` |
| CORS | Restricted to your own domain (Fly.io via `URL` secret) |
| CSP | Content-Security-Policy header restricts script/connect sources |
| Headers | HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (set in `server.js`) |
| Static IP | Fly.io deployment uses static egress IP for broker API calls (SEBI compliance) |
| Error leakage | Broker handlers return generic errors; details logged server-side only |
| Gmail data | Only merchant + amount + date persisted — no full email body stored |
| Real estate coordinates | Stored in localStorage only; Overpass API queries are anonymous (no API key) |
| Source code | Fully open source — audit everything. See [SECURITY-AUDIT.md](SECURITY-AUDIT.md) |

---

## APIs Used

### Free (No Keys Needed)

| API | Purpose |
|-----|---------|
| [mfapi.in](https://www.mfapi.in) | Mutual Fund NAV from AMFI |
| [gold-api.com](https://gold-api.com) | International gold/silver spot price (USD/oz) |
| [fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) | USD/INR forex rate |
| [Yahoo Finance](https://finance.yahoo.com) | Nifty/Sensex market indices |
| [Gmail API](https://developers.google.com/gmail/api) | Bank email expense tracking (free, 15K quota units/min) |
| [Overpass API](https://overpass-api.de) | OpenStreetMap infrastructure data for real estate analysis |
| [Leaflet + OpenStreetMap](https://leafletjs.com) | Interactive property map (no API key needed) |

### Require Your Own Key

| API | Purpose | Free Tier |
|-----|---------|-----------|
| [Gemini](https://aistudio.google.com/apikey) | AI analysis + expense parsing | 1500 req/day |
| [Finnhub](https://finnhub.io) | Stock/share live price | 60 calls/min |
| [HDFC Developer](https://developer.hdfcsec.com) | Broker integration | Free for clients |
| [Google Cloud](https://console.cloud.google.com) | OAuth Client ID for Gmail | Free |

---

## Supported Brokers

| Broker | Status | Env Variables |
|--------|--------|---------------|
| HDFC Securities (InvestRight) | ✅ Ready | `HDFC_API_KEY`, `HDFC_API_SECRET` |
| Zerodha Kite | 🔜 Coming | — |
| Angel One | 🔜 Coming | — |
| Groww | 🔜 Coming | — |
| Upstox | 🔜 Coming | — |

---

## Contributing

### Adding a New Broker

1. Add broker config to `BROKER_CONFIG` in `api/broker-proxy.js`
2. Add auth config to `BROKER_AUTH_CONFIG` in `api/broker-auth.js`
3. Add a holdings normalizer in `index.html` (see `classifyBrokerHoldings()`)
4. Submit a PR!

### Normalized Holding Format

All brokers should map to:

```javascript
{
  symbol: 'RELIANCE',
  name: 'Reliance Industries Ltd',
  qty: 10,
  avgPrice: 2450.50,
  currentPrice: 2580.00,
  exchange: 'NSE',
  type: 'equity',       // equity | mf | bond | etf | sgb
  broker: 'hdfc_securities',
  isin: 'INE002A01018',
  pnl: 1295.00,
}
```

---

## Roadmap

- [x] Unified overview dashboard with net worth + donut chart
- [x] Company share plans (ESPP/RSU/ESOP/Bonus) with configurable dividends
- [x] FD/RD tracker with multiple banks
- [x] SGB Gold with live international price
- [x] Physical gold tracker with storage locations + photo links
- [x] Post Office schemes (PPF/SSY/NSC/MIS)
- [x] Mutual Fund portfolio with curated picks + AMFI NAV
- [x] Broker integration (HDFC Securities OAuth)
- [x] ISIN-based fund resolution (broker ISIN → AMFI scheme code → live NAV)
- [x] AI Finance Assistant (6 modules + chat, multi-provider)
- [x] Monthly Investment Planner with custom fund entry
- [x] Budget Planner
- [x] Export AI analyses as text files
- [x] Fly.io deployment with static IP for SEBI-compliant broker API access
- [x] Supabase cloud backup with auth (login/signup)
- [x] Dark / Light theme toggle
- [x] Gmail expense tracking (HDFC Bank InstaAlerts via Gmail API)
- [x] Category-wise expense pie chart with filters
- [x] Security hardening (CSP, XSS sanitization, CORS, error leakage)
- [x] Architecture flow diagrams (Mermaid + SVG)
- [x] Retirement tracker (EPF/VPF/NPS with compound growth projections)
- [x] Real Estate tracker with Leaflet map + AI geospatial investment analysis
- [x] Overpass API integration for nearby infrastructure scanning (20km radius)
- [x] Budget page restructured with 5 sub-tabs (Overview, Transactions, Savings, Planning, Trends)
- [x] Insurance tracker (Term Life, Endowment, ULIP, Health, Whole Life — premium + renewal tracking)
- [x] Loans tracker (Home, Car, Personal, Education — EMI tracking + prepayment calc)
- [x] Reminders & Alerts Hub (auto-generated from insurance, loans, FDs, RDs, SIPs + custom alerts)
- [x] Export Profile for AI (structured JSON with market context for local Ollama/LLM)
- [x] OpenClaw agent integration with configurable reminder threshold
- [ ] Other broker integrations (Zerodha, Angel One, Groww, Upstox)
- [ ] Multi-bank Gmail support (ICICI, SBI, Axis)
- [ ] Mobile application

---

## FAQ

**Q: Is my data safe?**
All data is in your browser's localStorage by default. If you enable Cloud Sync (optional), data is also stored in your own Supabase instance, protected by Row Level Security. Nothing is shared with third parties.

**Q: Can I use this without deploying anywhere?**
Yes. Just open `index.html` in your browser (or run `node server.js` for a local origin). Everything works except broker integration, which requires Fly.io for the SEBI-mandated static IP.

**Q: What happens if I clear my browser data?**
Your portfolio data will be lost. Use Settings → Export Data to back up regularly.

**Q: Can multiple people use the same deployed site?**
Each person's data is in THEIR browser's localStorage — completely isolated. But for true privacy, each person should deploy their own instance.

**Q: Is the AI analysis accurate?**
The AI uses your real portfolio data as context but relies on the model's training knowledge for market data. Always verify specific numbers independently.

**Q: How does Gmail expense tracking work?**
You connect your Gmail via Google OAuth (readonly scope). The app searches for bank alert emails (e.g., HDFC InstaAlerts) in your selected date range, fetches the email bodies, and uses your configured AI provider to parse merchant, amount, date, and category from each email. Only extracted transaction data is stored — no raw email content. See [Architecture Diagrams](docs/).

**Q: Is my Gmail data safe?**
The app uses `gmail.readonly` scope — it can only read, never modify or delete emails. OAuth tokens are stored in sessionStorage (cleared on tab close, 1-hour expiry). Only parsed transaction fields (merchant, amount, date) are persisted. No full email body is ever stored or synced.

**Q: Why a single HTML file?**
Simplicity. Share via WhatsApp/email, works offline, no build tools, no dependencies, no vendor lock-in.

---

## Disclaimer

FinFolio is a personal portfolio tracker for **informational purposes only**. It does not provide financial, investment, or tax advice. The AI-powered analyses are generated by third-party language models and may contain inaccuracies.

- The developers are **not liable** for any investment decisions, data loss, or financial losses arising from the use of this application.
- Market data, NAVs, gold prices, and index values are fetched from third-party APIs and may be delayed or inaccurate. Always verify with official sources before making financial decisions.
- Gmail expense tracking reads your own emails with your explicit consent. The app does not access any bank systems, modify your emails, or share your financial data with third parties without your action.
- Cloud sync (Supabase) is opt-in. When enabled, your portfolio data is transmitted over HTTPS to your own cloud instances. You are responsible for securing your own API keys, sync secrets, and Supabase RLS policies.
- This software is provided "AS IS" without warranty of any kind. See the [LICENSE](LICENSE) file for full terms.

---

## License

[MIT License](LICENSE) — use it, fork it, share it. Your money, your data, your tracker.

See also: [COMPLIANCE.md](COMPLIANCE.md) for API protocol compliance documentation.

---

**Built with ❤️ for Indian investors who want to see their COMPLETE financial picture.**
