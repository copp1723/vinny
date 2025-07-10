import { chromium } from 'playwright';

async function testLeaderboardExtraction() {
  console.log('🤖 Testing simple Leaderboard extraction...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to VinSolutions
    await page.goto('https://vinsolutions.app.coxautoinc.com/vinconnect/pane-both/vinconnect-dealer-dashboard');
    await page.waitForTimeout(3000);
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Josh Copp').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('Need to login...');
      // Login process would go here
      return;
    }
    
    console.log('✅ Already logged in');
    
    // Click Insights
    await page.locator('text=Insights').click();
    await page.waitForTimeout(3000);
    console.log('✅ Clicked Insights');
    
    // Click Favorites
    await page.locator('text=Favorites').click();
    await page.waitForTimeout(2000);
    console.log('✅ Clicked Favorites');
    
    // Find and click Leaderboard
    await page.locator('text=Leaderboard').click();
    await page.waitForTimeout(3000);
    console.log('✅ Clicked Leaderboard report');
    
    // Look for download button
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('text=Download').click();
    console.log('✅ Clicked Download');
    
    // Wait for download
    const download = await downloadPromise;
    const fileName = `leaderboard_${Date.now()}.xlsx`;
    await download.saveAs(`downloads/${fileName}`);
    console.log(`✅ Downloaded: ${fileName}`);
    
    console.log('🎉 SUCCESS! Leaderboard report extracted autonomously!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testLeaderboardExtraction();
