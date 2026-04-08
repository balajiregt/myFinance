# Terms of Service

**FinFolio — Indian Portfolio Tracker**
Last updated: 2026-03-28

---

## 1. Acceptance of Terms

By using FinFolio, you agree to these Terms of Service. If you do not agree, do not use the application.

FinFolio is open-source software distributed under the [MIT License](../LICENSE). These terms apply to any hosted or self-hosted deployments of the application.

---

## 2. Description of Service

FinFolio is a self-hosted portfolio tracking application that allows users to:
- Track investments across multiple asset classes (Mutual Funds, FDs, RDs, SGB, Stocks, Gold, Post Office schemes)
- Plan budgets and track expenses via Gmail bank alert parsing
- Access AI-powered portfolio analysis using third-party AI providers
- Optionally sync data to cloud services (Supabase)

---

## 3. Not Financial Advice

**FinFolio does not provide financial, investment, tax, or legal advice.**

- All information displayed is for **informational purposes only**
- AI-generated analyses are produced by third-party language models and may contain inaccuracies, hallucinations, or outdated information
- Market data, NAVs, gold prices, and index values are fetched from third-party APIs and may be delayed, inaccurate, or unavailable
- You are solely responsible for verifying all data with official sources before making any financial decisions
- The developers, contributors, and maintainers of FinFolio are not registered financial advisors, brokers, or tax consultants

---

## 4. User Responsibilities

By using FinFolio, you agree that:

- **You own your data.** All portfolio data is stored in your browser or your own cloud instances. You are responsible for backing up your data
- **You provide your own API keys.** AI provider keys, broker credentials, and Gmail OAuth access are your own. You are responsible for securing them
- **You configure your own security.** If you enable Supabase cloud sync, you are responsible for configuring Row Level Security (RLS) policies correctly
- **You control Gmail access.** When connecting Gmail, you grant read-only access to your own email account. You can revoke this at any time
- **You verify market data independently.** Do not rely solely on FinFolio for time-sensitive financial decisions
- **You comply with applicable laws.** Use FinFolio in compliance with your local laws regarding financial data, tax reporting, and data privacy

---

## 5. Third-Party Services

FinFolio integrates with third-party services. Each has their own terms:

| Service | Their Terms |
|---|---|
| Google Gmail API | [Google API Terms](https://developers.google.com/terms) |
| Google Gemini AI | [Google AI Terms](https://ai.google.dev/terms) |
| Anthropic Claude | [Anthropic Usage Policy](https://www.anthropic.com/policies) |
| OpenAI | [OpenAI Terms](https://openai.com/policies) |
| OpenRouter | [OpenRouter Terms](https://openrouter.ai/terms) |
| Supabase | [Supabase Terms](https://supabase.com/terms) |
| Netlify | [Netlify Terms](https://www.netlify.com/legal/terms-of-use/) |
| HDFC Securities API | [HDFC Developer Terms](https://developer.hdfcsec.com) |
| Finnhub | [Finnhub Terms](https://finnhub.io/terms-of-service) |

You are responsible for complying with each service's terms when using their APIs through FinFolio.

---

## 6. Data and Privacy

- FinFolio stores all data locally in your browser by default
- Cloud sync (Supabase, Netlify) is optional and user-initiated
- No data is collected, tracked, or shared by the developers
- See our [Privacy Policy](PRIVACY-POLICY.md) for full details

---

## 7. Intellectual Property

- FinFolio is open-source software licensed under the [MIT License](../LICENSE)
- You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software
- The MIT License requires that the copyright notice and permission notice are included in all copies
- "FinFolio" as a name is used to identify this project and is not a registered trademark

---

## 8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

- THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED
- THE DEVELOPERS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING FROM THE USE OF THIS SOFTWARE
- THIS INCLUDES BUT IS NOT LIMITED TO: FINANCIAL LOSSES, DATA LOSS, INVESTMENT LOSSES, LOSS OF PROFITS, BUSINESS INTERRUPTION, OR ANY OTHER PECUNIARY LOSS
- THE DEVELOPERS ARE NOT LIABLE FOR ANY ERRORS, INACCURACIES, OR OMISSIONS IN MARKET DATA, AI ANALYSES, OR TRANSACTION PARSING
- THE DEVELOPERS ARE NOT LIABLE FOR UNAUTHORIZED ACCESS TO YOUR DATA DUE TO MISCONFIGURED SECURITY SETTINGS, LEAKED API KEYS, OR COMPROMISED THIRD-PARTY SERVICES

---

## 9. Indemnification

You agree to indemnify and hold harmless the developers, contributors, and maintainers of FinFolio from any claims, damages, losses, or expenses arising from:
- Your use of the application
- Your violation of these terms
- Your violation of any third-party rights
- Your misconfiguration of security settings or API credentials
- Any financial decisions made based on information displayed by the application

---

## 10. Service Availability

- FinFolio is self-hosted software. Availability depends on your hosting provider (Netlify, Vercel, or local)
- Third-party APIs may change, rate-limit, or discontinue service without notice
- The developers do not guarantee uptime, availability, or continued maintenance of the software
- The developers may update, modify, or discontinue the project at any time

---

## 11. Modifications to Terms

These terms may be updated when significant changes are made to the application. Changes will be reflected in the "Last updated" date. For self-hosted instances, you control when to update.

---

## 12. Governing Law

These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.

---

## 13. Contact

For questions about these terms:
- Open an issue at [github.com/balajiregt/myFinance](https://github.com/balajiregt/myFinance/issues)
- Or contact the repository owner directly via GitHub
