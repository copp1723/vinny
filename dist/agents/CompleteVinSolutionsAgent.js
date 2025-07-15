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
        const startTime = Date.now();
        const screenshots = [];
        try {
            this.logger.info('Starting Lead Source ROI extraction');
            // Send start notification
            await this.mailgunService.sendNotificationEmail('VinSolutions Extraction Started', 'The AI agent has begun extracting the Lead Source ROI report from VinSolutions. You will receive another email when the process is complete.', this.config.reportRecipients);
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
            // Step 3: Navigate to reports
            await this.navigateToReports(screenshots);
            // Step 4: Find and extract Lead Source ROI
            const reportPath = await this.extractReport(screenshots);
            const executionTime = Date.now() - startTime;
            const result = {
                success: true,
                reportPath,
                reportName: 'Lead Source ROI',
                platformName: 'VinSolutions',
                extractedAt: new Date().toISOString(),
                executionTime,
                screenshots
            };
            // Send success notification and report
            await this.sendSuccessNotification(result);
            this.logger.info('Lead Source ROI extraction completed successfully', {
                executionTime,
                reportPath
            });
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error('Lead Source ROI extraction failed', {
                error: error.message,
                executionTime
            });
            const result = {
                success: false,
                reportName: 'Lead Source ROI',
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
        // Step 1: Click Insights tab
        const insightsSelectors = [
            '//div[@id="tab-insights"]/a', // Exact XPath from VinSolutionsAgent
            '#tab-insights a',
            'text=Insights',
            'a:has-text("Insights")',
            '[data-testid*="insights"]',
            'button:has-text("Insights")'
        ];
        let insightsClicked = false;
        for (const selector of insightsSelectors) {
            try {
                const element = selector.startsWith('//')
                    ? this.page.locator(`xpath=${selector}`)
                    : this.page.locator(selector);
                if (await element.isVisible({ timeout: 3000 })) {
                    await element.click();
                    this.logger.info(`Clicked Insights tab using selector: ${selector}`);
                    insightsClicked = true;
                    break;
                }
            }
            catch (e) {
                continue;
            }
        }
        if (!insightsClicked) {
            this.logger.warn('Could not click Insights tab, trying Reports directly');
            // Fallback: Try clicking Reports directly
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
        }
        else {
            await this.page.waitForTimeout(3000);
        }
        await this.takeScreenshot(screenshots, 'after-insights-click');
        // Step 2: Wait for the reports iframe to load and access Favorites
        await this.accessFavoritesTab(screenshots);
    }
    async accessFavoritesTab(screenshots) {
        this.logger.info('Accessing Favorites tab');
        // Find the report iframe
        const frameSelectors = [
            '#reportFrame',
            'iframe[id="reportFrame"]',
            'iframe[name="reportFrame"]',
            'iframe[src*="report"]',
            'iframe'
        ];
        let reportFrame = null;
        for (const selector of frameSelectors) {
            try {
                const frameElement = this.page.locator(selector).first();
                if (await frameElement.isVisible({ timeout: 5000 })) {
                    reportFrame = this.page.frameLocator(selector);
                    // Verify frame is accessible
                    const hasContent = await reportFrame.locator('body').isVisible({ timeout: 3000 })
                        .catch(() => false);
                    if (hasContent) {
                        this.logger.info(`Found report frame using selector: ${selector}`);
                        break;
                    }
                }
            }
            catch (e) {
                continue;
            }
        }
        if (reportFrame) {
            // Click on the Favorites tab inside the iframe
            const favoritesSelectors = [
                'text=Favorites',
                'a:has-text("Favorites")',
                '.filter-favorites',
                'a.favorites-link',
                '[data-testid*="favorites"]'
            ];
            let favoritesClicked = false;
            for (const selector of favoritesSelectors) {
                try {
                    const element = reportFrame.locator(selector).first();
                    if (await element.isVisible({ timeout: 5000 })) {
                        await element.click();
                        this.logger.info(`Clicked Favorites tab using selector: ${selector}`);
                        favoritesClicked = true;
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (favoritesClicked) {
                // Wait for favorites list to load
                await this.page.waitForTimeout(3000);
                // Verify favorites loaded
                const tableVisible = await reportFrame.locator('table tbody tr').first().isVisible({ timeout: 5000 })
                    .catch(() => false);
                if (tableVisible) {
                    this.logger.info('Favorites list loaded successfully');
                }
                else {
                    this.logger.warn('Favorites list may not have loaded properly');
                }
            }
            else {
                this.logger.warn('Could not click Favorites tab');
            }
        }
        else {
            this.logger.warn('Report frame not found, trying to find reports on main page');
        }
        await this.takeScreenshot(screenshots, 'favorites-page');
    }
    async extractReport(screenshots) {
        this.logger.info('Extracting Lead Source ROI report');
        // Try to find the report in the iframe first
        const frameSelectors = [
            '#reportFrame',
            'iframe[id="reportFrame"]',
            'iframe[name="reportFrame"]',
            'iframe[src*="report"]',
            'iframe'
        ];
        let reportFrame = null;
        for (const selector of frameSelectors) {
            try {
                const frameElement = this.page.locator(selector).first();
                if (await frameElement.isVisible({ timeout: 3000 })) {
                    reportFrame = this.page.frameLocator(selector);
                    break;
                }
            }
            catch (e) {
                continue;
            }
        }
        // Look for Lead Source ROI in the reports list
        let reportFound = false;
        let reportElement = null;
        if (reportFrame) {
            // Try to find report inside iframe
            try {
                reportElement = reportFrame.locator('text="Lead Source ROI"').first();
                if (await reportElement.isVisible({ timeout: 10000 })) {
                    reportFound = true;
                    this.logger.info('Found Lead Source ROI report in iframe');
                }
            }
            catch (e) {
                this.logger.warn('Report not found in iframe');
            }
        }
        if (!reportFound) {
            // Try to find report on main page
            try {
                reportElement = this.page.locator('text="Lead Source ROI"').first();
                if (await reportElement.isVisible({ timeout: 10000 })) {
                    reportFound = true;
                    this.logger.info('Found Lead Source ROI report on main page');
                }
            }
            catch (e) {
                this.logger.error('Report not found on main page either');
            }
        }
        if (!reportFound) {
            throw new Error('Could not find report "Lead Source ROI" in Favorites after trying all strategies. Make sure the report is saved in your Favorites tab.');
        }
        await this.takeScreenshot(screenshots, 'report-found');
        // Set up new page listener before clicking (reports often open in new tabs)
        const newPagePromise = this.page.context().waitForEvent('page', { timeout: 30000 })
            .catch(() => null);
        // Click on Lead Source ROI report
        await reportElement.click();
        // Check if new page opened
        const newPage = await newPagePromise;
        if (newPage) {
            this.page = newPage;
            await this.page.waitForLoadState('networkidle');
            this.logger.info('Report opened in new tab');
        }
        else {
            await this.page.waitForTimeout(5000);
            this.logger.info('Report opened in same tab');
        }
        await this.takeScreenshot(screenshots, 'report-opened');
        // Set up download handling
        const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
        // Click Download button or Export arrow
        const downloadSelectors = [
            '#lbl_ExportArrow', // VinSolutions specific export button
            '//a[@id="lbl_ExportArrow"]',
            'text=Download',
            'button:has-text("Download")',
            '[data-testid*="download"]',
            'a:has-text("Download")',
            '.download-button',
            '[title*="Export"]'
        ];
        let downloadClicked = false;
        for (const selector of downloadSelectors) {
            try {
                const element = selector.startsWith('//')
                    ? this.page.locator(`xpath=${selector}`)
                    : this.page.locator(selector);
                if (await element.isVisible({ timeout: 5000 })) {
                    await element.click();
                    this.logger.info(`Clicked download button using selector: ${selector}`);
                    downloadClicked = true;
                    // For export arrow, we need to select format
                    if (selector.includes('ExportArrow')) {
                        await this.page.waitForTimeout(1000);
                        // Click CSV option
                        const csvOption = this.page.locator('text=CSV').first();
                        if (await csvOption.isVisible({ timeout: 3000 })) {
                            await csvOption.click();
                            this.logger.info('Selected CSV format');
                        }
                    }
                    break;
                }
            }
            catch (e) {
                continue;
            }
        }
        if (!downloadClicked) {
            throw new Error('Could not find or click download button');
        }
        // Wait for download to complete
        const download = await downloadPromise;
        const downloadPath = path_1.default.join(this.config.downloadDir, `lead-source-roi-${Date.now()}.${download.suggestedFilename().split('.').pop() || 'csv'}`);
        await download.saveAs(downloadPath);
        await this.takeScreenshot(screenshots, 'download-completed');
        this.logger.info('Report downloaded successfully', { downloadPath });
        return downloadPath;
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