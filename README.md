# ₹ FinFolio — Complete Indian Portfolio Tracker

**Self-hosted, single-file, privacy-first portfolio tracker for Indian investors.**

Track Stocks, Mutual Funds, FDs, RDs, SGB Gold, Physical Gold, Post Office schemes, Company Share Plans (ESPP/RSU/ESOP), and more — all from one dashboard with AI-powered insights.

> **Self-hosted means YOU own it.** Fork this repo, deploy to your own Netlify/Vercel, and all data stays in your browser. No shared servers, no tracking, no accounts.

---

## Why FinFolio?

| Problem | FinFolio Solution |
|---------|-------------------|
| Groww/Zerodha only show what you buy through them | Tracks ALL assets — broker, manual, physical |
| INDMoney wants your bank login | Zero server-side data — 100% localStorage |
| No app tracks physical gold in your bank locker | Physical gold tracker with storage locations + photo links |
| Can't see FDs, SGB, PPF, and stocks in one view | Unified dashboard with allocation donut + net worth |
| Generic "AI insights" from blog articles | AI assistant trained on YOUR actual portfolio data |
| Tied to one platform | Single HTML file — fork it, modify it, it's yours |

---

## Features

### Dashboard & Overview
- Real-time net worth calculation across all asset classes
- Allocation donut chart with diversification score
- Source badges: BROKER (auto-fetched) / MANUAL (user-entered)
- Responsive dark theme

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
| **Company Shares** | ESPP/ShareSave, RSU, ESOP, Bonus — configurable dividends (USD/INR/GBP/EUR), vesting schedules |
| **Budget** | Income/expense tracking, needs vs wants, savings rate |

### Broker Integration
- **HDFC Securities** — OAuth login, auto-fetch demat holdings
- Holdings auto-classified: Stocks vs MF vs SGB vs ETF
- API keys stored server-side only (Netlify Functions)
- Token in sessionStorage (clears on tab close)

### AI Finance Assistant (✨ floating bubble)

Available on every page with 6 one-click analyses + free-text chat:

| Module | What It Does |
|--------|-------------|
| 📊 Portfolio Review | Analyses all holdings, gives verdicts, allocation advice |
| 📈 Market Mood | Nifty PE, FII/DII flows, VIX, sector trends, mood score |
| 💰 Lumpsum Timing | Deploy now vs STP vs wait — based on valuations |
| 🥇 Gold & Silver | SGB outlook, gold price trend, buy/hold/reduce |
| 🏦 FD vs Debt Funds | RBI rates, best FD rates, tax efficiency comparison |
| 📋 Tax Harvesting | LTCG harvesting, 80C, NPS, old vs new regime |

- Results cached locally — instant replay without re-running
- Export analyses as `.txt` files
- Multi-provider: Gemini 2.5 Flash (free) / Claude / Groq

### Monthly Investment Planner
- Log SIP/lumpsum investments with fund selector
- Custom fund entry (any fund not in curated list) with ISIN tracking
- Dropdown shows: Portfolio picks + Broker-synced MFs + Custom funds
- Investment history tracking

### Cloud Sync (for OpenClaw / API Access)
- Optional cloud sync — push portfolio data to a secure Netlify endpoint
- Protected by a secret key (set in Netlify env vars + app settings)
- Auto-syncs on every portfolio change (3s debounce)
- Enables external agents (like [OpenClaw](https://openclaw.ai)) to fetch live portfolio data via API
- Manual "Sync Now" button in Settings → Data Management
- Data stays encrypted in transit (HTTPS) and access-controlled by your secret

---

## Self-Hosting Guide

### Option A: Just Open the HTML (No Broker, No Deploy)

```bash
git clone https://github.com/balajiregt/myFinance.git
open myFinance/index.html
```

Everything works except broker integration: MF NAVs, gold prices, SGB, FD/RD, physical gold, post office, share plans, budget, and AI analysis (with your own Gemini key).

### Option B: Deploy to Netlify (Enables Broker API)

#### Step 1: Fork & Clone

```bash
git clone https://github.com/balajiregt/myFinance.git
cd myFinance
```

#### Step 2: Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub fork
4. Deploy settings:
   - **Build command**: *(leave empty)*
   - **Publish directory**: `.`
5. Click **Deploy**

#### Step 3: Configure Broker (HDFC Securities)

**Create API credentials:**
1. Go to [developer.hdfcsec.com](https://developer.hdfcsec.com)
2. Login → **Apps** → **Create New App**
3. Set **Redirect URL** to: `https://YOUR-SITE.netlify.app/auth/callback`
4. Note your **API Key** and **API Secret**

**Add environment variables in Netlify:**

Go to Site Settings → Environment Variables → Add:

| Key | Value |
|-----|-------|
| `HDFC_API_KEY` | Your API Key |
| `HDFC_API_SECRET` | Your API Secret |
| `SYNC_SECRET` | *(Optional)* A random string for cloud sync — generate with `openssl rand -hex 24` |

**Redeploy**, then go to **Broker** tab → Select HDFC → Connect.

### Option C: Deploy to Vercel

```bash
npm i -g vercel
cd myFinance
vercel
```

Note: Broker integration requires adapting Netlify Functions to Vercel Serverless Functions (in `/api` directory).

### Option D: Deploy to GitHub Pages (Static Only)

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
| **Groq Llama** | Free — rate limited | Get key at [console.groq.com](https://console.groq.com) |

Paste your key in Settings → Save. The ✨ AI bubble is now active on every page.

---

## Project Structure

```
myFinance/
├── index.html                    # The entire app (~8,000 lines, single file)
├── netlify.toml                  # Netlify config: functions dir, OAuth redirect, security headers
├── package.json                  # Project metadata
├── .gitignore
├── README.md
└── netlify/
    └── functions/
        ├── broker-auth.js        # OAuth token exchange (server-side, keys never in browser)
        ├── broker-proxy.js       # API proxy to broker endpoints
        └── portfolio-sync.mjs    # Cloud sync API (GET/POST portfolio data, protected by secret)
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
│         ├── Gemini/Claude/Groq (AI) — your key           │
│         └── Forex API (USD/INR) — free                   │
└─────────────────────────────────────────────────────────┘
                    │
          (Only for broker OAuth)
                    │
┌─────────────────────────────────────────────────────────┐
│              NETLIFY (your own instance)                 │
│  ┌─────────────────┐  ┌──────────────────┐              │
│  │  broker-auth.js  │  │  broker-proxy.js  │             │
│  │  (token exchange)│  │  (API proxy)      │             │
│  └────────┬────────┘  └────────┬─────────┘              │
│           │                     │                        │
│     HDFC_API_KEY          HDFC_API_SECRET                │
│     (env variable)        (env variable)                 │
│     NEVER in browser      NEVER in browser               │
│                                                          │
│  ┌───────────────────────┐                               │
│  │  portfolio-sync.mjs    │  ← Cloud Sync API            │
│  │  (Netlify Blobs store) │     (optional, for agents)   │
│  └───────────┬───────────┘                               │
│              │                                           │
│        SYNC_SECRET (env variable)                        │
│        Auth via X-Sync-Secret header                     │
└─────────────────────────────────────────────────────────┘
                    │
          (Optional: external agents)
                    │
┌─────────────────────────────────────────────────────────┐
│              OPENCLAW (on your machine)                   │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │  FinFolio Skill   │  │  Cron Jobs        │             │
│  │  (reads API data) │  │  (proactive alerts)│            │
│  └──────────────────┘  └──────────────────┘              │
│              │                                           │
│    Telegram / WhatsApp (your bot)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Security

| Concern | How It's Handled |
|---------|-----------------|
| Portfolio data | 100% in browser localStorage — never sent anywhere (unless cloud sync is enabled) |
| Cloud sync | Opt-in only. Protected by a secret key. Data stored in Netlify Blobs (your own instance). HTTPS only |
| Sync secret | Never in source code. Set via Netlify env var (`SYNC_SECRET`) + browser localStorage |
| Broker API keys | Server-side only (Netlify env vars) — never in HTML |
| OAuth tokens | sessionStorage — cleared when tab closes |
| AI API keys | Stored client-side, sent directly to AI provider only |
| CORS | Restricted to your own domain |
| Headers | HSTS, X-XSS-Protection, X-Frame-Options DENY |
| Source code | Fully open source — audit everything |

---

## APIs Used

### Free (No Keys Needed)

| API | Purpose |
|-----|---------|
| [mfapi.in](https://www.mfapi.in) | Mutual Fund NAV from AMFI |
| [gold-api.com](https://gold-api.com) | International gold spot price (USD/oz) |
| [fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) | USD/INR forex rate |

### Require Your Own Key

| API | Purpose | Free Tier |
|-----|---------|-----------|
| [Gemini](https://aistudio.google.com/apikey) | AI analysis | 1500 req/day |
| [Finnhub](https://finnhub.io) | Stock/share live price | 60 calls/min |
| [HDFC Developer](https://developer.hdfcsec.com) | Broker integration | Free for clients |

---

## Supported Brokers

| Broker | Status | Env Variables |
|--------|--------|---------------|
| HDFC Securities (InvestRight) | ✅ Ready | `HDFC_API_KEY`, `HDFC_API_SECRET` |
| Zerodha Kite | ✅ Ready | `ZERODHA_API_KEY`, `ZERODHA_API_SECRET` |
| Angel One | 🔜 Coming | `ANGEL_API_KEY`, `ANGEL_CLIENT_ID` |
| Groww | 🔜 Coming | `GROWW_API_KEY`, `GROWW_API_SECRET` |
| Upstox | 🔜 Coming | `UPSTOX_API_KEY`, `UPSTOX_API_SECRET` |

---

## Contributing

### Adding a New Broker

1. Add broker config to `BROKER_CONFIG` in `netlify/functions/broker-proxy.js`
2. Add auth config to `BROKER_AUTH_CONFIG` in `netlify/functions/broker-auth.js`
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
- [x] Broker mode toggle (hide broker features for standalone use)
- [x] Cloud sync API for external agent access (OpenClaw compatible)
- [x] Zerodha Kite integration
- [ ] Angel One integration
- [ ] Export portfolio as PDF/CSV
- [ ] Encrypted multi-device sync
- [ ] Mobile PWA support

---

## FAQ

**Q: Is my data safe?**
All data is in your browser's localStorage by default. If you enable Cloud Sync (optional), data is also stored in your own Netlify Blobs instance, protected by a secret key you control. Nothing is shared with third parties.

**Q: Can I use this without deploying to Netlify?**
Yes. Just open `index.html` in your browser. Everything works except broker integration.

**Q: What happens if I clear my browser data?**
Your portfolio data will be lost. Use Settings → Export Data to back up regularly.

**Q: Can multiple people use the same deployed site?**
Each person's data is in THEIR browser's localStorage — completely isolated. But for true privacy, each person should deploy their own instance.

**Q: Is the AI analysis accurate?**
The AI uses your real portfolio data as context but relies on the model's training knowledge for market data. Always verify specific numbers independently.

**Q: What is Cloud Sync?**
An optional feature that saves your portfolio data to a secure API endpoint on your Netlify instance. This allows external tools like [OpenClaw](https://openclaw.ai) to fetch your portfolio and send you proactive alerts (e.g., FD maturity reminders, gold price drops, SIP reminders) via Telegram or WhatsApp. Enable it in Settings → Data Management → Cloud Sync.

**Q: Why a single HTML file?**
Simplicity. Share via WhatsApp/email, works offline, no build tools, no dependencies, no vendor lock-in.

---

## License

MIT — use it, fork it, share it. Your money, your data, your tracker.

---

**Built with ❤️ for Indian investors who want to see their COMPLETE financial picture.**
