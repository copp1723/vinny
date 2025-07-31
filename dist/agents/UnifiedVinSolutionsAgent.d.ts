import { Logger } from '../utils/Logger';
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
    viewport: {
        width: number;
        height: number;
    };
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
    target: {
        url: string;
        taskType: 'report' | 'lead-activity' | 'dnc-check' | 'custom' | 'natural-language';
        naturalLanguageTask?: string;
        parameters?: {
            reportPosition?: number;
            leadPhone?: string;
            dateRange?: string;
            customSelectors?: string[];
            [key: string]: any;
        };
    };
    authentication: {
        username: string;
        password: string;
        otpWebhookUrl?: string;
        maxAuthRetries?: number;
    };
    capabilities: {
        useVision?: boolean;
        usePatternLearning?: boolean;
        maxClicks?: number;
        screenshotDebug?: boolean;
        strategies?: ('direct' | 'vision' | 'position' | 'learned-pattern')[];
        naturalLanguageMode?: boolean;
        adaptiveStrategy?: boolean;
    };
    output?: {
        downloadPath?: string;
        emailTo?: string[];
        webhookUrl?: string;
        saveDebugInfo?: boolean;
    };
    learning?: {
        enablePatternStorage?: boolean;
        patternPriority?: 'speed' | 'reliability' | 'balanced';
        sharePatterns?: boolean;
    };
}
/**
 * Task result with comprehensive metrics
 */
export interface TaskResult {
    success: boolean;
    taskType: string;
    data?: any;
    filePath?: string;
    clickCount: number;
    duration: number;
    screenshots?: string[];
    error?: string;
    naturalLanguageInterpretation?: any;
    patternsUsed?: string[];
    patternsLearned?: string[];
    confidence?: number;
    adaptiveStrategy?: {
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
export declare class UnifiedVinSolutionsAgent {
    private config;
    private page;
    private browser;
    private context;
    private logger;
    private visionService?;
    private fileManager;
    private mailgunService?;
    private sessionPersistence;
    private patternLearningService?;
    private clickCount;
    private startTime;
    private screenshots;
    private sessionIdentifier;
    private currentPattern?;
    private actionSequence;
    private strategiesAttempted;
    private naturalLanguageInterpretation?;
    constructor(config: UnifiedTaskConfig, logger?: Logger);
    /**
     * Execute any VinSolutions task with optimal efficiency
     */
    executeTask(): Promise<TaskResult>;
    /**
     * Smart authentication that works with any Cox product
     * Optimized to use minimal clicks
     */
    private authenticateAndNavigate;
    /**
     * Check if authentication is needed
     */
    private checkNeedsAuthentication;
    /**
     * Perform Cox universal authentication with minimal clicks
     */
    private performCoxAuthentication;
    /**
     * Vision-guided login for maximum flexibility
     */
    private visionGuidedLogin;
    /**
     * Standard login with fallback selectors
     */
    private standardLogin;
    /**
     * Handle 2FA if required
     */
    private handle2FAIfRequired;
    /**
     * Check if 2FA is required
     */
    private check2FARequired;
    /**
     * Wait for OTP code from webhook
     */
    private waitForOTPCode;
    /**
     * Enter 2FA code
     */
    private enter2FACode;
    /**
     * Wait for authentication to complete
     */
    private waitForAuthCompletion;
    /**
     * Ensure we're at the target URL
     */
    private ensureAtTargetUrl;
    /**
     * Execute task based on type
     */
    private executeTaskByType;
    /**
     * Execute report download task
     */
    private executeReportTask;
    /**
     * Execute lead activity task
     */
    private executeLeadActivityTask;
    /**
     * Execute DNC check task
     */
    private executeDNCCheckTask;
    /**
     * Execute custom task with provided selectors
     */
    private executeCustomTask;
    /**
     * Extract lead activity data
     */
    private extractLeadActivity;
    /**
     * Handle output (email, webhook, etc.)
     */
    private handleOutput;
    /**
     * Take debug screenshot
     */
    private takeDebugScreenshot;
    /**
     * Execute natural language task using AI-powered interpretation and execution
     */
    private executeNaturalLanguageTask;
    /**
     * Interpret natural language task using AI
     */
    private interpretNaturalLanguageTask;
    /**
     * Find applicable learned pattern for the task
     */
    private findApplicablePattern;
    /**
     * Execute task using progressive enhancement (try direct → learned → vision → fallback)
     */
    private executeWithProgressiveEnhancement;
    /**
     * Execute task using a specific strategy
     */
    private executeWithStrategy;
    /**
     * Execute using direct selectors and standard automation
     */
    private executeDirectStrategy;
    /**
     * Execute using learned pattern
     */
    private executeLearnedPatternStrategy;
    /**
     * Execute using AI vision guidance
     */
    private executeVisionStrategy;
    /**
     * Execute using position-based strategy (last resort)
     */
    private executePositionStrategy;
    /**
     * Perform a direct action based on task interpretation
     */
    private performDirectAction;
    /**
     * Perform a step from learned pattern
     */
    private performPatternStep;
    /**
     * Perform action based on vision analysis
     */
    private performVisionAction;
    /**
     * Verify if task has been completed successfully
     */
    private verifyTaskCompletion;
    /**
     * Store successful execution pattern for learning
     */
    private storeSuccessfulPattern;
    /**
     * Build execution context for pattern learning
     */
    private buildExecutionContext;
    /**
     * Cleanup resources
     */
    private cleanup;
}
/**
 * Factory function for easy instantiation
 */
export declare function executeVinSolutionsTask(config: UnifiedTaskConfig): Promise<TaskResult>;
//# sourceMappingURL=UnifiedVinSolutionsAgent.d.ts.map