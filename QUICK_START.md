# Quick Start Guide - Unified VinSolutions Agent

## Get Started in 5 Minutes

This guide will get you downloading VinSolutions reports in under 5 minutes!

## Step 1: Install (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd vinny-agent

# Install dependencies
npm install

# Install browser
npx playwright install chromium
```

## Step 2: Set Credentials (1 minute)

Create a `.env` file in the root directory:

```bash
# Your VinSolutions credentials
COX_USERNAME=your-username
COX_PASSWORD=your-password

# Optional: Enable AI vision for better reliability
OPENROUTER_API_KEY=your-openrouter-key
```

## Step 3: Test Connection (1 minute)

```bash
# Test your credentials and connection
npm run unified test --url "https://vinsolutions.app.coxautoinc.com"
```

You should see:
```
🧪 Testing VinSolutions authentication...
✅ Task completed successfully!
📸 Screenshots: 3 saved
```

## Step 4: Download Your First Report (1 minute)

```bash
# Download the 1st report from your favorites
npm run unified report \
  --url "https://vinsolutions.app.coxautoinc.com/reporting/favorites" \
  --position 1
```

**That's it!** Your report will be downloaded to the `./downloads` folder.

## Understanding the Output

When successful, you'll see:
```
🚀 Unified VinSolutions Agent

📍 Target URL: https://vinsolutions.app.coxautoinc.com/reporting/favorites
🎯 Task Type: report
🤖 AI Vision: Enabled
🎮 Max Clicks: 5
👤 Username: your-username

⏳ Executing task...

✅ Task completed successfully!
⏱️  Duration: 15234ms
🖱️  Clicks used: 3 / 5
📄 File saved: ./downloads/lead-source-roi-2024.csv
🎯 Efficiency Score: 40% (lower clicks = better)
```

## What Just Happened?

The agent:
1. **Opened a browser** and navigated to VinSolutions
2. **Logged in automatically** using your credentials
3. **Found the 1st report** on your favorites page
4. **Downloaded it** to the downloads folder
5. **Used only 3 clicks** - super efficient!

## Next Steps

### Try Different Commands

```bash
# Download 2nd report and email it
npm run unified report \
  --url "https://vinsolutions.app.coxautoinc.com/reporting" \
  --position 2 \
  --email "manager@dealership.com"

# Look up lead activity
npm run unified lead \
  --url "https://vinsolutions.app.coxautoinc.com/leads" \
  --phone "555-123-4567"

# Custom automation (works with ANY Cox product!)
npm run unified custom \
  --url "https://dealer.com/admin/inventory" \
  --selectors "#export-button"
```

### Enable Debug Mode

Add `--debug` to any command to see screenshots:

```bash
npm run unified report --url "..." --debug
```

Screenshots will be saved to the `screenshots/` folder.

### Manage Sessions

The agent remembers your login:

```bash
# See saved sessions
npm run unified session --list

# Clear sessions (force fresh login)
npm run unified session --clear
```

## Common First-Time Issues

### ❌ "Missing credentials" Error

**Problem:** No `.env` file or wrong variable names

**Solution:** Create `.env` file with:
```bash
COX_USERNAME=your-actual-username
COX_PASSWORD=your-actual-password
```

### ❌ "2FA Required" Message

**Problem:** Your account has 2FA enabled

**Solutions:**
1. **Manual:** Complete 2FA in the browser window that opens
2. **Automated:** Set up webhook for automatic 2FA handling

### ❌ "Report download failed"

**Problem:** Wrong report position or page structure changed

**Solutions:**
1. Try different position: `--position 2` or `--position 3`
2. Enable debug mode: `--debug` to see screenshots
3. Check the actual URL matches your VinSolutions setup

## Pro Tips for Success

### 🎯 Use Position-Based Selection
Instead of relying on report names (which change), use positions:
```bash
# Always download the 1st report (most reliable)
--position 1
```

### 🤖 Enable AI Vision
For maximum reliability, get an OpenRouter API key:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxx
```

### 📸 Debug with Screenshots
When in doubt, add `--debug`:
```bash
npm run unified report --url "..." --debug
```

### 🔄 Let Sessions Save Time
The agent remembers your login, so subsequent runs are faster.

## What Makes This Different?

### Traditional Automation
- ❌ Fragile selectors that break with UI changes
- ❌ Complex setup and configuration
- ❌ No intelligence - just blind clicking
- ❌ High maintenance overhead

### Unified VinSolutions Agent
- ✅ **AI Vision** - Adapts to UI changes automatically
- ✅ **3-5 Click Maximum** - Enforced efficiency
- ✅ **Universal Cox SSO** - Works with ANY Cox product
- ✅ **Session Management** - Remembers your login
- ✅ **Position-Based Selection** - Reliable even when names change

## Real-World Usage Examples

### Daily Morning Routine
```bash
# Download lead source report every morning
npm run unified report \
  --url "https://vinsolutions.app.coxautoinc.com/reporting/favorites" \
  --position 1 \
  --email "manager@dealership.com"
```

### Customer Service
```bash
# Quick lead lookup during phone calls
npm run unified lead \
  --url "https://vinsolutions.app.coxautoinc.com/leads" \
  --phone "customer-phone-number"
```

### Inventory Management
```bash
# Export inventory data to Excel
npm run unified custom \
  --url "https://vinsolutions.app.coxautoinc.com/inventory" \
  --selectors "button:has-text('Export')" ".xlsx-option"
```

## Getting Help

1. **Read the error message** - they're designed to be helpful
2. **Enable debug mode** - `--debug` shows you exactly what's happening
3. **Check the logs** - `./logs/vinny-agent.log` has detailed information
4. **Test your connection** - `npm run unified test --url "..."`
5. **Try different positions** - Reports might be in position 2 or 3

## Next: Read the Full User Guide

This quick start covers the basics. For advanced features, troubleshooting, and configuration options, see:

- **USER_GUIDE.md** - Comprehensive user documentation
- **DEVELOPER_GUIDE.md** - Technical details and customization
- **src/examples/** - More example configurations

**Happy automating!** 🚀