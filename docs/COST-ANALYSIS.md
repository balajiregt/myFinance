# FinFolio — Cost Analysis (AI + Hosting)

Last updated: 2026-04-05

## AI-Powered Features

FinFolio uses your configured AI provider (BYOK — Bring Your Own Key) for two features:

1. **Gmail Expense Parsing** — LLM extracts merchant, amount, date, category from bank alert emails
2. **AI Finance Assistant** — Portfolio analysis, market mood, tax harvesting, chat

---

## 1. Gmail Expense Parsing — Cost Breakdown

### How It Works

- User clicks "Sync Now" with a date range
- App fetches matching bank alert emails via Gmail API
- Emails are batched (max 15 per batch) and sent to the AI provider
- Each email body is truncated to 500 characters
- AI returns a structured JSON array with parsed transactions
- This is a **one-time parse** — already-synced emails are skipped (dedup by Gmail message ID)

### Token Estimates Per Batch

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | ~200 | Parse instructions + JSON format |
| Bank parse hint | ~150 | Bank-specific email format description |
| Category list | ~50 | User's budget category names |
| Email bodies (15 × 500 chars) | ~2,000 | Truncated to 500 chars each |
| **Total Input** | **~2,400** | Per batch of 15 emails |
| **Total Output** | **~600** | JSON array with 15 transaction objects |

### Cost Per Sync (by provider)

Assuming a typical month has **30-60 bank transaction emails**:

| Provider | Input Rate | Output Rate | 30 emails (2 batches) | 60 emails (4 batches) | 100 emails (7 batches) |
|----------|-----------|------------|----------------------|----------------------|----------------------|
| **Gemini 2.5 Flash** | Free | Free | **$0.00** | **$0.00** | **$0.00** |
| Claude Sonnet 4 | $3/M | $15/M | $0.032 | $0.065 | $0.108 |
| Claude Haiku 4.5 | $0.80/M | $4/M | $0.009 | $0.017 | $0.029 |
| GPT-4o Mini | $0.15/M | $0.60/M | $0.002 | $0.003 | $0.005 |
| OpenRouter (Llama 3.3 70B) | ~$0.40/M | ~$0.40/M | $0.002 | $0.005 | $0.008 |

### Monthly Cost (Gmail Parsing Only)

Assuming 1 sync per week (~4 syncs/month), ~15 new emails per sync:

| Provider | Batches/Month | Monthly Cost |
|----------|--------------|-------------|
| **Gemini 2.5 Flash** | 4 | **$0.00 (free)** |
| Claude Sonnet 4 | 4 | ~$0.06 (~₹5) |
| Claude Haiku 4.5 | 4 | ~$0.02 (~₹2) |
| GPT-4o Mini | 4 | ~$0.003 (~₹0.25) |

**Verdict:** Gmail parsing is extremely cheap. With Gemini (recommended), it's completely free.

---

## 2. AI Finance Assistant — Cost Breakdown

### 6 One-Click Analyses

| Analysis | Input Tokens | Output Tokens | Notes |
|----------|-------------|---------------|-------|
| Portfolio Review | ~3,000 | ~1,200 | Full holdings context + analysis |
| Market Mood | ~2,000 | ~800 | Market indices + PE assessment |
| Lumpsum Timing | ~2,500 | ~1,000 | Valuation + deployment advice |
| Gold & Silver | ~2,000 | ~800 | SGB + physical gold context |
| FD vs Debt Funds | ~2,000 | ~800 | Rate comparison |
| Tax Harvesting | ~3,000 | ~1,000 | Holdings + period analysis |

### Free-Text Chat

| Type | Input Tokens | Output Tokens |
|------|-------------|---------------|
| Simple query | ~2,000 | ~500 |
| Complex analysis | ~4,000 | ~1,200 |

### Monthly Cost (AI Assistant)

Assuming 2 analyses + 3 chat messages per week:

| Provider | Monthly Cost | Notes |
|----------|-------------|-------|
| **Gemini 2.5 Flash** | **$0.00** | Free tier: 1,500 req/day |
| Claude Sonnet 4 | ~$0.50 (~₹42) | High quality responses |
| Claude Haiku 4.5 | ~$0.12 (~₹10) | Good quality, cheaper |
| GPT-4o Mini | ~$0.02 (~₹2) | Budget option |

---

## 3. Total Monthly Cost (AI Features Only)

| Provider | Gmail Parsing | AI Assistant | Total/Month | Total/Year |
|----------|--------------|-------------|-------------|------------|
| **Gemini 2.5 Flash** | $0.00 | $0.00 | **$0.00** | **$0.00** |
| Claude Sonnet 4 | $0.06 | $0.50 | $0.56 (~₹47) | $6.72 (~₹564) |
| Claude Haiku 4.5 | $0.02 | $0.12 | $0.14 (~₹12) | $1.68 (~₹141) |
| GPT-4o Mini | $0.003 | $0.02 | $0.023 (~₹2) | $0.28 (~₹23) |

---

## 4. Hosting Cost Breakdown

### Deployment Options

| Deployment | Monthly Cost | Broker Support | Notes |
|-----------|-------------|----------------|-------|
| **Open HTML file** | $0 | No | Just open `index.html` in browser |
| **Local `node server.js`** | $0 | No | Localhost origin, all features except broker |
| **GitHub Pages** | $0 | No | Free static hosting, all features except broker |
| **Fly.io** | ~$3.60 (~₹300) | **Yes** | Static IP required for SEBI-compliant broker API access |

### Fly.io Cost Detail

| Item | Monthly Cost | Usage-Based? | Notes |
|------|-------------|-------------|-------|
| Static IPv4 (shared) | $3.60 | No — fixed | Required for broker API whitelisting |
| Compute (shared-cpu-1x) | ~$0.00 | Yes — free tier | Machines auto-stop when idle; within free allowance (2,340 hrs/month) |
| Bandwidth | ~$0.00 | Yes — free tier | A few KB per broker sync; well within 160GB free |
| **Total** | **~$3.60 + GST** | | Per broker sync: ~30-60s compute = negligible |

### Why Fly.io?

SEBI Exchange circular (effective April 2026) mandates static IP whitelisting for all Indian broker APIs. Typical serverless platforms use dynamic IPs that change on every invocation — impossible to whitelist. Fly.io provides a static egress IP at ~$3.60/month. If you don't need broker integration, just open `index.html` or run `node server.js` locally — that's the $0 option.

---

## 5. Key Design Decisions That Keep Costs Low

| Decision | Impact |
|----------|--------|
| **Email truncation (500 chars)** | Cuts input tokens by ~80% vs full email body |
| **Batch processing (15 emails/batch)** | Amortizes system prompt across 15 emails |
| **Deduplication by Gmail message ID** | Already-synced emails are never re-parsed |
| **User-initiated sync only** | No background polling — AI called only when user clicks Sync |
| **Results cached in localStorage** | AI analyses cached locally — instant replay without re-running |
| **Category list from budget data** | Reuses existing categories instead of asking AI to create new ones |
| **JSON-only output format** | Keeps output tokens minimal (no explanations) |

---

## 6. Recommendation

**Use Gemini 2.5 Flash** — it's free, fast, and handles both Gmail parsing and AI analysis well. Get your key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

For users who want higher quality analysis responses, Claude Haiku 4.5 offers the best quality-per-dollar at ~₹12/month.

---

*Review this analysis when changing AI providers or modifying prompt templates.*
