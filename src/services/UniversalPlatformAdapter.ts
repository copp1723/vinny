import { Page, Browser } from 'playwright';
import { 
  PlatformAdapter, 
  PlatformCredentials, 
  ReportRequest, 
  ExtractionResult,
  PerceptionResult,
  VisionResult,
  AgentConfig,
  PlatformType 
} from '../types';
import { Logger } from '../utils/Logger';
import { FileManager } from '../utils/FileManager';
import path from 'path';
import fs from 'fs-extra';

export class UniversalPlatformAdapter implements PlatformAdapter {
  public readonly platformName: string;
  private page: Page | null = null;
  private browser: Browser | null = null;
  private logger: Logger;
  private fileManager: FileManager;
  private config: AgentConfig;
  private isAuthenticated = false;
  private platformConfig: PlatformConfig;

  constructor(platformName: string, config: AgentConfig, platformConfig?: PlatformConfig) {
    this.platformName = platformName;
    this.config = config;
    this.platformConfig = platformConfig || this.getDefaultPlatformConfig();
    this.logger = new Logger(`UniversalAdapter-${platformName}`);
    this.fileManager = new FileManager();
  }

  private getDefaultPlatformConfig(): PlatformConfig {
    return {
      loginSelectors: {
        username: ['input[name="username"]', 'input[type="email"]', '#username', '[data-testid*="username"]'],
        password: ['input[name="password"]', 'input[type="password"]', '#password', '[data-testid*="password"]'],
        loginButton: ['button[type="submit"]', 'input[type="submit"]', '.login-button', '[data-testid*="login"]']
      },
      navigationSelectors: {
        reports: ['a[href*="reports"]', 'text=Reports', '[data-testid*="reports"]', '.nav-reports'],
        dashboard: ['a[href*="dashboard"]', 'text=Dashboard', '[data-testid*="dashboard"]']
      },
      downloadSelectors: {
        downloadButton: ['text=Download', '[data-testid*="download"]', '.download-button', 'button:has-text("Download")'],
        exportButton: ['text=Export', '[data-testid*="export"]', '.export-button', 'button:has-text("Export")']
      },
      waitConditions: {
        loginSuccess: ['[data-testid*="dashboard"]', '.dashboard', 'text=Welcome'],
        reportsPage: ['text=REPORTS', '.reports-container', '[data-testid*="reports"]'],
        reportLoaded: ['.report-content', '[data-testid*="report"]', '.data-table']
      }
    };
  }

  async initialize(browser: Browser): Promise<void> {
    this.browser = browser;
    this.page = await browser.newPage({
      viewport: this.config.viewport || { width: 1920, height: 1080 },
      userAgent: this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    await this.setupDownloadHandling();
    await this.setupPageOptimizations();
    
    this.logger.info(`Universal adapter initialized for platform: ${this.platformName}`);
  }

  private async setupDownloadHandling(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    this.page.on('download', async (download) => {
      const suggestedFilename = download.suggestedFilename();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedPlatform = this.fileManager.sanitizeFilename(this.platformName);
      const filename = `${timestamp}_${sanitizedPlatform}_${suggestedFilename}`;
      const downloadPath = path.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
      
      await fs.ensureDir(path.dirname(downloadPath));
      await download.saveAs(downloadPath);
      
      this.logger.info(`Downloaded file: ${filename}`, { 
        platform: this.platformName,
        path: downloadPath 
      });
    });
  }

  private async setupPageOptimizations(): Promise<void> {
    if (!this.page) return;

    // Block unnecessary resources to speed up automation
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Set up error handling
    this.page.on('pageerror', (error) => {
      this.logger.warn('Page error detected', { error: error.message, platform: this.platformName });
    });
  }

  async login(credentials: PlatformCredentials): Promise<boolean> {
    if (!this.page) throw new Error('Adapter not initialized');

    try {
      this.logger.info(`Starting login process for platform: ${this.platformName}`);
      
      // Navigate to platform
      await this.page.goto(credentials.url, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Log current URL for debugging
      this.logger.debug('Login page loaded', { 
        platform: this.platformName,
        url: this.page.url() 
      });

      // Fallback to traditional selectors
      const traditionalLogin = await this.attemptTraditionalLogin(credentials);
      if (traditionalLogin) {
        return await this.verifyLoginSuccess();
      }

      this.logger.error('All login methods failed', { platform: this.platformName });
      return false;

    } catch (error) {
      this.logger.error('Login failed', { 
        platform: this.platformName,
        error: error.message 
      });
      
      if (this.config.screenshotOnError) {
        await this.takeErrorScreenshot('login_failed');
      }
      return false;
    }
  }


  private async attemptTraditionalLogin(credentials: PlatformCredentials): Promise<boolean> {
    try {
      // Try username field selectors
      for (const selector of this.platformConfig.loginSelectors.username) {
        try {
          await this.page!.fill(selector, credentials.username, { timeout: 5000 });
          break;
        } catch (e) {
          continue;
        }
      }

      // Try password field selectors
      for (const selector of this.platformConfig.loginSelectors.password) {
        try {
          await this.page!.fill(selector, credentials.password, { timeout: 5000 });
          break;
        } catch (e) {
          continue;
        }
      }

      // Try login button selectors
      for (const selector of this.platformConfig.loginSelectors.loginButton) {
        try {
          await this.page!.click(selector, { timeout: 5000 });
          await this.page!.waitForLoadState('networkidle');
          return true;
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug('Traditional login failed', { 
        platform: this.platformName,
        error: error.message 
      });
      return false;
    }
  }

  private async verifyLoginSuccess(): Promise<boolean> {
    try {
      // Check URL for common success patterns
      const currentUrl = this.page!.url();
      const successPatterns = ['dashboard', 'home', 'main', 'portal'];
      const urlSuccess = successPatterns.some(pattern => currentUrl.toLowerCase().includes(pattern));

      if (urlSuccess) {
        this.isAuthenticated = true;
        this.logger.info(`Login successful for platform: ${this.platformName}`);
        return true;
      }

      // Check for success elements
      for (const selector of this.platformConfig.waitConditions.loginSuccess) {
        try {
          await this.page!.waitForSelector(selector, { timeout: 10000 });
          this.isAuthenticated = true;
          this.logger.info(`Login successful for platform: ${this.platformName}`);
          return true;
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Login verification failed', { 
        platform: this.platformName,
        error: error.message 
      });
      return false;
    }
  }

  async navigateToReports(): Promise<boolean> {
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Must be logged in before navigating to reports');
    }

    try {
      this.logger.info(`Navigating to reports section for platform: ${this.platformName}`);


      // Fallback to traditional navigation
      const traditionalNav = await this.attemptTraditionalNavigation();
      if (traditionalNav) {
        return await this.verifyReportsPage();
      }

      this.logger.error('All navigation methods failed', { platform: this.platformName });
      return false;

    } catch (error) {
      this.logger.error('Navigation to reports failed', { 
        platform: this.platformName,
        error: error.message 
      });
      
      if (this.config.screenshotOnError) {
        await this.takeErrorScreenshot('navigation_failed');
      }
      return false;
    }
  }


  private async attemptTraditionalNavigation(): Promise<boolean> {
    for (const selector of this.platformConfig.navigationSelectors.reports) {
      try {
        await this.page!.click(selector, { timeout: 5000 });
        await this.page!.waitForLoadState('networkidle');
        return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  private async verifyReportsPage(): Promise<boolean> {
    for (const selector of this.platformConfig.waitConditions.reportsPage) {
      try {
        await this.page!.waitForSelector(selector, { timeout: 10000 });
        this.logger.info(`Successfully navigated to reports for platform: ${this.platformName}`);
        return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  async extractReport(request: ReportRequest): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    if (!this.page || !this.isAuthenticated) {
      throw new Error('Must be logged in before extracting reports');
    }

    try {
      this.logger.info(`Starting extraction of report: ${request.reportName} for platform: ${this.platformName}`);

      // Universal report extraction workflow
      const steps = [
        () => this.findReport(request.reportName),
        () => this.selectReport(request.reportName),
        () => this.openReport(request.reportName),
        () => this.downloadReport()
      ];

      let downloadResult: any = null;
      for (const step of steps) {
        const result = await step();
        if (step === steps[steps.length - 1]) {
          downloadResult = result;
        }
        if (!result) {
          throw new Error(`Step failed in extraction workflow`);
        }
      }

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

      this.logger.info(`Successfully extracted report: ${request.reportName} for platform: ${this.platformName}`, result);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Failed to extract report: ${request.reportName} for platform: ${this.platformName}`, { 
        error: error.message 
      });
      
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

  private async findReport(reportName: string): Promise<boolean> {
    // Search by text
    const reportLocator = this.page!.locator(`text=${reportName}`).first();
    return await reportLocator.isVisible();
  }

  private async selectReport(reportName: string): Promise<boolean> {
    // Try to find and click checkbox if it exists
    try {
      const reportRow = this.page!.locator(`text=${reportName}`).first();
      const checkbox = reportRow.locator('..').locator('input[type="checkbox"]').first();
      
      if (await checkbox.isVisible()) {
        await checkbox.click();
        this.logger.info(`Selected report: ${reportName} for platform: ${this.platformName}`);
        return true;
      }
    } catch (e) {
      // No checkbox needed for this platform
    }
    
    return true;
  }

  private async openReport(reportName: string): Promise<boolean> {
    const reportLink = this.page!.locator(`text=${reportName}`).first();
    await reportLink.click();
    await this.page!.waitForLoadState('networkidle');
    
    // Wait for report to load
    for (const selector of this.platformConfig.waitConditions.reportLoaded) {
      try {
        await this.page!.waitForSelector(selector, { timeout: 10000 });
        this.logger.info(`Opened report: ${reportName} for platform: ${this.platformName}`);
        return true;
      } catch (e) {
        continue;
      }
    }
    
    return true; // Continue even if we can't verify loading
  }

  private async downloadReport(): Promise<{ filePath: string; fileSize: number }> {
    // Use traditional selectors to find download buttons
    for (const selector of [...this.platformConfig.downloadSelectors.downloadButton, ...this.platformConfig.downloadSelectors.exportButton]) {
      try {
        if (await this.page!.locator(selector).isVisible()) {
          return await this.executeDownload(selector);
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('Download button not found');
  }

  private async executeDownload(selector: string): Promise<{ filePath: string; fileSize: number }> {
    const downloadPromise = this.page!.waitForEvent('download');
    await this.page!.click(selector);
    
    const download = await downloadPromise;
    const suggestedFilename = download.suggestedFilename();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedPlatform = this.fileManager.sanitizeFilename(this.platformName);
    const filename = `${timestamp}_${sanitizedPlatform}_${suggestedFilename}`;
    const downloadPath = path.join(process.env.REPORTS_OUTPUT_DIR || './downloads', filename);
    
    await fs.ensureDir(path.dirname(downloadPath));
    await download.saveAs(downloadPath);
    
    const stats = await fs.stat(downloadPath);
    
    return {
      filePath: downloadPath,
      fileSize: stats.size
    };
  }

  private async takeErrorScreenshot(context: string): Promise<void> {
    if (!this.page) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedPlatform = this.fileManager.sanitizeFilename(this.platformName);
      const filename = `error_${sanitizedPlatform}_${context}_${timestamp}.png`;
      const screenshotPath = path.join('./screenshots', filename);
      
      await fs.ensureDir(path.dirname(screenshotPath));
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      this.logger.info(`Error screenshot saved: ${filename}`, { platform: this.platformName });
    } catch (error) {
      this.logger.error('Failed to take error screenshot', { 
        platform: this.platformName,
        error: error.message 
      });
    }
  }

  async logout(): Promise<void> {
    if (!this.page) return;

    try {
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
      this.logger.info(`Logged out of platform: ${this.platformName}`);
    } catch (error) {
      this.logger.error('Logout failed', { 
        platform: this.platformName,
        error: error.message 
      });
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      return this.isAuthenticated;
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
    this.logger.info(`Universal adapter closed for platform: ${this.platformName}`);
  }
}

// Platform configuration interface
interface PlatformConfig {
  loginSelectors: {
    username: string[];
    password: string[];
    loginButton: string[];
  };
  navigationSelectors: {
    reports: string[];
    dashboard: string[];
  };
  downloadSelectors: {
    downloadButton: string[];
    exportButton: string[];
  };
  waitConditions: {
    loginSuccess: string[];
    reportsPage: string[];
    reportLoaded: string[];
  };
}

