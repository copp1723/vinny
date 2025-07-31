# Troubleshooting Guide

## Table of Contents
- [Common Issues](#common-issues)
- [Authentication Problems](#authentication-problems)
- [Download Issues](#download-issues)
- [Vision/AI Problems](#visionai-problems)
- [Session Management](#session-management)
- [Performance Issues](#performance-issues)
- [Debug Mode](#debug-mode)
- [Platform-Specific Issues](#platform-specific-issues)
- [Error Reference](#error-reference)

## Common Issues

### TypeScript Compilation Errors

**Problem:** TypeScript compilation fails with errors

**Solution:**
```bash
# Clean and rebuild
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version

# If errors persist, try:
npm install --save-dev typescript@latest
```

### Missing Dependencies

**Problem:** Module not found errors

**Solution:**
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

# For specific missing modules:
npm install <module-name>
```

### Browser Not Installed

**Problem:** Playwright browser not found

**Solution:**
```bash
# Install Chromium for Playwright
npx playwright install chromium

# Or install all browsers
npx playwright install
```

## Authentication Problems

### Login Fails

**Problem:** Authentication fails at Cox SSO

**Possible Causes:**
1. Invalid credentials
2. Account locked
3. 2FA not configured

**Solutions:**

1. **Verify Credentials:**
   ```bash
   # Test credentials manually
   npm run unified test --url https://signin.coxautoinc.com
   ```

2. **Check Environment Variables:**
   ```bash
   # Verify .env file
   cat .env | grep COX_
   
   # Should see:
   # COX_USERNAME=your-username
   # COX_PASSWORD=your-password
   ```

3. **Enable Debug Mode:**
   ```bash
   DEBUG=true npm run unified test --url <your-url> --debug
   ```

### 2FA Issues

**Problem:** Two-factor authentication code not received or processed

**Solutions:**

1. **Check Webhook Configuration:**
   ```bash
   # Test webhook endpoint
   curl -X POST https://your-webhook-url/test
   ```

2. **Manual 2FA Entry:**
   ```javascript
   // Disable automated 2FA in config
   {
     "authentication": {
       "username": "user",
       "password": "pass"
       // Remove otpWebhookUrl to enter manually
     }
   }
   ```

3. **Debug 2FA Flow:**
   ```bash
   # Enable screenshots for 2FA debugging
   npm run unified test --screenshot --debug
   ```

### Session Expired

**Problem:** Session expires during task execution

**Solution:**
```javascript
// Enable session persistence
{
  "capabilities": {
    "sessionPersistence": true,
    "keepAlive": true,
    "keepAliveInterval": 300000 // 5 minutes
  }
}
```

## Download Issues

### Report Not Downloading

**Problem:** Report downloads but file not saved

**Solutions:**

1. **Check Download Directory:**
   ```bash
   # Verify output directory exists
   ls -la ./downloads/
   
   # Create if missing
   mkdir -p ./downloads
   ```

2. **Permissions Issue:**
   ```bash
   # Fix permissions
   chmod 755 ./downloads
   ```

3. **Wait for Download:**
   ```javascript
   // Increase download timeout
   {
     "capabilities": {
       "downloadTimeout": 60000 // 60 seconds
     }
   }
   ```

### Wrong Report Downloaded

**Problem:** Agent downloads incorrect report

**Solution:**
```bash
# Use position parameter
npm run unified report --position 2

# Or use vision to find specific report
npm run unified report --vision --report-name "Daily Sales"
```

## Vision/AI Problems

### OpenRouter API Errors

**Problem:** Vision analysis fails

**Solutions:**

1. **Check API Key:**
   ```bash
   # Verify API key is set
   echo $OPENROUTER_API_KEY
   ```

2. **Rate Limiting:**
   ```javascript
   // Add retry configuration
   {
     "capabilities": {
       "visionRetries": 3,
       "visionRetryDelay": 2000
     }
   }
   ```

3. **Debug Vision Calls:**
   ```bash
   # Enable vision debugging
   DEBUG_VISION=true npm run unified report --vision
   ```

### Checkbox Mapping Fails

**Problem:** AI can't map checkboxes correctly

**Solutions:**

1. **Improve Screenshot Quality:**
   ```javascript
   {
     "capabilities": {
       "screenshotQuality": 100,
       "viewportSize": { "width": 1920, "height": 1080 }
     }
   }
   ```

2. **Use Fallback Strategies:**
   ```javascript
   // Enable multiple detection strategies
   {
     "capabilities": {
       "checkboxStrategies": ["vision", "position", "text"]
     }
   }
   ```

## Session Management

### Session Not Persisting

**Problem:** Sessions not saved between runs

**Solutions:**

1. **Enable Session Persistence:**
   ```bash
   # Set environment variable
   export SESSION_PERSISTENCE=true
   ```

2. **Check Session Directory:**
   ```bash
   # Verify sessions directory
   ls -la ./sessions/
   
   # Check session files
   ls -la ./sessions/*.json
   ```

3. **Validate Session:**
   ```bash
   npm run unified session validate <session-id>
   ```

### Keep-Alive Not Working

**Problem:** Session expires despite keep-alive

**Solution:**
```javascript
// Adjust keep-alive settings
{
  "sessionConfig": {
    "keepAlive": true,
    "keepAliveInterval": 180000, // 3 minutes
    "keepAliveStrategy": "mouse-move" // or "page-refresh"
  }
}
```

## Performance Issues

### Slow Execution

**Problem:** Tasks take too long to complete

**Solutions:**

1. **Disable Unnecessary Features:**
   ```javascript
   {
     "capabilities": {
       "screenshotDebug": false,
       "useVision": false // Only when needed
     }
   }
   ```

2. **Optimize Selectors:**
   ```javascript
   // Use specific selectors
   {
     "parameters": {
       "customSelectors": [
         "#specific-id",  // Fastest
         "[data-testid='button']", // Good
         "button:has-text('Export')" // Slower
       ]
     }
   }
   ```

3. **Parallel Execution:**
   ```bash
   # Run multiple instances
   npm run unified report --position 1 &
   npm run unified report --position 2 &
   ```

### Memory Leaks

**Problem:** Process uses too much memory

**Solutions:**

1. **Enable Cleanup:**
   ```javascript
   {
     "capabilities": {
       "autoCleanup": true,
       "cleanupInterval": 300000
     }
   }
   ```

2. **Limit Browser Instances:**
   ```bash
   # Set max browser contexts
   export MAX_BROWSER_CONTEXTS=1
   ```

## Debug Mode

### Enable Comprehensive Debugging

```bash
# Full debug mode
DEBUG=* npm run unified report --debug --screenshot

# Specific debug categories
DEBUG=auth,download npm run unified report

# Save debug output
DEBUG=* npm run unified report 2>&1 | tee debug.log
```

### Debug Categories
- `auth`: Authentication flow
- `download`: File downloads
- `vision`: AI vision calls
- `session`: Session management
- `element`: Element selection
- `network`: Network requests

### Analyze Debug Logs

```bash
# Search for errors
grep -i error debug.log

# Find specific issues
grep -E "(fail|error|timeout)" debug.log

# Get timing information
grep -E "duration|elapsed|took" debug.log
```

## Platform-Specific Issues

### VinSolutions Specific

**Problem:** VinSolutions inventory page not loading

**Solution:**
```javascript
// Use specific VinSolutions configuration
{
  "target": {
    "url": "https://provision.vauto.app.coxautoinc.com/Va/Inventory/Default.aspx",
    "waitForSelector": "//a[contains(@class, 'YearMakeModel')]"
  }
}
```

### Dealer.com Specific

**Problem:** Dealer.com requires different authentication

**Solution:**
```javascript
{
  "authentication": {
    "strategy": "dealer-com",
    "endpoint": "https://id.dealer.com/login"
  }
}
```

### vAuto Specific

**Problem:** vAuto grid not loading

**Solution:**
```javascript
// Force grid load
{
  "capabilities": {
    "forceGridLoad": true,
    "gridLoadStrategy": "scroll"
  }
}
```

## Error Reference

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `AUTH_FAILED` | Invalid credentials | Check username/password |
| `SESSION_EXPIRED` | Session timed out | Enable session persistence |
| `ELEMENT_NOT_FOUND` | Selector failed | Use vision or update selector |
| `DOWNLOAD_TIMEOUT` | Download took too long | Increase timeout |
| `VISION_QUOTA_EXCEEDED` | OpenRouter limit hit | Wait or upgrade plan |
| `NETWORK_ERROR` | Connection issue | Check internet/proxy |
| `BROWSER_CRASHED` | Browser process died | Restart and check memory |

### Error Codes

```javascript
// Handle specific errors
try {
  await agent.executeTask();
} catch (error) {
  switch (error.code) {
    case 'AUTH_FAILED':
      // Handle authentication
      break;
    case 'ELEMENT_NOT_FOUND':
      // Try with vision
      break;
    default:
      console.error('Unknown error:', error);
  }
}
```

## Getting Help

### Collect Diagnostic Information

```bash
# Generate diagnostic report
npm run diagnostic > diagnostic.txt

# Include:
# - Node version: node --version
# - NPM version: npm --version
# - OS: uname -a
# - Error logs
# - Screenshots if available
```

### Debug Checklist

1. ✓ Check credentials are correct
2. ✓ Verify environment variables
3. ✓ Test with `--debug` flag
4. ✓ Enable screenshots
5. ✓ Check browser is installed
6. ✓ Review debug logs
7. ✓ Test with minimal config
8. ✓ Try different selectors/strategies

### Community Support

For additional help:
- Check existing GitHub issues
- Review closed issues for solutions
- Create detailed bug report with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Debug logs
  - System information
  - Configuration used

## Prevention Tips

1. **Regular Updates:**
   ```bash
   # Keep dependencies updated
   npm update
   ```

2. **Monitor Sessions:**
   ```bash
   # Regular session cleanup
   npm run unified session clean --older-than 7d
   ```

3. **Test Configuration:**
   ```bash
   # Validate config before running
   npm run unified validate-config config.json
   ```

4. **Use Timeouts:**
   ```javascript
   // Set reasonable timeouts
   {
     "timeouts": {
       "navigation": 30000,
       "element": 10000,
       "download": 60000
     }
   }
   ```

Remember: Most issues can be resolved by:
1. Enabling debug mode
2. Checking credentials/environment
3. Using appropriate timeouts
4. Trying alternative strategies (vision vs selectors)