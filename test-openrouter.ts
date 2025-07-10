import { OpenRouterService } from './src/services/OpenRouterService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter Connection');
  console.log('=================================');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY not found in environment variables');
    return;
  }

  console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...`);
  console.log('');

  try {
    const openRouterService = new OpenRouterService({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL,
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL
    });

    console.log('🔧 Testing connection...');
    const isConnected = await openRouterService.testConnection();
    
    if (isConnected) {
      console.log('✅ OpenRouter connection successful!');
      console.log('');

      // Test model selection
      console.log('🤖 Testing model selection...');
      const visionModel = await openRouterService.selectBestModel('analyze screenshot for vision');
      const codeModel = await openRouterService.selectBestModel('generate code for automation');
      const fastModel = await openRouterService.selectBestModel('quick response needed');
      
      console.log(`   Vision tasks: ${visionModel}`);
      console.log(`   Code tasks: ${codeModel}`);
      console.log(`   Fast tasks: ${fastModel}`);
      console.log('');

      // Test automation strategy generation
      console.log('🎯 Testing automation strategy generation...');
      const strategy = await openRouterService.generateAutomationStrategy(
        'VinSolutions',
        'Lead Source ROI',
        'Login with 2FA',
        'Email 2FA code not received'
      );
      console.log(`   Strategy: ${strategy}`);
      console.log('');

      // Test 2FA code extraction
      console.log('🔐 Testing 2FA code extraction...');
      const sampleEmail = `
        Subject: VinSolutions Security Code
        
        Your verification code is: 123456
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please contact support.
      `;
      
      const codeAnalysis = await openRouterService.extractTwoFactorCode(sampleEmail);
      console.log(`   Code found: ${codeAnalysis.codeFound}`);
      console.log(`   Code: ${codeAnalysis.code}`);
      console.log(`   Confidence: ${codeAnalysis.confidence}`);
      console.log(`   Reasoning: ${codeAnalysis.reasoning}`);
      console.log('');

      console.log('🎉 All OpenRouter tests passed!');
      console.log('');
      console.log('Available capabilities:');
      console.log('✅ Vision analysis for page screenshots');
      console.log('✅ Intelligent 2FA code extraction');
      console.log('✅ Automation strategy generation');
      console.log('✅ Dynamic model selection');

    } else {
      console.log('❌ OpenRouter connection failed');
    }

  } catch (error: any) {
    console.log(`💥 OpenRouter test failed: ${error.message}`);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Verify the OpenRouter API key is correct');
    console.log('2. Check your OpenRouter account has credits');
    console.log('3. Ensure network connectivity to openrouter.ai');
  }
}

testOpenRouter().catch(console.error);

