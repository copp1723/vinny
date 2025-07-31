#!/usr/bin/env ts-node

import { UnifiedVinSolutionsAgent, UnifiedTaskConfig } from './src/agents/UnifiedVinSolutionsAgent';
import { Logger } from './src/utils/Logger';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test Direct Report Download Approach
 * 
 * This test verifies that we can:
 * 1. Navigate directly to a specific report URL
 * 2. Click the download button using provided selectors
 * 3. Select PDF from the dropdown
 * 4. Successfully download the report
 */

async function testDirectReportDownload() {
  const logger = new Logger('DirectReportTest');
  
  console.log('🧪 Testing Direct Report Download Approach\n');
  console.log('Target URL:', 'https://reporting-vinsolutions.app.coxautoinc.com/...');
  console.log('Download Button:', '#lbl_ExportArrow');
  console.log('PDF Option:', '#lblExportPDF_rdPopupOptionItem\n');
  
  // Configuration for direct report download
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://reporting-vinsolutions.app.coxautoinc.com/VinAnalyticsDashboards/rdPage.aspx?rdReport=CoachingDashboard.Dashboard_Coaching_BDAgent&rdDebugGuid=3498ab99cb4a4a9a8dfde46b1598bf44&inputSelectDashboard=CoachingDashboard.Dashboard_Coaching_BDAgent&rdBookmarkCollection=onekeel6157_dashboardCollection&rdRnd=55339',
      taskType: 'custom',
      parameters: {
        customSelectors: [
          '#lbl_ExportArrow',                    // Download button
          '#lblExportPDF_rdPopupOptionItem'      // PDF option in dropdown
        ],
        description: 'Click download button, then select PDF from dropdown'
      }
    },
    authentication: {
      username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
      password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || ''
    },
    capabilities: {
      useVision: false,      // Start without vision for direct approach
      maxClicks: 3,          // Only need 2 clicks + authentication
      screenshotDebug: true  // Take screenshots for debugging
    },
    output: {
      downloadPath: './downloads/direct-report-test',
      webhookUrl: process.env.WEBHOOK_URL
    }
  };

  // Validate credentials
  if (!config.authentication.username || !config.authentication.password) {
    console.error('❌ Missing credentials! Set COX_USERNAME and COX_PASSWORD environment variables.');
    console.log('\nExample .env file:');
    console.log('COX_USERNAME=your-username');
    console.log('COX_PASSWORD=your-password\n');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting direct report download test...\n');
    
    // Create agent and execute task
    const agent = new UnifiedVinSolutionsAgent(config, logger);
    const result = await agent.executeTask();
    
    // Display results
    console.log('\n📊 Test Results:');
    console.log('─'.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`⏱️  Duration: ${result.metadata.duration}ms`);
    console.log(`🖱️  Clicks Used: ${result.metadata.clicksUsed}`);
    
    if (result.files && result.files.length > 0) {
      console.log(`📄 Files Downloaded: ${result.files.length}`);
      result.files.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
    // Test specific selectors approach
    if (result.data?.customResults) {
      console.log('\n🎯 Selector Results:');
      result.data.customResults.forEach((res: any, index: number) => {
        console.log(`${index + 1}. ${res.selector}: ${res.clicked ? '✅' : '❌'} ${res.error || ''}`);
      });
    }
    
    console.log('\n✨ Direct report download test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Try with vision if direct approach fails
    console.log('\n🔄 Retrying with AI vision enabled...');
    
    config.capabilities.useVision = true;
    
    try {
      const agent = new UnifiedVinSolutionsAgent(config, logger);
      const result = await agent.executeTask();
      
      console.log('\n📊 Vision-Enabled Results:');
      console.log('─'.repeat(50));
      console.log(`✅ Success: ${result.success}`);
      console.log(`🤖 Vision Calls: ${result.metadata.visionCallsMade || 0}`);
      
      if (result.files && result.files.length > 0) {
        console.log(`📄 Files Downloaded: ${result.files.length}`);
      }
      
    } catch (visionError) {
      console.error('❌ Vision approach also failed:', visionError);
    }
  }
}

// Alternative test using natural language
async function testNaturalLanguageApproach() {
  console.log('\n\n🧠 Testing Natural Language Approach...\n');
  
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://reporting-vinsolutions.app.coxautoinc.com/VinAnalyticsDashboards/rdPage.aspx?rdReport=CoachingDashboard.Dashboard_Coaching_BDAgent&rdDebugGuid=3498ab99cb4a4a9a8dfde46b1598bf44&inputSelectDashboard=CoachingDashboard.Dashboard_Coaching_BDAgent&rdBookmarkCollection=onekeel6157_dashboardCollection&rdRnd=55339',
      taskType: 'natural-language',
      naturalLanguageTask: 'Click the download button at the top right of the page, then select PDF from the dropdown menu'
    },
    authentication: {
      username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
      password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || ''
    },
    capabilities: {
      useVision: true,
      maxClicks: 5,
      screenshotDebug: true
    },
    output: {
      downloadPath: './downloads/nl-report-test'
    }
  };
  
  try {
    const logger = new Logger('NaturalLanguageTest');
    const agent = new UnifiedVinSolutionsAgent(config, logger);
    const result = await agent.executeTask();
    
    console.log('\n📊 Natural Language Results:');
    console.log('─'.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`🧠 AI Interpretation Confidence: ${result.confidence || 'N/A'}`);
    
    if (result.files && result.files.length > 0) {
      console.log(`📄 Files Downloaded: ${result.files.length}`);
    }
    
  } catch (error) {
    console.error('❌ Natural language approach failed:', error);
  }
}

// Run tests
async function runTests() {
  // First test direct approach
  await testDirectReportDownload();
  
  // Ask if user wants to test natural language approach
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\n\nWould you like to test the natural language approach? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await testNaturalLanguageApproach();
    }
    
    readline.close();
    process.exit(0);
  });
}

// Execute tests
runTests().catch(console.error);