# FinFolio — API Compliance & Data Protocol Documentation

Last reviewed: 2026-03-28

This document certifies that all third-party API integrations in FinFolio follow official protocols, use proper authentication flows, respect rate limits, and handle user data with minimal scope and explicit consent.

---

## 1. Gmail API (Google)

**Purpose:** Auto-track bank transaction expenses from user's own email inbox.

| Parameter | Implementation |
|-----------|---------------|
| Auth protocol | OAuth 2.0 implicit grant via Google Identity Services (GIS) |
| Library | `https://accounts.google.com/gsi/client` (official Google library) |
| Scope requested | `https://www.googleapis.com/auth/gmail.readonly` |
| Scope justification | Read-only access to search and fetch bank alert emails. App never modifies, deletes, or sends emails |
| Consent | User explicitly clicks "Connect Gmail" and authorizes via Google consent screen |
| Token storage | `sessionStorage` only — cleared on tab close, 1-hour expiry |
| Token revocation | `google.accounts.oauth2.revoke()` called on disconnect |
| Data extracted | Transaction metadata only: merchant name, amount, date, payment method, category |
| Data NOT stored | Full email body, email headers, attachments, contact information, non-transaction emails |
| API quota | 15,000 quota units/user/minute (free). App uses ~5 units per message read, max 100 messages per sync |
| Rate limiting | User-initiated sync only — no background polling or automated scanning |
| Consent screen | App registered in Google Cloud Console with OAuth consent screen. Currently in "Testing" mode (only approved test users can authorize) |
| Verification status | Unverified (testing mode). Google verification required before publishing to production users |

**Compliance notes:**
- Follows [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- Limited use: data is used solely for expense categorization within the user's own app instance
- No data shared with third parties (except the user's chosen AI provider for transaction parsing)
- No data sold, transferred, or used for advertising
- User can disconnect Gmail and delete all synced transactions at any time

---

## 2. HDFC Securities Broker API

**Purpose:** Fetch user's demat holdings (stocks, MFs, SGBs, ETFs) from their brokerage account.

| Parameter | Implementation |
|-----------|---------------|
| API portal | [developer.hdfcsec.com](https://developer.hdfcsec.com) (official HDFC Securities developer portal) |
| Auth protocol | OAuth 2.0 authorization code flow with server-side token exchange |
| Client credentials | `HDFC_API_KEY` and `HDFC_API_SECRET` stored as Netlify environment variables — never exposed in client-side code |
| Token exchange | Performed server-side via `netlify/functions/broker-auth.js` |
| Token storage | `sessionStorage` on client — cleared on tab close |
| Endpoints used | `/portfolio/holdings`, `/portfolio/positions`, `/funds-and-margins`, `/user/profile` |
| API proxy | All requests routed through `netlify/functions/broker-proxy.js` to keep API key server-side |
| Data flow | Browser → Netlify function (adds API key) → HDFC API → Netlify function → Browser |
| Rate limiting | User-initiated only — no automated polling or bulk fetching |
| Data stored | Holdings data in localStorage for display. No credentials or tokens persisted beyond session |

**Compliance notes:**
- Uses only documented, officially published API endpoints
- No screen scraping, HTML parsing, or unofficial access
- No reverse engineering of HDFC's systems
- API credentials obtained through official developer registration
- User authenticates directly with HDFC's OAuth server — app never sees login credentials

---

## 3. HDFC Bank Transaction Emails

**Purpose:** Parse bank transaction alerts (InstaAlerts) from user's Gmail to track expenses.

| Parameter | Implementation |
|-----------|---------------|
| Data source | User's own Gmail inbox (not HDFC Bank servers) |
| Access method | Gmail API with user's OAuth consent (see Section 1) |
| Bank systems accessed | None — app never connects to HDFC Bank servers, APIs, or portals |
| Emails read | Only emails matching: `from:alerts@hdfcbank.bank.in` with specific transaction-related subjects |
| Email types parsed | Bank A/c debit alerts, UPI transaction alerts, Credit Card debit alerts |
| Data ownership | User is accessing their own transaction data from their own email account |
| Legal basis | Users have full rights to access, read, and process emails delivered to their own inbox |

**Compliance notes:**
- This is the same approach used by widely-accepted Indian fintech apps (Cred, INDMoney, Walnut, Jupiter) that parse bank SMS/email alerts
- No bank Terms of Service are violated — the app reads emails already delivered to the user, not data from bank servers
- HDFC Bank's email alerts are informational messages sent to the customer — the customer may process them as they wish
- App is extensible to other banks via the `GMAIL_BANK_CONFIGS` registry — same read-only, consent-based approach applies

---

## 4. Supabase (Cloud Backup)

**Purpose:** Optional cloud backup of portfolio data for cross-device access.

| Parameter | Implementation |
|-----------|---------------|
| Service | [Supabase](https://supabase.com) (open-source Firebase alternative) |
| Auth | Supabase Auth with email/password sign-up, or anonymous passphrase-based sync |
| Auth protocol | JWT-based authentication with access + refresh tokens |
| Anon key | Public anon key in client code (designed to be public per Supabase architecture) |
| Security | Row Level Security (RLS) enabled — users can only access their own data |
| Data synced | All portfolio data including Gmail transactions, budget plans, fund logs, FDs, SGBs, etc. |
| Data NOT synced | API keys, sync secrets, OAuth tokens, session data |
| Sync trigger | Auto-sync on portfolio change (3s debounce) or manual push/pull |
| Data control | User can pull (restore), push (backup), or delete their cloud data at any time |
| Encryption | HTTPS (TLS 1.2+) in transit. Supabase encrypts at rest by default |

**Compliance notes:**
- Cloud sync is opt-in — disabled by default
- User must explicitly enable sync and authenticate
- Data stored in user's own Supabase project instance
- Follows Supabase's [Terms of Service](https://supabase.com/terms) and [Privacy Policy](https://supabase.com/privacy)

---

## 5. Free Public APIs

### 6.1 AMFI Mutual Fund NAV — mfapi.in

| Parameter | Implementation |
|-----------|---------------|
| API | `https://api.mfapi.in/mf/{scheme_code}` |
| Auth | None required (public API) |
| Data source | Association of Mutual Funds in India (AMFI) — official NAV data |
| Usage | Fetch latest and historical NAV for mutual fund schemes |
| Rate limits | No documented limits. App makes requests only on user-initiated page loads |
| Terms | Community-maintained open API. No restrictive ToS |

### 6.2 Gold/Silver Spot Price — gold-api.com

| Parameter | Implementation |
|-----------|---------------|
| API | `https://api.gold-api.com/price/XAU` (gold), `XAG` (silver) |
| Auth | None required (free tier) |
| Data source | International spot market prices in USD/oz |
| Usage | Calculate SGB and physical gold current values |
| Rate limits | Reasonable use — app fetches only on page load or user action |
| Terms | Free tier available for non-commercial use |

### 6.3 Forex Rate — fawazahmed0/currency-api

| Parameter | Implementation |
|-----------|---------------|
| API | `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json` |
| Auth | None required (open-source, CDN-hosted) |
| Data source | Aggregated exchange rates |
| Usage | USD to INR conversion for gold price calculation |
| License | MIT — fully open-source |

### 6.4 Market Indices — Yahoo Finance

| Parameter | Implementation |
|-----------|---------------|
| API | `https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI` |
| Auth | None required |
| Data source | Yahoo Finance market data |
| Usage | Nifty 50 and Sensex current price and previous close |
| Status | **Undocumented/unofficial endpoint**. Yahoo does not publish this as an official API |
| Risk | Yahoo can change, rate-limit, or discontinue this endpoint without notice |
| Mitigation | Used only for market index display — not critical to core portfolio tracking. App functions fully without it |

**Note:** For production use, consider migrating to an official market data provider (NSE official data, or a paid service like Twelve Data, Alpha Vantage, or MarketStack).

### 6.5 Finnhub — Stock Prices

| Parameter | Implementation |
|-----------|---------------|
| API | `https://finnhub.io/api/v1/quote` |
| Auth | User's own API key (free tier) |
| Data source | Real-time and delayed stock quotes |
| Usage | Live price for company share plans (ESPP/RSU/ESOP) |
| Rate limits | 60 calls/min (free tier). App makes requests only on page load |
| Terms | Follows [Finnhub Terms of Service](https://finnhub.io/terms-of-service) |

---

## 6. AI Providers

**Purpose:** Portfolio analysis, market insights, and bank email transaction parsing.

| Provider | Auth Method | Data Sent | Data Stored by Provider |
|----------|-------------|-----------|------------------------|
| Google Gemini | `x-goog-api-key` header | Portfolio context + user prompt | Subject to [Google AI Terms](https://ai.google.dev/terms) |
| Anthropic Claude | `x-api-key` header | Portfolio context + user prompt | Subject to [Anthropic Usage Policy](https://www.anthropic.com/policies) |
| OpenAI GPT | `Authorization: Bearer` header | Portfolio context + user prompt | Subject to [OpenAI Terms](https://openai.com/policies) |
| OpenRouter | `Authorization: Bearer` header | Portfolio context + user prompt | Subject to [OpenRouter Terms](https://openrouter.ai/terms) |

**Compliance notes:**
- User chooses their own AI provider and provides their own API key
- Portfolio data is sent as context for analysis — user is aware this leaves the browser
- API keys sent via headers only (not URL parameters)
- No API keys stored server-side — all client-side in localStorage
- For Gmail expense parsing: truncated email snippets (max 500 chars each) are sent in batches to the AI provider for structured extraction

---

## 7. Data Flow Summary

```
User's Browser (localStorage)
    │
    ├── Gmail API (readonly, OAuth 2.0) ──── User's own Gmail inbox
    │       └── Only bank alert emails parsed
    │
    ├── HDFC Securities API (OAuth 2.0) ──── Official developer API
    │       └── Via Netlify proxy (API keys server-side)
    │
    ├── AI Provider (user's key) ──────────── Gemini / Claude / OpenAI / OpenRouter
    │       └── Portfolio context + email snippets for analysis
    │
    ├── Supabase (opt-in, auth) ───────────── User's own Supabase project
    │       └── Encrypted portfolio backup
    │
    └── Public APIs (no auth) ─────────────── AMFI, Gold, Forex, Yahoo, Finnhub
            └── Market data for display only
```

---

## 8. User Rights & Data Control

| Right | Implementation |
|-------|---------------|
| Access | User can export all data as JSON from Settings > Data Management |
| Deletion | User can clear all data via browser localStorage, disconnect Gmail, delete cloud data |
| Portability | JSON export includes all portfolio data — import into any system |
| Consent withdrawal | User can disconnect Gmail, sign out of Supabase, revoke broker access at any time |
| Transparency | Full source code is open — every API call, every data store is auditable |
| Data minimization | Only necessary data extracted and stored. No tracking, analytics, or telemetry |

---

## 9. Attestation

This application:

- Does NOT scrape, crawl, or access any unauthorized systems
- Does NOT bypass authentication or authorization mechanisms
- Does NOT store or transmit user credentials (bank logins, passwords)
- Does NOT share user data with third parties without explicit user action
- Does NOT use undisclosed data collection or tracking
- Does NOT violate the Terms of Service of any integrated API (with the noted exception of Yahoo Finance's undocumented endpoint status)
- DOES use official OAuth 2.0 flows for all authenticated integrations
- DOES request minimal API scopes required for functionality
- DOES store tokens in session-scoped storage with proper expiry
- DOES give users full control over their data (export, delete, disconnect)

---

*This document should be reviewed and updated whenever new API integrations are added or existing ones are modified.*
