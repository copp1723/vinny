"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousVinSolutionsAgent = void 0;
const playwright_1 = require("playwright");
const Logger_1 = require("../utils/Logger");
const MailgunService_1 = require("../services/MailgunService");
const OpenRouterService_1 = require("../services/OpenRouterService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AutonomousVinSolutionsAgent {
    browser = null;
    page = null;
    logger;
    mailgun;
    openrouter;
    config;
    executionSteps = [];
    startTime = new Date();
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger('AutonomousVinSolutionsAgent');
        this.mailgun = new MailgunService_1.MailgunService({
            apiKey: config.mailgun.apiKey,
            domain: config.mailgun.domain,
            fromEmail: config.mailgun.from
        });
        this.openrouter = new OpenRouterService_1.OpenRouterService({
            apiKey: config.openrouter.apiKey
        });
    }
    addStep(step, status = 'pending', details) {
        this.executionSteps.push({
            step,
            timestamp: new Date(),
            status,
            details
        });
        this.logger.info(`Step: ${step} - ${status}`);
    }
    async extractReport(reportName) {
        try {
            this.addStep(`Starting autonomous ${reportName} extraction`);
            await this.sendStartNotification(reportName);
            await this.initializeBrowser();
            await this.loginToVinSolutions();
            await this.navigateToReports();
            const filePath = await this.downloadReport(reportName);
            await this.sendSuccessNotification(reportName, filePath);
            this.addStep('Autonomous extraction completed successfully', 'completed');
            return { success: true, filePath };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addStep('Autonomous extraction failed', 'failed', errorMessage);
            this.logger.error('Extraction failed:', error);
            await this.sendErrorNotification(reportName, errorMessage);
            return { success: false, error: errorMessage };
        }
        finally {
            await this.cleanup();
        }
    }
    async initializeBrowser() {
        this.addStep('Initializing browser');
        this.browser = await playwright_1.chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        this.logger.info('Browser initialized successfully');
        this.addStep('Browser initialized', 'completed');
    }
    async loginToVinSolutions() {
        this.addStep('Logging into VinSolutions');
        if (!this.page)
            throw new Error('Browser not initialized');
        // Navigate to VinSolutions
        await this.page.goto('https://vinsolutions.app.coxautoinc.com/vinconnect/pane-both/vinconnect-dealer-dashboard');
        await this.page.waitForTimeout(3000);
        // Take screenshot for debugging
        await this.page.screenshot({ path: 'downloads/01-login_page.png' });
        // Check if already logged in
        const isLoggedIn = await this.page.locator('text=Josh Copp').isVisible({ timeout: 5000 }).catch(() => false);
        if (isLoggedIn) {
            this.logger.info('Already logged in to VinSolutions');
            this.addStep('Already authenticated', 'completed');
            return;
        }
        // Enter username
        await this.page.fill('input[type="email"], input[name="username"], #username', this.config.credentials.username);
        await this.page.waitForTimeout(1000);
        // Click Next button
        await this.page.click('button:has-text("Next"), input[type="submit"], button[type="submit"]');
        await this.page.waitForTimeout(2000);
        // Enter password
        await this.page.fill('input[type="password"], input[name="password"], #password', this.config.credentials.password);
        await this.page.waitForTimeout(1000);
        // Click Sign in
        await this.page.click('button:has-text("Sign in"), input[type="submit"], button[type="submit"]');
        await this.page.waitForTimeout(3000);
        // Handle 2FA if required
        const needsTwoFA = await this.page.locator('text=verification code, text=Verify email').isVisible({ timeout: 5000 }).catch(() => false);
        if (needsTwoFA) {
            this.addStep('2FA required, waiting for code');
            const code = await this.waitForTwoFACode();
            await this.page.fill('input[type="text"], input[name="code"], #code', code);
            await this.page.click('button:has-text("Verify"), button:has-text("Submit")');
            await this.page.waitForTimeout(3000);
        }
        // Wait for dashboard to load
        await this.page.waitForSelector('text=Josh Copp', { timeout: 30000 });
        await this.page.screenshot({ path: 'downloads/02-dashboard.png' });
        this.addStep('Successfully logged in', 'completed');
    }
    async waitForTwoFACode() {
        this.logger.info('Waiting for 2FA code from webhook...');
        const maxAttempts = 30; // 5 minutes
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${this.config.webhook.baseUrl}/api/code/latest?platform=vinsolutions`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.code && data.confidence > 80) {
                        this.logger.info(`Received 2FA code: ${data.code} (confidence: ${data.confidence}%)`);
                        return data.code;
                    }
                }
            }
            catch (error) {
                this.logger.debug('Webhook not responding, retrying...');
            }
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
        throw new Error('Timeout waiting for 2FA code from webhook');
    }
    async navigateToReports() {
        this.addStep('Navigating to reports section');
        if (!this.page)
            throw new Error('Browser not initialized');
        // Navigate to Insights tab
        const insightsSelectors = [
            'text=Insights',
            'a:has-text("Insights")',
            '[data-testid*="insights"]',
            'a[href*="insights"]',
            '.nav-item:has-text("Insights")',
            'li:has-text("Insights") a'
        ];
        let insightsFound = false;
        for (const selector of insightsSelectors) {
            try {
                await this.page.locator(selector).click({ timeout: 5000 });
                this.logger.info(`Successfully clicked Insights using selector: ${selector}`);
                insightsFound = true;
                break;
            }
            catch (error) {
                this.logger.debug(`Insights selector failed: ${selector}`);
            }
        }
        if (!insightsFound) {
            throw new Error('Could not find Insights navigation element');
        }
        // Wait for reports page to load
        await this.page.waitForTimeout(3000);
        await this.page.screenshot({ path: 'downloads/03-insights_page.png' });
        // Click on "Favorites" filter in the left sidebar
        this.logger.info('Clicking Favorites filter...');
        const favoritesSelectors = [
            'text=Favorites',
            '.filter-item:has-text("Favorites")',
            '[data-filter="favorites"]',
            'li:has-text("Favorites")',
            '.sidebar-item:has-text("Favorites")'
        ];
        let favoritesFound = false;
        for (const selector of favoritesSelectors) {
            try {
                await this.page.locator(selector).click({ timeout: 5000 });
                this.logger.info(`Successfully clicked Favorites using selector: ${selector}`);
                favoritesFound = true;
                break;
            }
            catch (error) {
                this.logger.debug(`Favorites selector failed: ${selector}`);
            }
        }
        if (!favoritesFound) {
            throw new Error('Could not find Favorites filter');
        }
        // Wait for filtered results to load
        await this.page.waitForTimeout(2000);
        await this.page.screenshot({ path: 'downloads/04-favorites.png' });
        this.addStep('Successfully navigated to Favorites reports', 'completed');
    }
    async downloadReport(reportName) {
        this.addStep(`Downloading ${reportName} report`);
        if (!this.page)
            throw new Error('Browser not initialized');
        // Find and click the specified report
        const reportSelectors = [
            `text=${reportName}`,
            `a:has-text("${reportName}")`,
            `.report-item:has-text("${reportName}")`,
            `tr:has-text("${reportName}")`,
            `td:has-text("${reportName}")`
        ];
        let reportFound = false;
        for (const selector of reportSelectors) {
            try {
                await this.page.locator(selector).click({ timeout: 5000 });
                this.logger.info(`Successfully clicked ${reportName} using selector: ${selector}`);
                reportFound = true;
                break;
            }
            catch (error) {
                this.logger.debug(`${reportName} selector failed: ${selector}`);
            }
        }
        if (!reportFound) {
            throw new Error(`Could not find ${reportName} report`);
        }
        // Wait for report to load
        await this.page.waitForTimeout(5000);
        await this.page.screenshot({ path: `downloads/05-${reportName.toLowerCase()}_report.png` });
        // Look for download button
        const downloadSelectors = [
            'text=Download',
            'button:has-text("Download")',
            '[data-testid*="download"]',
            '.download-btn',
            'a:has-text("Export")',
            'button:has-text("Export")'
        ];
        let downloadFound = false;
        for (const selector of downloadSelectors) {
            try {
                // Set up download handler
                const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
                await this.page.locator(selector).click({ timeout: 5000 });
                this.logger.info(`Successfully clicked download using selector: ${selector}`);
                // Wait for download to complete
                const download = await downloadPromise;
                const fileName = `${reportName.toLowerCase().replace(/\s+/g, '_')}_report_${Date.now()}.xlsx`;
                const filePath = path.join(process.cwd(), 'downloads', fileName);
                await download.saveAs(filePath);
                this.logger.info(`Report downloaded to: ${filePath}`);
                downloadFound = true;
                this.addStep(`${reportName} report downloaded successfully`, 'completed');
                return filePath;
            }
            catch (error) {
                this.logger.debug(`Download selector failed: ${selector}`);
            }
        }
        if (!downloadFound) {
            throw new Error(`Could not find download button for ${reportName} report`);
        }
        throw new Error('Download failed');
    }
    async sendStartNotification(reportName) {
        const subject = `VinSolutions ${reportName} Extraction - Started`;
        const htmlContent = `
      <h2>🤖 Autonomous Agent Started</h2>
      <p>The VinSolutions ${reportName} extraction has begun.</p>
      <p><strong>Started:</strong> ${this.startTime.toLocaleString()}</p>
      <p><strong>Target Report:</strong> ${reportName}</p>
      <p>You will receive the report via email once extraction is complete.</p>
    `;
        await this.mailgun.sendEmail({
            to: this.config.notifications.recipients,
            subject,
            html: htmlContent
        });
    }
    async sendSuccessNotification(filePath) {
        const executionTime = Math.round((Date.now() - this.startTime.getTime()) / 1000);
        const subject = 'VinSolutions Leaderboard Report - Delivered';
        const htmlContent = `
      <h2>✅ Leaderboard Report Successfully Extracted</h2>
      <p>Your VinSolutions Leaderboard report has been successfully extracted and is attached to this email.</p>
      
      <h3>📊 Execution Summary</h3>
      <ul>
        <li><strong>Report:</strong> Leaderboard</li>
        <li><strong>Execution Time:</strong> ${executionTime} seconds</li>
        <li><strong>Status:</strong> Success</li>
        <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      
      <h3>🔄 Execution Steps</h3>
      <ol>
        ${this.executionSteps.map(step => `<li><strong>${step.step}</strong> - ${step.status} (${step.timestamp.toLocaleTimeString()})</li>`).join('')}
      </ol>
      
      <p><em>This report was generated automatically by your autonomous AI agent.</em></p>
    `;
        const attachments = fs.existsSync(filePath) ? [filePath] : [];
        await this.mailgun.sendEmail({
            to: this.config.notifications.recipients,
            subject,
            html: htmlContent,
            attachments
        });
    }
    async sendErrorNotification(error) {
        const executionTime = Math.round((Date.now() - this.startTime.getTime()) / 1000);
        const subject = 'VinSolutions Leaderboard Extraction - Failed';
        const htmlContent = `
      <h2>❌ Leaderboard Extraction Failed</h2>
      <p>The autonomous extraction of the VinSolutions Leaderboard report encountered an error.</p>
      
      <h3>🚨 Error Details</h3>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Execution Time:</strong> ${executionTime} seconds</p>
      <p><strong>Failed At:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>🔄 Execution Steps</h3>
      <ol>
        ${this.executionSteps.map(step => `<li><strong>${step.step}</strong> - ${step.status} (${step.timestamp.toLocaleTimeString()})</li>`).join('')}
      </ol>
      
      <p>Please check the system logs for more details.</p>
    `;
        await this.mailgun.sendEmail({
            to: this.config.notifications.recipients,
            subject,
            html: htmlContent
        });
    }
    async cleanup() {
        this.addStep('Cleaning up resources');
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        this.addStep('Cleanup completed', 'completed');
    }
}
exports.AutonomousVinSolutionsAgent = AutonomousVinSolutionsAgent;
//# sourceMappingURL=AutonomousVinSolutionsAgent.js.map