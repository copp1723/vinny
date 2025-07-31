import { executeVinSolutionsTask, UnifiedTaskConfig } from '../agents/UnifiedVinSolutionsAgent';

/**
 * Example 1: Download a report (3 clicks total)
 */
async function downloadReportExample() {
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/reporting/favorites',
      taskType: 'report',
      parameters: {
        reportPosition: 1  // Download 1st report
      }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!,
      otpWebhookUrl: 'https://your-webhook.com/otp'
    },
    capabilities: {
      useVision: true,
      maxClicks: 5,
      screenshotDebug: true
    },
    output: {
      downloadPath: './reports',
      emailTo: ['manager@dealership.com']
    }
  };
  
  const result = await executeVinSolutionsTask(config);
  console.log(`Report downloaded in ${result.clickCount} clicks!`);
}

/**
 * Example 2: Check lead activity (4 clicks max)
 */
async function checkLeadActivityExample() {
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/leads',
      taskType: 'lead-activity',
      parameters: {
        leadPhone: '555-123-4567'
      }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!
    },
    capabilities: {
      maxClicks: 5
    }
  };
  
  const result = await executeVinSolutionsTask(config);
  console.log('Lead activity:', result.data);
}

/**
 * Example 3: Custom task with specific selectors (flexible)
 */
async function customNavigationExample() {
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/inventory',
      taskType: 'custom',
      parameters: {
        customSelectors: [
          'button:has-text("Add Vehicle")',
          'input[name="vin"]',
          'button[type="submit"]'
        ]
      }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!
    },
    capabilities: {
      useVision: true,
      maxClicks: 3  // Strict limit
    }
  };
  
  const result = await executeVinSolutionsTask(config);
  console.log(`Custom task completed: ${result.clickCount} clicks used`);
}

/**
 * Example 4: Any Cox Automotive product (Dealer.com, Xtime, etc.)
 */
async function dealerDotComExample() {
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://dealer.com/admin/inventory',  // Works with ANY Cox URL!
      taskType: 'custom',
      parameters: {
        customSelectors: ['#inventory-grid', '.export-button']
      }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!
    },
    capabilities: {
      maxClicks: 5
    }
  };
  
  const result = await executeVinSolutionsTask(config);
  console.log('Dealer.com task completed!');
}

/**
 * Example 5: Report with position-based selection (bulletproof)
 */
async function monthlyReportAutomation() {
  // Download 3rd report every month
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/reporting',
      taskType: 'report',
      parameters: {
        reportPosition: 3,  // Always get 3rd report regardless of name
        dateRange: 'last-month'
      }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!,
      otpWebhookUrl: process.env.OTP_WEBHOOK_URL
    },
    capabilities: {
      useVision: true,
      maxClicks: 5,
      strategies: ['position', 'vision', 'direct']  // Prioritized strategies
    },
    output: {
      downloadPath: './monthly-reports',
      emailTo: ['gm@dealership.com', 'controller@dealership.com'],
      webhookUrl: 'https://dealership.com/webhook/report-ready'
    }
  };
  
  const result = await executeVinSolutionsTask(config);
  
  if (result.success) {
    console.log(`✅ Monthly report automated: ${result.clickCount} clicks`);
    console.log(`📊 Report saved: ${result.filePath}`);
    console.log(`📧 Emailed to: ${config.output?.emailTo?.join(', ')}`);
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('🚀 Unified VinSolutions Agent Examples\n');
    
    try {
      // Example 1: Download report
      console.log('1️⃣ Downloading report...');
      await downloadReportExample();
      
      // Example 2: Check lead activity  
      console.log('\n2️⃣ Checking lead activity...');
      await checkLeadActivityExample();
      
      // Example 3: Custom navigation
      console.log('\n3️⃣ Custom navigation task...');
      await customNavigationExample();
      
      console.log('\n✅ All examples completed!');
      
    } catch (error) {
      console.error('❌ Example failed:', error);
    }
  })();
}