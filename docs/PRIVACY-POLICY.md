# Privacy Policy

**FinFolio — Indian Portfolio Tracker**
Last updated: 2026-03-28

---

## 1. Overview

FinFolio is a self-hosted, open-source portfolio tracker. This privacy policy explains what data is collected, how it is used, and where it is stored when you use the application.

**Key principle:** FinFolio is designed so that all your data stays under your control. There are no shared servers, no user tracking, and no analytics. Each user deploys their own instance.

---

## 2. Data Collection

### 2.1 Data You Provide Directly
- **Portfolio data:** Salary, investments (MFs, FDs, RDs, SGB, stocks, gold), budget entries, SIP plans
- **Configuration:** AI provider API keys, broker credentials (OAuth tokens only — never passwords), sync secrets
- **Gmail data (optional):** When you connect Gmail, the app reads bank transaction alert emails to extract expense data

### 2.2 Data Collected Automatically
- **None.** FinFolio does not use analytics, cookies, tracking pixels, fingerprinting, or any form of telemetry.

### 2.3 Data NOT Collected
- Passwords or bank login credentials
- Full email content (only transaction metadata is extracted)
- Location data, device information, or IP addresses
- Browsing history or behavior patterns

---

## 3. Data Storage

| Storage Location | What's Stored | Controlled By |
|---|---|---|
| **Browser localStorage** | All portfolio data, budget, Gmail transactions, AI keys | You (your browser) |
| **Browser sessionStorage** | OAuth tokens (Gmail, broker) — cleared on tab close | You (your browser) |
| **Supabase (optional)** | Portfolio data backup (if cloud sync enabled) | You (your Supabase project) |

- All cloud storage is **opt-in** — disabled by default
- You can export, delete, or clear all data at any time from Settings
- No data is stored on any server controlled by the developers

---

## 4. Third-Party Services

When you use certain features, data is transmitted to third-party services:

### 4.1 Gmail API (Google)
- **When:** You click "Connect Gmail" and "Sync Now"
- **Scope:** `gmail.readonly` — read-only access to your emails
- **Data sent:** Search queries to find bank alert emails
- **Data received:** Email metadata and body content for bank transactions
- **Data retained:** Only extracted transaction fields (merchant, amount, date, category). Full email body is NOT stored
- **Google's policy:** [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### 4.2 AI Providers
- **When:** You use the AI assistant, run portfolio analysis, or sync Gmail transactions (for LLM parsing)
- **Data sent:** Portfolio context and/or email snippets (truncated to 500 chars per email)
- **Providers:** Google Gemini, Anthropic Claude, OpenAI, OpenRouter (your choice)
- **Note:** Each provider has their own data handling policy. You provide your own API key and choose your provider

### 4.3 Supabase (Optional Cloud Backup)
- **When:** You enable cloud sync in Settings
- **Data sent:** All portfolio data including Gmail transactions
- **Security:** HTTPS in transit, encrypted at rest, Row Level Security enforced
- **Your control:** You can push, pull, or delete cloud data at any time

### 4.4 Broker API (HDFC Securities)
- **When:** You connect your broker account
- **Data sent:** OAuth authorization code (for token exchange)
- **Data received:** Your demat holdings
- **Security:** API credentials stored server-side (Netlify env vars), never in browser

### 4.5 Public Market APIs
- **Data sent:** API requests for market prices (no personal data included)
- **Services:** AMFI (MF NAV), gold-api.com, fawazahmed0/currency-api, Yahoo Finance, Finnhub

---

## 5. Data Sharing

FinFolio does **NOT**:
- Sell, rent, or trade your personal data
- Share data with advertisers or marketing services
- Use your data for profiling or targeted advertising
- Transfer data to third parties without your explicit action

Data is only transmitted to services you explicitly connect (Gmail, AI provider, Supabase, broker).

---

## 6. Data Retention

| Data Type | Retention | How to Delete |
|---|---|---|
| Portfolio data (localStorage) | Until you clear it | Settings > Data Management > clear browser data |
| Gmail transactions | Until you delete individual entries or clear all | Delete button per transaction, or clear localStorage |
| OAuth tokens (sessionStorage) | Until tab is closed or token expires (1 hour) | Close browser tab, or click "Disconnect" |
| Supabase cloud backup | Until you delete from cloud | Settings > Cloud Backup > delete, or Supabase dashboard |
| AI API keys | Until you remove them | Settings > clear the key field |

---

## 7. Security

- HTTPS enforced via HSTS headers
- Content Security Policy (CSP) restricts script and API sources
- OAuth tokens stored in sessionStorage (session-scoped, not persisted)
- API keys for brokers stored server-side only
- XSS protection via HTML sanitization of all rendered content
- CORS restricted to application's own domain
- See [SECURITY-AUDIT.md](../SECURITY-AUDIT.md) for full security checklist

---

## 8. Children's Privacy

FinFolio is not directed at children under 18. The app handles financial data intended for adult users managing their own investments.

---

## 9. Your Rights

| Right | How to Exercise |
|---|---|
| **Access** | Export all data as JSON from Settings > Data Management |
| **Deletion** | Clear localStorage, disconnect Gmail, delete cloud data |
| **Portability** | JSON export is human-readable and importable |
| **Consent withdrawal** | Disconnect Gmail, sign out of Supabase, revoke broker access at any time |
| **Transparency** | Full source code is open source — audit every API call and data store |

---

## 10. Changes to This Policy

This privacy policy may be updated when new features or integrations are added. Changes will be reflected in the "Last updated" date at the top. Since FinFolio is self-hosted, you control when to update your instance.

---

## 11. Contact

For privacy-related questions or concerns:
- Open an issue at [github.com/balajiregt/myFinance](https://github.com/balajiregt/myFinance/issues)
- Or contact the repository owner directly via GitHub
