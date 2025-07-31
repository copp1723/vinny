# Vinny Agent - Enterprise VinSolutions Automation Platform

## 🚀 Overview

Vinny Agent is a powerful, production-ready automation platform for VinSolutions CRM and all Cox Automotive products. It combines advanced browser automation, AI vision capabilities, and enterprise-grade features to automate complex workflows across automotive dealership systems.

## ✨ Core Capabilities

### 1. **Automated DNC Compliance Processing**
- Logs into VinSolutions CRM (handles 2FA automatically!)
- Extracts 50,000+ customer records per dealership
- Checks phone numbers against Federal DNC Registry via PossibleNOW API
- Automatically marks DNC customers in the CRM
- Generates compliance reports

### 2. **Multi-Dealership Orchestration**
- Process multiple dealerships in parallel (configurable concurrency)
- Isolates failures so one dealership doesn't affect others
- Priority-based queuing (HIGH/MEDIUM/LOW)
- Scheduled execution (e.g., after-hours processing)

### 3. **Bulletproof Browser Automation**
- 7 checkbox detection strategies (ExtJS, anchor-based, AI vision)
- Virtual scrolling that forces all content to load
- AI Vision for analyzing interfaces and mapping checkboxes
- Coordinate-based clicking as ultimate fallback
- 5-tier clicking strategy for stubborn elements

### 4. **Enterprise Features**
- **Checkpoint/Resume**: Can recover from ANY failure point
- **Real-time Monitoring**: WebSocket dashboard with metrics
- **Security**: AES-256 encryption, RBAC, audit trails
- **Compliance Reporting**: PDF/Excel/HTML reports
- **Intelligent Alerts**: CPU, memory, error rates, API quotas

## 🎯 Unified VinSolutions Agent

The **UnifiedVinSolutionsAgent** is the crown jewel of this platform - a single, powerful agent that can accomplish ANY VinSolutions task in 3-5 clicks (configurable).

### Key Features:

#### 1. **Universal Cox Authentication**
- Works with ANY Cox product URL (VinSolutions, Dealer.com, Xtime, etc.)
- Smart SSO handling with minimal clicks
- AI-powered 2FA automation with webhook integration

#### 2. **Task Efficiency**
- Direct navigation to target URL (1 click)
- AI vision identifies elements (0 clicks)
- Execute primary action (1-2 clicks)
- Confirm/download (1 click)
- **Total: 3-4 clicks average!**

#### 3. **Flexible Task System**
- **Report Downloads**: Position-based selection (1st, 2nd, 3rd report)
- **Lead Activity**: Phone search and data extraction
- **DNC Checking**: Ready for integration
- **Custom Tasks**: Any selectors or navigation paths

#### 4. **AI Vision Integration**
- Login page analysis
- Task-specific element detection
- Coordinate-based fallbacks
- Screenshot debugging

### 📦 Quick Start

```bash
# Set up credentials
export COX_USERNAME="your-username"
export COX_PASSWORD="your-password"
export OTP_WEBHOOK_URL="https://your-webhook.com/otp" # Optional

# Download a report (3 clicks!)
npm run unified -- report \
  --url "https://vinsolutions.app.coxautoinc.com/vinconnect/reporting" \
  --position 1 \
  --email "manager@dealership.com"

# Check lead activity (4 clicks!)
npm run unified -- lead \
  --url "https://vinsolutions.app.coxautoinc.com/vinconnect/leads" \
  --phone "555-123-4567"

# Custom navigation (flexible)
npm run unified -- custom \
  --url "https://dealer.com/admin/inventory" \
  --selectors "#export-btn" \
  --max-clicks 3

# Test authentication
npm run unified -- test \
  --url "https://vinsolutions.app.coxautoinc.com"
```

### 🔧 Advanced Configuration

Create a `task-config.json`:

```json
{
  "target": {
    "url": "https://vinsolutions.app.coxautoinc.com/vinconnect/reporting",
    "taskType": "report",
    "parameters": {
      "reportPosition": 3
    }
  },
  "authentication": {
    "username": "from-env",
    "password": "from-env",
    "otpWebhookUrl": "https://webhook.site/your-id"
  },
  "capabilities": {
    "useVision": true,
    "maxClicks": 5,
    "screenshotDebug": true
  },
  "output": {
    "emailTo": ["gm@dealer.com", "controller@dealer.com"]
  }
}
```

Run with: `npm run unified -- run -c task-config.json`

## 💾 Session Persistence

The agent includes intelligent session management that dramatically reduces login time:

### Features:
1. **Automatic Session Save & Restore**
   - First run: Logs in normally and saves the session
   - Subsequent runs: Skips login entirely and restores from saved session
   - Session validation: Checks if the restored session is still valid

2. **Keep-Alive Mechanism**
   - Performs subtle mouse movements and scrolls every 5 minutes
   - Prevents session timeout during long-running operations
   - Automatically stops when the agent completes

3. **Session Management CLI**
   ```bash
   # List all saved sessions
   npm run unified -- session --list
   
   # Clear all saved sessions  
   npm run unified -- session --clear
   
   # Get info about a specific session
   npm run unified -- session --info "username_vinsolutions.app.coxautoinc.com"
   ```

4. **Configuration**
   ```bash
   # .env file
   USE_SESSION_PERSISTENCE=true      # Enable/disable
   SESSION_PATH=./sessions          # Storage directory
   SESSION_KEEP_ALIVE=true          # Enable keep-alive
   SESSION_KEEP_ALIVE_INTERVAL=300000  # 5 minutes
   SESSION_TIMEOUT=86400000         # 24 hours
   ```

### Performance Impact:
- **Without Session Persistence**: 1-2 minutes (login + 2FA)
- **With Session Persistence**: ~5 seconds (no login needed!)

## 🧪 Direct Report Testing

For testing specific report downloads directly:

```bash
# Run the direct test script
./test-direct.sh

# Or directly with TypeScript
npx ts-node test-direct-report.ts
```

This test:
1. Navigates directly to your specific report URL
2. Uses exact selectors (#lbl_ExportArrow, #lblExportPDF_rdPopupOptionItem)
3. Downloads the report to ./downloads/direct-report-test/
4. Takes screenshots at each step for debugging

## 📊 Performance Stats

- **50,000+ records** per dealership
- **500 records** per API batch
- **3 dealerships** concurrent (configurable)
- Full checkpoint/resume capability
- Memory-efficient streaming processing

## 🛡️ Security Features

1. **AI-Powered 2FA** - Extracts codes from emails automatically
2. **Session Persistence** - Maintains login across multi-hour operations
3. **Quarantine System** - Isolates problematic dealerships
4. **Formula Injection Prevention** - Protects against CSV attacks
5. **Processing Windows** - Respects dealership schedules
6. **Fuzzy Matching** - Finds customers even with typos

## 📁 Project Structure

```
vinny-agent/
├── src/
│   ├── agents/
│   │   ├── UnifiedVinSolutionsAgent.ts    # Main unified agent
│   │   ├── VinSolutionsAgent.ts          # Base agent
│   │   └── ...other specialized agents
│   ├── services/
│   │   ├── OpenRouterService.ts          # AI vision integration
│   │   ├── SessionPersistenceService.ts  # Session management
│   │   ├── PatternLearningService.ts     # UI pattern learning
│   │   └── ...other services
│   ├── cli/
│   │   └── unified-agent-cli.ts          # Command-line interface
│   └── examples/
│       └── unified-agent-examples.ts      # Usage examples
├── test-direct-report.ts                  # Direct report test
├── test-direct.sh                         # Test runner script
└── task-config.json                       # Task configuration
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run Your First Task**
   ```bash
   npm run unified -- test --url "https://vinsolutions.app.coxautoinc.com"
   ```

## 📝 Monthly Compliance Run Example

```bash
node dist/src/workflows/dnc-compliance-workflow/cli.js run -c config.json --headless
```

This single command:
1. Processes ALL configured dealerships
2. Extracts customer data from last 30 days
3. Checks every phone number for DNC status
4. Updates CRM records automatically
5. Generates compliance reports
6. Sends notifications

## 🎯 What Makes This Special

1. **Single Agent, Any Task** - No more multiple scripts or agents
2. **Target URL Driven** - Just provide the URL, it figures out the rest
3. **Minimal Clicks** - Enforced efficiency with click counting
4. **AI Vision Fallback** - When selectors fail, AI takes over
5. **Universal Cox Auth** - Works across all Cox Automotive products
6. **Production Ready** - Error handling, retries, logging, screenshots

With the enhanced checkbox detection and AI vision capabilities, this is now a serious enterprise tool that can save dealerships from massive TCPA compliance fines while automating complex workflows across their entire Cox Automotive stack!