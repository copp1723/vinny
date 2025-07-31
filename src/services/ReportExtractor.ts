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
import { FileManager } from '../utils/FileManager';

export class ReportExtractor {
  private browser: Browser | null = null;
  private agent: VinSolutionsAgent | null = null;
  private logger: Logger;
  private notificationService: NotificationService;
  private config: AgentConfig;
  private isRunning = false;
  private fileManager = new FileManager();

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

      // Ensure storage dirs exist and clean old files
      this.fileManager.ensureDirectory(this.config.outputDir || './downloads');
      this.fileManager.ensureDirectory(this.config.screenshotDir || './screenshots');

      this.logger.info('Report Extractor initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize Report Extractor', { error: err.message });
      throw error;
    }
  }

  async extractReport(
    credentials: PlatformCredentials,
    request: ReportRequest & { reportIndex?: number },
    maxRetries: number = 3
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    const { reportName, reportIndex } = request;

    // Require at least one selector method
    if (!reportName && (reportIndex === undefined || reportIndex < 1)) {
      throw new Error('Must provide either reportName or a 1-based reportIndex');
    }

    // Log which strategy will run
    if (reportIndex) {
      this.logger.info(`Selecting report by position: #${reportIndex}`);
    } else {
      this.logger.info(`Selecting report by name: "${reportName}"`);
    }

    if (!this.agent) {
      throw new Error('Report Extractor not initialized');
    }

    this.isRunning = true;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(
          `Extraction attempt ${attempt}/${maxRetries} for ${
            reportIndex ? `reportIndex=${reportIndex}` : `reportName="${reportName}"`
          }`
        );

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
          
          result.executionTime = Date.now() - startTime;

          // Send success notification
          await this.notificationService.sendSuccessNotification(result);
          
          this.isRunning = false;
          return result;
        } else {
          throw new Error(result.error || 'Unknown extraction error');
        }

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err.message;
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
      executionTime: Date.now() - startTime
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
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Failed to extract report: ${request.reportName}`, { error: err.message });
        results.push({
          success: false,
          reportName: request.reportName,
          metadata: {
            extractedAt: new Date().toISOString(),
            platform: 'vinsolutions',
          },
          error: err.message,
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
      const outputDir = this.config.outputDir || './downloads';
      await this.fileManager.ensureDirectory(outputDir);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Storage health check failed', { error: err.message });
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
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Network health check failed', { error: err.message });
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
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error during shutdown', { error: err.message });
    }
  }

  get status(): { isRunning: boolean; isInitialized: boolean } {
    return {
      isRunning: this.isRunning,
      isInitialized: this.browser !== null && this.agent !== null
    };
  }
}
