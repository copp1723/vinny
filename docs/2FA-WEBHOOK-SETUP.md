# Vinny-Agent 2-FA Webhook Setup Guide

This document explains how to switch the VinSolutions demo from **simulated 2-FA** (hard-coded `123456`) to **real 2-FA** by capturing the verification code that VinSolutions emails to you and delivering it to the running Playwright agent.

---

## 1. Simulated vs Real 2-FA

| Mode | What Happens | When to Use |
|------|--------------|-------------|
| **Simulated** | Agent autotypes `123456` after a 5 s pause. No network calls. | Local UI demos, CI pipelines without external mail flow. |
| **Real (webhook)** | VinSolutions → sends email → Mailgun → HTTP POST `/webhook/2fa` → webhook extracts code → agent polls `/api/code/latest` and types real code. | Production, staging or any time MFA must actually succeed. |

You enable real mode simply by starting the webhook server and exporting `WEBHOOK_URL` in your `.env`.

---

## 2. Prerequisites

1. **Mailgun account** with a verified domain that receives your VinSolutions MFA email.
2. **Node ≥ 18** installed locally or on the server that will run the webhook.
3. **vinny-agent repository** cloned (`git clone …`) and dependencies installed (`pnpm i` or `npm i`).
4. Outbound port **3000** (or custom) reachable from Mailgun (public IP / tunnel).
5. `WEBHOOK_URL` environment variable pointing to the public URL of the webhook server.

Optional but handy: **ngrok** or **cloudflared tunnel** if you cannot expose port 3000 directly.

---

## 3. Step-by-Step – Webhook Server Setup

```bash
# 1. Navigate to the webhook handler package
cd webhook-handler

# 2. Install dependencies
pnpm i        # or npm install

# 3. Copy and edit environment variables
cp .env.example .env
# open .env in your editor and set:
# MAILGUN_API_KEY=key-xxxx
# OPENROUTER_API_KEY= (optional – only used for LLM-based extraction)
# ALLOWED_ORIGINS=http://localhost:5173 (if you have a UI)
# CODE_EXPIRATION_MINUTES=10 (default)
# WEBHOOK_PORT=3000 (change if you need)

# 4. Start the server (dev mode, hot reload)
pnpm dev       # or npm run dev
# The server listens on http://localhost:3000

# 5. Verify
curl http://localhost:3000/health
# ➜ { "status":"healthy", … }
```

If you prefer a production build:

```bash
pnpm build && pnpm start
```

> **Tip:** Keep the process alive with a supervisor such as pm2 or systemd on production hosts.

---

## 4. Mailgun Route Configuration

1. **Login to Mailgun → Receiving → Routes → Create Route**  
2. **Filter expression**  
   *Recipient* `match_recipient(".*@yourdomain.com")`
3. **Actions** (in order)  
   1. **Forward** → `https://YOUR_PUBLIC_HOST/webhook/2fa`  
   2. (Optional) **Store and Notify** → your email for backup  
4. **Description**: “Vinny Agent 2-FA Forwarder”
5. **Priority**: lower number < other rules (e.g. 1)
6. **Signing**: Keep “DKIM verification” on. The webhook verifier will check signatures in production.

After saving, click **“Test Webhook”** in Mailgun to send a sample. You should see a log entry in the webhook terminal.

---

## 5. Running the Demo with Real 2-FA

```bash
# root of repo
cp .env.example .env              # if you haven’t yet
nano .env
#   ─ add WEBHOOK_URL pointing to the public address
#     e.g. WEBHOOK_URL=https://vinny-ngrok.ngrok.app
#   ─ ensure VINSOLUTIONS_* credentials are present
#   ─ ensure MAILGUN_* values match the route domain

# start the webhook if not already (separate terminal)
cd webhook-handler && pnpm dev

# run the demo
npx ts-node run-demo-test.ts
```

What you should see:

1. Playwright opens VinSolutions, selects **Email** MFA method.  
2. Webhook terminal logs **“Received webhook”** within ~10 s.  
3. Agent polls `GET /api/code/latest`, receives the code, types it, presses **Verify**.  
4. Workflow proceeds to download the report and email it.

---

## 6. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Agent times out waiting for code | Mailgun route mis-configured, webhook URL wrong, tunnel offline. | Re-check Route action URL. Hit `/health` from internet. |
| `401 Invalid signature` in webhook | `MAILGUN_API_KEY` incorrect. | Paste the private API key from Mailgun dashboard. |
| Webhook receives email but `confidence < 0.7` | Email template changed. | Adjust regex in `CodeExtractor` or lower `minConfidence` query parameter. |
| CORS error when using UI | Add origin to `ALLOWED_ORIGINS` in `.env` inside webhook-handler. |
| Multiple codes stored, wrong one used | Increase `CODE_EXPIRATION_MINUTES` or include `platform=vinsolutions` param when polling. |
| Port conflict on 3000 | Change `WEBHOOK_PORT` in `.env` and expose the new port. Remember to update `WEBHOOK_URL`. |

---

## 7. Architecture Overview

```
┌────────┐ 1.Email  ┌───────────────┐ 2.Webhook  ┌──────────┐ 3.Poll  ┌──────────┐
│VinSol. │──────────▶│ Mailgun Route │────────────▶│Webhook   │─────────▶│Playwright│
│ MFA    │           │ (forward)     │            │Handler    │ Code API │  Agent   │
└────────┘           └───────────────┘            └──────────┘          └──────────┘
                                 │                                        │
                                 └── stores code in memory (CodeStore) ◀──┘
```

1. **VinSolutions** sends an email containing the verification code.  
2. **Mailgun Route** forwards the raw MIME to `/webhook/2fa` via HTTPS POST.  
3. **Webhook Handler** (`webhook-handler/src/server.ts`)  
   * Validates signature (prod)  
   * Uses `CodeExtractor` to find the code with regex/LLM  
   * Stores it in an in-memory `CodeStore` with TTL (default 10 min)  
   * Exposes REST endpoints:  
     * `GET /api/code/latest?platform=vinsolutions`  
     * `POST /api/code/:id/use` (mark consumed)  
4. **Playwright Agent** polls `/api/code/latest` every 5 s. On success it:  
   * Fills the code field  
   * Marks the code as used  
   * Continues the automated workflow.

This decoupled design means the agent never needs direct IMAP access and can run from any network that can reach the webhook URL.

---

Happy automating!  
For questions ping Josh or open an issue in the GitHub repo.  
