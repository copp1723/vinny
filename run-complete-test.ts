import { CompleteVinSolutionsAgent } from './src/agents/CompleteVinSolutionsAgent';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

async function runCompleteTest() {
  console.log('🚀 Starting Complete AI-Powered VinSolutions Test');
  console.log('==================================================');
  console.log('');
  console.log('This test will demonstrate:');
  console.log('✅ AI-powered browser automation');
  console.log('✅ Email-based 2FA handling');
  console.log('✅ Intelligent report extraction');
  console.log('✅ Professional email delivery via Mailgun');
  console.log('✅ Complete error handling and notifications');
  console.log('');

  try {
    // Validate environment variables
    const requiredEnvVars = [
      'VINSOLUTIONS_USERNAME',
      'VINSOLUTIONS_PASSWORD', 
      'VINSOLUTIONS_URL',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_FROM_EMAIL',
      'EMAIL_IMAP_HOST',
      'EMAIL_SMTP_USER',
      'EMAIL_SMTP_PASS',
      'OPENROUTER_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.log(`   ${varName}`));
      console.log('');
      console.log('Please check your .env file and ensure all variables are set.');
      return;
    }

    console.log('🔧 Configuration validated successfully');
    console.log(`📧 Agent Email: ${process.env.EMAIL_SMTP_USER}`);
    console.log(`📤 Mailgun Domain: ${process.env.MAILGUN_DOMAIN}`);
    console.log(`🌐 VinSolutions URL: ${process.env.VINSOLUTIONS_URL}`);
    console.log(`🤖 OpenRouter Model: ${process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'}`);
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
        fromName: 'VinSolutions AI Agent'
      },
      gmail: {
        imap: {
          host: process.env.EMAIL_IMAP_HOST!,
          port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
          secure: true,
          auth: {
            user: process.env.EMAIL_SMTP_USER!,
            pass: process.env.EMAIL_SMTP_PASS!
          }
        },
        agentEmail: process.env.EMAIL_SMTP_USER!
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseURL: process.env.OPENROUTER_BASE_URL,
        defaultModel: process.env.OPENROUTER_DEFAULT_MODEL
      },
      reportRecipients: [process.env.EMAIL_SMTP_USER!], // Send to self for testing
      downloadDir: path.resolve('./downloads'),
      screenshotDir: path.resolve('./screenshots')
    };

    // Initialize the agent
    console.log('🤖 Initializing Complete VinSolutions Agent...');
    const agent = new CompleteVinSolutionsAgent(agentConfig);
    await agent.initialize();
    console.log('✅ Agent initialized successfully');
    console.log('');

    // Run the complete extraction
    console.log('🎯 Starting Lead Source ROI extraction...');
    console.log('');
    console.log('The agent will now:');
    console.log('1. 📧 Send start notification via Mailgun');
    console.log('2. 🌐 Navigate to VinSolutions and login');
    console.log('3. 🔐 Handle 2FA using email automation');
    console.log('4. 📊 Navigate to reports and find Lead Source ROI');
    console.log('5. 💾 Download the report');
    console.log('6. 📤 Email the report with professional formatting');
    console.log('7. 📸 Capture screenshots for debugging');
    console.log('');
    console.log('⏱️  This process typically takes 2-5 minutes...');
    console.log('');

    const result = await agent.extractLeadSourceROI();

    console.log('');
    console.log('🎉 Extraction Process Completed!');
    console.log('================================');
    console.log('');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Report: ${result.reportName}`);
    console.log(`🏢 Platform: ${result.platformName}`);
    console.log(`⏱️  Execution Time: ${result.executionTime}ms`);
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
      console.log('🎊 SUCCESS! The AI agent has successfully:');
      console.log('✅ Logged into VinSolutions autonomously');
      console.log('✅ Handled 2FA via email automation');
      console.log('✅ Navigated to the correct report');
      console.log('✅ Downloaded the Lead Source ROI report');
      console.log('✅ Sent professional email with attachment');
      console.log('✅ Provided complete audit trail');
      console.log('');
      console.log('🚀 This proves the system can run completely autonomously!');
      console.log('');
      console.log('📧 Check your email for:');
      console.log('   1. Start notification');
      console.log('   2. Professional report delivery with Excel attachment');
      console.log('   3. Beautiful HTML formatting with performance metrics');
    } else {
      console.log('⚠️  The extraction encountered an issue, but the system:');
      console.log('✅ Handled the error gracefully');
      console.log('✅ Captured debugging screenshots');
      console.log('✅ Sent detailed error notification');
      console.log('✅ Provided complete audit trail');
      console.log('');
      console.log('🔧 This demonstrates robust error handling for production use.');
    }

    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Review the email delivery in your inbox');
    console.log('2. Check the downloaded report (if successful)');
    console.log('3. Review screenshots for any issues');
    console.log('4. Configure for additional platforms');
    console.log('5. Set up scheduling for automated runs');

  } catch (error: any) {
    console.log('');
    console.log('💥 Test failed with error:');
    console.log(`❌ ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check all environment variables are set correctly');
    console.log('2. Verify VinSolutions credentials are valid');
    console.log('3. Ensure Mailgun API key and domain are correct');
    console.log('4. Check Gmail IMAP settings and app password');
    console.log('5. Verify OpenRouter API key has credits');
  }
}

runCompleteTest().catch(console.error);

