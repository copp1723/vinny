import { chromium, Browser, Page } from 'playwright';
import { MailgunService } from '../services/MailgunService';
import { OpenRouterService } from '../services/OpenRouterService';
import { Logger } from '../utils/Logger';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios'; // Added axios for HTTP requests

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
  webhookUrl?: string; // Added webhook URL configuration
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
    // Default report name - can be made configurable via UI
    return await this.extractReport({ reportName: 'Lead Source ROI' });
  }

  async extractReport(request: { reportName?: string; reportIndex?: number }): Promise<ExtractionResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    
    // Validate request
    if (!request.reportName && !request.reportIndex) {
      throw new Error('Must provide either reportName or reportIndex');
    }
    
    // Use report name or index-based description
    const reportIdentifier = request.reportName || `Report #${request.reportIndex}`;
    
    try {
      this.logger.info(`Starting ${reportIdentifier} extraction (DEMO MODE)`);
      
      // Send start notification
      await this.mailgunService.sendNotificationEmail(
        'VinSolutions Extraction Started (Demo)',
        `The AI agent has begun extracting "${reportIdentifier}" from VinSolutions. This is a demonstration of the complete workflow including AI-powered automation and professional email delivery.`,
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

      // Step 3: Navigate to reports and favorites
      await this.navigateToReports(screenshots);

      // Step 4: Find and extract the specified report from Favorites
      const reportPath = await this.extractReportFromFavorites(request, screenshots);

      const executionTime = Date.now() - startTime;
      
      const result: ExtractionResult = {
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

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`${reportIdentifier} extraction failed`, {
        error: error.message,
        executionTime
      });

      const result: ExtractionResult = {
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
      // Wait for 2FA screen to load
      try {
        await this.page!.waitForSelector('text=/Verify your identity|Authentication|Two-Factor|2FA/i', { timeout: 10000 });
        this.logger.info('2FA screen detected');
        await this.takeScreenshot(screenshots, '2fa-screen-loaded');
      } catch (err) {
        this.logger.debug('2FA screen header not found, continuing with detection');
      }

      // 1. Update twoFactorIndicators to include factor selection screen indicators
      const twoFactorIndicators = [
        // Factor selection screen indicators
        'text=/Select.*method/i',
        'button:has-text("Select")',
        'text=/SMS.*Email/i',
        'text=/@/',  // Email mask with @ symbol
        'text=/Verify your identity/i',
        
        // Original indicators for code entry screen
        'text=verification',
        'text=code', 
        'text=authenticate',
        'text=two-factor',
        'text=2FA',
        'input[placeholder*="code"]',
        'input[name*="code"]'
      ];
      
      // 2. Differentiate between factor selection and code entry screens
      let isFactorSelectionScreen = false;
      let isCodeEntryScreen = false;
      
      // Check for factor selection screen (has Select buttons)
      const selectButtonCount = await this.page!.locator('button:has-text("Select")').count();
      if (selectButtonCount > 0) {
        isFactorSelectionScreen = true;
        this.logger.info('2FA factor selection screen detected');
        await this.takeScreenshot(screenshots, '2fa-factor-selection');
      }
      
      // Check for code entry screen (has code input)
      const codeInputSelectors = [
        'input[placeholder*="code"]',
        'input[name*="code"]',
        'input[type="text"]',
        'input[type="number"]'
      ];
      
      for (const selector of codeInputSelectors) {
        if (await this.page!.locator(selector).count() > 0) {
          isCodeEntryScreen = true;
          this.logger.info('2FA code entry screen detected');
          await this.takeScreenshot(screenshots, '2fa-code-entry');
          break;
        }
      }
      
      // Check if any 2FA indicators are present if we haven't detected a specific screen yet
      let has2FA = isFactorSelectionScreen || isCodeEntryScreen;
      if (!has2FA) {
        for (const indicator of twoFactorIndicators) {
          const count = await this.page!.locator(indicator).count();
          if (count > 0) {
            has2FA = true;
            this.logger.info(`2FA detected via indicator: ${indicator}`);
            break;
          }
        }
      }
      
      if (has2FA) {
        this.logger.info('2FA detected - proceeding with email verification');
        await this.takeScreenshot(screenshots, '2fa-required');
        
        // Handle factor selection if we're on that screen
        if (isFactorSelectionScreen) {
          // Select email option if available
          try {
            // richer selector list for e-mail MFA option
            const emailOptionSelectors = [
              'text=/email/i',
              'label:has-text("Email")',
              'span:has-text("Email")',
              'button:has-text("Email")',
              'input[type="radio"][value*="email" i]',
              '[aria-label*="email" i]',
              '.icon-email'
            ];

            // Track if we managed to click the e-mail factor
            let emailOptionClicked = false;

            /* ---------------------------------------------------------------
             * Deterministic XPath first - improved version
             * ------------------------------------------------------------- */
            try {
              // Improved deterministic XPath
              const emailSelectXPaths = [
                'xpath=//*[@id="button-verify-by-email"]', // Original
                'xpath=//button[contains(text(), "Select") and (preceding-sibling::*[contains(text(), "@")] or ancestor::*[contains(text(), "@")])]', // More robust
                'xpath=//div[contains(text(), "@")]/following::button[contains(text(), "Select")][1]', // Target first Select after @
                'xpath=//button[contains(text(), "Select") and following-sibling::*[contains(text(), "@")]]', // Select before @
                'xpath=//button[contains(text(), "Select") and parent::*[contains(., "@")]]' // Select within parent containing @
              ];
              
              for (const xpath of emailSelectXPaths) {
                const emailBtn = this.page!.locator(xpath);
                if (await emailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await emailBtn.click();
                  this.logger.debug(`2FA: Clicked email Select button via XPath: ${xpath}`);
                  await this.takeScreenshot(screenshots, '2fa-xpath-success');
                  await this.page!.waitForTimeout(1500);
                  emailOptionClicked = true;
                  break;
                }
              }
            } catch (err: any) {
              this.logger.debug('2FA: Deterministic XPath failed', { error: err.message });
              await this.takeScreenshot(screenshots, '2fa-xpath-failure');
            }

            // Add nth-based selector as a new strategy
            if (!emailOptionClicked) {
              try {
                // Target the second "Select" button directly (bottom one in screenshot)
                const nthSelectBtn = this.page!.locator('button:has-text("Select")').nth(1);
                if (await nthSelectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await nthSelectBtn.click();
                  this.logger.debug('2FA: Clicked email Select button via nth(1) selector');
                  await this.takeScreenshot(screenshots, '2fa-nth-success');
                  await this.page!.waitForTimeout(1500);
                  emailOptionClicked = true;
                }
              } catch (err: any) {
                this.logger.debug('2FA: nth-based selector failed', { error: err.message });
                await this.takeScreenshot(screenshots, '2fa-nth-failure');
              }
            }

            // Try standard selectors if still not clicked
            if (!emailOptionClicked) {
              for (const selector of emailOptionSelectors) {
                const el = this.page!.locator(selector).first();
                if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await el.click({ timeout: 3000 }).catch(() => {});
                  this.logger.debug(`2FA: Clicked e-mail option using selector: ${selector}`);
                  await this.takeScreenshot(screenshots, `2fa-selector-${selector.replace(/[^a-z0-9]/gi, '-')}`);
                  emailOptionClicked = true;
                  await this.page!.waitForTimeout(1500);
                  break;
                }
              }
            }

            // Add new combined container and button selector
            if (!emailOptionClicked) {
              try {
                const combinedSelectors = [
                  'div:has-text("@") >> button:has-text("Select")',
                  'div:has-text("@") button:has-text("Select")',
                  'div:has-text("@") + div button:has-text("Select")'
                ];
                
                for (const selector of combinedSelectors) {
                  const combinedBtn = this.page!.locator(selector);
                  if (await combinedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await combinedBtn.click();
                    this.logger.debug(`2FA: Clicked email Select button via combined selector: ${selector}`);
                    await this.takeScreenshot(screenshots, '2fa-combined-success');
                    await this.page!.waitForTimeout(1500);
                    emailOptionClicked = true;
                    break;
                  }
                }
              } catch (err: any) {
                this.logger.debug('2FA: Combined selector failed', { error: err.message });
                await this.takeScreenshot(screenshots, '2fa-combined-failure');
              }
            }

            /* ------------------------------------------------------------------
               If none of the basic selectors worked, try a layout-aware approach:
               – Find any element that contains an "@" (masked email string)
               – Click its sibling / container "Select" button
               Improved layout heuristic with closer DOM traversal
            ------------------------------------------------------------------ */
            if (!emailOptionClicked) {
              try {
                // Look for the line that contains the masked email address
                const emailCard = this.page!.locator('text=/@/').first(); // regex-like match
                if (await emailCard.isVisible({ timeout: 3000 }).catch(() => false)) {
                  // Try multiple traversal patterns
                  const traversalPatterns = ['xpath=..', 'xpath=../..', 'xpath=ancestor::div[1]'];
                  
                  for (const traversal of traversalPatterns) {
                    const selectBtn = emailCard.locator(traversal).locator('button:has-text("Select")').first();
                    if (await selectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                      await selectBtn.click({ timeout: 3000 }).catch(() => {});
                      this.logger.debug(`2FA: Clicked Select for email card containing "@" using traversal: ${traversal}`);
                      await this.takeScreenshot(screenshots, `2fa-heuristic-${traversal}-success`);
                      emailOptionClicked = true;
                      await this.page!.waitForTimeout(1500);
                      break;
                    }
                  }
                }
              } catch (err: any) {
                this.logger.debug('2FA: email card selection attempt failed', { error: err.message });
                await this.takeScreenshot(screenshots, '2fa-heuristic-failure');
              }
            }

            /* ------------------------------------------------------------------
               Final fallback: click the last "Select" button – typically email
            ------------------------------------------------------------------ */
            if (!emailOptionClicked) {
              try {
                const selectButtons = this.page!.locator('button:has-text("Select")');
                const total = await selectButtons.count();
                if (total > 0) {
                  await selectButtons.nth(total - 1).click({ timeout: 3000 }).catch(() => {});
                  this.logger.debug('2FA: Clicked last Select button as fallback (likely email)');
                  await this.takeScreenshot(screenshots, '2fa-fallback-success');
                  emailOptionClicked = true;
                  await this.page!.waitForTimeout(1500);
                }
              } catch (err: any) {
                this.logger.debug('2FA: fallback Select-button click failed', { error: err.message });
                await this.takeScreenshot(screenshots, '2fa-fallback-failure');
              }
            }

            // 3. If we successfully chose e-mail, click a "send code" / "next" style button
            if (emailOptionClicked) {
              await this.takeScreenshot(screenshots, '2fa-option-selected');
              const sendCodeSelectors = [
                'button:has-text("Send Code")',
                'button:has-text("Send")',
                'button:has-text("Next")',
                'button:has-text("Continue")',
                'input[type="submit"]',
                'button[type="submit"]'
              ];
              
              let sendCodeClicked = false;
              for (const btnSelector of sendCodeSelectors) {
                const btn = this.page!.locator(btnSelector).first();
                if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await btn.click({ timeout: 3000 }).catch(() => {});
                  this.logger.debug(`2FA: Triggered code delivery using selector: ${btnSelector}`);
                  await this.takeScreenshot(screenshots, '2fa-send-code-clicked');
                  // 3. Allow time for the page to transition to code entry
                  await this.page!.waitForTimeout(5000);
                  sendCodeClicked = true;
                  break;
                }
              }
              
              // 4. Check if we've moved to the code entry screen
              if (sendCodeClicked) {
                // Wait for code input to appear
                for (const selector of codeInputSelectors) {
                  try {
                    await this.page!.waitForSelector(selector, { timeout: 5000 });
                    isCodeEntryScreen = true;
                    this.logger.info('Successfully transitioned to code entry screen');
                    break;
                  } catch {
                    // Try next selector
                  }
                }
                
                if (!isCodeEntryScreen) {
                  this.logger.warn('Failed to detect code entry screen after clicking Send Code');
                  await this.takeScreenshot(screenshots, '2fa-code-entry-not-found');
                  // 5. Add explicit error handling
                  throw new Error('Failed to transition to 2FA code entry screen');
                }
              } else {
                this.logger.warn('No Send Code button found after selecting email option');
                await this.takeScreenshot(screenshots, '2fa-no-send-code-button');
              }
            } else {
              // 5. Better error handling - throw specific error when all fallbacks fail
              this.logger.warn('2FA: No email option could be selected after trying all strategies');
              await this.takeScreenshot(screenshots, '2fa-all-fallbacks-failed');
              throw new Error('Failed to select email option for 2FA after trying all strategies');
            }
          } catch (err: any) {
            this.logger.warn('2FA: Error while selecting e-mail option', { error: err.message });
            await this.takeScreenshot(screenshots, '2fa-selection-error');
            throw new Error(`2FA selection failed: ${err.message}`);
          }
        }

        // Handle code entry (either we started here or transitioned from factor selection)
        if (isCodeEntryScreen || await this.isCodeEntryScreenVisible()) {
          // Wait for the real 2FA code from webhook instead of simulating
          if (!this.config.webhookUrl) {
            this.logger.warn('No webhook URL configured, falling back to simulated 2FA code');
            await this.mailgunService.sendNotificationEmail(
              'Warning: Using Simulated 2FA Code',
              'No webhook URL was configured. Using a simulated code (123456) instead of retrieving a real code from the email webhook.',
              this.config.reportRecipients
            );
            
            // Use simulated code as fallback
            await this.enterTwoFactorCode('123456', codeInputSelectors, screenshots);
          } else {
            // Use real webhook to get the 2FA code
            await this.mailgunService.sendNotificationEmail(
              '2FA Code Retrieval',
              'The agent is waiting for the 2FA code to arrive at the webhook. This typically takes 15-30 seconds after selecting the email option.',
              this.config.reportRecipients
            );
            
            this.logger.info('Waiting for real 2FA code from webhook...');
            await this.takeScreenshot(screenshots, '2fa-waiting-for-webhook');
            
            // Wait for email to arrive at webhook (15 seconds initial wait)
            await this.page!.waitForTimeout(15000);
            
            // Try to get the code from webhook with retries
            const code = await this.getCodeFromWebhook(screenshots);
            if (code) {
              this.logger.info(`Retrieved real 2FA code from webhook: ${code.substring(0, 2)}****`);
              await this.enterTwoFactorCode(code, codeInputSelectors, screenshots);
            } else {
              throw new Error('Failed to retrieve 2FA code from webhook after multiple attempts');
            }
          }
        }
        
        // 4. Verify we've actually moved past 2FA
        const still2FA = await this.is2FAScreenVisible();
        if (still2FA) {
          this.logger.error('Still on 2FA screen after all attempts');
          await this.takeScreenshot(screenshots, '2fa-not-completed');
          // 5. Throw explicit error
          throw new Error('Failed to complete 2FA process - still on authentication screen');
        }
        
        this.logger.info('2FA authentication completed successfully');
      }
    } catch (error: any) {
      this.logger.error('2FA handling failed', { error: error.message });
      throw error;
    }
  }
  
  // Helper method to get 2FA code from webhook with retries
  private async getCodeFromWebhook(screenshots: string[]): Promise<string | null> {
    if (!this.config.webhookUrl) {
      return null;
    }
    
    const maxRetries = 5;
    const retryDelayMs = 5000; // 5 seconds between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Attempting to retrieve 2FA code from webhook (attempt ${attempt}/${maxRetries})`);
        
        // Make request to webhook endpoint
        const response = await axios.get(
          `${this.config.webhookUrl}/api/code/latest?platform=vinsolutions&minConfidence=0.7`,
          { timeout: 10000 }
        );
        
        if (response.data && response.data.success && response.data.code) {
          await this.takeScreenshot(screenshots, '2fa-webhook-code-received');
          return response.data.code;
        }
        
        this.logger.debug(`No valid code found in webhook response (attempt ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          this.logger.info(`Waiting ${retryDelayMs/1000} seconds before next webhook check...`);
          await this.page!.waitForTimeout(retryDelayMs);
        }
      } catch (err: any) {
        this.logger.warn(`Error retrieving code from webhook (attempt ${attempt}/${maxRetries})`, { 
          error: err.message 
        });
        
        if (attempt < maxRetries) {
          await this.page!.waitForTimeout(retryDelayMs);
        }
      }
    }
    
    this.logger.error('Failed to retrieve 2FA code from webhook after all attempts');
    await this.takeScreenshot(screenshots, '2fa-webhook-failed');
    return null;
  }
  
  // Helper method to enter 2FA code and submit
  private async enterTwoFactorCode(code: string, codeInputSelectors: string[], screenshots: string[]): Promise<void> {
    let codeEntered = false;
    
    // Try to enter the code in any matching input field
    for (const input of codeInputSelectors) {
      const count = await this.page!.locator(input).count();
      if (count > 0) {
        await this.page!.fill(input, code);
        codeEntered = true;
        this.logger.info('2FA code entered successfully');
        break;
      }
    }
    
    if (!codeEntered) {
      this.logger.warn('Could not find code input field');
      await this.takeScreenshot(screenshots, '2fa-code-input-not-found');
      throw new Error('Could not find input field for 2FA code');
    } else {
      await this.takeScreenshot(screenshots, '2fa-code-entered');
      
      // Submit 2FA
      const submitButtons = [
        'button:has-text("Verify")',
        'button:has-text("Submit")',
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Continue")'
      ];
      
      let submitClicked = false;
      for (const button of submitButtons) {
        const count = await this.page!.locator(button).count();
        if (count > 0) {
          await this.page!.click(button);
          submitClicked = true;
          this.logger.info('2FA code submitted');
          break;
        }
      }
      
      if (!submitClicked) {
        this.logger.warn('Could not find submit button for 2FA code');
        await this.takeScreenshot(screenshots, '2fa-submit-not-found');
        throw new Error('Could not find submit button for 2FA code');
      }
      
      // Wait longer for 2FA processing
      await this.page!.waitForTimeout(8000);
      await this.takeScreenshot(screenshots, 'after-2fa');
    }
  }
  
  // Helper to check if we're still on a 2FA screen
  private async is2FAScreenVisible(): Promise<boolean> {
    const indicators = [
      'text=/Verify your identity/i',
      'text=/Authentication/i',
      'text=/Two-Factor/i',
      'text=/2FA/i',
      'button:has-text("Select")',
      'input[placeholder*="code"]',
      'input[name*="code"]'
    ];
    
    for (const indicator of indicators) {
      if (await this.page!.locator(indicator).count() > 0) {
        return true;
      }
    }
    return false;
  }
  
  // Helper to check if we're on the code entry screen
  private async isCodeEntryScreenVisible(): Promise<boolean> {
    const codeInputSelectors = [
      'input[placeholder*="code"]',
      'input[name*="code"]',
      'input[type="text"]',
      'input[type="number"]'
    ];
    
    for (const selector of codeInputSelectors) {
      if (await this.page!.locator(selector).count() > 0) {
        return true;
      }
    }
    return false;
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
    
    // ALWAYS navigate to Favorites tab - this is where saved reports are located
    await this.navigateToFavorites(screenshots);
  }

  private async navigateToFavorites(screenshots: string[]): Promise<void> {
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
      const count = await this.page!.locator(selector).count();
      if (count > 0) {
        await this.page!.click(selector);
        await this.page!.waitForTimeout(3000);
        favoritesFound = true;
        this.logger.info(`Successfully clicked Favorites tab using selector: ${selector}`);
        break;
      }
    }
    
    if (!favoritesFound) {
      this.logger.warn('Favorites tab not found, reports may be in main reports list');
      await this.takeScreenshot(screenshots, 'favorites-tab-not-found');
    } else {
      await this.takeScreenshot(screenshots, 'favorites-tab-loaded');
    }
  }

  private async extractReportFromFavorites(request: { reportName?: string; reportIndex?: number }, screenshots: string[]): Promise<string> {
    const { reportName, reportIndex } = request;
    const reportIdentifier = reportName || `Report #${reportIndex}`;
    
    this.logger.info(`Extracting "${reportIdentifier}" from Favorites tab`);
    
    let reportLink;
    
    try {
      if (reportIndex) {
        // Option 1: Select by position (1-based index)
        this.logger.info(`Selecting report by position: ${reportIndex}`);
        
        // Get all report links in favorites
        const allReportLinks = this.page!.locator('.favorites-list a, #favorites a, [data-testid="favorites"] a, [role="list"] a');
        const linkCount = await allReportLinks.count();
        
        if (linkCount === 0) {
          // Try broader selectors if specific favorites selectors don't work
          const broadLinks = this.page!.locator('a[href*="report"], a[href*="Report"], a:has-text("report")', { hasText: /.+/ });
          reportLink = broadLinks.nth(reportIndex - 1);
        } else if (reportIndex > linkCount) {
          throw new Error(`Report index ${reportIndex} exceeds available reports (found ${linkCount} reports)`);
        } else {
          reportLink = allReportLinks.nth(reportIndex - 1);
        }
        
        // Wait for the nth link to be visible
        await reportLink.waitFor({ state: 'visible', timeout: 15000 });
        
      } else if (reportName) {
        // Option 2: Select by name (existing logic)
        reportLink = this.page!.getByRole('link', { name: reportName });
        await reportLink.waitFor({ state: 'visible', timeout: 15000 });
      }
      
      await this.takeScreenshot(screenshots, 'favorites-reports-list');
      
      const [download] = await Promise.all([
        this.page!.waitForEvent('download'),   // capture the download
        reportLink!.click(),                    // trigger it
      ]);
      
      // Save the download with sanitized filename
      const baseName = reportName || `report-position-${reportIndex}`;
      const sanitizedName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const downloadPath = path.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
      await download.saveAs(downloadPath);
      
      await this.takeScreenshot(screenshots, 'download-completed');
      this.logger.info(`${reportIdentifier} downloaded to: ${downloadPath}`);
      return downloadPath;
      
    } catch (error: any) {
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
        const fallbackLink = this.page!.locator(`a[href*="${encodeURIComponent(reportName!)}"]`);
        await fallbackLink.waitFor({ state: 'visible', timeout: 10000 });
        
        const [download] = await Promise.all([
          this.page!.waitForEvent('download'),
          fallbackLink.click(),
        ]);
        
        const sanitizedName = reportName!.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const downloadPath = path.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
        await download.saveAs(downloadPath);
        
        await this.takeScreenshot(screenshots, 'fallback-download-completed');
        this.logger.info(`Report "${reportName}" downloaded via fallback to: ${downloadPath}`);
        return downloadPath;
        
      } catch (fallbackError: any) {
        // Final fallback: Try partial text matching
        try {
          const keywords = reportName!.split(' ').filter(word => word.length > 2);
          const keywordRegex = new RegExp(keywords.join('|'), 'i');
          const partialLink = this.page!.getByRole('link', { name: keywordRegex });
          await partialLink.waitFor({ state: 'visible', timeout: 10000 });
          
          const [download] = await Promise.all([
            this.page!.waitForEvent('download'),
            partialLink.click(),
          ]);
          
          const sanitizedName = reportName!.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const downloadPath = path.join(this.config.downloadDir, `${sanitizedName}-${Date.now()}.xlsx`);
          await download.saveAs(downloadPath);
          
          await this.takeScreenshot(screenshots, 'partial-match-download-completed');
          this.logger.info(`Report "${reportName}" downloaded via partial match to: ${downloadPath}`);
          return downloadPath;
          
        } catch (finalError: any) {
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
