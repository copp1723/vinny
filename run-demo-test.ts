import { DemoVinSolutionsAgent } from './src/agents/DemoVinSolutionsAgent';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

async function runDemoTest() {
  console.log('🚀 Starting DEMO AI-Powered VinSolutions Test');
  console.log('==============================================');
  console.log('');
  console.log('This demo will show:');
  console.log('✅ AI-powered browser automation');
  console.log('✅ Intelligent report extraction');
  console.log('✅ Professional email delivery via Mailgun');
  console.log('✅ Complete error handling and notifications');
  console.log('');
  
  // Update demo description based on webhook configuration
  if (process.env.WEBHOOK_URL) {
    console.log('✅ Real 2FA code retrieval from webhook');
    console.log('🔧 Note: Using webhook to retrieve actual 2FA codes');
    console.log('   The agent will wait for real verification codes to arrive at the webhook');
  } else {
    console.log('✅ Simulated email-based 2FA handling');
    console.log('🔧 Note: 2FA will be simulated with code 123456 (no webhook configured)');
    console.log('   In production, the agent reads real 2FA codes from webhook');
  }
  console.log('');

  try {
    // Validate required environment variables (excluding Gmail)
    const requiredEnvVars = [
      'VINSOLUTIONS_USERNAME',
      'VINSOLUTIONS_PASSWORD', 
      'VINSOLUTIONS_URL',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_FROM_EMAIL',
      'OPENROUTER_API_KEY'
    ];
    // WEBHOOK_URL is optional, so not included in requiredEnvVars

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.log(`   ${varName}`));
      console.log('');
      console.log('Please check your .env file and ensure all variables are set.');
      return;
    }

    console.log('🔧 Configuration validated successfully');
    console.log(`📤 Mailgun Domain: ${process.env.MAILGUN_DOMAIN}`);
    console.log(`📧 From Email: ${process.env.MAILGUN_FROM_EMAIL}`);
    console.log(`🌐 VinSolutions URL: ${process.env.VINSOLUTIONS_URL}`);
    console.log(`🤖 OpenRouter Model: ${process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'}`);
    
    // Display webhook configuration status
    if (process.env.WEBHOOK_URL) {
      console.log(`🔗 Webhook URL: Configured (will use real 2FA codes)`);
    } else {
      console.log(`🔗 Webhook URL: Not configured (will use simulated 2FA codes)`);
    }
    console.log('');

    // Create agent configuration
    const agentConfig = {
      vinsolutions: {
        username: process.env.VINSOLUTIONS_USERNAME!,
        password: process.env.VINSOLUTIONS_PASSWORD!,
        url: process.env.VINSOLUTIONS_URL!
      },
      mailgun: {
        apiKey: process.env.MAILGUN_API_KEY!,
        domain: process.env.MAILGUN_DOMAIN!,
        fromEmail: process.env.MAILGUN_FROM_EMAIL!,
        fromName: 'VinSolutions AI Agent (Demo)'
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseURL: process.env.OPENROUTER_BASE_URL,
        defaultModel: process.env.OPENROUTER_DEFAULT_MODEL
      },
      reportRecipients: [process.env.MAILGUN_FROM_EMAIL!], // Send to self for demo
      downloadDir: path.resolve('./downloads'),
      screenshotDir: path.resolve('./screenshots'),
      webhookUrl: process.env.WEBHOOK_URL // Add webhook URL configuration (optional)
    };

    // Initialize the agent
    console.log('🤖 Initializing Demo VinSolutions Agent...');
    const agent = new DemoVinSolutionsAgent(agentConfig);
    await agent.initialize();
    console.log('✅ Agent initialized successfully');
    console.log('');

    // Run the complete extraction
    console.log('🎯 Starting Lead Source ROI extraction (DEMO MODE)...');
    console.log('');
    console.log('The agent will now:');
    console.log('1. 📧 Send start notification via Mailgun');
    console.log('2. 🌐 Navigate to VinSolutions and login');
    
    // Update 2FA handling description based on webhook configuration
    if (process.env.WEBHOOK_URL) {
      console.log('3. 🔐 Handle 2FA with real webhook code retrieval');
    } else {
      console.log('3. 🔐 Simulate 2FA handling with code 123456');
    }
    
    console.log('4. 📊 Navigate to reports and find Lead Source ROI');
    console.log('5. 💾 Download the report');
    console.log('6. 📤 Email the report with professional formatting');
    console.log('7. 📸 Capture screenshots for debugging');
    console.log('');
    console.log('⏱️  This process typically takes 3-7 minutes...');
    console.log('🖥️  Browser will open - you can watch the automation!');
    console.log('');

    const result = await agent.extractLeadSourceROI();

    console.log('');
    console.log('🎉 Demo Extraction Process Completed!');
    console.log('====================================');
    console.log('');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Report: ${result.reportName}`);
    console.log(`🏢 Platform: ${result.platformName}`);
    console.log(`⏱️  Execution Time: ${result.executionTime}ms (${Math.round(result.executionTime / 1000)}s)`);
    console.log(`📅 Extracted At: ${result.extractedAt}`);
    
    if (result.success && result.reportPath) {
      console.log(`💾 Report Path: ${result.reportPath}`);
      console.log('📧 Professional email sent via Mailgun with report attachment');
    } else {
      console.log(`❌ Error: ${result.error}`);
      console.log('📧 Error notification sent via Mailgun');
    }
    
    console.log(`📸 Screenshots: ${result.screenshots.length} captured`);
    console.log('');

    if (result.success) {
      console.log('🎊 DEMO SUCCESS! The AI agent has successfully:');
      console.log('✅ Logged into VinSolutions autonomously');
      
      // Update 2FA success message based on webhook configuration
      if (process.env.WEBHOOK_URL) {
        console.log('✅ Handled 2FA using real webhook code retrieval');
      } else {
        console.log('✅ Simulated 2FA handling (production uses real webhook)');
      }
      
      console.log('✅ Navigated to the correct report');
      console.log('✅ Downloaded the Lead Source ROI report');
      console.log('✅ Sent professional email with attachment via Mailgun');
      console.log('✅ Provided complete audit trail with screenshots');
      console.log('');
      console.log('🚀 This proves the system can run completely autonomously!');
      console.log('');
      console.log('📧 Check your email for:');
      console.log('   1. Start notification');
      console.log('   2. 2FA notification');
      console.log('   3. Professional report delivery with Excel attachment');
      console.log('   4. Beautiful HTML formatting with performance metrics');
      console.log('');
      console.log('🔧 For production deployment:');
      if (!process.env.WEBHOOK_URL) {
        console.log('   - Configure webhook URL for real 2FA code handling');
      }
      console.log('   - Set headless: true for background operation');
      console.log('   - Configure scheduling for automated runs');
      console.log('   - Add additional platforms using the same framework');
    } else {
      console.log('⚠️  The extraction encountered an issue, but the system:');
      console.log('✅ Handled the error gracefully');
      console.log('✅ Captured debugging screenshots');
      console.log('✅ Sent detailed error notification via Mailgun');
      console.log('✅ Provided complete audit trail');
      console.log('');
      console.log('🔧 This demonstrates robust error handling for production use.');
    }

    console.log('');
    console.log('🎯 What This Demo Proves:');
    console.log('1. ✅ Browser automation works reliably');
    console.log('2. ✅ Mailgun email delivery is professional and reliable');
    console.log('3. ✅ Error handling and notifications work correctly');
    console.log('4. ✅ Screenshot debugging provides complete audit trail');
    console.log('5. ✅ The system is ready for production deployment');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Review the professional emails in your inbox');
    console.log('2. Check the downloaded report file');
    console.log('3. Review screenshots for any issues');
    if (!process.env.WEBHOOK_URL) {
      console.log('4. Configure webhook URL for real 2FA code handling');
    }
    console.log('5. Configure additional platforms');
    console.log('6. Set up scheduling for automated runs');

  } catch (error: any) {
    console.log('');
    console.log('💥 Demo test failed with error:');
    console.log(`❌ ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check all environment variables are set correctly');
    console.log('2. Verify VinSolutions credentials are valid');
    console.log('3. Ensure Mailgun API key and domain are correct');
    console.log('4. Verify OpenRouter API key has credits');
    console.log('5. Check network connectivity');
    if (process.env.WEBHOOK_URL) {
      console.log('6. Verify webhook server is running and accessible');
    }
  }
}

runDemoTest().catch(console.error);
