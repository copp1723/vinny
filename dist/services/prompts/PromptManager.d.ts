import { PromptType } from './PromptTemplates';
import { PromptContext, PromptBuildOptions, BuiltPrompt } from './PromptBuilder';
import { Logger } from '../../utils/Logger';
/**
 * Execution options for prompt manager
 */
export interface PromptExecutionOptions extends PromptBuildOptions {
    useCache?: boolean;
    cacheKey?: string;
    cacheTtl?: number;
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
    timeout?: number;
    priority?: 'low' | 'medium' | 'high';
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
export declare class PromptManager {
    private builder;
    private logger;
    private cache;
    private stats;
    private executionTimes;
    private errorCount;
    private totalExecutions;
    private cacheHits;
    constructor(logger?: Logger);
    /**
     * Execute a prompt with full orchestration
     */
    executePrompt<T = any>(type: PromptType, variables: Record<string, any>, executor: (prompt: string) => Promise<T>, context?: PromptContext, options?: PromptExecutionOptions): Promise<PromptExecutionResult<T>>;
    /**
     * Get statistics about prompt manager performance
     */
    getStats(): PromptManagerStats;
    /**
     * Clear all cached results
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        totalEntries: number;
        totalHits: number;
        hitRate: number;
        oldestEntry: number;
        newestEntry: number;
    };
    /**
     * Validate a built prompt before execution
     */
    validatePrompt(type: PromptType, variables: Record<string, any>, context?: PromptContext): Promise<{
        isValid: boolean;
        issues: string[];
        builtPrompt?: BuiltPrompt;
    }>;
    /**
     * Check cache for existing result
     */
    private checkCache;
    /**
     * Cache execution result
     */
    private cacheResult;
    /**
     * Generate cache key from prompt type and variables
     */
    private generateCacheKey;
    /**
     * Generate execution ID for tracking
     */
    private generateExecutionId;
    /**
     * Calculate retry delay with optional exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Execute function with timeout
     */
    private executeWithTimeout;
    /**
     * Parse and validate execution result
     */
    private parseResult;
    /**
     * Extract confidence score from result
     */
    private extractConfidence;
    /**
     * Log execution details for debugging
     */
    private logExecution;
    /**
     * Update performance statistics
     */
    private updateStats;
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Hash object for cache key generation
     */
    private hashObject;
    /**
     * Sleep utility function
     */
    private sleep;
}
//# sourceMappingURL=PromptManager.d.ts.map