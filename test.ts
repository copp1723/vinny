import { VinSolutionsExtractor } from './src/VinSolutionsExtractor';

async function testExtractor() {
  console.log('🧪 Testing VinSolutions Extractor');
  console.log('=====================================');
  
  const extractor = new VinSolutionsExtractor();
  
  // You would replace these with real credentials
  const credentials = {
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD', 
    url: 'https://vinsolutions.app.coxautoinc.com/vinconnect/pane-both/vinconnect-dealer-dashboard'
  };

  console.log('⚠️  IMPORTANT: This is a REAL test that will:');
  console.log('   1. Open a visible browser window');
  console.log('   2. Navigate to VinSolutions');
  console.log('   3. Attempt to login with provided credentials');
  console.log('   4. Navigate to reports');
  console.log('   5. Find and download Lead Source ROI report');
  console.log('   6. Take screenshots at each step');
  console.log('');
  console.log('📁 Results will be saved to:');
  console.log('   - ./downloads/ (for reports)');
  console.log('   - ./screenshots/ (for debugging)');
  console.log('');
  
  if (credentials.username === 'YOUR_USERNAME') {
    console.log('❌ Please update credentials in test.ts before running');
    console.log('');
    console.log('To run this test:');
    console.log('1. npm install');
    console.log('2. Update credentials in test.ts');
    console.log('3. npm run test');
    return;
  }

  try {
    const result = await extractor.extractReport(credentials);
    
    console.log('');
    console.log('📊 EXTRACTION RESULT:');
    console.log('=====================');
    console.log(`Success: ${result.success}`);
    console.log(`Report: ${result.reportName}`);
    
    if (result.success) {
      console.log(`✅ Downloaded to: ${result.filePath}`);
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
  }
}

// Run the test
testExtractor().catch(console.error);

