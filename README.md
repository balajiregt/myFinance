# 💰 myFinance — Personal Portfolio Tracker

A **self-hostable, single-file portfolio tracker** for Indian investors. Track Mutual Funds, Stocks, SGBs, Fixed Deposits, and company share plans — all from one dashboard with live price feeds.

🔗 **Live Demo**: [your-site.netlify.app](https://your-site.netlify.app)

---

## ✨ Features

### Works Offline (Tier 1 — No Setup)
- **Mutual Funds** — Auto-fetch NAV from AMFI API (free, no key needed)
- **SGB Gold** — Live 24K gold price via international spot rate + forex conversion
- **Nifty 50** — Live index price for lumpsum trigger alerts
- **Company Shares** — Configurable ESPP/ShareSave/RSU tracker
- **Fixed Deposits & Recurring Deposits** — Interest calculator
- **Portfolio Donut** — Visual allocation breakdown
- All data stored in `localStorage` — nothing leaves your browser

### With Broker API (Tier 2 — Self-Host on Netlify)
- **HDFC Securities** — Fetch live holdings, positions, funds
- **Zerodha Kite** — Coming soon
- **Angel One** — Coming soon
- **Groww** — Coming soon
- **Upstox** — Coming soon

> Broker integration requires deploying to Netlify (free tier) and configuring your broker API credentials.

---

## 🚀 Quick Start

### Option A: Just Use It (No Setup)
1. Download `index.html`
2. Open in any browser
3. Start adding your holdings manually
4. MF NAVs and Gold prices fetch automatically

### Option B: Deploy to Netlify (Enables Broker Integration)

#### 1. Fork & Clone
```bash
git clone https://github.com/balajiregt/myFinance.git
cd myFinance
```

#### 2. Deploy to Netlify
- Go to [app.netlify.app](https://app.netlify.app)
- Click **"Add new site"** → **"Import an existing project"**
- Connect your GitHub repo (`balajiregt/myFinance`)
- Deploy settings:
  - **Build command**: *(leave empty)*
  - **Publish directory**: `.`
- Click **Deploy**

#### 3. Configure Broker API (Example: HDFC Securities)

**Step 1**: Create API credentials at [developer.hdfcsec.com](https://developer.hdfcsec.com)
- Login with your HDFC Securities account
- Go to **Apps** → **Create New App**
- **App Name**: `myFinance`
- **Redirect URL**: `https://YOUR-SITE.netlify.app/auth/callback`
- Note your **API Key** and **API Secret**

**Step 2**: Add environment variables in Netlify
- Go to **Site Settings** → **Environment Variables**
- Add:
  | Key | Value |
  |-----|-------|
  | `HDFC_API_KEY` | Your HDFC API Key |
  | `HDFC_API_SECRET` | Your HDFC API Secret |

**Step 3**: Redeploy
- Go to **Deploys** → **Trigger deploy** → **Deploy site**

**Step 4**: Use it
- Open your site → Go to **Broker** tab
- Select **HDFC Securities** → Click **Connect**
- Login with HDFC credentials → Holdings auto-populate!

---

## 🔧 Supported Brokers & Setup

| Broker | Status | Env Variables Needed |
|--------|--------|---------------------|
| HDFC Securities | ✅ Ready | `HDFC_API_KEY`, `HDFC_API_SECRET` |
| Zerodha Kite | 🔜 Coming | `ZERODHA_API_KEY`, `ZERODHA_API_SECRET` |
| Angel One | 🔜 Coming | `ANGEL_API_KEY`, `ANGEL_CLIENT_ID` |
| Groww | 🔜 Coming | `GROWW_API_KEY`, `GROWW_API_SECRET` |
| Upstox | 🔜 Coming | `UPSTOX_API_KEY`, `UPSTOX_API_SECRET` |

Want to add a broker? See [Contributing](#contributing).

---

## 📁 Project Structure

```
myFinance/
├── index.html              # The entire app — single file
├── netlify.toml            # Netlify config (functions + redirects)
├── netlify/
│   └── functions/
│       ├── broker-auth.js  # OAuth token exchange (server-side)
│       └── broker-proxy.js # API proxy to broker endpoints
└── README.md
```

---

## 🔒 Security

- **API keys are NEVER in the HTML** — stored as Netlify environment variables
- **OAuth tokens stay in-session** — stored in `sessionStorage`, cleared on tab close
- **Netlify Functions act as a proxy** — your broker credentials never reach the browser
- **No database, no server** — your portfolio data lives in your browser's `localStorage`
- **Open source** — audit the code yourself

---

## 🆓 Free APIs Used (No Keys Needed)

| API | Purpose | Rate Limit |
|-----|---------|-----------|
| [mfapi.in](https://www.mfapi.in) | Mutual Fund NAV (AMFI) | Generous |
| [gold-api.com](https://gold-api.com) | International gold spot price | Unlimited |
| [fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) | USD/INR forex rate | Unlimited |

---

## 🤝 Contributing

### Adding a New Broker

1. Add broker config to `BROKER_CONFIG` in `netlify/functions/broker-proxy.js`
2. Add auth config to `BROKER_AUTH_CONFIG` in `netlify/functions/broker-auth.js`
3. Add a `parseHoldings()` normalizer in the frontend (in `index.html`)
4. Submit a PR!

### Normalised Holding Format
All brokers should map their response to this common format:
```javascript
{
  symbol: 'RELIANCE',        // Trading symbol
  name: 'Reliance Industries', // Full name
  qty: 10,                    // Quantity held
  avgPrice: 2450.50,          // Average buy price
  currentPrice: 2580.00,      // Current market price (if available)
  exchange: 'NSE',            // Exchange
  type: 'equity',             // equity | mf | bond | etf
  broker: 'hdfc_securities',  // Broker identifier
  isin: 'INE002A01018',       // ISIN (optional)
  pnl: 1295.00,               // P&L (optional)
}
```

---

## 📋 Roadmap

- [x] Manual portfolio entry (MF, Stocks, SGB, FD/RD)
- [x] Live MF NAV from AMFI
- [x] Live gold price (international spot + forex)
- [x] Nifty 50 live price
- [x] Company share plan tracker (ESPP/ShareSave)
- [x] Broker API proxy (Netlify Functions)
- [ ] HDFC Securities live holdings
- [ ] Zerodha Kite integration
- [ ] Angel One integration
- [ ] Gmail expense tracker (OAuth)
- [ ] Multi-broker aggregated view
- [ ] Export portfolio as PDF/CSV

---

## 📄 License

MIT — use it, fork it, share it. Your money, your data, your tracker.
