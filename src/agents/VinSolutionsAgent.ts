import { Page, Browser } from 'playwright';
import { NotteClient } from 'notte-sdk';
import { 
  PlatformAdapter, 
  PlatformCredentials, 
  ReportRequest, 
  ExtractionResult,
  PerceptionResult,
  VisionResult,
  AgentConfig 
} from '../types';
import { Logger } from '../utils/Logger';
import { FileManager } from '../utils/FileManager';
import path from 'path';
import fs from 'fs-extra';

export class VinSolutionsAgent implements PlatformAdapter {
  public readonly platformName = 'vinsolutions';
  private page: Page | null = null;
  private browser: Browser | null = null;
  private notte: NotteClient;
  private logger: Logger;
  private fileManager: FileManager;
  private config: AgentConfig;
  private isAuthenticated = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = new Logger('VinSolutionsAgent');
    this.fileManager = new FileManager();
    this.notte = new NotteClient({
      apiKey: process.env.NOTTE_API_KEY
    });
  }

  async initialize(browser: Browser): Promise<void> {
    this.browser = browser;
    this.page = await browser.newPage({
      viewport: this.config.viewport || { width: 1920, height: 1080 },
      userAgent: this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    // Set up download handling
    await this.setupDownloadHandling();
    
    this.logger.info('VinSolutions agent initialized');
  }

  private async setupDownloadHandling(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    this.page.on('download', async (download) => {
      const suggestedFilename = download.suggestedFilename();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${suggestedFilename}`;
      const downloadPath = path.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
      
      await fs.ensureDir(path.dirname(downloadPath));
      await download.saveAs(downloadPath);
      
      this.logger.info(`Downloaded file: ${filename}`, { path: downloadPath });
    });
  }

  async login(credentials: PlatformCredentials): Promise<boolean> {
    if (!this.page) throw new Error('Agent not initialized');

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
      } else {
        // Fallback to traditional selectors
        await this.page.fill('input[name="username"], input[type="email"], #username', credentials.username);
      }

      // Find password field using perception
      const passwordField = await this.findElementByDescription('password input field');
      if (passwordField.success && passwordField.element) {
        await this.page.click(`xpath=${passwordField.element.xpath}`);
        await this.page.fill(`xpath=${passwordField.element.xpath}`, credentials.password);
      } else {
        // Fallback to traditional selectors
        await this.page.fill('input[name="password"], input[type="password"], #password', credentials.password);
      }

      // Find and click login button using perception
      const loginButton = await this.findElementByDescription('login button');
      if (loginButton.success && loginButton.element) {
        await this.page.click(`xpath=${loginButton.element.xpath}`);
      } else {
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
      } else {
        this.logger.error('Login failed - not redirected to dashboard');
        return false;
      }

    } catch (error) {
      this.logger.error('Login failed', { error: error.message });
      if (this.config.screenshotOnError) {
        await this.takeErrorScreenshot('login_failed');
      }
      return false;
    }
  }

  async navigateToReports(): Promise<boolean> {
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Must be logged in before navigating to reports');
    }

    try {
      this.logger.info('Navigating to reports section');

      // Use perception to find the reports navigation
      const perception = await this.perceivePage();
      
      // Look for "Reports" in the navigation
      const reportsNav = await this.findElementByDescription('Reports navigation link');
      if (reportsNav.success && reportsNav.element) {
        await this.page.click(`xpath=${reportsNav.element.xpath}`);
      } else {
        // Fallback: look for common report navigation patterns
        const reportSelectors = [
          'a[href*="reports"]',
          'text=Reports',
          '[data-testid*="reports"]',
          '.nav-reports',
          '#reports-nav'
        ];
        
        for (const selector of reportSelectors) {
          try {
            await this.page.click(selector, { timeout: 5000 });
            break;
          } catch (e) {
            continue;
          }
        }
      }

      await this.page.waitForLoadState('networkidle');
      
      // Verify we're on the reports page
      const currentUrl = this.page.url();
      const isOnReportsPage = currentUrl.includes('reports') || 
                             await this.page.locator('text=REPORTS & DASHBOARDS').isVisible();

      if (isOnReportsPage) {
        this.logger.info('Successfully navigated to reports section');
        return true;
      } else {
        this.logger.error('Failed to navigate to reports section');
        return false;
      }

    } catch (error) {
      this.logger.error('Navigation to reports failed', { error: error.message });
      if (this.config.screenshotOnError) {
        await this.takeErrorScreenshot('navigation_failed');
      }
      return false;
    }
  }

  async extractReport(request: ReportRequest): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Must be logged in before extracting reports');
    }

    try {
      this.logger.info(`Starting extraction of report: ${request.reportName}`);

      // Step 1: Find the report in the list using perception
      const reportFound = await this.findAndSelectReport(request.reportName);
      if (!reportFound) {
        throw new Error(`Report "${request.reportName}" not found`);
      }

      // Step 2: Click the report to open it
      await this.openReport(request.reportName);

      // Step 3: Wait for report to load and find download button
      await this.page.waitForLoadState('networkidle');
      
      // Step 4: Download the report
      const downloadResult = await this.downloadReport();
      
      const executionTime = Date.now() - startTime;

      const result: ExtractionResult = {
        success: true,
        reportName: request.reportName,
        filePath: downloadResult.filePath,
        metadata: {
          extractedAt: new Date().toISOString(),
          platform: this.platformName,
          fileSize: downloadResult.fileSize,
        },
        attempt: 1,
        executionTime
      };

      this.logger.info(`Successfully extracted report: ${request.reportName}`, result);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Failed to extract report: ${request.reportName}`, { error: error.message });
      
      if (this.config.screenshotOnError) {
        await this.takeErrorScreenshot(`extraction_failed_${request.reportName}`);
      }

      return {
        success: false,
        reportName: request.reportName,
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

  private async findAndSelectReport(reportName: string): Promise<boolean> {
    try {
      // Use perception to understand the reports list
      const perception = await this.perceivePage();
      
      // Look for the specific report (e.g., "Lead Source ROI")
      const reportElement = await this.findElementByDescription(`${reportName} report checkbox`);
      
      if (reportElement.success && reportElement.element) {
        // Click the checkbox to select the report
        await this.page.click(`xpath=${reportElement.element.xpath}`);
        this.logger.info(`Selected report: ${reportName}`);
        return true;
      }

      // Fallback: search for the report by text
      const reportRow = this.page.locator(`text=${reportName}`).first();
      if (await reportRow.isVisible()) {
        // Find the checkbox in the same row
        const checkbox = reportRow.locator('..').locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          this.logger.info(`Selected report via fallback: ${reportName}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to find and select report: ${reportName}`, { error: error.message });
      return false;
    }
  }

  private async openReport(reportName: string): Promise<void> {
    // Click on the report name/link to open it
    const reportLink = this.page.locator(`text=${reportName}`).first();
    await reportLink.click();
    
    // Wait for the report to load
    await this.page.waitForLoadState('networkidle');
    this.logger.info(`Opened report: ${reportName}`);
  }

  private async downloadReport(): Promise<{ filePath: string; fileSize: number }> {
    // Use perception to find the download button
    const downloadButton = await this.findElementByDescription('Download button');
    
    if (downloadButton.success && downloadButton.element) {
      // Set up download promise before clicking
      const downloadPromise = this.page.waitForEvent('download');
      
      await this.page.click(`xpath=${downloadButton.element.xpath}`);
      
      const download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${suggestedFilename}`;
      const downloadPath = path.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
      
      await fs.ensureDir(path.dirname(downloadPath));
      await download.saveAs(downloadPath);
      
      const stats = await fs.stat(downloadPath);
      
      return {
        filePath: downloadPath,
        fileSize: stats.size
      };
    }

    // Fallback: look for common download button patterns
    const downloadSelectors = [
      'text=Download',
      '[data-testid*="download"]',
      '.download-button',
      'button:has-text("Download")',
      'a:has-text("Download")'
    ];

    for (const selector of downloadSelectors) {
      try {
        if (await this.page.locator(selector).isVisible()) {
          const downloadPromise = this.page.waitForEvent('download');
          await this.page.click(selector);
          
          const download = await downloadPromise;
          const suggestedFilename = download.suggestedFilename();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${timestamp}_${suggestedFilename}`;
          const downloadPath = path.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
          
          await fs.ensureDir(path.dirname(downloadPath));
          await download.saveAs(downloadPath);
          
          const stats = await fs.stat(downloadPath);
          
          return {
            filePath: downloadPath,
            fileSize: stats.size
          };
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('Download button not found');
  }

  private async perceivePage(): Promise<PerceptionResult> {
    if (!this.page) throw new Error('Page not initialized');

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
    } catch (error) {
      this.logger.error('Failed to perceive page', { error: error.message });
      throw error;
    }
  }

  private async findElementByDescription(description: string): Promise<VisionResult> {
    try {
      // This would use AI vision to find elements by description
      // For now, return a mock result
      return {
        success: false,
        error: 'Vision integration not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async takeErrorScreenshot(context: string): Promise<void> {
    if (!this.page) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `error_${context}_${timestamp}.png`;
      const screenshotPath = path.join('./screenshots', filename);
      
      await fs.ensureDir(path.dirname(screenshotPath));
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      this.logger.info(`Error screenshot saved: ${filename}`);
    } catch (error) {
      this.logger.error('Failed to take error screenshot', { error: error.message });
    }
  }

  async logout(): Promise<void> {
    if (!this.page) return;

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
        } catch (e) {
          continue;
        }
      }

      this.isAuthenticated = false;
      this.logger.info('Logged out of VinSolutions');
    } catch (error) {
      this.logger.error('Logout failed', { error: error.message });
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const currentUrl = this.page.url();
      return this.isAuthenticated && 
             (currentUrl.includes('dealer-dashboard') || currentUrl.includes('dashboard'));
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    this.isAuthenticated = false;
    this.logger.info('VinSolutions agent closed');
  }
}

