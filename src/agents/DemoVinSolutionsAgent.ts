import { chromium, Browser, Page } from 'playwright';
import { MailgunService } from '../services/MailgunService';
import { OpenRouterService } from '../services/OpenRouterService';
import { Logger } from '../utils/Logger';
import fs from 'fs-extra';
import path from 'path';

export interface DemoAgentConfig {
  // VinSolutions credentials
  vinsolutions: {
    username: string;
    password: string;
    url: string;
  };
  
  // Mailgun for sending reports
  mailgun: {
    apiKey: string;
    domain: string;
    fromEmail: string;
    fromName?: string;
  };
  
  // OpenRouter for AI
  openrouter: {
    apiKey: string;
    baseURL?: string;
    defaultModel?: string;
  };
  
  // Recipients and settings
  reportRecipients: string[];
  downloadDir: string;
  screenshotDir: string;
}

export interface ExtractionResult {
  success: boolean;
  reportPath?: string;
  reportName: string;
  platformName: string;
  extractedAt: string;
  executionTime: number;
  error?: string;
  screenshots: string[];
}

export class DemoVinSolutionsAgent {
  private config: DemoAgentConfig;
  private logger: Logger;
  private mailgunService: MailgunService;
  private openRouterService: OpenRouterService;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: DemoAgentConfig) {
    this.config = config;
    this.logger = new Logger('DemoVinSolutionsAgent');
    
    // Initialize services
    this.mailgunService = new MailgunService({
      apiKey: config.mailgun.apiKey,
      domain: config.mailgun.domain,
      fromEmail: config.mailgun.fromEmail,
      fromName: config.mailgun.fromName || 'VinSolutions AI Agent'
    });
    
    this.openRouterService = new OpenRouterService({
      apiKey: config.openrouter.apiKey,
      baseURL: config.openrouter.baseURL,
      defaultModel: config.openrouter.defaultModel
    });
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.ensureDir(this.config.downloadDir);
      await fs.ensureDir(this.config.screenshotDir);
      
      this.logger.info('Demo VinSolutions Agent initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize agent', { error: error.message });
      throw error;
    }
  }

  async extractLeadSourceROI(): Promise<ExtractionResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    
    try {
      this.logger.info('Starting Lead Source ROI extraction (DEMO MODE)');
      
      // Send start notification
      await this.mailgunService.sendNotificationEmail(
        'VinSolutions Extraction Started (Demo)',
        'The AI agent has begun extracting the Lead Source ROI report from VinSolutions. This is a demonstration of the complete workflow including AI-powered automation and professional email delivery.',
        this.config.reportRecipients
      );

      // Launch browser
      this.browser = await chromium.launch({
        headless: false, // Keep visible for demonstration
        slowMo: 2000 // Slow down for demonstration
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
      
      const result: ExtractionResult = {
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

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error('Lead Source ROI extraction failed', { 
        error: error.message,
        executionTime 
      });

      const result: ExtractionResult = {
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

    } finally {
      await this.cleanup();
    }
  }

  private async performLogin(screenshots: string[]): Promise<void> {
    this.logger.info('Performing login');
    
    // Wait for page to load
    await this.page!.waitForTimeout(3000);
    
    // Enter username
    const usernameSelector = 'input[name="username"], input[type="email"], #username, input[placeholder*="username"], input[placeholder*="email"]';
    await this.page!.waitForSelector(usernameSelector, { timeout: 10000 });
    await this.page!.fill(usernameSelector, this.config.vinsolutions.username);
    await this.takeScreenshot(screenshots, 'username-entered');
    
    // Click Next or continue
    try {
      const nextButton = 'button:has-text("Next"), input[type="submit"], button[type="submit"], button:has-text("Continue")';
      await this.page!.click(nextButton);
      await this.page!.waitForTimeout(3000);
    } catch {
      // If no Next button, continue
    }
    
    // Enter password
    const passwordSelector = 'input[name="password"], input[type="password"], #password, input[placeholder*="password"]';
    await this.page!.waitForSelector(passwordSelector, { timeout: 10000 });
    await this.page!.fill(passwordSelector, this.config.vinsolutions.password);
    await this.takeScreenshot(screenshots, 'password-entered');
    
    // Click Sign In
    const signInButton = 'button:has-text("Sign"), input[type="submit"], button[type="submit"], button:has-text("Login")';
    await this.page!.click(signInButton);
    await this.page!.waitForTimeout(5000);
    await this.takeScreenshot(screenshots, 'after-login-attempt');

    // Handle 2FA if present
    await this.handle2FA(screenshots);
  }

  private async handle2FA(screenshots: string[]): Promise<void> {
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
        const count = await this.page!.locator(indicator).count();
        if (count > 0) {
          has2FA = true;
          break;
        }
      }
      
      if (has2FA) {
        this.logger.info('2FA detected - DEMO MODE: Simulating email code retrieval');
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
            const count = await this.page!.locator(option).count();
            if (count > 0) {
              await this.page!.click(option);
              await this.page!.waitForTimeout(2000);
              break;
            }
          }
        } catch {
          // Email might already be selected
        }

        // DEMO: Simulate waiting for 2FA code
        this.logger.info('DEMO: Simulating 2FA code retrieval from email...');
        
        // Send notification about 2FA simulation
        await this.mailgunService.sendNotificationEmail(
          'Demo: 2FA Code Simulation',
          'In production, the AI agent would automatically read the 2FA code from email using IMAP. For this demo, we will simulate receiving the code and entering it automatically.',
          this.config.reportRecipients
        );
        
        // Simulate a realistic delay for email retrieval
        await this.page!.waitForTimeout(5000);
        
        // Generate a simulated 2FA code (in production, this comes from email)
        const simulatedCode = '123456';
        this.logger.info(`DEMO: Using simulated 2FA code: ${simulatedCode}`);
        
        // Enter the code
        const codeInputs = [
          'input[type="text"]',
          'input[type="number"]', 
          'input[name*="code"]',
          'input[placeholder*="code"]'
        ];
        
        for (const input of codeInputs) {
          const count = await this.page!.locator(input).count();
          if (count > 0) {
            await this.page!.fill(input, simulatedCode);
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
          const count = await this.page!.locator(button).count();
          if (count > 0) {
            await this.page!.click(button);
            break;
          }
        }
        
        await this.page!.waitForTimeout(5000);
        await this.takeScreenshot(screenshots, 'after-2fa');
        
        this.logger.info('DEMO: 2FA simulation completed');
      }
    } catch (error: any) {
      this.logger.error('2FA handling failed', { error: error.message });
      throw error;
    }
  }

  private async navigateToReports(screenshots: string[]): Promise<void> {
    this.logger.info('Navigating to reports section');
    
    // Wait for dashboard to load
    await this.page!.waitForTimeout(5000);
    await this.takeScreenshot(screenshots, 'dashboard-loaded');
    
    // Click Insights tab
    const insightsSelectors = [
      'text=Insights',
      '[data-testid*="insights"]',
      'a:has-text("Insights")',
      'button:has-text("Insights")'
    ];
    
    for (const selector of insightsSelectors) {
      const count = await this.page!.locator(selector).count();
      if (count > 0) {
        await this.page!.click(selector);
        await this.page!.waitForTimeout(3000);
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
      const count = await this.page!.locator(selector).count();
      if (count > 0) {
        await this.page!.click(selector);
        await this.page!.waitForTimeout(3000);
        break;
      }
    }
    
    await this.takeScreenshot(screenshots, 'reports-page');
  }

  private async extractReport(screenshots: string[]): Promise<string> {
    this.logger.info('Extracting Lead Source ROI report');
    
    // Look for Lead Source ROI in the reports list
    await this.page!.waitForSelector('text=Lead Source ROI', { timeout: 15000 });
    await this.takeScreenshot(screenshots, 'reports-list');
    
    // Click on Lead Source ROI report
    await this.page!.click('text=Lead Source ROI');
    await this.page!.waitForTimeout(5000);
    await this.takeScreenshot(screenshots, 'report-opened');
    
    // Set up download handling
    const downloadPromise = this.page!.waitForEvent('download');
    
    // Click Download button
    const downloadSelectors = [
      'text=Download',
      'button:has-text("Download")',
      '[data-testid*="download"]',
      'a:has-text("Download")'
    ];
    
    for (const selector of downloadSelectors) {
      const count = await this.page!.locator(selector).count();
      if (count > 0) {
        await this.page!.click(selector);
        break;
      }
    }
    
    // Wait for download to complete
    const download = await downloadPromise;
    const downloadPath = path.join(this.config.downloadDir, `lead-source-roi-${Date.now()}.xlsx`);
    await download.saveAs(downloadPath);
    
    await this.takeScreenshot(screenshots, 'download-completed');
    
    this.logger.info('Report downloaded successfully', { downloadPath });
    return downloadPath;
  }

  private async sendSuccessNotification(result: ExtractionResult): Promise<void> {
    if (result.reportPath) {
      // Send report via Mailgun
      await this.mailgunService.sendReportEmail(
        result.reportPath,
        result.reportName,
        result.platformName,
        {
          extractedAt: result.extractedAt,
          executionTime: result.executionTime
        },
        this.config.reportRecipients
      );
    }
  }

  private async sendFailureNotification(result: ExtractionResult): Promise<void> {
    await this.mailgunService.sendNotificationEmail(
      'VinSolutions Extraction Failed',
      `The AI agent encountered an error while extracting the ${result.reportName} report from ${result.platformName}.\n\nError: ${result.error}\n\nExecution time: ${result.executionTime}ms\n\nScreenshots have been captured for debugging.`,
      this.config.reportRecipients,
      true // isError
    );
  }

  private async takeScreenshot(screenshots: string[], name: string): Promise<void> {
    try {
      const screenshotPath = path.join(this.config.screenshotDir, `${name}-${Date.now()}.png`);
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);
      this.logger.debug(`Screenshot saved: ${screenshotPath}`);
    } catch (error: any) {
      this.logger.warn('Failed to take screenshot', { error: error.message, name });
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
      this.logger.info('Agent cleanup completed');
    } catch (error: any) {
      this.logger.error('Error during cleanup', { error: error.message });
    }
  }
}

