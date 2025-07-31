"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedVinSolutionsAgent = void 0;
const EmailService_1 = require("../services/EmailService");
const Logger_1 = require("../utils/Logger");
const FileManager_1 = require("../utils/FileManager");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class EnhancedVinSolutionsAgent {
    browser = null;
    page = null;
    emailService;
    logger;
    fileManager;
    screenshots = [];
    constructor(emailConfig) {
        this.emailService = new EmailService_1.EmailService(emailConfig);
        this.logger = new Logger_1.Logger('EnhancedVinSolutionsAgent');
        this.fileManager = new FileManager_1.FileManager();
    }
    async initialize(browser) {
        this.browser = browser;
        this.page = await browser.newPage({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        // Initialize email service
        await this.emailService.initialize();
        // Set up download handling
        this.page.on('download', async (download) => {
            const suggestedFilename = download.suggestedFilename();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}_VinSolutions_${suggestedFilename}`;
            const downloadPath = path_1.default.join('./downloads', filename);
            await this.fileManager.ensureDirectory('./downloads');
            await download.saveAs(downloadPath);
            this.logger.info(`Downloaded file: ${filename} at ${downloadPath}`);
        });
        this.logger.info('Enhanced VinSolutions agent initialized');
    }
    async takeScreenshot(name) {
        if (!this.page)
            throw new Error('Page not initialized');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${name}.png`;
        const screenshotPath = path_1.default.join('./screenshots', filename);
        await this.fileManager.ensureDirectory('./screenshots');
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.screenshots.push(screenshotPath);
        this.logger.debug(`Screenshot taken: ${screenshotPath}`);
        return screenshotPath;
    }
    async loginWithEmailAuth(credentials) {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            this.logger.info('Starting login process with email authentication');
            // Navigate to VinSolutions
            await this.page.goto(credentials.url, { waitUntil: 'networkidle' });
            await this.takeScreenshot('01_login_page');
            // Enter username
            await this.page.fill('input[type="text"], input[name="username"]', credentials.username);
            await this.page.click('button:has-text("Next")');
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('02_after_username');
            // Enter password
            await this.page.fill('input[type="password"], input[name="password"]', credentials.password);
            await this.page.click('button:has-text("Sign in")');
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('03_after_password');
            // Check if 2FA is required
            const pageContent = await this.page.textContent('body');
            if (pageContent?.includes('Verify your identity') || pageContent?.includes('verification')) {
                this.logger.info('2FA required, selecting email option');
                // Look for email option and select it
                const emailOptions = await this.page.locator('button:has-text("Select")').all();
                // Try to find the email option (usually the second one)
                for (let i = 0; i < emailOptions.length; i++) {
                    try {
                        const optionText = await emailOptions[i].textContent();
                        if (optionText?.includes('@') || i === 1) { // Email contains @ or is second option
                            await emailOptions[i].click();
                            break;
                        }
                    }
                    catch (e) {
                        // Try next option
                        continue;
                    }
                }
                await this.page.waitForLoadState('networkidle');
                await this.takeScreenshot('04_email_2fa_selected');
                // Wait for 2FA code via email
                this.logger.info('Waiting for 2FA code via email...');
                try {
                    const twoFactorCode = await this.emailService.waitForTwoFactorCode(300000, 'vinsolutions.com');
                    this.logger.info(`Received 2FA code: ${twoFactorCode.code}`);
                    // Enter the 2FA code
                    await this.page.fill('input[placeholder*="code"], input[type="text"]', twoFactorCode.code);
                    await this.page.click('button:has-text("Verify")');
                    await this.page.waitForLoadState('networkidle');
                    await this.takeScreenshot('05_2fa_completed');
                }
                catch (emailError) {
                    this.logger.error('Failed to get 2FA code via email', { error: emailError.message });
                    await this.emailService.sendNotificationEmail('VinSolutions Login Failed', `Failed to receive 2FA code via email: ${emailError.message}`, true);
                    return false;
                }
            }
            // Verify login success
            const currentUrl = this.page.url();
            const finalPageContent = await this.page.textContent('body');
            if (currentUrl.includes('dashboard') || finalPageContent?.includes('VinSolutions')) {
                this.logger.info('Login successful');
                await this.takeScreenshot('06_login_success');
                await this.emailService.sendNotificationEmail('VinSolutions Login Successful', `AI Agent successfully logged into VinSolutions at ${new Date().toISOString()}`);
                return true;
            }
            else {
                this.logger.error('Login verification failed');
                await this.takeScreenshot('07_login_failed');
                return false;
            }
        }
        catch (error) {
            this.logger.error('Login failed', { error: error.message });
            await this.takeScreenshot('08_login_error');
            await this.emailService.sendNotificationEmail('VinSolutions Login Error', `Login failed with error: ${error.message}`, true);
            return false;
        }
    }
    async navigateToReports() {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            this.logger.info('Navigating to reports section');
            // Click on Insights tab
            await this.page.click('a:has-text("Insights")');
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('09_insights_tab');
            // Click on Reports
            await this.page.click('a:has-text("Reports")');
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('10_reports_page');
            // Verify we're on the reports page
            const pageContent = await this.page.textContent('body');
            if (pageContent?.includes('REPORTS & DASHBOARDS')) {
                this.logger.info('Successfully navigated to reports');
                return true;
            }
            else {
                this.logger.error('Failed to navigate to reports page');
                return false;
            }
        }
        catch (error) {
            this.logger.error('Navigation to reports failed', { error: error.message });
            await this.takeScreenshot('11_navigation_error');
            return false;
        }
    }
    async extractLeadSourceROI() {
        const startTime = Date.now();
        const reportName = 'Lead Source ROI';
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            this.logger.info(`Starting extraction of ${reportName} report`);
            // Ensure Lead Source Analysis is selected in the left sidebar
            const leadSourceAnalysisCheckbox = this.page.locator('text=*Lead Source Analysis').locator('..').locator('input[type="checkbox"]');
            if (!(await leadSourceAnalysisCheckbox.isChecked())) {
                await leadSourceAnalysisCheckbox.click();
                await this.page.waitForTimeout(2000);
            }
            await this.takeScreenshot('12_lead_source_filter_selected');
            // Find and select the Lead Source ROI report
            const reportRow = this.page.locator(`text=${reportName}`).first();
            if (!(await reportRow.isVisible())) {
                throw new Error(`${reportName} report not found`);
            }
            // Click the checkbox for the report
            const reportCheckbox = reportRow.locator('..').locator('input[type="checkbox"]').first();
            await reportCheckbox.click();
            await this.takeScreenshot('13_report_selected');
            // Click on the report name to open it
            await reportRow.click();
            await this.page.waitForLoadState('networkidle');
            await this.takeScreenshot('14_report_opened');
            // Wait for the report to fully load
            await this.page.waitForSelector('text=Download', { timeout: 30000 });
            // Click Download button
            await this.page.click('a:has-text("Download")');
            await this.page.waitForTimeout(1000);
            await this.takeScreenshot('15_download_menu');
            // Select Excel format
            const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
            await this.page.click('a:has-text("Excel")');
            // Wait for download to complete
            const download = await downloadPromise;
            const suggestedFilename = download.suggestedFilename();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}_VinSolutions_${suggestedFilename}`;
            const downloadPath = path_1.default.join('./downloads', filename);
            await fs_extra_1.default.ensureDir('./downloads');
            await download.saveAs(downloadPath);
            const stats = await fs_extra_1.default.stat(downloadPath);
            const executionTime = Date.now() - startTime;
            this.logger.info(`Successfully extracted ${reportName}`, {
                filePath: downloadPath,
                fileSize: stats.size,
                executionTime
            });
            await this.takeScreenshot('16_download_complete');
            const result = {
                success: true,
                reportName,
                filePath: downloadPath,
                screenshots: this.screenshots,
                executionTime,
                extractedAt: new Date().toISOString(),
                fileSize: stats.size
            };
            // Send the report via email
            await this.emailService.sendReportEmail(downloadPath, reportName, 'VinSolutions', {
                extractedAt: result.extractedAt,
                executionTime: result.executionTime,
                fileSize: result.fileSize
            });
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Failed to extract ${reportName}`, { error: error.message });
            await this.takeScreenshot('17_extraction_error');
            const result = {
                success: false,
                reportName,
                error: error.message,
                screenshots: this.screenshots,
                executionTime,
                extractedAt: new Date().toISOString()
            };
            // Send error notification
            await this.emailService.sendNotificationEmail(`${reportName} Extraction Failed`, `Failed to extract ${reportName} report: ${error.message}`, true);
            return result;
        }
    }
    async runFullExtractionWorkflow(credentials) {
        try {
            this.logger.info('Starting full extraction workflow');
            // Step 1: Login with email-based 2FA
            const loginSuccess = await this.loginWithEmailAuth(credentials);
            if (!loginSuccess) {
                throw new Error('Login failed');
            }
            // Step 2: Navigate to reports
            const navSuccess = await this.navigateToReports();
            if (!navSuccess) {
                throw new Error('Navigation to reports failed');
            }
            // Step 3: Extract the report
            const result = await this.extractLeadSourceROI();
            if (result.success) {
                await this.emailService.sendNotificationEmail('Report Extraction Completed', `Successfully extracted ${result.reportName} report and sent via email.`);
            }
            return result;
        }
        catch (error) {
            this.logger.error('Full extraction workflow failed', { error: error.message });
            await this.emailService.sendNotificationEmail('Extraction Workflow Failed', `The complete extraction workflow failed: ${error.message}`, true);
            return {
                success: false,
                reportName: 'Lead Source ROI',
                error: error.message,
                screenshots: this.screenshots,
                executionTime: 0,
                extractedAt: new Date().toISOString()
            };
        }
    }
    async close() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        await this.emailService.close();
        this.logger.info('Enhanced VinSolutions agent closed');
    }
}
exports.EnhancedVinSolutionsAgent = EnhancedVinSolutionsAgent;
//# sourceMappingURL=EnhancedVinSolutionsAgent.js.map