import { MailgunService } from './src/services/MailgunService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMailgun() {
  console.log('🧪 Testing Mailgun Service');
  console.log('===========================');

  // Check for Mailgun environment variables
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL;

  if (!apiKey || !domain || !fromEmail) {
    console.log('❌ Missing Mailgun configuration. Please set:');
    console.log('   MAILGUN_API_KEY=your-api-key');
    console.log('   MAILGUN_DOMAIN=your-domain.com');
    console.log('   MAILGUN_FROM_EMAIL=ai-agent@your-domain.com');
    console.log('');
    console.log('Or provide them when I ask...');
    return;
  }

  console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`🌐 Domain: ${domain}`);
  console.log(`📧 From Email: ${fromEmail}`);
  console.log('');

  try {
    const mailgunService = new MailgunService({
      apiKey,
      domain,
      fromEmail,
      fromName: 'VinSolutions AI Agent'
    });

    console.log('🔧 Testing Mailgun connection...');
    const isConnected = await mailgunService.testConnection();
    
    if (isConnected) {
      console.log('✅ Mailgun connection successful!');
      console.log('');

      // Test notification email
      console.log('📤 Testing notification email...');
      await mailgunService.sendNotificationEmail(
        'Mailgun Test Successful',
        'Your Mailgun configuration is working correctly! The AI agent can now send professional emails for report delivery and notifications.',
        [fromEmail] // Send to self for testing
      );
      console.log('✅ Notification email sent!');
      console.log('');

      console.log('🎉 All Mailgun tests passed!');
      console.log('');
      console.log('Mailgun is ready for:');
      console.log('✅ Professional report delivery');
      console.log('✅ Success/failure notifications');
      console.log('✅ File attachments (Excel, PDF, CSV)');
      console.log('✅ HTML formatted emails');
      console.log('✅ Email tracking and analytics');
      console.log('');
      console.log('Check your email inbox to confirm delivery!');

    } else {
      console.log('❌ Mailgun connection failed');
    }

  } catch (error: any) {
    console.log(`💥 Mailgun test failed: ${error.message}`);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Verify your Mailgun API key is correct');
    console.log('2. Check that your domain is verified in Mailgun');
    console.log('3. Ensure the from email is authorized for your domain');
    console.log('4. Check your Mailgun account has credits/is not suspended');
  }
}

testMailgun().catch(console.error);

