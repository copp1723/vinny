# Unified VinSolutions Agent - User Guide

## Overview

The Unified VinSolutions Agent is a powerful AI-driven automation tool that can execute ANY VinSolutions (or Cox Automotive) task with minimal clicks (3-5 max). It uses advanced AI vision, session management, and intelligent navigation to accomplish complex workflows efficiently.

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Credential Configuration](#credential-configuration)
3. [Available Commands](#available-commands)
4. [Task Types](#task-types)
5. [Common Use Cases](#common-use-cases)
6. [Configuration Files](#configuration-files)
7. [Session Management](#session-management)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Setup & Installation

### Prerequisites
- Node.js 16+ installed
- Access to VinSolutions or other Cox Automotive platforms

### Installation Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd vinny-agent
   npm install
   npx playwright install chromium
   ```

2. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```bash
   # Required Credentials
   COX_USERNAME=your-username
   COX_PASSWORD=your-password
   
   # Optional Features
   OPENROUTER_API_KEY=your-openrouter-key  # For AI vision
   OTP_WEBHOOK_URL=https://your-webhook.com/otp  # For 2FA automation
   
   # Email Integration (Optional)
   MAILGUN_API_KEY=your-mailgun-key
   MAILGUN_DOMAIN=your-domain.com
   MAILGUN_FROM_EMAIL=reports@your-domain.com
   
   # Session Management (Optional)
   USE_SESSION_PERSISTENCE=true
   SESSION_PATH=./sessions
   SESSION_KEEP_ALIVE=true
   SESSION_TIMEOUT=86400000  # 24 hours
   ```

## Credential Configuration

### Environment Variables vs Command Line

The agent supports multiple ways to provide credentials:

1. **Environment Variables** (Recommended)
   ```bash
   COX_USERNAME=your-username
   COX_PASSWORD=your-password
   ```

2. **Legacy VinSolutions Variables**
   ```bash
   VINSOLUTIONS_USERNAME=your-username
   VINSOLUTIONS_PASSWORD=your-password
   ```

3. **JSON Configuration Files** (See Configuration Files section)

### 2FA Setup

For automated 2FA handling, set up a webhook endpoint:

```bash
OTP_WEBHOOK_URL=https://your-webhook.com/otp
```

The webhook should return JSON: `{"code": "123456"}`

## Available Commands

### 1. Report Download
```bash
npm run unified report --url "https://vinsolutions.app.coxautoinc.com/reporting" --position 1
```

**Options:**
- `--url <url>` - Target reporting URL (required)
- `--position <number>` - Report position (1st, 2nd, 3rd) [default: 1]
- `--email <emails...>` - Email addresses to send report to
- `--no-vision` - Disable AI vision capabilities
- `--debug` - Enable screenshot debugging

### 2. Lead Activity Check
```bash
npm run unified lead --url "https://vinsolutions.app.coxautoinc.com/leads" --phone "555-123-4567"
```

**Options:**
- `--url <url>` - Target leads URL (required)
- `--phone <phone>` - Lead phone number (required)
- `--no-vision` - Disable AI vision capabilities
- `--debug` - Enable screenshot debugging

### 3. Custom Automation
```bash
npm run unified custom --url "https://any-cox-url.com" --selectors "button:has-text('Export')" "#data-grid"
```

**Options:**
- `--url <url>` - Target URL (required)
- `--selectors <selectors...>` - CSS selectors to interact with (required)
- `--max-clicks <number>` - Maximum clicks allowed [default: 5]
- `--no-vision` - Disable AI vision capabilities
- `--debug` - Enable screenshot debugging

### 4. Run from Configuration File
```bash
npm run unified run --config ./configs/monthly-report.json
```

### 5. Test Authentication
```bash
npm run unified test --url "https://vinsolutions.app.coxautoinc.com"
```

### 6. Session Management
```bash
# List saved sessions
npm run unified session --list

# Clear all sessions
npm run unified session --clear

# Show session info
npm run unified session --info "username_hostname"
```

## Task Types

### 1. Report Downloads (`report`)

**Purpose:** Download reports from VinSolutions reporting pages

**Configuration:**
```typescript
{
  target: {
    taskType: 'report',
    parameters: {
      reportPosition: 1,  // 1st, 2nd, 3rd report
      dateRange: 'last-month'  // Optional filter
    }
  }
}
```

**Expected Clicks:** 2-3 clicks total

### 2. Lead Activity (`lead-activity`)

**Purpose:** Search for and extract lead activity information

**Configuration:**
```typescript
{
  target: {
    taskType: 'lead-activity',
    parameters: {
      leadPhone: '555-123-4567'
    }
  }
}
```

**Expected Clicks:** 3-4 clicks total

### 3. DNC Check (`dnc-check`)

**Purpose:** Check Do Not Call compliance (placeholder - to be implemented)

### 4. Custom Tasks (`custom`)

**Purpose:** Execute any custom automation workflow

**Configuration:**
```typescript
{
  target: {
    taskType: 'custom',
    parameters: {
      customSelectors: ['button:has-text("Add")', 'input[name="vin"]']
    }
  }
}
```

**Expected Clicks:** Based on selectors provided

## Common Use Cases

### Daily Report Download

```bash
# Download today's lead source report
npm run unified report \
  --url "https://vinsolutions.app.coxautoinc.com/reporting/favorites" \
  --position 1 \
  --email "manager@dealership.com" \
  --debug
```

### Lead Lookup

```bash
# Check activity for a specific lead
npm run unified lead \
  --url "https://vinsolutions.app.coxautoinc.com/leads" \
  --phone "555-123-4567"
```

### Inventory Export

```bash
# Export inventory data
npm run unified custom \
  --url "https://vinsolutions.app.coxautoinc.com/inventory" \
  --selectors "button:has-text('Export')" ".confirm-button"
```

### Multi-Platform Automation

```bash
# Works with any Cox product!
npm run unified custom \
  --url "https://dealer.com/admin/reports" \
  --selectors "#export-btn"
```

## Configuration Files

### Creating JSON Configurations

Create reusable task configurations:

**monthly-report.json:**
```json
{
  "target": {
    "url": "https://vinsolutions.app.coxautoinc.com/reporting",
    "taskType": "report",
    "parameters": {
      "reportPosition": 3,
      "dateRange": "last-month"
    }
  },
  "authentication": {
    "otpWebhookUrl": "https://your-webhook.com/otp"
  },
  "capabilities": {
    "useVision": true,
    "maxClicks": 5,
    "screenshotDebug": true,
    "strategies": ["position", "vision", "direct"]
  },
  "output": {
    "downloadPath": "./monthly-reports",
    "emailTo": ["gm@dealership.com", "controller@dealership.com"],
    "webhookUrl": "https://dealership.com/webhook/report-ready"
  }
}
```

**Run with:**
```bash
npm run unified run --config monthly-report.json
```

## Session Management

The agent automatically manages browser sessions to avoid repeated logins:

### Features
- **Automatic Session Saving** - Saves cookies, localStorage, sessionStorage
- **Session Restoration** - Restores previous sessions on subsequent runs
- **Keep-Alive** - Maintains active sessions with subtle interactions
- **Session Validation** - Verifies session validity before use
- **Automatic Cleanup** - Removes expired sessions

### Session Commands

```bash
# List all saved sessions
npm run unified session --list

# Clear all sessions (force fresh login)
npm run unified session --clear

# Show session age and info
npm run unified session --info "username_vinsolutions.app.coxautoinc.com"
```

### Session Configuration

```bash
# Environment variables
USE_SESSION_PERSISTENCE=true  # Enable/disable sessions
SESSION_PATH=./sessions       # Where to store sessions
SESSION_KEEP_ALIVE=true       # Keep sessions active
SESSION_TIMEOUT=86400000      # 24 hours in milliseconds
```

## Troubleshooting

### Common Issues

#### 1. Missing Credentials Error
```
❌ Missing credentials! Set COX_USERNAME and COX_PASSWORD environment variables.
```

**Solution:** Create `.env` file with your credentials:
```bash
COX_USERNAME=your-username
COX_PASSWORD=your-password
```

#### 2. 2FA Required
```
🔐 2FA required - waiting for manual completion or webhook...
```

**Solutions:**
- **Manual:** Complete 2FA in the browser window
- **Automated:** Set up OTP webhook: `OTP_WEBHOOK_URL=https://your-webhook.com/otp`

#### 3. Click Limit Reached
```
⚠️ Click limit reached (5/5 clicks used)
```

**Solutions:**
- Increase limit: `--max-clicks 10`
- Optimize selectors for fewer clicks
- Enable AI vision: Remove `--no-vision` flag

#### 4. Session Restoration Failed
```
⚠️ Restored session is invalid - proceeding with fresh login
```

**This is normal** - expired sessions are automatically cleaned up.

#### 5. Download Failed
```
❌ Report download failed: Element not found
```

**Solutions:**
- Check report position: `--position 2` instead of `--position 1`
- Enable debug screenshots: `--debug`
- Try AI vision: Remove `--no-vision`

### Debug Mode

Always use `--debug` when troubleshooting:

```bash
npm run unified report --url "..." --debug
```

This creates screenshots at each step in the `screenshots/` folder.

### Log Files

Check log files for detailed information:
- `./logs/vinny-agent.log` - Main log file
- `./logs/error.log` - Error-only log

## Best Practices

### 1. Security
- ✅ Use environment variables for credentials
- ✅ Never commit credentials to version control
- ✅ Rotate passwords regularly
- ✅ Use restricted service accounts when possible

### 2. Reliability
- ✅ Enable AI vision for better element detection
- ✅ Use position-based selection for reports (more reliable than names)
- ✅ Set reasonable click limits (3-5 for most tasks)
- ✅ Enable session persistence to reduce login frequency

### 3. Monitoring
- ✅ Enable debug screenshots for troubleshooting
- ✅ Set up email notifications for completed tasks
- ✅ Use webhooks for integration with other systems
- ✅ Monitor log files for errors

### 4. Performance
- ✅ Reuse sessions when possible
- ✅ Use specific URLs (not generic dashboard URLs)
- ✅ Keep custom selector lists minimal
- ✅ Clean up old sessions and downloads periodically

### 5. Maintenance
- ✅ Test configurations regularly
- ✅ Update selectors if UI changes
- ✅ Monitor success rates and adjust strategies
- ✅ Keep dependencies updated

## Advanced Features

### Multi-Strategy Execution

Configure fallback strategies:

```json
{
  "capabilities": {
    "strategies": ["position", "vision", "direct"]
  }
}
```

1. **Position** - Use nth-child selectors
2. **Vision** - Use AI to identify elements
3. **Direct** - Use CSS selectors

### Email Integration

Automatically email reports:

```bash
npm run unified report \
  --url "..." \
  --email "manager@dealership.com" "controller@dealership.com"
```

### Webhook Integration

Get notified when tasks complete:

```json
{
  "output": {
    "webhookUrl": "https://your-system.com/webhook/task-complete"
  }
}
```

The webhook receives the complete task result as JSON.

## Support & Resources

### Getting Help
1. Check this guide first
2. Enable `--debug` mode for screenshots
3. Check log files in `./logs/`
4. Review configuration examples
5. Test with `npm run unified test`

### Example Configurations
See `src/examples/unified-agent-examples.ts` for comprehensive examples.

### API Reference
See `DEVELOPER_GUIDE.md` for technical details and extension information.