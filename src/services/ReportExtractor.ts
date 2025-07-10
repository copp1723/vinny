import { chromium, Browser } from 'playwright';
import { VinSolutionsAgent } from '../agents/VinSolutionsAgent';
import { 
  PlatformCredentials, 
  ReportRequest, 
  ExtractionResult, 
  AgentConfig,
  HealthStatus 
} from '../types';
import { Logger } from '../utils/Logger';
import { NotificationService } from './NotificationService';

export class ReportExtractor {
  private browser: Browser | null = null;
  private agent: VinSolutionsAgent | null = null;
  private logger: Logger;
  private notificationService: NotificationService;
  private config: AgentConfig;
  private isRunning = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.logger = new Logger('ReportExtractor');
    this.notificationService = new NotificationService();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Report Extractor');

      // Launch browser
      this.browser = await chromium.launch({
        headless: this.config.headless,
        timeout: this.config.timeout,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      // Initialize VinSolutions agent
      this.agent = new VinSolutionsAgent(this.config);
      await this.agent.initialize(this.browser);

      this.logger.info('Report Extractor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Report Extractor', { error: error.message });
      throw error;
    }
  }

  async extractReport(
    credentials: PlatformCredentials,
    request: ReportRequest,
    maxRetries: number = 3
  ): Promise<ExtractionResult> {
    if (!this.agent) {
      throw new Error('Report Extractor not initialized');
    }

    this.isRunning = true;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Extraction attempt ${attempt}/${maxRetries} for report: ${request.reportName}`);

        // Step 1: Login
        const loginSuccess = await this.agent.login(credentials);
        if (!loginSuccess) {
          throw new Error('Login failed');
        }

        // Step 2: Navigate to reports
        const navSuccess = await this.agent.navigateToReports();
        if (!navSuccess) {
          throw new Error('Failed to navigate to reports section');
        }

        // Step 3: Extract the report
        const result = await this.agent.extractReport(request);
        
        if (result.success) {
          this.logger.info(`Successfully extracted report: ${request.reportName}`, result);
          
          // Send success notification
          await this.notificationService.sendSuccessNotification(result);
          
          this.isRunning = false;
          return result;
        } else {
          throw new Error(result.error || 'Unknown extraction error');
        }

      } catch (error) {
        lastError = error.message;
        this.logger.warn(`Extraction attempt ${attempt} failed: ${lastError}`);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          this.logger.info(`Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);

          // Reset agent state for retry
          try {
            await this.agent.logout();
          } catch (e) {
            // Ignore logout errors during retry
          }
        }
      }
    }

    // All attempts failed
    const failureResult: ExtractionResult = {
      success: false,
      reportName: request.reportName,
      metadata: {
        extractedAt: new Date().toISOString(),
        platform: 'vinsolutions',
      },
      error: `All ${maxRetries} attempts failed. Last error: ${lastError}`,
      attempt: maxRetries,
      executionTime: 0
    };

    this.logger.error(`Failed to extract report after ${maxRetries} attempts: ${request.reportName}`, failureResult);
    
    // Send failure notification
    await this.notificationService.sendFailureNotification(failureResult);
    
    this.isRunning = false;
    return failureResult;
  }

  async extractMultipleReports(
    credentials: PlatformCredentials,
    requests: ReportRequest[]
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.extractReport(credentials, request);
        results.push(result);

        // Small delay between reports to avoid overwhelming the server
        await this.sleep(2000);
      } catch (error) {
        this.logger.error(`Failed to extract report: ${request.reportName}`, { error: error.message });
        results.push({
          success: false,
          reportName: request.reportName,
          metadata: {
            extractedAt: new Date().toISOString(),
            platform: 'vinsolutions',
          },
          error: error.message,
          attempt: 1,
          executionTime: 0
        });
      }
    }

    return results;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = {
      browser: this.browser !== null,
      platform: this.agent !== null && await this.agent.isLoggedIn(),
      storage: await this.checkStorageHealth(),
      network: await this.checkNetworkHealth()
    };

    const allHealthy = Object.values(checks).every(check => check);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      errors: allHealthy ? undefined : ['One or more health checks failed']
    };
  }

  private async checkStorageHealth(): Promise<boolean> {
    try {
      const outputDir = process.env.REPORTS_OUTPUT_DIR || './downloads';
      const fs = await import('fs-extra');
      await fs.ensureDir(outputDir);
      return true;
    } catch (error) {
      this.logger.error('Storage health check failed', { error: error.message });
      return false;
    }
  }

  private async checkNetworkHealth(): Promise<boolean> {
    try {
      // Simple network check - try to resolve a DNS name
      const dns = await import('dns').then(m => m.promises);
      await dns.resolve('google.com');
      return true;
    } catch (error) {
      this.logger.error('Network health check failed', { error: error.message });
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Report Extractor');

      if (this.agent) {
        await this.agent.close();
        this.agent = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isRunning = false;
      this.logger.info('Report Extractor shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
    }
  }

  get status(): { isRunning: boolean; isInitialized: boolean } {
    return {
      isRunning: this.isRunning,
      isInitialized: this.browser !== null && this.agent !== null
    };
  }
}

