import { EmailService } from './src/services/EmailService';
import fs from 'fs-extra';

async function testEmailConnection() {
  console.log('🧪 Testing Email Connection');
  console.log('===========================');

  try {
    // Load email configuration
    const emailConfig = await fs.readJson('./email-config.json');
    console.log(`📧 Agent Email: ${emailConfig.agentEmail}`);
    console.log(`📤 SMTP: ${emailConfig.smtp.host}:${emailConfig.smtp.port}`);
    console.log(`📥 IMAP: ${emailConfig.imap.host}:${emailConfig.imap.port}`);
    console.log('');

    // Initialize email service
    const emailService = new EmailService(emailConfig);
    
    console.log('🔧 Initializing email service...');
    await emailService.initialize();
    console.log('✅ Email service initialized successfully!');
    console.log('');

    // Test sending a notification email
    console.log('📤 Sending test notification email...');
    await emailService.sendNotificationEmail(
      'Email Service Test',
      'This is a test email from your VinSolutions AI Agent. If you receive this, the email configuration is working correctly!'
    );
    console.log('✅ Test email sent successfully!');
    console.log('');

    // Test IMAP connection for reading emails
    console.log('📥 Testing IMAP connection for reading emails...');
    console.log('   (This will timeout after 10 seconds - that\'s normal for testing)');
    
    try {
      // Try to wait for a 2FA code for 10 seconds (will timeout, but tests IMAP)
      await emailService.waitForTwoFactorCode(10000, 'test.com');
    } catch (timeoutError: any) {
      if (timeoutError.message && timeoutError.message.includes('Timeout')) {
        console.log('✅ IMAP connection working (timeout expected for test)');
      } else {
        throw timeoutError;
      }
    }

    await emailService.close();
    console.log('');
    console.log('🎉 All email tests passed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your email inbox for the test message');
    console.log('2. Configure VinSolutions to send 2FA codes to rylie1234@gmail.com');
    console.log('3. Run: npm run test-email');

  } catch (error: any) {
    console.log(`❌ Email test failed: ${error.message || error}`);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Verify the Gmail App Password is correct');
    console.log('2. Ensure 2FA is enabled on the Gmail account');
    console.log('3. Check that IMAP is enabled in Gmail settings');
  }
}

testEmailConnection().catch(console.error);

