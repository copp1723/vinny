import { Page, Browser, BrowserContext } from 'playwright';
import { Logger } from '../utils/Logger';
import { OpenRouterService } from '../services/OpenRouterService';
import { FileManager } from '../utils/FileManager';
import { MailgunService } from '../services/MailgunService';
import { SessionPersistenceService } from '../services/SessionPersistenceService';
import { PatternLearningService, AutomationPattern } from '../services/PatternLearningService';
import { ContextBuilders } from '../services/prompts';

/**
 * Task interpretation result from natural language processing
 */
export interface TaskInterpretation {
  taskType: string;
  userIntent: string;
  confidence: number;
  estimatedClicks?: number;
  subTasks: ActionInstruction[];
  targetElements?: string[];
  successCriteria?: string;
  parameters?: {
    requiredCapabilities?: string[];
    [key: string]: any;
  };
}

/**
 * Action instruction from task interpretation
 */
export interface ActionInstruction {
  action: 'click' | 'fill' | 'select' | 'navigate' | 'wait' | 'verify';
  target?: string;
  value?: string;
  selector?: string;
  description: string;
  priority: number;
}

/**
 * Execution context for pattern learning and analysis
 */
export interface ExecutionContext {
  url: string;
  timestamp: string;
  browser: string;
  viewport: { width: number; height: number };
  sessionDuration: number;
  clickCount: number;
  screenshots: number;
  username: string;
  [key: string]: any;
}

/**
 * Task configuration for the unified agent
 */
export interface UnifiedTaskConfig {
  // Target configuration
  target: {
    url: string;                    // Any VinSolutions/Cox URL
    taskType: 'report' | 'lead-activity' | 'dnc-check' | 'custom' | 'natural-language';
    
    // Natural language task specification
    naturalLanguageTask?: string;   // Natural language description of the task
    
    parameters?: {
      reportPosition?: number;      // For reports: 1st, 2nd, 3rd
      leadPhone?: string;          // For lead activity
      dateRange?: string;          // For filtering
      customSelectors?: string[];  // For custom tasks
      [key: string]: any;          // Flexible parameters
    };
  };
  
  // Authentication configuration
  authentication: {
    username: string;
    password: string;
    otpWebhookUrl?: string;        // For 2FA automation
    maxAuthRetries?: number;       // Default: 3
  };
  
  // Agent capabilities
  capabilities: {
    useVision?: boolean;           // Enable AI vision (default: true)
    usePatternLearning?: boolean;  // Enable pattern learning (default: true)
    maxClicks?: number;           // Enforce click limit (default: 5)
    screenshotDebug?: boolean;    // Take screenshots (default: true)
    strategies?: ('direct' | 'vision' | 'position' | 'learned-pattern')[];  // Prioritized strategies
    naturalLanguageMode?: boolean; // Enable natural language processing (default: false)
    adaptiveStrategy?: boolean;    // Use progressive enhancement (default: true)
  };
  
  // Output configuration
  output?: {
    downloadPath?: string;         // For file downloads
    emailTo?: string[];           // For email delivery
    webhookUrl?: string;          // For notifications
    saveDebugInfo?: boolean;      // Save detailed debug information
  };
  
  // Learning configuration
  learning?: {
    enablePatternStorage?: boolean;  // Store successful patterns (default: true)
    patternPriority?: 'speed' | 'reliability' | 'balanced'; // Learning preference
    sharePatterns?: boolean;         // Share patterns with other instances
  };
}

/**
 * Task result with comprehensive metrics
 */
export interface TaskResult {
  success: boolean;
  taskType: string;
  data?: any;                     // Task-specific data
  filePath?: string;              // Downloaded file path
  clickCount: number;             // Actual clicks used
  duration: number;               // Task duration in ms
  screenshots?: string[];         // Debug screenshots
  error?: string;                // Error message if failed
  
  // Natural language and learning metrics
  naturalLanguageInterpretation?: any;  // How the task was interpreted
  patternsUsed?: string[];              // Pattern IDs that were applied
  patternsLearned?: string[];           // New patterns discovered
  confidence?: number;                  // Confidence in task completion
  adaptiveStrategy?: {                  // Strategy progression details
    strategiesAttempted: string[];
    successfulStrategy: string;
    failureReasons: string[];
  };
}

/**
 * Unified VinSolutions Agent
 * 
 * A single, powerful agent that can accomplish ANY VinSolutions task
 * with minimal configuration and optimal efficiency (3-5 clicks max).
 * 
 * Features:
 * - Universal Cox authentication (works with any Cox product)
 * - AI Vision-powered navigation and task execution
 * - Parameter-driven flexibility for any workflow
 * - Enforced click efficiency (3-5 clicks max)
 * - Intelligent error recovery and retry logic
 */
export class UnifiedVinSolutionsAgent {
  private page!: Page;
  private browser!: Browser;
  private context!: BrowserContext;
  private logger: Logger;
  private visionService?: OpenRouterService;
  private fileManager: FileManager;
  private mailgunService?: MailgunService;
  private sessionPersistence: SessionPersistenceService;
  private patternLearningService?: PatternLearningService;
  private clickCount: number = 0;
  private startTime: number = 0;
  private screenshots: string[] = [];
  private sessionIdentifier: string;
  
  // Natural language and learning state
  private currentPattern?: AutomationPattern;
  private actionSequence: any[] = [];
  private strategiesAttempted: string[] = [];
  private naturalLanguageInterpretation?: any;

  constructor(
    private config: UnifiedTaskConfig,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('UnifiedVinSolutionsAgent');
    this.fileManager = new FileManager();
    
    // Initialize session persistence
    this.sessionPersistence = new SessionPersistenceService();
    
    // Create session identifier from username and target URL
    const urlHost = new URL(this.config.target.url).hostname;
    this.sessionIdentifier = `${this.config.authentication.username}_${urlHost}`;
    
    // Initialize services based on config
    if (config.capabilities?.useVision !== false) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        this.visionService = new OpenRouterService({ apiKey });
      }
    }
    
    // Initialize pattern learning service
    if (config.capabilities?.usePatternLearning !== false) {
      this.patternLearningService = new PatternLearningService('./patterns', this.logger);
    }
    
    if (config.output?.emailTo) {
      this.mailgunService = new MailgunService({
        apiKey: process.env.MAILGUN_API_KEY || '',
        domain: process.env.MAILGUN_DOMAIN || '',
        fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
        fromName: 'VinSolutions AI Agent'
      });
    }
  }

  /**
   * Execute any VinSolutions task with optimal efficiency
   */
  async executeTask(): Promise<TaskResult> {
    this.startTime = Date.now();
    this.clickCount = 0;
    
    try {
      this.logger.stepStart('Executing unified VinSolutions task', {
        taskType: this.config.target.taskType,
        targetUrl: this.config.target.url,
        maxClicks: this.config.capabilities?.maxClicks || 5
      });

      // Step 1: Smart authentication and navigation (1-2 clicks max)
      await this.authenticateAndNavigate();
      
      // Step 2: Execute task based on type (2-3 clicks max)
      const result = await this.executeTaskByType();
      
      // Step 3: Handle output (email, webhook, etc.)
      if (result.success && this.config.output) {
        await this.handleOutput(result);
      }
      
      const duration = Date.now() - this.startTime;
      this.logger.stepSuccess(`Task completed in ${duration}ms with ${this.clickCount} clicks`);
      
      return {
        ...result,
        clickCount: this.clickCount,
        duration,
        screenshots: this.screenshots
      };
      
    } catch (error) {
      const duration = Date.now() - this.startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.stepFailed('Task execution failed', err);
      
      // Take failure screenshot
      if (this.page) {
        await this.takeDebugScreenshot('error');
      }
      
      return {
        success: false,
        taskType: this.config.target.taskType,
        clickCount: this.clickCount,
        duration,
        screenshots: this.screenshots,
        error: (error as Error).message
      };
      
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Smart authentication that works with any Cox product
   * Optimized to use minimal clicks
   */
  private async authenticateAndNavigate(): Promise<void> {
    this.logger.stepStart('Smart authentication and navigation');
    
    // Initialize session persistence
    await this.sessionPersistence.initialize();
    
    // Initialize browser
    const playwright = await import('playwright');
    this.browser = await playwright.chromium.launch({
      headless: this.config.capabilities?.screenshotDebug === false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    });
    
    // Try to restore existing session
    const sessionResult = await this.sessionPersistence.restoreSession(
      this.context,
      this.sessionIdentifier
    );
    
    if (sessionResult.restored && sessionResult.page) {
      this.logger.info('✅ Session restored successfully!');
      this.page = sessionResult.page;
      
      // Start keep-alive
      await this.sessionPersistence.startKeepAlive(this.page);
      
      // Navigate to target URL if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes(new URL(this.config.target.url).pathname)) {
        await this.page.goto(this.config.target.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      }
      
      await this.takeDebugScreenshot('session-restored');
      this.logger.stepSuccess('Authentication and navigation complete (session restored)');
      return;
    }
    
    // No valid session - proceed with normal authentication
    this.logger.info('No valid session found, proceeding with authentication');
    this.page = await this.context.newPage();
    
    // Navigate directly to target URL (Cox SSO will handle auth redirect)
    await this.page.goto(this.config.target.url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await this.takeDebugScreenshot('initial-navigation');
    
    // Check if we need to authenticate
    const needsAuth = await this.checkNeedsAuthentication();
    
    if (needsAuth) {
      await this.performCoxAuthentication();
    } else {
      this.logger.info('Already authenticated, proceeding to task');
    }
    
    // Verify we're at the target URL or can navigate there
    await this.ensureAtTargetUrl();
    
    // Save session for future use
    await this.sessionPersistence.saveSession(
      this.context,
      this.page,
      this.sessionIdentifier
    );
    
    // Start keep-alive
    await this.sessionPersistence.startKeepAlive(this.page);
    
    this.logger.stepSuccess('Authentication and navigation complete');
  }

  /**
   * Check if authentication is needed
   */
  private async checkNeedsAuthentication(): Promise<boolean> {
    // Check for common Cox login indicators
    const loginIndicators = [
      'input[name="username"]',
      'input[name="email"]',
      'input[id="username"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      '.login-form',
      '#loginForm'
    ];
    
    for (const selector of loginIndicators) {
      const element = await this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        this.logger.info(`Login required - found: ${selector}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Perform Cox universal authentication with minimal clicks
   */
  private async performCoxAuthentication(): Promise<void> {
    this.logger.stepStart('Performing Cox universal authentication');
    
    try {
      // Enter credentials using AI vision if available
      if (this.visionService) {
        await this.visionGuidedLogin();
      } else {
        await this.standardLogin();
      }
      
      // Handle 2FA if needed
      await this.handle2FAIfRequired();
      
      // Wait for redirect to complete
      await this.waitForAuthCompletion();
      
      this.logger.stepSuccess('Authentication successful');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.stepFailed('Authentication failed', err);
      throw err;
    }
  }

  /**
   * Vision-guided login for maximum flexibility
   */
  private async visionGuidedLogin(): Promise<void> {
    const screenshot = await this.page.screenshot();
    const base64 = screenshot.toString('base64');
    
    const loginElements = await this.visionService!.analyzeLoginPage(base64);
    
    if (loginElements.usernameSelector) {
      await this.page.locator(loginElements.usernameSelector).fill(this.config.authentication.username);
      this.clickCount++;
    }
    
    if (loginElements.passwordSelector) {
      await this.page.locator(loginElements.passwordSelector).fill(this.config.authentication.password);
      this.clickCount++;
    }
    
    if (loginElements.submitSelector) {
      await this.page.locator(loginElements.submitSelector).click();
      this.clickCount++;
    }
  }

  /**
   * Standard login with fallback selectors
   */
  private async standardLogin(): Promise<void> {
    // Username entry
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[id="username"]',
      'input[type="email"]',
      'input[placeholder*="Username"]'
    ];
    
    for (const selector of usernameSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(this.config.authentication.username);
          this.clickCount++;
          break;
        }
      } catch {}
    }
    
    // Password entry
    const passwordSelectors = [
      'input[name="password"]',
      'input[id="password"]',
      'input[type="password"]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(this.config.authentication.password);
          this.clickCount++;
          break;
        }
      } catch {}
    }
    
    // Submit
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'input[type="submit"]'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          this.clickCount++;
          break;
        }
      } catch {}
    }
  }

  /**
   * Handle 2FA if required
   */
  private async handle2FAIfRequired(): Promise<void> {
    // Wait to see if 2FA page appears
    await this.page.waitForTimeout(3000);
    
    const requires2FA = await this.check2FARequired();
    if (!requires2FA) return;
    
    this.logger.stepStart('Handling 2FA authentication');
    
    if (this.config.authentication.otpWebhookUrl) {
      // Automated 2FA handling
      const code = await this.waitForOTPCode();
      await this.enter2FACode(code);
    } else {
      // Manual 2FA - wait for user
      this.logger.info('Waiting for manual 2FA completion...');
      await this.page.waitForURL((url) => !url.toString().includes('signin'), {
        timeout: 300000 // 5 minutes
      });
    }
  }

  /**
   * Check if 2FA is required
   */
  private async check2FARequired(): Promise<boolean> {
    const indicators = [
      'input[name="otpCode"]',
      'input[name="code"]',
      'text=/verification code/i',
      'text=/two.factor/i',
      'text=/2FA/i'
    ];
    
    for (const indicator of indicators) {
      if (await this.page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Wait for OTP code from webhook
   */
  private async waitForOTPCode(): Promise<string> {
    this.logger.info('Waiting for OTP code from webhook...');
    
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 5000;   // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(this.config.authentication.otpWebhookUrl!);
        const data = await response.json();
        
        if (data.code) {
          this.logger.info('OTP code received');
          return data.code;
        }
      } catch {}
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Timeout waiting for OTP code');
  }

  /**
   * Enter 2FA code
   */
  private async enter2FACode(code: string): Promise<void> {
    const codeSelectors = [
      'input[name="otpCode"]',
      'input[name="code"]',
      'input[type="text"]:visible'
    ];
    
    for (const selector of codeSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(code);
          this.clickCount++;
          
          // Submit if button exists
          const submitButton = this.page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Verify")').first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            this.clickCount++;
          }
          
          break;
        }
      } catch {}
    }
  }

  /**
   * Wait for authentication to complete
   */
  private async waitForAuthCompletion(): Promise<void> {
    try {
      await this.page.waitForURL((url) => 
        !url.toString().includes('signin') && 
        !url.toString().includes('login') &&
        !url.toString().includes('authorize'),
        { timeout: 30000 }
      );
    } catch {
      // Sometimes the URL doesn't change, check for dashboard elements
      const dashboardIndicators = [
        'text=/dashboard/i',
        'text=/welcome/i',
        'nav',
        '.navigation',
        '#navigation'
      ];
      
      for (const indicator of dashboardIndicators) {
        if (await this.page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
          return;
        }
      }
    }
  }

  /**
   * Ensure we're at the target URL
   */
  private async ensureAtTargetUrl(): Promise<void> {
    const currentUrl = this.page.url();
    
    if (!currentUrl.includes(new URL(this.config.target.url).pathname)) {
      this.logger.info('Navigating to target URL');
      await this.page.goto(this.config.target.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      await this.takeDebugScreenshot('target-navigation');
    }
  }

  /**
   * Execute task based on type
   */
  private async executeTaskByType(): Promise<TaskResult> {
    switch (this.config.target.taskType) {
      case 'report':
        return await this.executeReportTask();
      
      case 'lead-activity':
        return await this.executeLeadActivityTask();
      
      case 'dnc-check':
        return await this.executeDNCCheckTask();
      
      case 'custom':
        return await this.executeCustomTask();
      
      case 'natural-language':
        return await this.executeNaturalLanguageTask();
      
      default:
        throw new Error(`Unknown task type: ${this.config.target.taskType}`);
    }
  }

  /**
   * Execute report download task
   */
  private async executeReportTask(): Promise<TaskResult> {
    this.logger.stepStart('Executing report download task');
    
    try {
      // Use position-based selection if specified
      const position = this.config.target.parameters?.reportPosition || 1;
      
      // Set up download handling
      const downloadPath = this.config.output?.downloadPath || './downloads';
      await this.fileManager.ensureDirectoryExists(downloadPath);
      
      const downloadPromise = this.page.waitForEvent('download');
      
      // Click report by position
      const reportSelector = `a[href*="report"]:nth-of-type(${position}), .report-link:nth-of-type(${position})`;
      
      // Use vision if available
      if (this.visionService) {
        const screenshot = await this.page.screenshot();
        const action = await this.visionService.analyzePageForTask(
          screenshot.toString('base64'),
          'download report',
          { position }
        );
        
        if (action.selector) {
          await this.page.locator(action.selector).click();
          this.clickCount++;
        }
      } else {
        await this.page.locator(reportSelector).click();
        this.clickCount++;
      }
      
      // Wait for download
      const download = await downloadPromise;
      const fileName = download.suggestedFilename();
      const filePath = `${downloadPath}/${fileName}`;
      await download.saveAs(filePath);
      
      this.logger.stepSuccess('Report downloaded successfully');
      
      return {
        success: true,
        taskType: 'report',
        filePath,
        data: { fileName, position },
        clickCount: this.clickCount,
        duration: Date.now() - this.startTime
      };
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Report download failed: ${errMsg}`);
    }
  }

  /**
   * Execute lead activity task
   */
  private async executeLeadActivityTask(): Promise<TaskResult> {
    this.logger.stepStart('Executing lead activity task');
    
    try {
      const phone = this.config.target.parameters?.leadPhone;
      if (!phone) {
        throw new Error('Lead phone number required for lead activity task');
      }
      
      // Search for lead
      const searchSelector = 'input[placeholder*="Search"], input[name="search"]';
      await this.page.locator(searchSelector).fill(phone);
      this.clickCount++;
      
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(2000);
      
      // Click first result
      const resultSelector = '.search-result:first-of-type, tr:has-text("' + phone + '")';
      await this.page.locator(resultSelector).first().click();
      this.clickCount++;
      
      // Extract activity data
      await this.page.waitForTimeout(2000);
      const activityData = await this.extractLeadActivity();
      
      this.logger.stepSuccess('Lead activity retrieved');
      
      return {
        success: true,
        taskType: 'lead-activity',
        data: activityData,
        clickCount: this.clickCount,
        duration: Date.now() - this.startTime
      };
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Lead activity task failed: ${errMsg}`);
    }
  }

  /**
   * Execute DNC check task
   */
  private async executeDNCCheckTask(): Promise<TaskResult> {
    this.logger.stepStart('Executing DNC check task');
    
    try {
      // This would integrate with your DNC checking logic
      // For now, returning a placeholder
      
      return {
        success: true,
        taskType: 'dnc-check',
        data: { message: 'DNC check task not yet implemented' },
        clickCount: this.clickCount,
        duration: Date.now() - this.startTime
      };
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`DNC check task failed: ${errMsg}`);
    }
  }

  /**
   * Execute custom task with provided selectors
   */
  private async executeCustomTask(): Promise<TaskResult> {
    this.logger.stepStart('Executing custom task');
    
    try {
      const selectors = this.config.target.parameters?.customSelectors || [];
      const results: any[] = [];
      
      for (const selector of selectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 5000 })) {
            await element.click();
            this.clickCount++;
            results.push({ selector, clicked: true });
            
            // Check if we've hit click limit
            if (this.clickCount >= (this.config.capabilities?.maxClicks || 5)) {
              this.logger.warn('Click limit reached');
              break;
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          results.push({ selector, clicked: false, error: errMsg });
        }
      }
      
      return {
        success: true,
        taskType: 'custom',
        data: results,
        clickCount: this.clickCount,
        duration: Date.now() - this.startTime
      };
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Custom task failed: ${errMsg}`);
    }
  }

  /**
   * Extract lead activity data
   */
  private async extractLeadActivity(): Promise<any> {
    return await this.page.evaluate(() => {
      const activities: any[] = [];
      
      // Extract activity rows
      const rows = document.querySelectorAll('.activity-row, .timeline-item, tr[class*="activity"]');
      rows.forEach(row => {
        const date = row.querySelector('.date, .timestamp, td:nth-child(1)')?.textContent?.trim();
        const type = row.querySelector('.type, .activity-type, td:nth-child(2)')?.textContent?.trim();
        const details = row.querySelector('.details, .description, td:nth-child(3)')?.textContent?.trim();
        
        if (date && type) {
          activities.push({ date, type, details });
        }
      });
      
      return {
        leadName: document.querySelector('.lead-name, h1, .customer-name')?.textContent?.trim(),
        phone: document.querySelector('.phone, .contact-phone')?.textContent?.trim(),
        email: document.querySelector('.email, .contact-email')?.textContent?.trim(),
        activities
      };
    });
  }

  /**
   * Handle output (email, webhook, etc.)
   */
  private async handleOutput(result: TaskResult): Promise<void> {
    if (this.config.output?.emailTo && result.filePath && this.mailgunService) {
      await this.mailgunService.sendReportEmail(
        result.filePath,
        `${this.config.target.taskType}_report`,
        'VinSolutions',
        {
          taskType: this.config.target.taskType,
          duration: result.duration,
          clickCount: result.clickCount,
          timestamp: new Date().toISOString()
        },
        Array.isArray(this.config.output.emailTo) ? this.config.output.emailTo : [this.config.output.emailTo]
      );
    }
    
    if (this.config.output?.webhookUrl) {
      await fetch(this.config.output.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    }
  }

  /**
   * Take debug screenshot
   */
  private async takeDebugScreenshot(label: string): Promise<void> {
    if (!this.config.capabilities?.screenshotDebug) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = `screenshots/${label}-${timestamp}.png`;
      await this.fileManager.ensureDirectoryExists('screenshots');
      await this.page.screenshot({ path, fullPage: false });
      this.screenshots.push(path);
      this.logger.debug(`Screenshot saved: ${path}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to take screenshot', { error: err.message });
    }
  }

  /**
   * Execute natural language task using AI-powered interpretation and execution
   */
  private async executeNaturalLanguageTask(): Promise<TaskResult> {
    this.logger.stepStart('Executing natural language task');
    
    if (!this.config.target.naturalLanguageTask) {
      throw new Error('Natural language task description is required');
    }

    if (!this.visionService) {
      throw new Error('Vision service is required for natural language tasks');
    }

    try {
      // Initialize pattern learning service if available
      if (this.patternLearningService) {
        await this.patternLearningService.initialize();
      }

      // Step 1: Interpret the natural language task
      const taskInterpretation = await this.interpretNaturalLanguageTask();
      this.naturalLanguageInterpretation = taskInterpretation;

      // Step 2: Check for learned patterns
      let executionStrategy = 'adaptive';
      if (this.patternLearningService && this.config.capabilities?.strategies?.includes('learned-pattern')) {
        const pattern = await this.findApplicablePattern(taskInterpretation);
        if (pattern) {
          this.currentPattern = pattern;
          executionStrategy = 'learned-pattern';
          this.logger.info('Using learned pattern', { patternId: pattern.id, confidence: pattern.confidence });
        }
      }

      // Step 3: Execute using progressive enhancement strategy
      const result = await this.executeWithProgressiveEnhancement(taskInterpretation, executionStrategy);
      
      // Step 4: Learn from successful execution
      if (result.success && this.patternLearningService && this.config.learning?.enablePatternStorage !== false) {
        await this.storeSuccessfulPattern(taskInterpretation, result);
      }

      // Update pattern performance if we used one
      if (this.currentPattern && this.patternLearningService) {
        await this.patternLearningService.updatePatternAfterExecution(
          this.currentPattern.id,
          {
            success: result.success,
            executionTime: result.duration,
            context: this.buildExecutionContext(),
            errorDetails: result.error
          }
        );
      }

      this.logger.stepSuccess('Natural language task completed', {
        strategy: executionStrategy,
        confidence: taskInterpretation.confidence
      });

      return {
        ...result,
        naturalLanguageInterpretation: taskInterpretation,
        patternsUsed: this.currentPattern ? [this.currentPattern.id] : [],
        confidence: taskInterpretation.confidence,
        adaptiveStrategy: {
          strategiesAttempted: this.strategiesAttempted,
          successfulStrategy: executionStrategy,
          failureReasons: []
        }
      };

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Natural language task failed: ${errMsg}`);
    }
  }

  /**
   * Interpret natural language task using AI
   */
  private async interpretNaturalLanguageTask(): Promise<TaskInterpretation> {
    if (!this.visionService) {
      throw new Error('Vision service required for natural language interpretation');
    }

    const screenshot = await this.page.screenshot();
    const context = ContextBuilders.buildVinSolutionsContext(
      this.config.authentication.username,
      this.page.url(),
      Date.now() - this.startTime,
      [],
      0
    );

    return await this.visionService.analyzeTaskInstruction(
      this.config.target.naturalLanguageTask!,
      this.page.url(),
      ['click', 'fill', 'select', 'navigate', 'wait'],
      context
    );
  }

  /**
   * Find applicable learned pattern for the task
   */
  private async findApplicablePattern(taskInterpretation: TaskInterpretation): Promise<AutomationPattern | null> {
    if (!this.patternLearningService) return null;

    return await this.patternLearningService.getBestPattern(
      taskInterpretation.taskType,
      this.buildExecutionContext(),
      taskInterpretation.parameters?.requiredCapabilities || []
    );
  }

  /**
   * Execute task using progressive enhancement (try direct → learned → vision → fallback)
   */
  private async executeWithProgressiveEnhancement(
    taskInterpretation: TaskInterpretation,
    preferredStrategy: string
  ): Promise<TaskResult> {
    const strategies = this.config.capabilities?.strategies || 
      ['direct', 'learned-pattern', 'vision', 'position'];
    
    // Prioritize preferred strategy
    const orderedStrategies = [preferredStrategy, ...strategies.filter(s => s !== preferredStrategy)];
    
    let lastError: Error | null = null;
    
    for (const strategy of orderedStrategies) {
      this.strategiesAttempted.push(strategy);
      
      try {
        this.logger.info(`Attempting strategy: ${strategy}`);
        
        const result = await this.executeWithStrategy(strategy, taskInterpretation);
        
        if (result.success) {
          this.logger.info(`Strategy succeeded: ${strategy}`);
          return result;
        } else {
          lastError = new Error(result.error || `Strategy ${strategy} failed`);
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Strategy ${strategy} failed`, { error: lastError.message });
        
        // Take screenshot for debugging
        await this.takeDebugScreenshot(`strategy-${strategy}-failed`);
      }
    }
    
    // All strategies failed
    throw lastError || new Error('All execution strategies failed');
  }

  /**
   * Execute task using a specific strategy
   */
  private async executeWithStrategy(strategy: string, taskInterpretation: TaskInterpretation): Promise<TaskResult> {
    switch (strategy) {
      case 'direct':
        return await this.executeDirectStrategy(taskInterpretation);
        
      case 'learned-pattern':
        return await this.executeLearnedPatternStrategy();
        
      case 'vision':
        return await this.executeVisionStrategy(taskInterpretation);
        
      case 'position':
        return await this.executePositionStrategy(taskInterpretation);
        
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Execute using direct selectors and standard automation
   */
  private async executeDirectStrategy(taskInterpretation: TaskInterpretation): Promise<TaskResult> {
    this.logger.debug('Executing direct strategy');
    
    const actions = taskInterpretation.subTasks || [];
    const results: any[] = [];
    
    for (const action of actions) {
      try {
        const actionResult = await this.performDirectAction(action);
        results.push(actionResult);
        this.actionSequence.push(actionResult);
        
        if (this.clickCount >= (this.config.capabilities?.maxClicks || 5)) {
          this.logger.warn('Click limit reached in direct strategy');
          break;
        }
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Direct action failed', { action, error: err.message });
        throw err;
      }
    }
    
    return {
      success: true,
      taskType: 'natural-language',
      data: results,
      clickCount: this.clickCount,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Execute using learned pattern
   */
  private async executeLearnedPatternStrategy(): Promise<TaskResult> {
    if (!this.currentPattern) {
      throw new Error('No learned pattern available');
    }
    
    this.logger.debug('Executing learned pattern strategy', { patternId: this.currentPattern.id });
    
    const results: any[] = [];
    
    for (const step of this.currentPattern.actionSequence) {
      try {
        const stepResult = await this.performPatternStep(step);
        results.push(stepResult);
        this.actionSequence.push(stepResult);
        
        if (this.clickCount >= (this.config.capabilities?.maxClicks || 5)) {
          this.logger.warn('Click limit reached in pattern strategy');
          break;
        }
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Pattern step failed', { step: step.stepNumber, error: err.message });
        throw err;
      }
    }
    
    return {
      success: true,
      taskType: 'natural-language',
      data: results,
      clickCount: this.clickCount,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Execute using AI vision guidance
   */
  private async executeVisionStrategy(taskInterpretation: TaskInterpretation): Promise<TaskResult> {
    if (!this.visionService) {
      throw new Error('Vision service not available');
    }
    
    this.logger.debug('Executing vision strategy');
    
    const results: any[] = [];
    const maxSteps = Math.min(taskInterpretation.estimatedClicks || 5, this.config.capabilities?.maxClicks || 5);
    
    for (let step = 0; step < maxSteps; step++) {
      try {
        const screenshot = await this.page.screenshot();
        
        const visionAnalysis = await this.visionService.analyzeScreenshotAdvanced(
          screenshot.toString('base64'),
          'find next action to complete task',
          taskInterpretation.targetElements || [],
          `Step ${step + 1} of task: ${this.config.target.naturalLanguageTask}`
        );
        
        const actionResult = await this.performVisionAction(visionAnalysis);
        results.push(actionResult);
        this.actionSequence.push(actionResult);
        
        // Check if task is complete
        const isComplete = await this.verifyTaskCompletion(taskInterpretation);
        if (isComplete) {
          this.logger.info('Task completed via vision strategy');
          break;
        }
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Vision step failed', { step, error: err.message });
        throw err;
      }
    }
    
    return {
      success: true,
      taskType: 'natural-language',
      data: results,
      clickCount: this.clickCount,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Execute using position-based strategy (last resort)
   */
  private async executePositionStrategy(taskInterpretation: TaskInterpretation): Promise<TaskResult> {
    this.logger.debug('Executing position strategy');
    
    // This is a fallback strategy that uses basic position-based clicking
    // Implementation would depend on the specific task requirements
    
    return {
      success: false,
      taskType: 'natural-language',
      error: 'Position strategy not yet implemented',
      clickCount: this.clickCount,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Perform a direct action based on task interpretation
   */
  private async performDirectAction(action: ActionInstruction): Promise<any> {
    // Implementation depends on action type
    this.logger.debug('Performing direct action', { action });
    
    try {
      switch (action.action) {
        case 'click':
          if (action.selector) {
            await this.page.locator(action.selector).first().click();
            this.clickCount++;
          } else if (action.target) {
            await this.page.locator(action.target).first().click();
            this.clickCount++;
          }
          break;
          
        case 'fill':
          if (action.selector && action.value) {
            await this.page.locator(action.selector).first().fill(action.value);
            this.clickCount++;
          } else if (action.target && action.value) {
            await this.page.locator(action.target).first().fill(action.value);
            this.clickCount++;
          }
          break;
          
        case 'select':
          if (action.selector && action.value) {
            await this.page.locator(action.selector).first().selectOption(action.value);
            this.clickCount++;
          }
          break;
          
        case 'wait':
          await this.page.waitForTimeout(2000);
          break;
          
        default:
          this.logger.warn('Unknown action type', { action: action.action });
      }
      
      return {
        action: action.action,
        selector: action.selector || action.target,
        success: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to perform ${action.action}: ${err.message}`);
    }
  }

  /**
   * Perform a step from learned pattern
   */
  private async performPatternStep(step: any): Promise<any> {
    this.logger.debug('Performing pattern step', { stepNumber: step.stepNumber });
    
    try {
      // Try primary selector
      const element = this.page.locator(step.targetElement.primarySelector).first();
      
      if (await element.isVisible({ timeout: step.timeout || 5000 })) {
        switch (step.action) {
          case 'click':
            await element.click();
            this.clickCount++;
            break;
            
          case 'fill':
            await element.fill(step.parameters?.value || '');
            this.clickCount++;
            break;
            
          default:
            this.logger.warn('Unknown pattern step action', { action: step.action });
        }
        
        return {
          step: step.stepNumber,
          action: step.action,
          success: true,
          selector: step.targetElement.primarySelector,
          timestamp: new Date().toISOString()
        };
      }
      
      // Try fallback selectors
      for (const fallbackSelector of step.targetElement.fallbackSelectors || []) {
        const fallbackElement = this.page.locator(fallbackSelector).first();
        if (await fallbackElement.isVisible({ timeout: 2000 })) {
          await fallbackElement.click();
          this.clickCount++;
          
          return {
            step: step.stepNumber,
            action: step.action,
            success: true,
            selector: fallbackSelector,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      throw new Error('No selectors worked for pattern step');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Pattern step execution failed', { 
        step: step.stepNumber, 
        error: err.message 
      });
      throw err;
    }
  }

  /**
   * Perform action based on vision analysis
   */
  private async performVisionAction(visionAnalysis: any): Promise<any> {
    this.logger.debug('Performing vision action', { visionAnalysis });
    
    if (!visionAnalysis.actionPlan) {
      throw new Error('No action plan in vision analysis');
    }
    
    const action = visionAnalysis.actionPlan;
    
    try {
      switch (action.primaryAction) {
        case 'click':
          if (action.coordinates) {
            await this.page.mouse.click(action.coordinates.x, action.coordinates.y);
          } else if (action.targetElement) {
            await this.page.locator(action.targetElement).first().click();
          }
          this.clickCount++;
          break;
          
        case 'fill':
          if (action.targetElement && action.value) {
            await this.page.locator(action.targetElement).fill(action.value);
            this.clickCount++;
          }
          break;
          
        default:
          this.logger.warn('Unknown vision action', { action: action.primaryAction });
      }
      
      return {
        action: action.primaryAction,
        success: true,
        confidence: visionAnalysis.confidence || 0,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Vision action execution failed', { 
        action: action.primaryAction, 
        error: err.message 
      });
      throw err;
    }
  }

  /**
   * Verify if task has been completed successfully
   */
  private async verifyTaskCompletion(taskInterpretation: TaskInterpretation): Promise<boolean> {
    if (!this.visionService) return false;
    
    try {
      const screenshot = await this.page.screenshot();
      
      const verification = await this.visionService.verifyTaskCompletion(
        this.config.target.naturalLanguageTask!,
        taskInterpretation.successCriteria || 'Task completed successfully',
        this.page.url(),
        taskInterpretation.userIntent || 'Complete the requested task'
      );
      
      return verification.completionStatus?.isComplete || false;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Task completion verification failed', { error: err.message });
      return false;
    }
  }

  /**
   * Store successful execution pattern for learning
   */
  private async storeSuccessfulPattern(taskInterpretation: TaskInterpretation, result: TaskResult): Promise<void> {
    if (!this.patternLearningService) return;
    
    try {
      // Convert action sequence to pattern format
      const actionSequence = this.actionSequence.map((action, index) => ({
        stepNumber: index + 1,
        action: action.action || 'click',
        description: `Step ${index + 1}: ${action.action}`,
        targetElement: {
          primarySelector: action.selector || 'unknown',
          fallbackSelectors: [],
          visualDescription: `Element for ${action.action}`
        },
        timeout: 5000,
        maxRetries: 3,
        successRate: 1.0
      }));
      
      const selectors = this.actionSequence
        .filter(action => action.selector)
        .map(action => ({
          selector: action.selector,
          type: 'css' as const,
          reliability: 1.0,
          context: this.page.url(),
          lastWorked: new Date().toISOString(),
          failureReasons: []
        }));
      
      await this.patternLearningService.storePattern(
        taskInterpretation.taskType || 'natural-language',
        actionSequence,
        selectors,
        {
          executionTime: result.duration,
          success: result.success,
          context: this.buildExecutionContext()
        }
      );
      
      this.logger.info('Successful pattern stored for learning');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to store pattern', { error: err.message });
    }
  }

  /**
   * Build execution context for pattern learning
   */
  private buildExecutionContext(): ExecutionContext {
    return {
      url: this.page?.url() || this.config.target.url,
      timestamp: new Date().toISOString(),
      browser: 'chromium',
      viewport: { width: 1920, height: 1080 },
      sessionDuration: Date.now() - this.startTime,
      clickCount: this.clickCount,
      screenshots: this.screenshots.length,
      username: this.config.authentication.username
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop keep-alive
      this.sessionPersistence.stopKeepAlive();
      
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Cleanup error', { error: err.message });
    }
  }
}

/**
 * Factory function for easy instantiation
 */
export async function executeVinSolutionsTask(config: UnifiedTaskConfig): Promise<TaskResult> {
  const agent = new UnifiedVinSolutionsAgent(config);
  return await agent.executeTask();
}