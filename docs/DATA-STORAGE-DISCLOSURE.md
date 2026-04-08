# Data Storage Disclosure

**FinFolio — What We Store and Where**
Last updated: 2026-04-01

This document provides full transparency on every piece of data FinFolio stores, where it is stored, and how to delete it.

---

## 1. Browser localStorage

**Persistence:** Until manually cleared or browser data is deleted.
**Scope:** Your browser only. Not accessible by other websites or users.

| Key | Data Type | Contains | Sensitive? |
|---|---|---|---|
| `mypf_v3` | JSON | Core portfolio: salary, savings %, allocation config | No |
| `mypf_fds` | JSON | Fixed deposits: bank, principal, rate, tenure, maturity | No |
| `mypf_rds` | JSON | Recurring deposits: bank, monthly amount, rate, tenure | No |
| `mypf_sgb_v2` | JSON | Sovereign Gold Bonds: series, grams, buy price, dates | No |
| `mypf_physical_gold` | JSON | Physical gold: type, grams, purity, storage location | No |
| `mypf_mflogs` | JSON | Mutual fund transaction logs | No |
| `mypf_mfnavs` | JSON | Cached MF NAV values | No |
| `mypf_manual_funds` | JSON | Manually tracked mutual funds | No |
| `mypf_custom_mfs` | JSON | Custom fund entries with ISIN | No |
| `mypf_broker_mf` | JSON | Broker-synced mutual fund holdings | No |
| `mypf_sip_plans` | JSON | SIP plans: name, amount, status, dates | No |
| `mypf_sipday` | JSON | SIP day preference | No |
| `mypf_po` | JSON | Post Office schemes: PPF, SSY, NSC, MIS | No |
| `mypf_ss_config` | JSON | Company share plan configuration | No |
| `mypf_budget` | JSON | Budget: fixed/variable expenses, emergency fund | No |
| `mypf_budget_history` | JSON | Monthly budget snapshots | No |
| `mypf_gmail_transactions` | JSON | Gmail-synced expenses: merchant, amount, date, category, payment method | **Yes** — financial transaction data |
| `mypf_fund_verdicts` | JSON | Cached AI fund analysis results | No |
| `mypf_mf_analysis` | JSON | Cached AI portfolio analysis | No |
| `mypf_apikey` | String | Claude API key | **Yes** — API credential |
| `mypf_openai_key` | String | OpenAI API key | **Yes** — API credential |
| `mypf_gemini_key` | String | Gemini API key | **Yes** — API credential |
| `mypf_openrouter_key` | String | OpenRouter API key | **Yes** — API credential |
| `mypf_finnhub_key` | String | Finnhub API key | **Yes** — API credential |
| `mypf_gmail_client_id` | String | Google OAuth Client ID | Semi-public (not a secret) |
| `mypf_gmail_bank_configs` | JSON | Configured banks for Gmail expense tracking (sender, subjects, query) | No |
| `mypf_retirement` | JSON | Retirement accounts: EPF/VPF/NPS, balance, rate, monthly contributions, employer match | No |
| `mypf_realty` | JSON | Real estate properties: name, type, area, location, coordinates, purchase/current value, survey no. | No |
| `mypf_supa_session` | JSON | Supabase auth session (access + refresh tokens) | **Yes** — auth credential |
| `mypf_supa_config` | JSON | Supabase sync configuration | No |
| `mypf_ai_provider` | String | Selected AI provider name | No |
| `mypf_theme` | String | Theme preference ("dark" or "light") | No |

### How to delete
- **Individual keys:** Browser DevTools > Application > Local Storage > delete specific keys
- **All FinFolio data:** Settings > Data Management > clear browser data, or run `Object.keys(localStorage).filter(k=>k.startsWith('mypf_')).forEach(k=>localStorage.removeItem(k))` in browser console
- **Everything:** Browser Settings > Clear browsing data > Cookies and site data

---

## 2. Browser sessionStorage

**Persistence:** Until browser tab is closed.
**Scope:** Current tab only.

| Key | Contains | Sensitive? | Expiry |
|---|---|---|---|
| `mypf_gmail_token` | Gmail OAuth access token | **Yes** | 1 hour (Google-enforced) |
| `mypf_broker_token` | Broker OAuth access token | **Yes** | Session-scoped |

### How to delete
- Close the browser tab, or
- Click "Disconnect" in Settings (Gmail / Broker)

---

## 3. Supabase Cloud (Optional — Opt-in)

**Persistence:** Until you delete from cloud.
**Scope:** Your Supabase project, protected by Row Level Security.

| What's Synced | What's NOT Synced |
|---|---|
| All `mypf_*` keys from the `SYNC_KEYS` list | API keys (`mypf_apikey`, etc.) |
| Gmail transactions | OAuth tokens (sessionStorage) |
| Budget data | Theme preference |
| Fund logs, FDs, SGBs, etc. | |

### How to delete
- Settings > Cloud Backup > Sign in > delete from Supabase dashboard
- Or run SQL: `DELETE FROM portfolio WHERE user_key = 'your_key'`

---

## 4. What FinFolio Does NOT Store

| Data | Where You Might Expect It | Reality |
|---|---|---|
| Cookies | Browser cookie jar | FinFolio uses zero cookies |
| Bank login credentials | Nowhere | OAuth only — app never sees passwords |
| Full email bodies | After Gmail sync | Only transaction metadata extracted. Raw email discarded after parsing |
| Server-side user profiles | Backend database | No backend user database exists |
| Analytics/telemetry | Server logs | Zero tracking, zero analytics |
| IP addresses | Access logs | Netlify may log IPs in their infrastructure logs (standard CDN behavior), but FinFolio code does not access or store them |

---

## 5. Data Flow to Third Parties

| When You... | Data Goes To | What's Sent | Stored by Them? |
|---|---|---|---|
| Use AI assistant | Your chosen AI provider | Portfolio context + prompt | Subject to provider's policy |
| Sync Gmail expenses | Google (Gmail API) | Search queries | Google logs API usage per their policy |
| Parse expenses with AI | Your chosen AI provider | Email snippets (500 char max) | Subject to provider's policy |
| Connect broker | HDFC Securities (via Netlify proxy) | OAuth token | HDFC logs API access per their policy |
| Enable Supabase sync | Your Supabase project | Portfolio data | Stored until you delete |
| Fetch market prices | Public APIs (AMFI, gold, forex) | API request (no personal data) | Standard CDN/server logs |

---

## 6. Verification

You can verify all stored data yourself:

```javascript
// View all FinFolio localStorage keys and sizes
Object.keys(localStorage)
  .filter(k => k.startsWith('mypf_'))
  .map(k => ({ key: k, size: localStorage.getItem(k).length }))
  .sort((a, b) => b.size - a.size);

// View sessionStorage (OAuth tokens)
Object.keys(sessionStorage)
  .filter(k => k.startsWith('mypf_'));

// Check if cookies exist (should be empty)
document.cookie;
```

Run these in your browser's DevTools console (F12 > Console) to audit exactly what FinFolio stores.
