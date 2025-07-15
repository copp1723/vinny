"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VinSolutionsAgent = void 0;
const Logger_1 = require("../utils/Logger");
const FileManager_1 = require("../utils/FileManager");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class VinSolutionsAgent {
    platformName = 'vinsolutions';
    page = null;
    browser = null;
    notte;
    logger;
    fileManager;
    config;
    isAuthenticated = false;
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger('VinSolutionsAgent');
        this.fileManager = new FileManager_1.FileManager();
        this.notte = new NotteClient({
            apiKey: process.env.NOTTE_API_KEY
        });
    }
    async initialize(browser) {
        this.browser = browser;
        this.page = await browser.newPage({
            viewport: this.config.viewport || { width: 1920, height: 1080 },
            userAgent: this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        // Set up download handling
        await this.setupDownloadHandling();
        this.logger.info('VinSolutions agent initialized');
    }
    async setupDownloadHandling() {
        if (!this.page)
            throw new Error('Page not initialized');
        this.page.on('download', async (download) => {
            const suggestedFilename = download.suggestedFilename();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}_${suggestedFilename}`;
            const downloadPath = path_1.default.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
            await fs_extra_1.default.ensureDir(path_1.default.dirname(downloadPath));
            await download.saveAs(downloadPath);
            this.logger.info(`Downloaded file: ${filename}`, { path: downloadPath });
        });
    }
    async login(credentials) {
        if (!this.page)
            throw new Error('Agent not initialized');
        try {
            this.logger.info('Starting VinSolutions login process');
            // Navigate to VinSolutions login
            await this.page.goto(credentials.url, {
                waitUntil: 'networkidle',
                timeout: this.config.timeout
            });
            // Use Notte's perception to understand the login page
            const perception = await this.perceivePage();
            this.logger.debug('Login page perception', { perception: perception.markdown });
            // Find username field using perception
            const usernameField = await this.findElementByDescription('username input field');
            if (usernameField.success && usernameField.element) {
                await this.page.click(`xpath=${usernameField.element.xpath}`);
                await this.page.fill(`xpath=${usernameField.element.xpath}`, credentials.username);
            }
            else {
                // Fallback to traditional selectors
                await this.page.fill('input[name="username"], input[type="email"], #username', credentials.username);
            }
            // Find password field using perception
            const passwordField = await this.findElementByDescription('password input field');
            if (passwordField.success && passwordField.element) {
                await this.page.click(`xpath=${passwordField.element.xpath}`);
                await this.page.fill(`xpath=${passwordField.element.xpath}`, credentials.password);
            }
            else {
                // Fallback to traditional selectors
                await this.page.fill('input[name="password"], input[type="password"], #password', credentials.password);
            }
            // Find and click login button using perception
            const loginButton = await this.findElementByDescription('login button');
            if (loginButton.success && loginButton.element) {
                await this.page.click(`xpath=${loginButton.element.xpath}`);
            }
            else {
                // Fallback to traditional selectors
                await this.page.click('button[type="submit"], input[type="submit"], .login-button');
            }
            // Wait for navigation and verify login
            await this.page.waitForLoadState('networkidle');
            // Check if we're on the dashboard
            const currentUrl = this.page.url();
            this.isAuthenticated = currentUrl.includes('dealer-dashboard') || currentUrl.includes('dashboard');
            if (this.isAuthenticated) {
                this.logger.info('Successfully logged into VinSolutions');
                return true;
            }
            else {
                this.logger.error('Login failed - not redirected to dashboard');
                return false;
            }
        }
        catch (error) {
            this.logger.error('Login failed', { error: error.message });
            if (this.config.screenshotOnError) {
                await this.takeErrorScreenshot('login_failed');
            }
            return false;
        }
    }
    async navigateToReports() {
        if (!this.page || !this.isAuthenticated) {
            throw new Error('Must be logged in before navigating to reports');
        }
        try {
            this.logger.info('Navigating to reports section using 3-click workflow');
            // Step 1: Click the Insights tab in the main navigation
            this.logger.debug('Clicking on Insights tab');
            const insightsSelectors = [
                '//div[@id="tab-insights"]/a', // Exact XPath provided
                '#tab-insights a', // CSS selector alternative
                'a:has-text("Insights")', // Text-based selector
                'text=Insights' // Simple text selector
            ];
            let insightsClicked = false;
            for (const selector of insightsSelectors) {
                try {
                    const element = selector.startsWith('//')
                        ? this.page.locator(`xpath=${selector}`)
                        : this.page.locator(selector);
                    if (await element.isVisible({ timeout: 5000 })) {
                        await element.click();
                        this.logger.debug(`Clicked Insights tab using selector: ${selector}`);
                        insightsClicked = true;
                        break;
                    }
                }
                catch (e) {
                    this.logger.debug(`Failed to click Insights using selector: ${selector}`);
                    continue;
                }
            }
            if (!insightsClicked) {
                this.logger.error('Failed to click Insights tab');
                if (this.config.screenshotOnError) {
                    await this.takeErrorScreenshot('insights_tab_not_found');
                }
                return false;
            }
            // Step 2: Wait for the reports iframe to load
            this.logger.debug('Waiting for report frame to load');
            const reportFrame = await this.getReportFrame();
            if (!reportFrame) {
                this.logger.error('Report frame not found');
                if (this.config.screenshotOnError) {
                    await this.takeErrorScreenshot('report_frame_not_found');
                }
                return false;
            }
            // Step 3: Click on the Favorites tab inside the iframe
            this.logger.debug('Clicking on Favorites tab');
            const favoritesSelectors = [
                'text=Favorites',
                'a:has-text("Favorites")',
                '.filter-favorites',
                'a.favorites-link'
            ];
            let favoritesClicked = false;
            for (const selector of favoritesSelectors) {
                try {
                    const element = reportFrame.locator(selector);
                    if (await element.isVisible({ timeout: 5000 })) {
                        await element.click();
                        this.logger.debug(`Clicked Favorites tab using selector: ${selector}`);
                        favoritesClicked = true;
                        break;
                    }
                }
                catch (e) {
                    this.logger.debug(`Failed to click Favorites using selector: ${selector}`);
                    continue;
                }
            }
            if (!favoritesClicked) {
                this.logger.error('Failed to click Favorites tab');
                if (this.config.screenshotOnError) {
                    await this.takeErrorScreenshot('favorites_tab_not_found');
                }
                return false;
            }
            // Step 4: Wait for the favorites list to render
            this.logger.debug('Waiting for favorites list to render');
            const tableLoaded = await reportFrame.locator('table tbody tr').first().isVisible({ timeout: 10000 })
                .catch(() => false);
            if (!tableLoaded) {
                this.logger.error('Favorites list did not load');
                if (this.config.screenshotOnError) {
                    await this.takeErrorScreenshot('favorites_list_not_loaded');
                }
                return false;
            }
            this.logger.info('Successfully navigated to reports and loaded favorites');
            return true;
        }
        catch (error) {
            this.logger.error('Navigation to reports failed', { error: error.message });
            if (this.config.screenshotOnError) {
                await this.takeErrorScreenshot('navigation_failed');
            }
            return false;
        }
    }
    async getReportFrame() {
        if (!this.page)
            return null;
        try {
            // Wait for the iframe to be available
            const frameSelectors = [
                '#reportFrame',
                'iframe[id="reportFrame"]',
                'iframe[name="reportFrame"]'
            ];
            for (const selector of frameSelectors) {
                try {
                    // First check if the iframe element exists and is visible
                    const frameElement = this.page.locator(selector);
                    if (await frameElement.isVisible({ timeout: this.config.timeout / 2 })) {
                        // Get the frame locator
                        const frameLocator = this.page.frameLocator(selector);
                        // Verify the frame is accessible by checking for some content
                        const hasContent = await frameLocator.locator('body').isVisible({ timeout: this.config.timeout / 2 })
                            .catch(() => false);
                        if (hasContent) {
                            this.logger.debug(`Found report frame using selector: ${selector}`);
                            return frameLocator;
                        }
                    }
                }
                catch (e) {
                    this.logger.debug(`Frame selector failed: ${selector}`);
                    continue;
                }
            }
            this.logger.error('Could not find or access report frame');
            return null;
        }
        catch (error) {
            this.logger.error('Error getting report frame', { error: error.message });
            return null;
        }
    }
    async extractReport(request) {
        const startTime = Date.now();
        if (!this.page || !this.isAuthenticated) {
            throw new Error('Must be logged in before extracting reports');
        }
        try {
            this.logger.info(`Starting extraction of report: ${request.reportName || 'first available report'}`);
            // Step 1: Find the report in the list
            const reportFound = await this.findAndSelectReport(request.reportName);
            if (!reportFound) {
                throw new Error(`Report ${request.reportName ? `"${request.reportName}"` : ''} not found`);
            }
            // Step 2: Click the report to open it
            await this.openReport(request.reportName);
            // Step 3: Wait for report to load and find download button
            await this.page.waitForLoadState('networkidle');
            // Step 4: Download the report
            const downloadResult = await this.downloadReport(request);
            const executionTime = Date.now() - startTime;
            const result = {
                success: true,
                reportName: request.reportName || 'Unnamed Report',
                filePath: downloadResult.filePath,
                metadata: {
                    extractedAt: new Date().toISOString(),
                    platform: this.platformName,
                    fileSize: downloadResult.fileSize,
                    fileType: downloadResult.fileType
                },
                attempt: 1,
                executionTime
            };
            this.logger.info(`Successfully extracted report: ${result.reportName}`, result);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Failed to extract report: ${request.reportName || 'Unnamed Report'}`, { error: error.message });
            if (this.config.screenshotOnError) {
                await this.takeErrorScreenshot(`extraction_failed_${request.reportName || 'unnamed'}`);
            }
            return {
                success: false,
                reportName: request.reportName || 'Unnamed Report',
                metadata: {
                    extractedAt: new Date().toISOString(),
                    platform: this.platformName,
                },
                error: error.message,
                attempt: 1,
                executionTime
            };
        }
    }
    async findAndSelectReport(reportName) {
        try {
            // Get the report frame
            const reportFrame = await this.getReportFrame();
            if (!reportFrame) {
                throw new Error('Report frame not found');
            }
            this.logger.debug(`Looking for report: ${reportName || 'first available'}`);
            if (reportName) {
                // Look for the specific report by name
                const reportRow = reportFrame.locator(`text=${reportName}`).first();
                if (await reportRow.isVisible({ timeout: 5000 })) {
                    this.logger.info(`Found report: ${reportName}`);
                    return true;
                }
                else {
                    this.logger.error(`Report not found: ${reportName}`);
                    return false;
                }
            }
            else {
                // If no specific report name, just check if there's at least one report in the list
                const firstReport = reportFrame.locator('table tbody tr').first();
                if (await firstReport.isVisible({ timeout: 5000 })) {
                    this.logger.info('Found first available report');
                    return true;
                }
                else {
                    this.logger.error('No reports found in favorites list');
                    return false;
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to find report: ${reportName || 'first available'}`, { error: error.message });
            return false;
        }
    }
    async openReport(reportName) {
        // Get the report frame
        const reportFrame = await this.getReportFrame();
        if (!reportFrame) {
            throw new Error('Report frame not found');
        }
        try {
            // Find the report link
            const reportLink = reportName
                ? reportFrame.locator(`text=${reportName}`).first()
                : reportFrame.locator('table tbody tr td a').first();
            if (!await reportLink.isVisible({ timeout: 5000 })) {
                throw new Error(`Report link ${reportName || 'first available'} not visible`);
            }
            // Set up listener for new page before clicking
            this.logger.debug('Setting up new page listener before clicking report');
            const newPagePromise = this.page.context().waitForEvent('page', { timeout: 30000 });
            // Click the report link
            await reportLink.click();
            // Wait for the new page to open
            this.logger.debug('Waiting for new page to open');
            const newPage = await newPagePromise;
            // Switch to the new page
            this.page = newPage;
            // Wait for the report to load in the new page
            await this.page.waitForLoadState('networkidle');
            this.logger.info(`Opened report: ${reportName || 'first available'} in new tab`);
        }
        catch (error) {
            this.logger.error(`Failed to open report: ${reportName || 'first available'}`, { error: error.message });
            throw error;
        }
    }
    async downloadReport(request) {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            // Get the preferred file type (default to CSV if not specified)
            const fileType = (request && 'fileType' in request) ? request.fileType || 'CSV' : 'CSV';
            this.logger.debug(`Attempting to download report as ${fileType}`);
            // Click the download arrow button
            const downloadArrowSelectors = [
                '#lbl_ExportArrow',
                'xpath=//*[@id="lbl_ExportArrow"]',
                'button:has-text("Download")',
                '.download-button'
            ];
            let arrowClicked = false;
            for (const selector of downloadArrowSelectors) {
                try {
                    const element = selector.startsWith('xpath=')
                        ? this.page.locator(selector)
                        : this.page.locator(selector);
                    if (await element.isVisible({ timeout: 5000 })) {
                        await element.click();
                        this.logger.debug(`Clicked download arrow using selector: ${selector}`);
                        arrowClicked = true;
                        break;
                    }
                }
                catch (e) {
                    this.logger.debug(`Failed to click download arrow using selector: ${selector}`);
                    continue;
                }
            }
            if (!arrowClicked) {
                throw new Error('Download arrow button not found');
            }
            // Wait for dropdown menu to appear
            await this.page.waitForSelector('text=Excel, text=CSV, text=PDF', { timeout: 5000 })
                .catch(() => {
                throw new Error('Download format dropdown did not appear');
            });
            // Select the file format from the dropdown
            let formatSelector;
            switch (fileType.toUpperCase()) {
                case 'EXCEL':
                    formatSelector = 'text=Excel';
                    break;
                case 'PDF':
                    formatSelector = 'text=PDF';
                    break;
                case 'CSV':
                default:
                    formatSelector = 'text=CSV';
                    break;
            }
            // Set up download promise before clicking the format
            const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
            // Click the format option
            await this.page.click(formatSelector);
            this.logger.debug(`Selected download format: ${fileType}`);
            // Wait for the download to start
            const download = await downloadPromise;
            const suggestedFilename = download.suggestedFilename();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}_${suggestedFilename}`;
            const downloadPath = path_1.default.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
            // Ensure the download directory exists
            await fs_extra_1.default.ensureDir(path_1.default.dirname(downloadPath));
            // Save the downloaded file
            await download.saveAs(downloadPath);
            // Get the file size
            const stats = await fs_extra_1.default.stat(downloadPath);
            this.logger.info(`Downloaded report as ${fileType}: ${filename} (${stats.size} bytes)`);
            return {
                filePath: downloadPath,
                fileSize: stats.size,
                fileType: fileType
            };
        }
        catch (error) {
            this.logger.error('Failed to download report', { error: error.message });
            throw error;
        }
    }
    async perceivePage() {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            // Use Notte's perception to understand the current page
            const screenshot = await this.page.screenshot();
            // This would be the actual Notte API call
            // For now, we'll create a mock structure
            return {
                markdown: "Mock perception - would be replaced with actual Notte API call",
                elements: [],
                actions: []
            };
        }
        catch (error) {
            this.logger.error('Failed to perceive page', { error: error.message });
            throw error;
        }
    }
    async findElementByDescription(description) {
        try {
            // This would use AI vision to find elements by description
            // For now, return a mock result
            return {
                success: false,
                error: 'Vision integration not yet implemented'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async takeErrorScreenshot(context) {
        if (!this.page)
            return;
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `error_${context}_${timestamp}.png`;
            const screenshotPath = path_1.default.join('./screenshots', filename);
            await fs_extra_1.default.ensureDir(path_1.default.dirname(screenshotPath));
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.logger.info(`Error screenshot saved: ${filename}`);
        }
        catch (error) {
            this.logger.error('Failed to take error screenshot', { error: error.message });
        }
    }
    async logout() {
        if (!this.page)
            return;
        try {
            // Look for logout button/link
            const logoutSelectors = [
                'text=Logout',
                'text=Sign Out',
                '[data-testid*="logout"]',
                '.logout-button'
            ];
            for (const selector of logoutSelectors) {
                try {
                    if (await this.page.locator(selector).isVisible()) {
                        await this.page.click(selector);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            this.isAuthenticated = false;
            this.logger.info('Logged out of VinSolutions');
        }
        catch (error) {
            this.logger.error('Logout failed', { error: error.message });
        }
    }
    async isLoggedIn() {
        if (!this.page)
            return false;
        try {
            const currentUrl = this.page.url();
            return this.isAuthenticated &&
                (currentUrl.includes('dealer-dashboard') || currentUrl.includes('dashboard'));
        }
        catch (error) {
            return false;
        }
    }
    async close() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        this.isAuthenticated = false;
        this.logger.info('VinSolutions agent closed');
    }
}
exports.VinSolutionsAgent = VinSolutionsAgent;
//# sourceMappingURL=VinSolutionsAgent.js.map