"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteVinSolutionsAgent = void 0;
const playwright_1 = require("playwright");
const MailgunService_1 = require("../services/MailgunService");
const OpenRouterService_1 = require("../services/OpenRouterService");
const EmailService_1 = require("../services/EmailService");
const Logger_1 = require("../utils/Logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class CompleteVinSolutionsAgent {
    config;
    logger;
    mailgunService;
    emailService;
    openRouterService;
    browser = null;
    page = null;
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger('CompleteVinSolutionsAgent');
        // Initialize services
        this.mailgunService = new MailgunService_1.MailgunService({
            apiKey: config.mailgun.apiKey,
            domain: config.mailgun.domain,
            fromEmail: config.mailgun.fromEmail,
            fromName: config.mailgun.fromName || 'VinSolutions AI Agent'
        });
        this.emailService = new EmailService_1.EmailService({
            smtp: {
                host: 'smtp.gmail.com', // Not used for sending, but required
                port: 587,
                secure: false,
                auth: config.gmail.imap.auth
            },
            imap: config.gmail.imap,
            agentEmail: config.gmail.agentEmail,
            reportRecipients: config.reportRecipients
        });
        this.openRouterService = new OpenRouterService_1.OpenRouterService({
            apiKey: config.openrouter.apiKey,
            baseURL: config.openrouter.baseURL,
            defaultModel: config.openrouter.defaultModel
        });
    }
    async initialize() {
        try {
            // Ensure directories exist
            await fs_extra_1.default.ensureDir(this.config.downloadDir);
            await fs_extra_1.default.ensureDir(this.config.screenshotDir);
            // Initialize services
            await this.emailService.initialize();
            this.logger.info('Complete VinSolutions Agent initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize agent', { error: error.message });
            throw error;
        }
    }
    async extractLeadSourceROI() {
        // Default report name - can be made configurable via UI
        return await this.extractReport({ reportName: 'Lead Source ROI' });
    }
    async extractReport(request) {
        const startTime = Date.now();
        const screenshots = [];
        // Validate request
        if (!request.reportName && !request.reportIndex) {
            throw new Error('Must provide either reportName or reportIndex');
        }
        // Use report name or index-based description
        const reportIdentifier = request.reportName || `Report #${request.reportIndex}`;
        try {
            this.logger.info(`Starting ${reportIdentifier} extraction`);
            // Send start notification
            await this.mailgunService.sendNotificationEmail('VinSolutions Extraction Started', `The AI agent has begun extracting "${reportIdentifier}" from VinSolutions. You will receive another email when the process is complete.`, this.config.reportRecipients);
            // Launch browser
            this.browser = await playwright_1.chromium.launch({
                headless: false, // Set to true for production
                slowMo: 1000 // Slow down for demonstration
            });
            this.page = await this.browser.newPage();
            // Step 1: Navigate to VinSolutions
            this.logger.info('Navigating to VinSolutions');
            await this.page.goto(this.config.vinsolutions.url);
            await this.takeScreenshot(screenshots, 'login-page');
            // Step 2: Login with AI assistance
            await this.performLogin(screenshots);
            // Step 3: Navigate to reports and favorites
            await this.navigateToReports(screenshots);
            // Step 4: Find and extract the specified report from Favorites
            const reportPath = await this.extractReportFromFavorites(request, screenshots);
            const executionTime = Date.now() - startTime;
            const result = {
                success: true,
                reportPath,
                reportName: reportIdentifier,
                platformName: 'VinSolutions',
                extractedAt: new Date().toISOString(),
                executionTime,
                screenshots
            };
            // Send success notification and report
            await this.sendSuccessNotification(result);
            this.logger.info(`${reportIdentifier} extraction completed successfully`, {
                executionTime,
                reportPath
            });
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`${reportIdentifier} extraction failed`, {
                error: error.message,
                executionTime
            });
            const result = {
                success: false,
                reportName: reportIdentifier,
                platformName: 'VinSolutions',
                extractedAt: new Date().toISOString(),
                executionTime,
                error: error.message,
                screenshots
            };
            // Send failure notification
            await this.sendFailureNotification(result);
            return result;
        }
        finally {
            await this.cleanup();
        }
    }
    async performLogin(screenshots) {
        this.logger.info('Performing login');
        // Wait for page to load
        await this.page.waitForTimeout(2000);
        // Enter username
        const usernameSelector = 'input[name="username"], input[type="email"], #username, input[placeholder*="username"], input[placeholder*="email"]';
        await this.page.waitForSelector(usernameSelector, { timeout: 10000 });
        await this.page.fill(usernameSelector, this.config.vinsolutions.username);
        await this.takeScreenshot(screenshots, 'username-entered');
        // Click Next or continue
        try {
            const nextButton = 'button:has-text("Next"), input[type="submit"], button[type="submit"], button:has-text("Continue")';
            await this.page.click(nextButton);
            await this.page.waitForTimeout(3000);
        }
        catch {
            // If no Next button, continue
        }
        // Enter password
        const passwordSelector = 'input[name="password"], input[type="password"], #password, input[placeholder*="password"]';
        await this.page.waitForSelector(passwordSelector, { timeout: 10000 });
        await this.page.fill(passwordSelector, this.config.vinsolutions.password);
        await this.takeScreenshot(screenshots, 'password-entered');
        // Click Sign In
        const signInButton = 'button:has-text("Sign"), input[type="submit"], button[type="submit"], button:has-text("Login")';
        await this.page.click(signInButton);
        await this.page.waitForTimeout(5000);
        await this.takeScreenshot(screenshots, 'after-login-attempt');
        // Handle 2FA if present
        await this.handle2FA(screenshots);
    }
    async handle2FA(screenshots) {
        try {
            // Check if 2FA is required by looking for common 2FA indicators
            const twoFactorIndicators = [
                'text=verification',
                'text=code',
                'text=authenticate',
                'text=two-factor',
                'text=2FA',
                'input[placeholder*="code"]',
                'input[name*="code"]'
            ];
            let has2FA = false;
            for (const indicator of twoFactorIndicators) {
                const count = await this.page.locator(indicator).count();
                if (count > 0) {
                    has2FA = true;
                    break;
                }
            }
            if (has2FA) {
                this.logger.info('2FA detected, waiting for email code');
                await this.takeScreenshot(screenshots, '2fa-required');
                // Select email option if available
                try {
                    const emailOptions = [
                        'text=email',
                        '[data-testid*="email"]',
                        'button:has-text("email")',
                        'input[value*="email"]'
                    ];
                    for (const option of emailOptions) {
                        const count = await this.page.locator(option).count();
                        if (count > 0) {
                            await this.page.click(option);
                            await this.page.waitForTimeout(2000);
                            break;
                        }
                    }
                }
                catch {
                    // Email might already be selected
                }
                // Wait for 2FA code via email
                this.logger.info('Waiting for 2FA code from email...');
                const twoFactorCode = await this.emailService.waitForTwoFactorCode(300000, 'vinsolutions.com');
                this.logger.info(`Received 2FA code: ${twoFactorCode.code}`);
                // Enter the code
                const codeInputs = [
                    'input[type="text"]',
                    'input[type="number"]',
                    'input[name*="code"]',
                    'input[placeholder*="code"]'
                ];
                for (const input of codeInputs) {
                    const count = await this.page.locator(input).count();
                    if (count > 0) {
                        await this.page.fill(input, twoFactorCode.code);
                        break;
                    }
                }
                await this.takeScreenshot(screenshots, '2fa-code-entered');
                // Submit 2FA
                const submitButtons = [
                    'button:has-text("Verify")',
                    'button:has-text("Submit")',
                    'input[type="submit"]',
                    'button:has-text("Continue")'
                ];
                for (const button of submitButtons) {
                    const count = await this.page.locator(button).count();
                    if (count > 0) {
                        await this.page.click(button);
                        break;
                    }
                }
                await this.page.waitForTimeout(5000);
                await this.takeScreenshot(screenshots, 'after-2fa');
            }
        }
        catch (error) {
            this.logger.error('2FA handling failed', { error: error.message });
            throw error;
        }
    }
    async navigateToReports(screenshots) {
        this.logger.info('Navigating to reports section');
        // Wait for dashboard to load
        await this.page.waitForTimeout(5000);
        await this.takeScreenshot(screenshots, 'dashboard-loaded');
        // Click Insights tab
        const insightsSelectors = [
            'text=Insights',
            '[data-testid*="insights"]',
            'a:has-text("Insights")',
            'button:has-text("Insights")'
        ];
        for (const selector of insightsSelectors) {
            const count = await this.page.locator(selector).count();
            if (count > 0) {
                await this.page.click(selector);
                await this.page.waitForTimeout(3000);
                break;
            }
        }
        // Click Reports
        const reportsSelectors = [
            'text=Reports',
            '[data-testid*="reports"]',
            'a:has-text("Reports")',
            'button:has-text("Reports")'
        ];
        for (const selector of reportsSelectors) {
            const count = await this.page.locator(selector).count();
            if (count > 0) {
                await this.page.click(selector);
                await this.page.waitForTimeout(3000);
                break;
            }
        }
        await this.takeScreenshot(screenshots, 'reports-page');
        // ALWAYS navigate to Favorites tab - this is where saved reports are located
        await this.navigateToFavorites(screenshots);
    }
    async navigateToFavorites(screenshots) {
        this.logger.info('Navigating to Favorites tab (where saved reports are located)');
        // Look for Favorites tab
        const favoritesSelectors = [
            'text=Favorites',
            'text=Favourite',
            '[data-testid*="favorite"]',
            'a:has-text("Favorites")',
            'button:has-text("Favorites")',
            'tab:has-text("Favorites")',
            '[role="tab"]:has-text("Favorites")'
        ];
        let favoritesFound = false;
        for (const selector of favoritesSelectors) {
            const count = await this.page.locator(selector).count();
            if (count > 0) {
                await this.page.click(selector);
                await this.page.waitForTimeout(3000);
                favoritesFound = true;
                this.logger.info(`Successfully clicked Favorites tab using selector: ${selector}`);
                break;
            }
        }
        if (!favoritesFound) {
            this.logger.warn('Favorites tab not found, reports may be in main reports list');
            await this.takeScreenshot(screenshots, 'favorites-tab-not-found');
        }
        else {
            await this.takeScreenshot(screenshots, 'favorites-tab-loaded');
        }
    }
    async extractReportFromFavorites(request, screenshots) {
        const { reportName, reportIndex } = request;
        const reportIdentifier = reportName || `Report #${reportIndex}`;
        this.logger.info(`Extracting "${reportIdentifier}" from Favorites tab`);
        let reportLink;
        try {
            if (reportIndex) {
                // Option 1: Select by position (1-based index)
                this.logger.info(`Selecting report by position: ${reportIndex}`);
                // Get all report links in favorites
                const allReportLinks = this.page.locator('.favorites-list a, #favorites a, [data-testid="favorites"] a, [role="list"] a');
                const linkCount = await allReportLinks.count();
                if (linkCount === 0) {
                    // Try broader selectors if specific favorites selectors don't work
                    const broadLinks = this.page.locator('a[href*="report"], a[href*="Report"], a:has-text("report")', { hasText: /.+/ });
                    reportLink = broadLinks.nth(reportIndex - 1);
                }
                else if (reportIndex > linkCount) {
                    throw new Error(`Report index ${reportIndex} exceeds available reports (found ${linkCount} reports)`);
                }
                else {
                    reportLink = allReportLinks.nth(reportIndex - 1);
                }
                // Wait for the nth link to be visible
                await reportLink.waitFor({ state: 'visible', timeout: 15000 });
            }
            else if (reportName) {
                // Option 2: Select by name (existing logic)
                reportLink = this.page.getByRole('link', { name: reportName });
                await reportLink.waitFor({ state: 'visible', timeout: 15000 });
            }
            await this.takeScreenshot(screenshots, 'favorites-reports-list');
            const [download] = await Promise.all([
                this.page.waitForEvent('download'), // capture the download
                reportLink.click(), // trigger it
            ]);
            // Save the download with sanitized filename
            const baseName = reportName || `report-position-${reportIndex}`;
            const sanitizedName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const downloadPath = path_1.default.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
            await download.saveAs(downloadPath);
            await this.takeScreenshot(screenshots, 'download-completed');
            this.logger.info(`${reportIdentifier} downloaded to: ${downloadPath}`);
            return downloadPath;
        }
        catch (error) {
            // If selecting by index failed, don't try name-based fallbacks
            if (reportIndex) {
                this.logger.error(`Failed to select report at position ${reportIndex}`, { error: error.message });
                await this.takeScreenshot(screenshots, 'index-selection-failed');
                throw new Error(`Could not select report at position ${reportIndex} in Favorites. Error: ${error.message}`);
            }
            // For name-based selection, continue with existing fallback strategies
            this.logger.warn(`Primary selector failed for "${reportName}", trying fallback strategies`, { error: error.message });
            await this.takeScreenshot(screenshots, 'primary-selector-failed');
            // Fallback: Try href-based matching
            try {
                const fallbackLink = this.page.locator(`a[href*="${encodeURIComponent(reportName)}"]`);
                await fallbackLink.waitFor({ state: 'visible', timeout: 10000 });
                const [download] = await Promise.all([
                    this.page.waitForEvent('download'),
                    fallbackLink.click(),
                ]);
                const sanitizedName = reportName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const downloadPath = path_1.default.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
                await download.saveAs(downloadPath);
                await this.takeScreenshot(screenshots, 'fallback-download-completed');
                this.logger.info(`Report "${reportName}" downloaded via fallback to: ${downloadPath}`);
                return downloadPath;
            }
            catch (fallbackError) {
                // Final fallback: Try partial text matching
                try {
                    const keywords = reportName.split(' ').filter(word => word.length > 2);
                    const keywordRegex = new RegExp(keywords.join('|'), 'i');
                    const partialLink = this.page.getByRole('link', { name: keywordRegex });
                    await partialLink.waitFor({ state: 'visible', timeout: 10000 });
                    const [download] = await Promise.all([
                        this.page.waitForEvent('download'),
                        partialLink.click(),
                    ]);
                    const sanitizedName = reportName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const downloadPath = path_1.default.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
                    await download.saveAs(downloadPath);
                    await this.takeScreenshot(screenshots, 'partial-match-download-completed');
                    this.logger.info(`Report "${reportName}" downloaded via partial match to: ${downloadPath}`);
                    return downloadPath;
                }
                catch (finalError) {
                    this.logger.error(`All selector strategies failed for "${reportName}"`, {
                        primaryError: error.message,
                        fallbackError: fallbackError.message,
                        finalError: finalError.message
                    });
                    throw new Error(`Could not find report "${reportName}" in Favorites after trying all strategies. Make sure the report is saved in your Favorites tab.`);
                }
            }
        }
    }
    async sendSuccessNotification(result) {
        if (result.reportPath) {
            // Send report via Mailgun
            await this.mailgunService.sendReportEmail(result.reportPath, result.reportName, result.platformName, {
                extractedAt: result.extractedAt,
                executionTime: result.executionTime
            }, this.config.reportRecipients);
        }
    }
    async sendFailureNotification(result) {
        await this.mailgunService.sendNotificationEmail('VinSolutions Extraction Failed', `The AI agent encountered an error while extracting the ${result.reportName} report from ${result.platformName}.\n\nError: ${result.error}\n\nExecution time: ${result.executionTime}ms\n\nScreenshots have been captured for debugging.`, this.config.reportRecipients, true // isError
        );
    }
    async takeScreenshot(screenshots, name) {
        try {
            const screenshotPath = path_1.default.join(this.config.screenshotDir, `${name}-${Date.now()}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            screenshots.push(screenshotPath);
            this.logger.debug(`Screenshot saved: ${screenshotPath}`);
        }
        catch (error) {
            this.logger.warn('Failed to take screenshot', { error: error.message, name });
        }
    }
    async cleanup() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
            await this.emailService.close();
            this.logger.info('Agent cleanup completed');
        }
        catch (error) {
            this.logger.error('Error during cleanup', { error: error.message });
        }
    }
}
exports.CompleteVinSolutionsAgent = CompleteVinSolutionsAgent;
//# sourceMappingURL=CompleteVinSolutionsAgent.js.map