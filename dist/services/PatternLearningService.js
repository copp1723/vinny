"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternLearningService = void 0;
const Logger_1 = require("../utils/Logger");
const FileManager_1 = require("../utils/FileManager");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * PatternLearningService - Manages automation pattern learning and retrieval
 *
 * This service stores successful automation patterns and provides intelligent
 * pattern matching for new tasks. It learns from successful executions to
 * improve future automation performance.
 */
class PatternLearningService {
    logger;
    fileManager;
    patterns = new Map();
    patternsFile;
    initialized = false;
    constructor(patternsDirectory = './patterns', logger) {
        this.logger = logger || new Logger_1.Logger('PatternLearningService');
        this.fileManager = new FileManager_1.FileManager();
        this.patternsFile = path.join(patternsDirectory, 'automation-patterns.json');
    }
    /**
     * Initialize the pattern learning service
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            await this.fileManager.ensureDirectoryExists(path.dirname(this.patternsFile));
            await this.loadPatterns();
            // Set up periodic pattern optimization
            setInterval(() => this.optimizePatterns(), 3600000); // Every hour
            this.initialized = true;
            this.logger.info('Pattern learning service initialized', {
                patternsLoaded: this.patterns.size,
                patternsFile: this.patternsFile
            });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to initialize pattern learning service', { error: err.message });
            throw err;
        }
    }
    /**
     * Store a successful automation pattern
     */
    async storePattern(taskType, actionSequence, selectors, executionMetrics, conditions = []) {
        try {
            const patternId = this.generatePatternId(taskType, actionSequence);
            // Check if pattern already exists
            const existingPattern = this.patterns.get(patternId);
            if (existingPattern) {
                // Update existing pattern
                await this.updateExistingPattern(existingPattern, executionMetrics);
                this.logger.debug('Updated existing pattern', { patternId, taskType });
                return patternId;
            }
            // Create new pattern
            const newPattern = {
                id: patternId,
                name: this.generatePatternName(taskType, actionSequence),
                description: this.generatePatternDescription(taskType, actionSequence),
                taskType,
                actionSequence,
                selectors,
                timing: this.calculateTimingPattern(actionSequence, executionMetrics.executionTime),
                successRate: 1.0,
                executionCount: 1,
                averageExecutionTime: executionMetrics.executionTime,
                lastSuccessfulExecution: new Date().toISOString(),
                applicableConditions: conditions,
                requiredCapabilities: this.extractRequiredCapabilities(actionSequence),
                environmentFactors: this.analyzeEnvironmentFactors(executionMetrics.context),
                createdDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                confidence: 0.8, // Initial confidence
                tags: this.generateTags(taskType, actionSequence),
                priority: 'medium',
                usageStats: {
                    totalExecutions: 1,
                    successfulExecutions: 1,
                    failedExecutions: 0,
                    averageExecutionTime: executionMetrics.executionTime,
                    fastestExecution: executionMetrics.executionTime,
                    slowestExecution: executionMetrics.executionTime,
                    recentExecutions: [
                        {
                            timestamp: new Date().toISOString(),
                            success: true,
                            executionTime: executionMetrics.executionTime,
                            context: executionMetrics.context,
                            performanceMetrics: this.extractPerformanceMetrics(executionMetrics)
                        }
                    ],
                    improvementTrends: []
                }
            };
            this.patterns.set(patternId, newPattern);
            await this.savePatterns();
            this.logger.info('Stored new automation pattern', {
                patternId,
                taskType,
                actionCount: actionSequence.length,
                executionTime: executionMetrics.executionTime
            });
            return patternId;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to store pattern', { taskType, error: err.message });
            throw err;
        }
    }
    /**
     * Find patterns matching specific criteria
     */
    async findPatterns(criteria) {
        const results = [];
        for (const pattern of this.patterns.values()) {
            if (this.matchesCriteria(pattern, criteria)) {
                results.push(pattern);
            }
        }
        // Sort results
        if (criteria.sortBy) {
            results.sort((a, b) => this.comparePatterns(a, b, criteria.sortBy));
        }
        // Apply limit
        if (criteria.limit && results.length > criteria.limit) {
            return results.slice(0, criteria.limit);
        }
        return results;
    }
    /**
     * Get the best pattern for a specific task
     */
    async getBestPattern(taskType, context = {}, requiredCapabilities = []) {
        const criteria = {
            taskType,
            minSuccessRate: 0.7,
            minConfidence: 0.6,
            requiredCapabilities,
            sortBy: 'success_rate',
            limit: 1
        };
        const patterns = await this.findPatterns(criteria);
        if (patterns.length === 0) {
            return null;
        }
        const bestPattern = patterns[0];
        // Update pattern usage tracking
        this.trackPatternUsage(bestPattern.id, context);
        this.logger.info('Retrieved best pattern', {
            patternId: bestPattern.id,
            taskType,
            successRate: bestPattern.successRate,
            confidence: bestPattern.confidence
        });
        return bestPattern;
    }
    /**
     * Update pattern after execution (success or failure)
     */
    async updatePatternAfterExecution(patternId, executionResult) {
        const pattern = this.patterns.get(patternId);
        if (!pattern) {
            this.logger.warn('Pattern not found for update', { patternId });
            return;
        }
        // Update execution statistics
        pattern.usageStats.totalExecutions++;
        if (executionResult.success) {
            pattern.usageStats.successfulExecutions++;
            pattern.lastSuccessfulExecution = new Date().toISOString();
        }
        else {
            pattern.usageStats.failedExecutions++;
        }
        // Update success rate
        pattern.successRate = pattern.usageStats.successfulExecutions / pattern.usageStats.totalExecutions;
        // Update timing metrics
        const totalTime = pattern.averageExecutionTime * (pattern.usageStats.totalExecutions - 1) + executionResult.executionTime;
        pattern.averageExecutionTime = totalTime / pattern.usageStats.totalExecutions;
        pattern.usageStats.averageExecutionTime = pattern.averageExecutionTime;
        // Update execution bounds
        pattern.usageStats.fastestExecution = Math.min(pattern.usageStats.fastestExecution, executionResult.executionTime);
        pattern.usageStats.slowestExecution = Math.max(pattern.usageStats.slowestExecution, executionResult.executionTime);
        // Add execution record
        const executionRecord = {
            timestamp: new Date().toISOString(),
            success: executionResult.success,
            executionTime: executionResult.executionTime,
            context: executionResult.context,
            errorDetails: executionResult.errorDetails,
            performanceMetrics: this.extractPerformanceMetrics(executionResult)
        };
        pattern.usageStats.recentExecutions.push(executionRecord);
        // Keep only recent executions (last 50)
        if (pattern.usageStats.recentExecutions.length > 50) {
            pattern.usageStats.recentExecutions = pattern.usageStats.recentExecutions.slice(-50);
        }
        // Update confidence based on recent performance
        pattern.confidence = this.calculatePatternConfidence(pattern);
        pattern.lastUpdated = new Date().toISOString();
        await this.savePatterns();
        this.logger.debug('Updated pattern after execution', {
            patternId,
            success: executionResult.success,
            newSuccessRate: pattern.successRate,
            newConfidence: pattern.confidence
        });
    }
    /**
     * Get pattern statistics and insights
     */
    getPatternStatistics() {
        const patterns = Array.from(this.patterns.values());
        const topPerforming = patterns
            .filter(p => p.usageStats.totalExecutions >= 3)
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 5);
        const recentlyUsed = patterns
            .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
            .slice(0, 10);
        const averageSuccessRate = patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length
            : 0;
        const improvementOpportunities = this.identifyImprovementOpportunities(patterns);
        return {
            totalPatterns: patterns.length,
            averageSuccessRate,
            topPerformingPatterns: topPerforming,
            recentlyUsedPatterns: recentlyUsed,
            improvementOpportunities
        };
    }
    /**
     * Export patterns for backup or sharing
     */
    async exportPatterns(filePath) {
        try {
            const patternsData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                patterns: Array.from(this.patterns.values())
            };
            await fs.writeFile(filePath, JSON.stringify(patternsData, null, 2));
            this.logger.info('Patterns exported successfully', {
                filePath,
                patternCount: this.patterns.size
            });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to export patterns', { filePath, error: err.message });
            throw err;
        }
    }
    /**
     * Import patterns from backup or external source
     */
    async importPatterns(filePath, overwrite = false) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const importData = JSON.parse(content);
            if (!importData.patterns || !Array.isArray(importData.patterns)) {
                throw new Error('Invalid patterns file format');
            }
            let importedCount = 0;
            for (const patternData of importData.patterns) {
                const pattern = patternData;
                if (!overwrite && this.patterns.has(pattern.id)) {
                    continue; // Skip existing patterns
                }
                this.patterns.set(pattern.id, pattern);
                importedCount++;
            }
            await this.savePatterns();
            this.logger.info('Patterns imported successfully', {
                filePath,
                importedCount,
                totalPatterns: this.patterns.size
            });
            return importedCount;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to import patterns', { filePath, error: err.message });
            throw err;
        }
    }
    // ===== PRIVATE METHODS =====
    /**
     * Load patterns from storage
     */
    async loadPatterns() {
        try {
            const exists = await fs.access(this.patternsFile).then(() => true).catch(() => false);
            if (!exists) {
                this.logger.info('No existing patterns file found, starting fresh');
                return;
            }
            const content = await fs.readFile(this.patternsFile, 'utf-8');
            const data = JSON.parse(content);
            if (data.patterns && Array.isArray(data.patterns)) {
                for (const patternData of data.patterns) {
                    this.patterns.set(patternData.id, patternData);
                }
            }
            this.logger.info('Patterns loaded successfully', { count: this.patterns.size });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to load patterns', { error: err.message });
            // Don't throw - start with empty patterns
        }
    }
    /**
     * Save patterns to storage
     */
    async savePatterns() {
        try {
            const data = {
                lastUpdated: new Date().toISOString(),
                version: '1.0',
                patterns: Array.from(this.patterns.values())
            };
            await fs.writeFile(this.patternsFile, JSON.stringify(data, null, 2));
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to save patterns', { error: err.message });
            throw err;
        }
    }
    /**
     * Generate unique pattern ID
     */
    generatePatternId(taskType, actionSequence) {
        const hash = this.hashActionSequence(actionSequence);
        return `${taskType}_${hash}`;
    }
    /**
     * Hash action sequence for pattern identification
     */
    hashActionSequence(actionSequence) {
        const sequence = actionSequence
            .map(step => `${step.action}:${step.targetElement.primarySelector}`)
            .join('|');
        let hash = 0;
        for (let i = 0; i < sequence.length; i++) {
            const char = sequence.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Generate human-readable pattern name
     */
    generatePatternName(taskType, actionSequence) {
        const actionTypes = [...new Set(actionSequence.map(step => step.action))];
        return `${taskType}_${actionTypes.join('_')}_pattern`;
    }
    /**
     * Generate pattern description
     */
    generatePatternDescription(taskType, actionSequence) {
        const stepCount = actionSequence.length;
        const actions = actionSequence.map(step => step.action).join(' -> ');
        return `${taskType} automation with ${stepCount} steps: ${actions}`;
    }
    /**
     * Calculate timing pattern from execution data
     */
    calculateTimingPattern(actionSequence, totalTime) {
        const averageStepDelay = totalTime / actionSequence.length;
        return {
            averageStepDelay,
            criticalWaitPoints: [],
            pageLoadTimes: [],
            optimizationOpportunities: []
        };
    }
    /**
     * Extract required capabilities from action sequence
     */
    extractRequiredCapabilities(actionSequence) {
        const capabilities = new Set();
        for (const step of actionSequence) {
            switch (step.action) {
                case 'click':
                    capabilities.add('mouse_interaction');
                    break;
                case 'fill':
                    capabilities.add('keyboard_input');
                    break;
                case 'select':
                    capabilities.add('dropdown_interaction');
                    break;
                case 'navigate':
                    capabilities.add('page_navigation');
                    break;
            }
        }
        return Array.from(capabilities);
    }
    /**
     * Analyze environment factors from execution context
     */
    analyzeEnvironmentFactors(context) {
        const factors = [];
        if (context.browser) {
            factors.push({
                factor: 'browser_type',
                impact: 'neutral',
                weight: 0.1,
                description: `Browser: ${context.browser}`
            });
        }
        if (context.viewport) {
            factors.push({
                factor: 'viewport_size',
                impact: 'neutral',
                weight: 0.05,
                description: `Viewport: ${context.viewport.width}x${context.viewport.height}`
            });
        }
        return factors;
    }
    /**
     * Generate tags for pattern categorization
     */
    generateTags(taskType, actionSequence) {
        const tags = [taskType];
        const actions = new Set(actionSequence.map(step => step.action));
        tags.push(...Array.from(actions));
        // Add complexity tags
        if (actionSequence.length <= 3) {
            tags.push('simple');
        }
        else if (actionSequence.length <= 6) {
            tags.push('moderate');
        }
        else {
            tags.push('complex');
        }
        return tags;
    }
    /**
     * Extract performance metrics from execution result
     */
    extractPerformanceMetrics(executionResult) {
        return {
            executionTime: executionResult.executionTime || 0,
            memoryUsage: executionResult.memoryUsage || 0,
            networkRequests: executionResult.networkRequests || 0,
            errorsEncountered: executionResult.errorsEncountered || 0
        };
    }
    /**
     * Update existing pattern with new execution data
     */
    async updateExistingPattern(pattern, executionMetrics) {
        pattern.executionCount++;
        if (executionMetrics.success) {
            pattern.lastSuccessfulExecution = new Date().toISOString();
        }
        // Update average execution time
        const totalTime = pattern.averageExecutionTime * (pattern.executionCount - 1) + executionMetrics.executionTime;
        pattern.averageExecutionTime = totalTime / pattern.executionCount;
        pattern.lastUpdated = new Date().toISOString();
        await this.savePatterns();
    }
    /**
     * Check if pattern matches search criteria
     */
    matchesCriteria(pattern, criteria) {
        if (criteria.taskType && pattern.taskType !== criteria.taskType) {
            return false;
        }
        if (criteria.minSuccessRate && pattern.successRate < criteria.minSuccessRate) {
            return false;
        }
        if (criteria.minConfidence && pattern.confidence < criteria.minConfidence) {
            return false;
        }
        if (criteria.tags && !criteria.tags.some(tag => pattern.tags.includes(tag))) {
            return false;
        }
        if (criteria.requiredCapabilities) {
            const hasAllCapabilities = criteria.requiredCapabilities.every(cap => pattern.requiredCapabilities.includes(cap));
            if (!hasAllCapabilities) {
                return false;
            }
        }
        if (criteria.maxAge) {
            const ageInDays = (Date.now() - new Date(pattern.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > criteria.maxAge) {
                return false;
            }
        }
        return true;
    }
    /**
     * Compare patterns for sorting
     */
    comparePatterns(a, b, sortBy) {
        switch (sortBy) {
            case 'success_rate':
                return b.successRate - a.successRate;
            case 'confidence':
                return b.confidence - a.confidence;
            case 'usage_count':
                return b.usageStats.totalExecutions - a.usageStats.totalExecutions;
            case 'last_updated':
                return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
            default:
                return 0;
        }
    }
    /**
     * Track pattern usage for analytics
     */
    trackPatternUsage(patternId, context) {
        // This could be enhanced to track detailed usage analytics
        this.logger.debug('Pattern usage tracked', { patternId, context });
    }
    /**
     * Calculate pattern confidence based on performance history
     */
    calculatePatternConfidence(pattern) {
        const baseConfidence = pattern.successRate;
        const usageBonus = Math.min(pattern.usageStats.totalExecutions / 10, 0.1);
        const recencyBonus = this.calculateRecencyBonus(pattern.lastUpdated);
        return Math.min(baseConfidence + usageBonus + recencyBonus, 1.0);
    }
    /**
     * Calculate recency bonus for confidence scoring
     */
    calculateRecencyBonus(lastUpdated) {
        const daysSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7)
            return 0.05;
        if (daysSinceUpdate <= 30)
            return 0.02;
        return 0;
    }
    /**
     * Identify improvement opportunities from pattern analysis
     */
    identifyImprovementOpportunities(patterns) {
        const opportunities = [];
        const lowSuccessPatterns = patterns.filter(p => p.successRate < 0.8 && p.usageStats.totalExecutions >= 5);
        if (lowSuccessPatterns.length > 0) {
            opportunities.push(`${lowSuccessPatterns.length} patterns have success rates below 80%`);
        }
        const oldPatterns = patterns.filter(p => {
            const daysSinceUpdate = (Date.now() - new Date(p.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate > 90;
        });
        if (oldPatterns.length > 0) {
            opportunities.push(`${oldPatterns.length} patterns haven't been used in over 90 days`);
        }
        return opportunities;
    }
    /**
     * Optimize patterns by removing poor performers and consolidating similar ones
     */
    async optimizePatterns() {
        let optimized = 0;
        const patternsToRemove = [];
        for (const [id, pattern] of this.patterns.entries()) {
            // Remove patterns with very low success rates and low usage
            if (pattern.successRate < 0.3 && pattern.usageStats.totalExecutions >= 10) {
                patternsToRemove.push(id);
                optimized++;
            }
            // Remove very old unused patterns
            const daysSinceUpdate = (Date.now() - new Date(pattern.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate > 180 && pattern.usageStats.totalExecutions < 3) {
                patternsToRemove.push(id);
                optimized++;
            }
        }
        // Remove identified patterns
        for (const id of patternsToRemove) {
            this.patterns.delete(id);
        }
        if (optimized > 0) {
            await this.savePatterns();
            this.logger.info('Pattern optimization completed', {
                patternsRemoved: optimized,
                remainingPatterns: this.patterns.size
            });
        }
    }
}
exports.PatternLearningService = PatternLearningService;
//# sourceMappingURL=PatternLearningService.js.map