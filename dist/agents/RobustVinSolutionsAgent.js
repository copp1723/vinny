"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobustVinSolutionsAgent = void 0;
const Logger_1 = require("../utils/Logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class RobustVinSolutionsAgent {
    logger;
    browser = null;
    page = null;
    downloadDir;
    screenshotDir;
    screenshots = [];
    usedStrategies = [];
    constructor(config) {
        this.logger = new Logger_1.Logger('RobustVinSolutionsAgent');
        this.downloadDir = config.downloadDir;
        this.screenshotDir = config.screenshotDir;
    }
    async initialize(browser, page) {
        this.browser = browser;
        this.page = page;
        // Ensure directories exist
        await fs_extra_1.default.ensureDir(this.downloadDir);
        await fs_extra_1.default.ensureDir(this.screenshotDir);
        // Set up advanced download handling
        await this.setupAdvancedDownloadHandling();
        this.logger.info('Robust VinSolutions Agent initialized');
    }
    async setupAdvancedDownloadHandling() {
        if (!this.page)
            return;
        // Enhanced download event handler
        this.page.on('download', async (download) => {
            try {
                const suggestedFilename = download.suggestedFilename();
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${timestamp}_${suggestedFilename}`;
                const downloadPath = path_1.default.join(this.downloadDir, filename);
                await download.saveAs(downloadPath);
                this.logger.info(`Download captured: ${filename}`);
            }
            catch (error) {
                this.logger.error('Download handling error', { error: error.message });
            }
        });
        // Also monitor for file downloads via fetch/XHR
        await this.page.route('**/*', async (route) => {
            const request = route.request();
            const url = request.url();
            // Check if this might be a report download
            if (url.includes('download') || url.includes('export') || url.includes('report')) {
                this.logger.debug('Potential download detected', { url });
            }
            await route.continue();
        });
    }
    async navigateToReportsWithStrategies() {
        this.logger.info('Navigating to reports using multiple strategies');
        // Strategy 1: Direct Insights tab click with multiple selectors
        const strategy1 = await this.tryStrategy('Direct Insights Tab', async () => {
            const insightsSelectors = [
                '//div[@id="tab-insights"]/a',
                '#tab-insights a',
                'a:has-text("Insights")',
                'text=Insights',
                '[data-testid*="insights"]',
                'button:has-text("Insights")',
                '.insights-tab',
                '[role="tab"]:has-text("Insights")'
            ];
            for (const selector of insightsSelectors) {
                try {
                    const element = await this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 3000 })) {
                        await element.click();
                        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
                        return true;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            return false;
        });
        if (strategy1) {
            await this.takeScreenshot('after-insights-click');
            return await this.accessFavoritesTab();
        }
        // Strategy 2: Navigate via URL manipulation
        const strategy2 = await this.tryStrategy('URL Navigation', async () => {
            const currentUrl = this.page.url();
            if (currentUrl.includes('vinconnect')) {
                const reportsUrl = currentUrl.replace(/\/[^/]*$/, '/reports');
                await this.page.goto(reportsUrl, { waitUntil: 'networkidle' });
                return true;
            }
            return false;
        });
        if (strategy2) {
            return await this.accessFavoritesTab();
        }
        // Strategy 3: Use keyboard navigation
        const strategy3 = await this.tryStrategy('Keyboard Navigation', async () => {
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            // Press Tab multiple times to navigate to Insights
            for (let i = 0; i < 10; i++) {
                const activeElement = await this.page.evaluate(() => {
                    return document.activeElement?.textContent || '';
                });
                if (activeElement.toLowerCase().includes('insights')) {
                    await this.page.keyboard.press('Enter');
                    await this.page.waitForLoadState('networkidle');
                    return true;
                }
                await this.page.keyboard.press('Tab');
                await this.page.waitForTimeout(200);
            }
            return false;
        });
        if (strategy3) {
            return await this.accessFavoritesTab();
        }
        return false;
    }
    async accessFavoritesTab() {
        this.logger.info('Accessing Favorites tab with multiple strategies');
        // Strategy 1: Find and interact with report frame
        const frameStrategy = await this.tryStrategy('Report Frame Interaction', async () => {
            const reportFrame = await this.getReportFrameWithRetries();
            if (!reportFrame)
                return false;
            // Multiple selectors for Favorites tab
            const favoritesSelectors = [
                'text=Favorites',
                'a:has-text("Favorites")',
                '.filter-favorites',
                'a.favorites-link',
                '[data-testid*="favorites"]',
                'button:has-text("Favorites")',
                '[role="tab"]:has-text("Favorites")',
                '//a[contains(text(), "Favorites")]'
            ];
            for (const selector of favoritesSelectors) {
                try {
                    const element = reportFrame.locator(selector).first();
                    if (await element.isVisible({ timeout: 3000 })) {
                        await element.click();
                        await this.page.waitForTimeout(2000);
                        // Verify favorites loaded
                        const tableVisible = await reportFrame.locator('table tbody tr').first().isVisible({ timeout: 5000 })
                            .catch(() => false);
                        if (tableVisible) {
                            this.logger.info('Successfully accessed Favorites tab');
                            return true;
                        }
                    }
                }
                catch (e) {
                    continue;
                }
            }
            return false;
        });
        if (frameStrategy) {
            await this.takeScreenshot('favorites-loaded');
            return true;
        }
        // Strategy 2: Direct page navigation to favorites
        const directNavStrategy = await this.tryStrategy('Direct Favorites Navigation', async () => {
            // Try to find favorites outside of iframe
            const favoritesOnPage = await this.page.locator('text=Favorites').first();
            if (await favoritesOnPage.isVisible({ timeout: 3000 })) {
                await favoritesOnPage.click();
                await this.page.waitForTimeout(2000);
                return true;
            }
            return false;
        });
        return directNavStrategy;
    }
    async getReportFrameWithRetries() {
        const frameSelectors = [
            '#reportFrame',
            'iframe[id="reportFrame"]',
            'iframe[name="reportFrame"]',
            'iframe[src*="report"]',
            'iframe[src*="analytics"]',
            'iframe'
        ];
        for (let retry = 0; retry < 3; retry++) {
            for (const selector of frameSelectors) {
                try {
                    const frameElement = this.page.locator(selector).first();
                    if (await frameElement.isVisible({ timeout: 5000 })) {
                        const frameLocator = this.page.frameLocator(selector);
                        // Verify frame is accessible
                        const hasContent = await frameLocator.locator('body').isVisible({ timeout: 3000 })
                            .catch(() => false);
                        if (hasContent) {
                            this.logger.debug(`Found report frame: ${selector}`);
                            return frameLocator;
                        }
                    }
                }
                catch (e) {
                    continue;
                }
            }
            // Wait before retry
            if (retry < 2) {
                await this.page.waitForTimeout(2000);
            }
        }
        return null;
    }
    async extractLeadSourceROIWithStrategies() {
        const startTime = Date.now();
        this.screenshots = [];
        this.usedStrategies = [];
        try {
            this.logger.info('Starting robust Lead Source ROI extraction');
            // Navigate to reports and favorites
            const navSuccess = await this.navigateToReportsWithStrategies();
            if (!navSuccess) {
                throw new Error('Failed to navigate to reports/favorites');
            }
            // Find and click the report
            const reportClicked = await this.findAndClickReport();
            if (!reportClicked) {
                throw new Error('Could not find or click Lead Source ROI report');
            }
            // Download the report
            const downloadPath = await this.downloadReportWithStrategies();
            if (!downloadPath) {
                throw new Error('Failed to download report');
            }
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                reportPath: downloadPath,
                reportName: 'Lead Source ROI',
                platformName: 'VinSolutions',
                extractedAt: new Date().toISOString(),
                executionTime,
                screenshots: this.screenshots,
                strategies: this.usedStrategies
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error('Extraction failed', {
                error: error.message,
                strategies: this.usedStrategies
            });
            await this.takeScreenshot('extraction-failed');
            return {
                success: false,
                reportName: 'Lead Source ROI',
                platformName: 'VinSolutions',
                extractedAt: new Date().toISOString(),
                executionTime,
                error: error.message,
                screenshots: this.screenshots,
                strategies: this.usedStrategies
            };
        }
    }
    async findAndClickReport() {
        this.logger.info('Finding and clicking Lead Source ROI report');
        // Strategy 1: Click within iframe
        const iframeStrategy = await this.tryStrategy('Iframe Report Click', async () => {
            const reportFrame = await this.getReportFrameWithRetries();
            if (!reportFrame)
                return false;
            const reportSelectors = [
                'text="Lead Source ROI"',
                'a:has-text("Lead Source ROI")',
                'td:has-text("Lead Source ROI")',
                '//a[contains(text(), "Lead Source ROI")]',
                '//td[contains(text(), "Lead Source ROI")]//a'
            ];
            for (const selector of reportSelectors) {
                try {
                    const element = reportFrame.locator(selector).first();
                    if (await element.isVisible({ timeout: 5000 })) {
                        // Some reports open in new tabs
                        const newPagePromise = this.page.context().waitForEvent('page', { timeout: 10000 })
                            .catch(() => null);
                        await element.click();
                        // Check if new page opened
                        const newPage = await newPagePromise;
                        if (newPage) {
                            this.page = newPage;
                            await this.page.waitForLoadState('networkidle');
                            this.logger.info('Report opened in new tab');
                        }
                        else {
                            await this.page.waitForLoadState('networkidle');
                        }
                        return true;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            return false;
        });
        if (iframeStrategy) {
            await this.takeScreenshot('report-opened');
            return true;
        }
        // Strategy 2: Direct page click
        const directClickStrategy = await this.tryStrategy('Direct Report Click', async () => {
            const reportLink = this.page.locator('text="Lead Source ROI"').first();
            if (await reportLink.isVisible({ timeout: 5000 })) {
                await reportLink.click();
                await this.page.waitForLoadState('networkidle');
                return true;
            }
            return false;
        });
        return directClickStrategy;
    }
    async downloadReportWithStrategies() {
        this.logger.info('Downloading report using multiple strategies');
        // Strategy 1: Click download button with download promise
        const downloadButtonStrategy = await this.tryStrategy('Download Button Click', async () => {
            const downloadSelectors = [
                '#lbl_ExportArrow',
                '//a[@id="lbl_ExportArrow"]',
                'text=Download',
                'button:has-text("Download")',
                'a:has-text("Download")',
                '[data-testid*="download"]',
                '.download-button',
                '[title*="Download"]',
                '[aria-label*="Download"]'
            ];
            for (const selector of downloadSelectors) {
                try {
                    const element = this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 5000 })) {
                        // For dropdown arrows, handle the menu
                        if (selector.includes('ExportArrow')) {
                            await element.click();
                            await this.page.waitForTimeout(1000);
                            // Click CSV option
                            const csvOption = this.page.locator('text=CSV').first();
                            if (await csvOption.isVisible({ timeout: 3000 })) {
                                const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
                                await csvOption.click();
                                const download = await downloadPromise;
                                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                                const downloadPath = path_1.default.join(this.downloadDir, `lead-source-roi-${timestamp}.csv`);
                                await download.saveAs(downloadPath);
                                return downloadPath;
                            }
                        }
                        else {
                            // Direct download button
                            const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
                            await element.click();
                            const download = await downloadPromise;
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const filename = download.suggestedFilename();
                            const downloadPath = path_1.default.join(this.downloadDir, `${timestamp}_${filename}`);
                            await download.saveAs(downloadPath);
                            return downloadPath;
                        }
                    }
                }
                catch (e) {
                    this.logger.debug(`Download selector failed: ${selector}`);
                    continue;
                }
            }
            return null;
        });
        if (downloadButtonStrategy) {
            await this.takeScreenshot('download-completed');
            return downloadButtonStrategy;
        }
        // Strategy 2: Intercept network download
        const networkStrategy = await this.tryStrategy('Network Download Interception', async () => {
            // Set up response listener for downloads
            const downloadPromise = new Promise((resolve) => {
                this.page.on('response', async (response) => {
                    const url = response.url();
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('csv') ||
                        contentType.includes('excel') ||
                        contentType.includes('spreadsheet') ||
                        url.includes('download') ||
                        url.includes('export')) {
                        const buffer = await response.body();
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const extension = contentType.includes('csv') ? 'csv' : 'xlsx';
                        const downloadPath = path_1.default.join(this.downloadDir, `lead-source-roi-${timestamp}.${extension}`);
                        await fs_extra_1.default.writeFile(downloadPath, buffer);
                        resolve(downloadPath);
                    }
                });
            });
            // Trigger download through various means
            await this.page.keyboard.press('Control+S');
            const downloadPath = await Promise.race([
                downloadPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Network download timeout')), 10000))
            ]).catch(() => null);
            return downloadPath;
        });
        return networkStrategy;
    }
    async tryStrategy(name, strategy) {
        this.logger.debug(`Trying strategy: ${name}`);
        this.usedStrategies.push(name);
        try {
            const result = await strategy();
            if (result) {
                this.logger.info(`Strategy succeeded: ${name}`);
            }
            return result;
        }
        catch (error) {
            this.logger.debug(`Strategy failed: ${name}`, { error: error.message });
            return null;
        }
    }
    async takeScreenshot(name) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${name}-${timestamp}.png`;
            const screenshotPath = path_1.default.join(this.screenshotDir, filename);
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true,
                animations: 'disabled'
            });
            this.screenshots.push(screenshotPath);
            this.logger.debug(`Screenshot saved: ${filename}`);
        }
        catch (error) {
            this.logger.warn('Failed to take screenshot', { error: error.message, name });
        }
    }
}
exports.RobustVinSolutionsAgent = RobustVinSolutionsAgent;
//# sourceMappingURL=RobustVinSolutionsAgent.js.map