import { PromptType } from './PromptTemplates';
import { PromptBuilder, PromptContext, PromptBuildOptions, BuiltPrompt } from './PromptBuilder';
import { Logger } from '../../utils/Logger';

/**
 * Cache entry structure for prompt results
 */
interface CacheEntry {
  key: string;
  result: any;
  timestamp: number;
  ttl: number;
  hitCount: number;
  metadata: {
    promptType: PromptType;
    tokenCount: number;
    buildTime: number;
  };
}

/**
 * Execution options for prompt manager
 */
export interface PromptExecutionOptions extends PromptBuildOptions {
  // Caching options
  useCache?: boolean;
  cacheKey?: string;
  cacheTtl?: number; // milliseconds

  // Retry options
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;

  // Performance options
  timeout?: number;
  priority?: 'low' | 'medium' | 'high';

  // Debug options
  logPrompts?: boolean;
  logResponses?: boolean;
  saveDebugInfo?: boolean;
}

/**
 * Execution result with comprehensive metadata
 */
export interface PromptExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    promptType: PromptType;
    executionTime: number;
    cacheHit: boolean;
    retryCount: number;
    tokenCount: number;
    confidence?: number;
  };
  debugInfo?: {
    prompt: string;
    rawResponse: string;
    buildInfo: BuiltPrompt;
  };
}

/**
 * Statistics for monitoring prompt manager performance
 */
export interface PromptManagerStats {
  totalExecutions: number;
  cacheHitRate: number;
  averageExecutionTime: number;
  errorRate: number;
  promptTypeBreakdown: Record<PromptType, number>;
  performanceMetrics: {
    fastestExecution: number;
    slowestExecution: number;
    averageTokenCount: number;
    totalTokensProcessed: number;
  };
}

/**
 * PromptManager - Orchestrates prompt execution with caching and optimization
 * 
 * This class manages the entire lifecycle of prompt execution including:
 * - Prompt building and optimization
 * - Response caching for performance
 * - Retry logic with exponential backoff  
 * - Performance monitoring and statistics
 * - Debug information collection
 */
export class PromptManager {
  private builder: PromptBuilder;
  private logger: Logger;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: PromptManagerStats;
  
  // Performance tracking
  private executionTimes: number[] = [];
  private errorCount: number = 0;
  private totalExecutions: number = 0;
  private cacheHits: number = 0;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('PromptManager');
    this.builder = new PromptBuilder(this.logger);
    
    this.stats = {
      totalExecutions: 0,
      cacheHitRate: 0,
      averageExecutionTime: 0,
      errorRate: 0,
      promptTypeBreakdown: {} as Record<PromptType, number>,
      performanceMetrics: {
        fastestExecution: Infinity,
        slowestExecution: 0,
        averageTokenCount: 0,
        totalTokensProcessed: 0
      }
    };

    // Cleanup cache periodically
    setInterval(() => this.cleanupCache(), 300000); // 5 minutes
  }

  /**
   * Execute a prompt with full orchestration
   */
  async executePrompt<T = any>(
    type: PromptType,
    variables: Record<string, any>,
    executor: (prompt: string) => Promise<T>,
    context?: PromptContext,
    options: PromptExecutionOptions = {}
  ): Promise<PromptExecutionResult<T>> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    this.logger.debug('Starting prompt execution', { type, executionId, options });

    try {
      // Check cache first
      if (options.useCache !== false) {
        const cacheResult = await this.checkCache<T>(type, variables, options.cacheKey);
        if (cacheResult) {
          this.updateStats(type, Date.now() - startTime, true, false);
          return cacheResult;
        }
      }

      // Build the prompt
      const builtPrompt = await this.builder.buildPrompt(type, variables, context, options);
      
      // Validate required variables
      if (builtPrompt.missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${builtPrompt.missingVariables.join(', ')}`);
      }

      // Execute with retry logic
      let lastError: Error | null = null;
      const maxRetries = options.maxRetries || 3;
      let retryCount = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const delay = this.calculateRetryDelay(attempt, options);
            this.logger.info(`Retrying prompt execution (attempt ${attempt + 1}/${maxRetries + 1})`, { delay });
            await this.sleep(delay);
          }

          // Execute the prompt
          const result = await this.executeWithTimeout(
            () => executor(builtPrompt.prompt),
            options.timeout || 30000
          );

          // Parse and validate result
          const parsedResult = this.parseResult(result, type);

          // Cache the result
          if (options.useCache !== false) {
            await this.cacheResult(type, variables, parsedResult, options);
          }

          // Log debug information
          if (options.logPrompts || options.logResponses) {
            this.logExecution(builtPrompt, result, options);
          }

          const executionTime = Date.now() - startTime;
          this.updateStats(type, executionTime, false, false);

          const executionResult: PromptExecutionResult<T> = {
            success: true,
            data: parsedResult,
            metadata: {
              promptType: type,
              executionTime,
              cacheHit: false,
              retryCount: attempt,
              tokenCount: builtPrompt.estimatedTokens,
              confidence: this.extractConfidence(parsedResult)
            }
          };

          // Add debug info if requested
          if (options.saveDebugInfo) {
            executionResult.debugInfo = {
              prompt: builtPrompt.prompt,
              rawResponse: typeof result === 'string' ? result : JSON.stringify(result),
              buildInfo: builtPrompt
            };
          }

          this.logger.debug('Prompt execution completed successfully', {
            type,
            executionId,
            executionTime,
            retryCount: attempt,
            tokenCount: builtPrompt.estimatedTokens
          });

          return executionResult;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount = attempt;
          
          this.logger.warn(`Prompt execution attempt ${attempt + 1} failed`, {
            type,
            executionId,
            error: lastError.message,
            willRetry: attempt < maxRetries
          });
        }
      }

      // All retries failed
      const executionTime = Date.now() - startTime;
      this.updateStats(type, executionTime, false, true);

      return {
        success: false,
        error: lastError?.message || 'Unknown error',
        metadata: {
          promptType: type,
          executionTime,
          cacheHit: false,
          retryCount,
          tokenCount: builtPrompt.estimatedTokens
        }
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const executionTime = Date.now() - startTime;
      
      this.logger.error('Prompt execution failed', {
        type,
        executionId,
        error: err.message,
        executionTime
      });

      this.updateStats(type, executionTime, false, true);

      return {
        success: false,
        error: err.message,
        metadata: {
          promptType: type,
          executionTime,
          cacheHit: false,
          retryCount: 0,
          tokenCount: 0
        }
      };
    }
  }

  /**
   * Get statistics about prompt manager performance
   */
  getStats(): PromptManagerStats {
    return { ...this.stats };
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Prompt cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalHits: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    let totalHits = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }

    return {
      totalEntries: this.cache.size,
      totalHits,
      hitRate: this.totalExecutions > 0 ? this.cacheHits / this.totalExecutions : 0,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry
    };
  }

  /**
   * Validate a built prompt before execution
   */
  async validatePrompt(
    type: PromptType,
    variables: Record<string, any>,
    context?: PromptContext
  ): Promise<{ isValid: boolean; issues: string[]; builtPrompt?: BuiltPrompt }> {
    const issues: string[] = [];

    try {
      const builtPrompt = await this.builder.buildPrompt(type, variables, context);

      // Check for missing variables
      if (builtPrompt.missingVariables.length > 0) {
        issues.push(`Missing required variables: ${builtPrompt.missingVariables.join(', ')}`);
      }

      // Check prompt length
      if (builtPrompt.estimatedTokens > 8000) {
        issues.push(`Prompt may be too long (${builtPrompt.estimatedTokens} estimated tokens)`);
      }

      // Check for placeholder text
      if (builtPrompt.prompt.includes('[MISSING:')) {
        issues.push('Prompt contains missing variable placeholders');
      }

      return {
        isValid: issues.length === 0,
        issues,
        builtPrompt
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      issues.push(`Failed to build prompt: ${err.message}`);

      return {
        isValid: false,
        issues
      };
    }
  }

  /**
   * Check cache for existing result
   */
  private async checkCache<T>(
    type: PromptType,
    variables: Record<string, any>,
    customKey?: string
  ): Promise<PromptExecutionResult<T> | null> {
    const cacheKey = customKey || this.generateCacheKey(type, variables);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update hit count
    entry.hitCount++;
    this.cacheHits++;

    this.logger.debug('Cache hit', { cacheKey, hitCount: entry.hitCount });

    return {
      success: true,
      data: entry.result,
      metadata: {
        promptType: type,
        executionTime: 0,
        cacheHit: true,
        retryCount: 0,
        tokenCount: entry.metadata.tokenCount
      }
    };
  }

  /**
   * Cache execution result
   */
  private async cacheResult(
    type: PromptType,
    variables: Record<string, any>,
    result: any,
    options: PromptExecutionOptions
  ): Promise<void> {
    const cacheKey = options.cacheKey || this.generateCacheKey(type, variables);
    const ttl = options.cacheTtl || 300000; // 5 minutes default

    const entry: CacheEntry = {
      key: cacheKey,
      result,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
      metadata: {
        promptType: type,
        tokenCount: 0, // Will be updated by caller
        buildTime: 0   // Will be updated by caller
      }
    };

    this.cache.set(cacheKey, entry);
    this.logger.debug('Result cached', { cacheKey, ttl });
  }

  /**
   * Generate cache key from prompt type and variables
   */
  private generateCacheKey(type: PromptType, variables: Record<string, any>): string {
    const variableHash = this.hashObject(variables);
    return `${type}:${variableHash}`;
  }

  /**
   * Generate execution ID for tracking
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate retry delay with optional exponential backoff
   */
  private calculateRetryDelay(attempt: number, options: PromptExecutionOptions): number {
    const baseDelay = options.retryDelay || 1000;
    
    if (options.exponentialBackoff) {
      return baseDelay * Math.pow(2, attempt - 1);
    }
    
    return baseDelay;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      )
    ]);
  }

  /**
   * Parse and validate execution result
   */
  private parseResult(result: any, type: PromptType): any {
    if (typeof result === 'string') {
      // Try to parse as JSON
      try {
        return JSON.parse(result);
      } catch {
        // Return as is if not JSON
        return result;
      }
    }
    
    return result;
  }

  /**
   * Extract confidence score from result
   */
  private extractConfidence(result: any): number | undefined {
    if (typeof result === 'object' && result !== null) {
      return result.confidence || result.confidenceScore || undefined;
    }
    return undefined;
  }

  /**
   * Log execution details for debugging
   */
  private logExecution(
    builtPrompt: BuiltPrompt,
    result: any,
    options: PromptExecutionOptions
  ): void {
    if (options.logPrompts) {
      this.logger.debug('Prompt executed', {
        prompt: builtPrompt.prompt.substring(0, 500) + (builtPrompt.prompt.length > 500 ? '...' : ''),
        tokenCount: builtPrompt.estimatedTokens
      });
    }

    if (options.logResponses) {
      this.logger.debug('Prompt response', {
        response: typeof result === 'string' ? result.substring(0, 500) + (result.length > 500 ? '...' : '') : result
      });
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(
    type: PromptType,
    executionTime: number,
    cacheHit: boolean,
    error: boolean
  ): void {
    this.totalExecutions++;
    
    if (cacheHit) {
      this.cacheHits++;
    } else {
      this.executionTimes.push(executionTime);
    }

    if (error) {
      this.errorCount++;
    }

    // Update prompt type breakdown
    this.stats.promptTypeBreakdown[type] = (this.stats.promptTypeBreakdown[type] || 0) + 1;

    // Update performance metrics
    if (!cacheHit) {
      this.stats.performanceMetrics.fastestExecution = Math.min(
        this.stats.performanceMetrics.fastestExecution,
        executionTime
      );
      this.stats.performanceMetrics.slowestExecution = Math.max(
        this.stats.performanceMetrics.slowestExecution,
        executionTime
      );
    }

    // Calculate aggregated stats
    this.stats.totalExecutions = this.totalExecutions;
    this.stats.cacheHitRate = this.totalExecutions > 0 ? this.cacheHits / this.totalExecutions : 0;
    this.stats.errorRate = this.totalExecutions > 0 ? this.errorCount / this.totalExecutions : 0;
    this.stats.averageExecutionTime = this.executionTimes.length > 0 
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length 
      : 0;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}