# FinFolio Security Audit Checklist

Last audited: 2026-04-05

Use this checklist for periodic security reviews and before major releases.

---

## 1. Exposed Secrets

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded API keys in source | ✅ Fixed | Gemini key moved from URL param to `x-goog-api-key` header |
| No tokens/passwords in committed files | ✅ OK | Verified — no secrets in tracked files |
| `.gitignore` blocks `.env`, `node_modules/`, `.netlify/` | ✅ Added | Prevents accidental secret commits |
| Supabase anon key in source | ⚠️ Accepted | Anon key is designed to be public; security relies on RLS policies |
| AI API keys in localStorage | ⚠️ Accepted | Client-side app — keys stored in plaintext localStorage. XSS = key theft. Mitigated by CSP + HTML escaping |

**How to check:**
```bash
# Scan for potential secrets in tracked files
git grep -iE '(sk-ant-|sk-or-|AIza|Bearer |eyJ|bot[0-9]+:AA)' -- ':!SECURITY-AUDIT.md'
```

---

## 2. XSS (Cross-Site Scripting)

| Check | Status | Notes |
|-------|--------|-------|
| AI chat responses HTML-escaped before `innerHTML` | ✅ Fixed | `addChatMessage()` escapes `<`, `>`, `&`, `"` before rendering |
| `markdownToHTML()` escapes HTML entities | ✅ OK | Line 6357: `&`, `<`, `>` escaped before markdown transforms |
| Budget item labels escaped in `renderBudgetList()` | ✅ Fixed | `escHTML(item.label)` prevents injection from imported/synced data |
| Gmail transaction fields escaped in table render | ✅ Fixed | `escHTML()` on merchant, date, category fields |
| `contenteditable` fields use `textContent` on blur | ✅ OK | `this.textContent.trim()` — safe, strips HTML |

**How to check:**
```bash
# Find innerHTML assignments with potentially unsafe template literals
grep -n 'innerHTML.*\${' index.html | grep -v 'escHTML\|fmt\|icon\|style\|PIE_COLORS'
```

---

## 3. CORS & Origin Validation

| Check | Status | Notes |
|-------|--------|-------|
| `broker-proxy.js` — CORS restricted to `process.env.URL` | ✅ OK | Only allows the Netlify site origin |
| `broker-auth.js` — CORS restricted to `process.env.URL` | ✅ OK | Same pattern as broker-proxy |

**How to check:**
```bash
grep -n 'Allow-Origin\|includes.*localhost\|origin.*===\|cors' netlify/functions/*.{js,mjs}
```

---

## 4. API & Endpoint Security

| Check | Status | Notes |
|-------|--------|-------|
| Sync secret only via header (`X-Sync-Secret`) | ✅ Fixed | Removed query parameter fallback — secrets don't leak in logs/URLs |
| `extra_headers` passthrough removed from broker-proxy | ✅ Fixed | Prevents header injection / request smuggling |
| Error responses don't leak internal details | ✅ Fixed | Broker auth/proxy return generic errors; details logged server-side only |
| Netlify functions validate required params | ✅ OK | All endpoints check for required fields before processing |

**How to check:**
```bash
# Check for details/data leakage in error responses
grep -n 'details:\|err.message' netlify/functions/*.{js,mjs}
```

---

## 5. Content Security Policy (CSP)

| Check | Status | Notes |
|-------|--------|-------|
| CSP header set in `netlify.toml` | ✅ Added | Restricts script sources, connect targets, frame sources |
| `script-src` allows `'unsafe-inline'` | ⚠️ Accepted | Required for single-file app with inline `<script>`. Cannot remove without refactoring to external JS |
| `connect-src` whitelist covers all APIs | ✅ OK | Supabase, MFAPI, Gold API, Finnhub, AI providers, Gmail, Yahoo Finance, Overpass API |
| `img-src` allows OSM tiles | ✅ OK | `*.tile.openstreetmap.org` for Leaflet map rendering |
| `frame-src` restricted to Google (OAuth) | ✅ OK | Only `accounts.google.com` allowed |

**Current CSP:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co https://api.mfapi.in https://api.gold-api.com
  https://finnhub.io https://api.anthropic.com https://api.openai.com
  https://generativelanguage.googleapis.com https://openrouter.ai
  https://gmail.googleapis.com https://cdn.jsdelivr.net https://query1.finance.yahoo.com
  https://overpass-api.de;
img-src 'self' data: https://*.tile.openstreetmap.org;
frame-src https://accounts.google.com;
```

---

## 6. Authentication & Token Storage

| Check | Status | Notes |
|-------|--------|-------|
| Gmail OAuth token in `sessionStorage` | ✅ OK | Expires on tab close, 1-hour token lifetime |
| Broker token in `sessionStorage` | ✅ OK | Same pattern — not persisted across sessions |
| Supabase session in `localStorage` | ⚠️ Accepted | Contains `access_token` + `refresh_token`. XSS risk but required for auto-sync persistence. Mitigated by CSP + escaping |
| Supabase RLS enforced | ⚠️ Verify | Anon key relies on Row Level Security. Verify policies restrict access to `auth.uid()` or hashed `user_key` |
| Anonymous passphrase flow (non-auth sync) | ⚠️ Open | Plaintext passphrase as `user_key`. Consider hashing server-side |

---

## 7. Data Privacy

| Check | Status | Notes |
|-------|--------|-------|
| Gmail transactions synced to cloud | ⚠️ Info | `mypf_gmail_transactions` is in `SYNC_KEYS` — bank transaction data goes to Supabase. Users should be aware |
| No full email body stored | ✅ OK | Only merchant, amount, date, category extracted — no raw email content persisted |
| Export includes all localStorage data | ✅ OK | Export is user-initiated, JSON format, no secrets included |
| AI prompts don't leak raw financial data to third-party APIs | ⚠️ Info | Portfolio data sent to chosen AI provider (Claude/OpenAI/Gemini/OpenRouter). User's choice of provider |

---

## 8. Infrastructure

| Check | Status | Notes |
|-------|--------|-------|
| HTTPS enforced via HSTS | ✅ OK | `Strict-Transport-Security: max-age=31536000; includeSubDomains` (both Netlify + Fly.io) |
| `X-Frame-Options: DENY` | ✅ OK | Prevents clickjacking (both Netlify + Fly.io) |
| `X-Content-Type-Options: nosniff` | ✅ OK | Prevents MIME sniffing (both Netlify + Fly.io) |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ OK | Limits referrer leakage |
| `Permissions-Policy` restricts camera/mic/geo | ✅ OK | All denied |

---

## 9. Fly.io Deployment (Broker Integration)

| Check | Status | Notes |
|-------|--------|-------|
| `server.js` uses zero external dependencies | ✅ OK | Only `node:http`, `node:fs`, `node:path` — no supply chain risk |
| Broker secrets stored via `fly secrets` | ✅ OK | Encrypted at rest, injected as env vars at runtime |
| Static egress IP for broker API compliance | ✅ OK | SEBI mandate (April 2026) — IP whitelisted on broker portal |
| Path traversal protection | ✅ OK | `server.js` resolves paths and checks they stay within `/app/` |
| Security headers match Netlify | ✅ OK | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| CORS restricted to `process.env.URL` | ✅ OK | Same pattern as Netlify functions — only allows configured origin |
| Docker image minimal | ✅ OK | `node:20-alpine` (~43MB), no unnecessary packages |
| Machines auto-stop when idle | ✅ OK | Reduces attack surface window |
| `force_https: true` in fly.toml | ✅ OK | All HTTP redirected to HTTPS |

**How to check:**
```bash
# Verify server.js has no require() calls to external packages
grep -n "require(" server.js | grep -v "node:" | grep -v "./netlify"

# Verify security headers in server.js match netlify.toml
grep -A1 "Strict-Transport\|X-Frame\|X-Content-Type\|Referrer-Policy" server.js
```

---

## Open Items (Future)

| Item | Priority | Description |
|------|----------|-------------|
| Hash anonymous passphrase | Medium | Server-side hash before using as `user_key` in Supabase |
| Proxy AI calls through Netlify | Low | Would prevent client-side API key exposure; adds complexity and cost |
| Move to external JS bundle | Low | Would allow removing `'unsafe-inline'` from CSP `script-src` |
| Supabase RLS audit | Medium | Verify policies enforce `auth.uid()` filtering, test with another user's credentials |
| Fly.io egress IP rotation | Low | Monitor if shared IPv4 changes — re-whitelist on broker portal if needed |

---

## How to Run This Audit

1. Review each section's table against current code
2. Run the shell commands under "How to check" for automated scans
3. Update status and date at the top after each review
4. For new features touching auth, storage, or external APIs — add a row to the relevant section
