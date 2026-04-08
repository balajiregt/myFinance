# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | Yes |
| Older commits | No |

FinFolio is a single-branch project. Only the latest version on the `main` branch receives security updates.

---

## Reporting a Vulnerability

If you discover a security vulnerability in FinFolio, **please report it responsibly** rather than opening a public issue.

### How to Report

1. **Email:** Contact the repository owner via their GitHub profile
2. **GitHub:** Use [GitHub's private vulnerability reporting](https://github.com/balajiregt/myFinance/security/advisories/new) if enabled
3. **Do NOT** open a public issue for security vulnerabilities

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact (data exposure, XSS, authentication bypass, etc.)
- Suggested fix (if you have one)

### Response Timeline

| Stage | Timeline |
|---|---|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix deployed | Within 30 days (critical), 90 days (non-critical) |
| Public disclosure | After fix is deployed |

### What Qualifies

- XSS vulnerabilities in rendered content
- Authentication or authorization bypasses
- CORS misconfigurations allowing unauthorized access
- Secrets or credentials exposed in source code
- API endpoints accessible without proper authentication
- Data leakage through error messages or logs
- Client-side injection vulnerabilities

### What Does NOT Qualify

- Self-hosted misconfigurations (user's responsibility to configure RLS, env vars, etc.)
- Third-party API vulnerabilities (report to the API provider)
- Missing rate limiting (documented as open item in SECURITY-AUDIT.md)
- Browser localStorage accessibility (inherent to client-side storage)
- AI model generating incorrect information (not a security issue)

---

## Security Documentation

| Document | Purpose |
|---|---|
| [SECURITY-AUDIT.md](SECURITY-AUDIT.md) | Detailed vulnerability checklist with verification commands |
| [COMPLIANCE.md](COMPLIANCE.md) | API protocol compliance and data handling documentation |
| [docs/PRIVACY-POLICY.md](docs/PRIVACY-POLICY.md) | What data is collected, stored, and shared |

---

## Security Architecture

### Core App (Client-Side)

- All portfolio data stored in browser localStorage (client-side only)
- OAuth tokens in sessionStorage (cleared on tab close)
- Broker API credentials server-side only (Fly.io secrets / Netlify env vars)
- HTTPS enforced via HSTS headers
- Content Security Policy (CSP) restricts script and API sources (both Netlify and Fly.io)
- CORS restricted to application's own domain
- HTML sanitization on all AI-generated and user-provided content
- No cookies, no tracking, no analytics

### Fly.io Deployment (Broker Integration)

- Zero-dependency Node.js server — no third-party packages, minimal attack surface
- Static egress IP whitelisted on broker portals (SEBI compliance)
- Secrets stored via `fly secrets` (encrypted at rest, injected as env vars at runtime)
- Same security headers as Netlify deployment (HSTS, CSP, X-Frame-Options, etc.)
- Path traversal protection on static file serving
- Docker image: node:20-alpine (~43MB) — no unnecessary packages
- Machines auto-stop when idle — reduced exposure window

### Optional Cloud Sync (Supabase)

- Opt-in only — disabled by default
- Data stored in YOUR Supabase project (you control the instance)
- Row Level Security (RLS) ensures each user can only access their own data
- API keys (AI providers, broker credentials) are NEVER synced to cloud
- OAuth tokens (Gmail, broker) remain in browser sessionStorage — never leave the tab

### Agent Layer (Premium Add-on)

The optional proactive alerting agent is designed as a **read-only consumer**:

| Principle | Implementation |
|---|---|
| **Least privilege** | Agent can only READ portfolio data — no write access to any data store |
| **No credential access** | Browser-stored secrets (API keys, OAuth tokens, broker credentials) are inaccessible to the agent |
| **Data isolation** | Agent reads from Supabase with RLS-enforced filtering — cannot access other users' data |
| **No network exposure** | Agent gateway binds to localhost only — not exposed to the internet |
| **Channel restriction** | Messaging (Telegram/WhatsApp) restricted to an explicit allowlist of user IDs |
| **Prompt injection mitigation** | Data source is self-owned (your Supabase), no third-party writes; even if LLM is manipulated, no write-back path or credential access exists |

**What the agent CANNOT do:**
- Write, modify, or delete any portfolio data
- Access Gmail, broker, or AI provider credentials
- Read browser localStorage or sessionStorage
- Accept messages from unauthorized users
- Execute arbitrary code or install packages

---

## Acknowledgments

We appreciate responsible security researchers who help keep FinFolio safe. Contributors who report valid vulnerabilities will be acknowledged here (with permission).
