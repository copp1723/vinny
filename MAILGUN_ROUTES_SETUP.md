# Mailgun Routes Setup for AI Agent 2FA

## Overview
This guide shows you how to set up Mailgun receiving routes so your AI agent can automatically receive and process 2FA codes from VinSolutions and other platforms.

**Email Configuration:**
- **FROM (Sending):** `vinny@universalsync.ai` (AI agent sends reports from this address)
- **TO (Receiving):** `vendora@universalsync.ai` (AI agent receives 2FA codes at this address)

## Route Configuration

### Route 1: VinSolutions 2FA Codes
**Purpose:** Capture 2FA codes from VinSolutions
**Priority:** 10 (highest)

**Expression:**
```
match_recipient("vendora@universalsync.ai") and match_header("from", ".*vinsolutions.*|.*coxautoinc.*")
```

**Actions:**
```
forward("https://your-webhook-url.com/webhook/2fa")
store()
```

### Route 2: General Business Platform 2FA
**Purpose:** Capture 2FA codes from other business platforms
**Priority:** 20

**Expression:**
```
match_recipient("vendora@universalsync.ai") and (match_header("subject", ".*verification.*|.*code.*|.*authenticate.*|.*2FA.*|.*two.factor.*") or match_header("from", ".*noreply.*|.*no-reply.*|.*security.*"))
```

**Actions:**
```
forward("https://your-webhook-url.com/webhook/2fa")
store()
```

### Route 3: Catch-All for AI Agent
**Purpose:** Catch any other emails sent to the AI agent
**Priority:** 30

**Expression:**
```
match_recipient("vendora@universalsync.ai")
```

**Actions:**
```
forward("https://your-webhook-url.com/webhook/general")
store()
```

## Step-by-Step Setup

### 1. Create the Routes in Mailgun

Click "Create Route" and enter each route with these exact settings:

#### Route 1 Settings:
- **Priority:** 10
- **Expression:** `match_recipient("vendora@universalsync.ai") and match_header("from", ".*vinsolutions.*|.*coxautoinc.*")`
- **Actions:** 
  - ✅ Forward to URL: `https://your-webhook-url.com/webhook/2fa`
  - ✅ Store message
- **Description:** VinSolutions 2FA Code Handler

#### Route 2 Settings:
- **Priority:** 20  
- **Expression:** `match_recipient("vendora@universalsync.ai") and (match_header("subject", ".*verification.*|.*code.*|.*authenticate.*|.*2FA.*|.*two.factor.*") or match_header("from", ".*noreply.*|.*no-reply.*|.*security.*"))`
- **Actions:**
  - ✅ Forward to URL: `https://your-webhook-url.com/webhook/2fa`
  - ✅ Store message
- **Description:** General Business Platform 2FA Handler

#### Route 3 Settings:
- **Priority:** 30
- **Expression:** `match_recipient("vendora@universalsync.ai")`
- **Actions:**
  - ✅ Forward to URL: `https://your-webhook-url.com/webhook/general`
  - ✅ Store message
- **Description:** AI Agent Catch-All

### 2. Webhook URL Options

You have several options for the webhook URL:

#### Option A: Use a Service (Recommended for Testing)
- **Webhook.site:** `https://webhook.site/your-unique-id`
- **RequestBin:** `https://requestbin.com/your-bin`
- **ngrok:** `https://your-tunnel.ngrok.io/webhook/2fa`

#### Option B: Deploy Our Webhook Handler
I'll create a simple webhook handler you can deploy to:
- **Vercel/Netlify:** Free hosting for webhook endpoints
- **Railway/Render:** Simple deployment platforms
- **Your own server:** If you have hosting

### 3. Test Email Address Setup

#### Update VinSolutions Account:
1. Log into VinSolutions
2. Go to Account Settings → Security
3. Change 2FA email from `rylie1234@gmail.com` to `vendora@universalsync.ai`
4. Verify the email address

#### Benefits of Dedicated Email:
- ✅ **Clean separation** - Only 2FA codes, no noise
- ✅ **Better parsing** - Easier to extract codes
- ✅ **Professional** - Dedicated AI agent email
- ✅ **Scalable** - Works for all platforms

## Updated Environment Variables

Update your `.env` file with the correct email addresses:

```bash
# Mailgun Configuration (for sending reports)
MAILGUN_API_KEY=YOUR_MAILGUN_API_KEY
MAILGUN_DOMAIN=universalsync.ai
MAILGUN_FROM_EMAIL=vinny@universalsync.ai

# AI Agent Receiving Email (for 2FA codes)
AI_AGENT_EMAIL=vendora@universalsync.ai

# Report Recipients (where to send extracted reports)
EMAIL_RECIPIENTS=rylie1234@gmail.com,vendora@universalsync.ai
```

## Webhook Payload Structure

When Mailgun forwards emails to `vendora@universalsync.ai`, you'll receive:

```json
{
  "timestamp": "1578002400",
  "token": "verification-token",
  "signature": "signature-hash",
  "recipient": "vendora@universalsync.ai",
  "sender": "noreply@vinsolutions.com",
  "subject": "Your VinSolutions verification code",
  "body-plain": "Your verification code is: 123456",
  "body-html": "<html>Your verification code is: <strong>123456</strong></html>",
  "stripped-text": "Your verification code is: 123456",
  "message-headers": "[[\"From\", \"noreply@vinsolutions.com\"], [\"Subject\", \"Your VinSolutions verification code\"]]"
}
```

## Email Flow Summary

1. **VinSolutions** sends 2FA code → `vendora@universalsync.ai`
2. **Mailgun route** catches the email → forwards to webhook
3. **Webhook handler** extracts the code → stores for AI agent
4. **AI agent** retrieves code → completes login
5. **AI agent** downloads report → emails via `vinny@universalsync.ai`
6. **You receive** professional report at `rylie1234@gmail.com`

## Next Steps

1. **Create the 3 routes** in Mailgun using `vendora@universalsync.ai`
2. **Choose webhook URL** (start with webhook.site for testing)
3. **Update VinSolutions** 2FA email to `vendora@universalsync.ai`
4. **Test the setup** by triggering a 2FA code
5. **Deploy webhook handler** for production use

Would you like me to create the webhook handler code that processes emails sent to `vendora@universalsync.ai`?

