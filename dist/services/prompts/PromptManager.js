"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptManager = void 0;
const PromptBuilder_1 = require("./PromptBuilder");
const Logger_1 = require("../../utils/Logger");
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
class PromptManager {
    builder;
    logger;
    cache = new Map();
    stats;
    // Performance tracking
    executionTimes = [];
    errorCount = 0;
    totalExecutions = 0;
    cacheHits = 0;
    constructor(logger) {
        this.logger = logger || new Logger_1.Logger('PromptManager');
        this.builder = new PromptBuilder_1.PromptBuilder(this.logger);
        this.stats = {
            totalExecutions: 0,
            cacheHitRate: 0,
            averageExecutionTime: 0,
            errorRate: 0,
            promptTypeBreakdown: {},
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
    async executePrompt(type, variables, executor, context, options = {}) {
        const startTime = Date.now();
        const executionId = this.generateExecutionId();
        this.logger.debug('Starting prompt execution', { type, executionId, options });
        try {
            // Check cache first
            if (options.useCache !== false) {
                const cacheResult = await this.checkCache(type, variables, options.cacheKey);
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
            let lastError = null;
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
                    const result = await this.executeWithTimeout(() => executor(builtPrompt.prompt), options.timeout || 30000);
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
                    const executionResult = {
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
                }
                catch (error) {
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
        }
        catch (error) {
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
    getStats() {
        return { ...this.stats };
    }
    /**
     * Clear all cached results
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('Prompt cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
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
    async validatePrompt(type, variables, context) {
        const issues = [];
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
        }
        catch (error) {
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
    async checkCache(type, variables, customKey) {
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
    async cacheResult(type, variables, result, options) {
        const cacheKey = options.cacheKey || this.generateCacheKey(type, variables);
        const ttl = options.cacheTtl || 300000; // 5 minutes default
        const entry = {
            key: cacheKey,
            result,
            timestamp: Date.now(),
            ttl,
            hitCount: 0,
            metadata: {
                promptType: type,
                tokenCount: 0, // Will be updated by caller
                buildTime: 0 // Will be updated by caller
            }
        };
        this.cache.set(cacheKey, entry);
        this.logger.debug('Result cached', { cacheKey, ttl });
    }
    /**
     * Generate cache key from prompt type and variables
     */
    generateCacheKey(type, variables) {
        const variableHash = this.hashObject(variables);
        return `${type}:${variableHash}`;
    }
    /**
     * Generate execution ID for tracking
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Calculate retry delay with optional exponential backoff
     */
    calculateRetryDelay(attempt, options) {
        const baseDelay = options.retryDelay || 1000;
        if (options.exponentialBackoff) {
            return baseDelay * Math.pow(2, attempt - 1);
        }
        return baseDelay;
    }
    /**
     * Execute function with timeout
     */
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), timeout))
        ]);
    }
    /**
     * Parse and validate execution result
     */
    parseResult(result, type) {
        if (typeof result === 'string') {
            // Try to parse as JSON
            try {
                return JSON.parse(result);
            }
            catch {
                // Return as is if not JSON
                return result;
            }
        }
        return result;
    }
    /**
     * Extract confidence score from result
     */
    extractConfidence(result) {
        if (typeof result === 'object' && result !== null) {
            return result.confidence || result.confidenceScore || undefined;
        }
        return undefined;
    }
    /**
     * Log execution details for debugging
     */
    logExecution(builtPrompt, result, options) {
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
    updateStats(type, executionTime, cacheHit, error) {
        this.totalExecutions++;
        if (cacheHit) {
            this.cacheHits++;
        }
        else {
            this.executionTimes.push(executionTime);
        }
        if (error) {
            this.errorCount++;
        }
        // Update prompt type breakdown
        this.stats.promptTypeBreakdown[type] = (this.stats.promptTypeBreakdown[type] || 0) + 1;
        // Update performance metrics
        if (!cacheHit) {
            this.stats.performanceMetrics.fastestExecution = Math.min(this.stats.performanceMetrics.fastestExecution, executionTime);
            this.stats.performanceMetrics.slowestExecution = Math.max(this.stats.performanceMetrics.slowestExecution, executionTime);
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
    cleanupCache() {
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
    hashObject(obj) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.PromptManager = PromptManager;
//# sourceMappingURL=PromptManager.js.map