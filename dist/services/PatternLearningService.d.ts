import { Logger } from '../utils/Logger';
/**
 * Represents a successful automation pattern
 */
export interface AutomationPattern {
    id: string;
    name: string;
    description: string;
    taskType: string;
    actionSequence: ActionStep[];
    selectors: SelectorPattern[];
    timing: TimingPattern;
    successRate: number;
    executionCount: number;
    averageExecutionTime: number;
    lastSuccessfulExecution: string;
    applicableConditions: PatternCondition[];
    requiredCapabilities: string[];
    environmentFactors: EnvironmentFactor[];
    createdDate: string;
    lastUpdated: string;
    confidence: number;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    usageStats: UsageStatistics;
}
/**
 * Individual step in an automation pattern
 */
export interface ActionStep {
    stepNumber: number;
    action: 'click' | 'fill' | 'select' | 'navigate' | 'wait' | 'verify';
    description: string;
    targetElement: {
        primarySelector: string;
        fallbackSelectors: string[];
        coordinates?: {
            x: number;
            y: number;
        };
        visualDescription: string;
    };
    parameters?: Record<string, any>;
    waitConditions?: string[];
    verificationCriteria?: string[];
    timeout: number;
    maxRetries: number;
    successRate: number;
}
/**
 * Selector pattern with reliability metrics
 */
export interface SelectorPattern {
    selector: string;
    type: 'css' | 'xpath' | 'text' | 'coordinates';
    reliability: number;
    context: string;
    lastWorked: string;
    failureReasons: string[];
}
/**
 * Timing patterns for optimal execution
 */
export interface TimingPattern {
    averageStepDelay: number;
    criticalWaitPoints: {
        stepNumber: number;
        averageWait: number;
    }[];
    pageLoadTimes: {
        url: string;
        averageTime: number;
    }[];
    optimizationOpportunities: string[];
}
/**
 * Conditions under which pattern is applicable
 */
export interface PatternCondition {
    type: 'url_pattern' | 'page_state' | 'element_present' | 'user_role' | 'time_of_day';
    condition: string;
    value: any;
    required: boolean;
}
/**
 * Environmental factors affecting pattern success
 */
export interface EnvironmentFactor {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
}
/**
 * Usage and performance statistics
 */
export interface UsageStatistics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    fastestExecution: number;
    slowestExecution: number;
    recentExecutions: ExecutionRecord[];
    improvementTrends: TrendData[];
}
/**
 * Individual execution record
 */
export interface ExecutionRecord {
    timestamp: string;
    success: boolean;
    executionTime: number;
    context: Record<string, any>;
    errorDetails?: string;
    performanceMetrics: Record<string, number>;
}
/**
 * Trend analysis data
 */
export interface TrendData {
    period: string;
    metric: string;
    value: number;
    trend: 'improving' | 'declining' | 'stable';
}
/**
 * Pattern search criteria
 */
export interface PatternSearchCriteria {
    taskType?: string;
    tags?: string[];
    minSuccessRate?: number;
    minConfidence?: number;
    applicableConditions?: PatternCondition[];
    requiredCapabilities?: string[];
    maxAge?: number;
    sortBy?: 'success_rate' | 'confidence' | 'usage_count' | 'last_updated';
    limit?: number;
}
/**
 * PatternLearningService - Manages automation pattern learning and retrieval
 *
 * This service stores successful automation patterns and provides intelligent
 * pattern matching for new tasks. It learns from successful executions to
 * improve future automation performance.
 */
export declare class PatternLearningService {
    private logger;
    private fileManager;
    private patterns;
    private patternsFile;
    private initialized;
    constructor(patternsDirectory?: string, logger?: Logger);
    /**
     * Initialize the pattern learning service
     */
    initialize(): Promise<void>;
    /**
     * Store a successful automation pattern
     */
    storePattern(taskType: string, actionSequence: ActionStep[], selectors: SelectorPattern[], executionMetrics: {
        executionTime: number;
        success: boolean;
        context: Record<string, any>;
    }, conditions?: PatternCondition[]): Promise<string>;
    /**
     * Find patterns matching specific criteria
     */
    findPatterns(criteria: PatternSearchCriteria): Promise<AutomationPattern[]>;
    /**
     * Get the best pattern for a specific task
     */
    getBestPattern(taskType: string, context?: Record<string, any>, requiredCapabilities?: string[]): Promise<AutomationPattern | null>;
    /**
     * Update pattern after execution (success or failure)
     */
    updatePatternAfterExecution(patternId: string, executionResult: {
        success: boolean;
        executionTime: number;
        context: Record<string, any>;
        errorDetails?: string;
    }): Promise<void>;
    /**
     * Get pattern statistics and insights
     */
    getPatternStatistics(): {
        totalPatterns: number;
        averageSuccessRate: number;
        topPerformingPatterns: AutomationPattern[];
        recentlyUsedPatterns: AutomationPattern[];
        improvementOpportunities: string[];
    };
    /**
     * Export patterns for backup or sharing
     */
    exportPatterns(filePath: string): Promise<void>;
    /**
     * Import patterns from backup or external source
     */
    importPatterns(filePath: string, overwrite?: boolean): Promise<number>;
    /**
     * Load patterns from storage
     */
    private loadPatterns;
    /**
     * Save patterns to storage
     */
    private savePatterns;
    /**
     * Generate unique pattern ID
     */
    private generatePatternId;
    /**
     * Hash action sequence for pattern identification
     */
    private hashActionSequence;
    /**
     * Generate human-readable pattern name
     */
    private generatePatternName;
    /**
     * Generate pattern description
     */
    private generatePatternDescription;
    /**
     * Calculate timing pattern from execution data
     */
    private calculateTimingPattern;
    /**
     * Extract required capabilities from action sequence
     */
    private extractRequiredCapabilities;
    /**
     * Analyze environment factors from execution context
     */
    private analyzeEnvironmentFactors;
    /**
     * Generate tags for pattern categorization
     */
    private generateTags;
    /**
     * Extract performance metrics from execution result
     */
    private extractPerformanceMetrics;
    /**
     * Update existing pattern with new execution data
     */
    private updateExistingPattern;
    /**
     * Check if pattern matches search criteria
     */
    private matchesCriteria;
    /**
     * Compare patterns for sorting
     */
    private comparePatterns;
    /**
     * Track pattern usage for analytics
     */
    private trackPatternUsage;
    /**
     * Calculate pattern confidence based on performance history
     */
    private calculatePatternConfidence;
    /**
     * Calculate recency bonus for confidence scoring
     */
    private calculateRecencyBonus;
    /**
     * Identify improvement opportunities from pattern analysis
     */
    private identifyImprovementOpportunities;
    /**
     * Optimize patterns by removing poor performers and consolidating similar ones
     */
    private optimizePatterns;
}
//# sourceMappingURL=PatternLearningService.d.ts.map