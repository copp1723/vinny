import { AutonomousVinSolutionsAgent } from './src/agents/AutonomousVinSolutionsAgent';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🤖 Starting Autonomous VinSolutions Agent...');
  
  const config = {
    credentials: {
      username: 'ATSGlobal',
      password: 'Robsight1'
    },
    webhook: {
      baseUrl: 'https://3000-iv8nixdefzvfq6x4qg8da-645a6add.manusvm.computer'
    },
    notifications: {
      recipients: ['josh.copp@onekeel.ai']
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY || 'YOUR_MAILGUN_API_KEY',
      domain: 'universalsync.ai',
      from: 'vinny@universalsync.ai'
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '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'
    }
  };

  const agent = new AutonomousVinSolutionsAgent(config);
  
  try {
    // Use the new method that accepts report name
    const result = await agent.extractReport('Leaderboard');
    
    if (result.success) {
      console.log('✅ SUCCESS: Leaderboard report extracted successfully!');
      if (result.filePath) {
        console.log(`📊 Report saved to: ${result.filePath}`);
      }
    } else {
      console.log('❌ FAILED: Report extraction failed');
      console.log(`🚨 Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

main().catch(console.error);

