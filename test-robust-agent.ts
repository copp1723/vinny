import { chromium } from 'playwright';
import { CompleteVinSolutionsAgent } from './src/agents/CompleteVinSolutionsAgent';
import { RobustVinSolutionsAgent } from './src/agents/RobustVinSolutionsAgent';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function testRobustExtraction() {
  const config = {
    vinsolutions: {
      username: process.env.VINSOLUTIONS_USERNAME || '',
      password: process.env.VINSOLUTIONS_PASSWORD || '',
      url: process.env.VINSOLUTIONS_URL || 'https://vinsolutions.app.coxautoinc.com/vinconnect/pane-both/vinconnect-dealer-dashboard'
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY || '',
      domain: process.env.MAILGUN_DOMAIN || '',
      fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
      fromName: process.env.MAILGUN_FROM_NAME || 'VinSolutions AI Agent'
    },
    gmail: {
      imap: {
        host: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
        port: parseInt(process.env.GMAIL_IMAP_PORT || '993'),
        secure: process.env.GMAIL_IMAP_SECURE === 'true',
        auth: {
          user: process.env.GMAIL_USER || '',
          pass: process.env.GMAIL_APP_PASSWORD || ''
        }
      },
      agentEmail: process.env.AGENT_EMAIL || ''
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: process.env.OPENROUTER_MODEL || 'gpt-4-turbo-preview'
    },
    reportRecipients: (process.env.REPORT_RECIPIENTS || '').split(',').filter(Boolean),
    downloadDir: path.join(process.cwd(), 'downloads'),
    screenshotDir: path.join(process.cwd(), 'screenshots')
  };

  // Initialize the complete agent for login and 2FA handling
  const completeAgent = new CompleteVinSolutionsAgent(config);
  await completeAgent.initialize();

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    timeout: 60000
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    console.log('🚀 Starting robust VinSolutions extraction test');

    // Step 1: Navigate to VinSolutions
    await page.goto(config.vinsolutions.url);
    console.log('✅ Navigated to VinSolutions');

    // Step 2: Perform login with the existing agent
    console.log('🔐 Logging in...');
    
    // Use existing login functionality
    await page.fill('input[name="username"], input[type="email"], #username', config.vinsolutions.username);
    await page.waitForTimeout(1000);
    
    // Check if we need to click Next
    try {
      await page.click('button:has-text("Next")', { timeout: 3000 });
      await page.waitForTimeout(2000);
    } catch {
      // No Next button, continue
    }
    
    await page.fill('input[name="password"], input[type="password"], #password', config.vinsolutions.password);
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Sign"), input[type="submit"], button[type="submit"]');
    console.log('✅ Credentials submitted');

    // Wait for page to load or 2FA prompt
    await page.waitForTimeout(5000);

    // Handle 2FA if needed (you can use existing 2FA logic here)
    const has2FA = await page.locator('text=verification, text=code, text=authenticate').count() > 0;
    if (has2FA) {
      console.log('⚠️ 2FA required - please handle manually or use existing 2FA logic');
      // In production, you'd use the existing 2FA handling from CompleteVinSolutionsAgent
      await page.waitForTimeout(30000); // Wait for manual 2FA entry
    }

    // Step 3: Initialize robust agent for report extraction
    console.log('🤖 Initializing robust extraction agent...');
    const robustAgent = new RobustVinSolutionsAgent({
      downloadDir: config.downloadDir,
      screenshotDir: config.screenshotDir
    });

    await robustAgent.initialize(browser, page);

    // Step 4: Navigate to reports using multiple strategies
    console.log('📊 Navigating to reports with robust strategies...');
    const navSuccess = await robustAgent.navigateToReportsWithStrategies();
    
    if (!navSuccess) {
      throw new Error('Failed to navigate to reports/favorites');
    }
    console.log('✅ Successfully navigated to reports/favorites');

    // Step 5: Extract the report with all strategies
    console.log('📥 Extracting Lead Source ROI report...');
    const result = await robustAgent.extractLeadSourceROIWithStrategies();

    if (result.success) {
      console.log('✅ Report extracted successfully!');
      console.log(`📁 Report saved to: ${result.reportPath}`);
      console.log(`⏱️ Execution time: ${result.executionTime}ms`);
      console.log(`🎯 Strategies used: ${result.strategies.join(', ')}`);
    } else {
      console.error('❌ Report extraction failed');
      console.error(`Error: ${result.error}`);
      console.error(`Strategies tried: ${result.strategies.join(', ')}`);
      console.error(`Screenshots saved: ${result.screenshots.length}`);
    }

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    // Keep browser open for inspection
    console.log('\n🔍 Browser will remain open for inspection. Press Ctrl+C to exit.');
    
    // Wait indefinitely
    await new Promise(() => {});
  }
}

// Run the test
testRobustExtraction().catch(console.error);