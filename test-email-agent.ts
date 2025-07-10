import { chromium } from 'playwright';
import { EnhancedVinSolutionsAgent } from './src/agents/EnhancedVinSolutionsAgent';
import { EmailConfig } from './src/services/EmailService';
import fs from 'fs-extra';

async function testEmailAgent() {
  console.log('🧪 Testing Enhanced VinSolutions Agent with Email Authentication');
  console.log('================================================================');

  // Load email configuration
  let emailConfig: EmailConfig;
  try {
    emailConfig = await fs.readJson('./email-config.json');
  } catch (error) {
    console.log('❌ Please create email-config.json based on email-config.example.json');
    console.log('');
    console.log('Steps to set up email authentication:');
    console.log('1. Create a dedicated Gmail account for your AI agent');
    console.log('2. Enable 2-factor authentication on the Gmail account');
    console.log('3. Generate an App Password for the agent');
    console.log('4. Copy email-config.example.json to email-config.json');
    console.log('5. Update the configuration with your email details');
    console.log('');
    console.log('Then update your VinSolutions account to use email for 2FA instead of phone.');
    return;
  }

  const credentials = {
    username: 'ATSGlobal',
    password: 'Robsight1',
    url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/pane-both/vinconnect-dealer-dashboard'
  };

  console.log('🚀 Starting browser...');
  const browser = await chromium.launch({
    headless: false, // Show browser for demonstration
    slowMo: 1000     // Slow down for visibility
  });

  const agent = new EnhancedVinSolutionsAgent(emailConfig);

  try {
    console.log('🔧 Initializing agent...');
    await agent.initialize(browser);

    console.log('📧 Email service initialized');
    console.log(`   Agent Email: ${emailConfig.agentEmail}`);
    console.log(`   Report Recipients: ${emailConfig.reportRecipients.join(', ')}`);
    console.log('');

    console.log('🔐 Starting login with email-based 2FA...');
    console.log('   ⚠️  Make sure VinSolutions is configured to send 2FA codes to email!');
    console.log('');

    const result = await agent.runFullExtractionWorkflow(credentials);

    console.log('');
    console.log('📊 EXTRACTION RESULT:');
    console.log('=====================');
    console.log(`Success: ${result.success}`);
    console.log(`Report: ${result.reportName}`);
    console.log(`Execution Time: ${result.executionTime}ms`);
    
    if (result.success) {
      console.log(`✅ Downloaded to: ${result.filePath}`);
      console.log(`📧 Report emailed to: ${emailConfig.reportRecipients.join(', ')}`);
      console.log(`📁 File Size: ${result.fileSize} bytes`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
    
    console.log(`📸 Screenshots taken: ${result.screenshots?.length || 0}`);
    if (result.screenshots) {
      result.screenshots.forEach((screenshot, i) => {
        console.log(`   ${i + 1}. ${screenshot}`);
      });
    }

  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
  } finally {
    await agent.close();
    await browser.close();
    console.log('🔒 Browser and agent closed');
  }
}

// Run the test
testEmailAgent().catch(console.error);

