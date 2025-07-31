/**
 * Unified UI Navigation Prompt System - Public API
 *
 * This module provides a comprehensive natural language prompt system
 * for VinSolutions automation tasks. It enables the agent to understand
 * and execute complex UI navigation tasks through AI-powered prompts.
 */
export { PromptType, PROMPT_TEMPLATES, CONTEXT_TEMPLATES, VALIDATION_TEMPLATES, getPromptTemplate, getAvailablePromptTypes, getTemplateVariables } from './PromptTemplates';
export { PromptBuilder, type PromptContext, type CurrentStateContext, type UserContext, type TechnicalContext, type BusinessContext, type PromptBuildOptions, type BuiltPrompt } from './PromptBuilder';
export { PromptManager, type PromptExecutionOptions, type PromptExecutionResult, type PromptManagerStats } from './PromptManager';
import { PromptManager } from './PromptManager';
import { PromptType } from './PromptTemplates';
import { PromptContext } from './PromptBuilder';
import { Logger } from '../../utils/Logger';
/**
 * Get or create the default prompt manager instance
 */
export declare function getDefaultPromptManager(logger?: Logger): PromptManager;
/**
 * Quick execution function for simple prompt tasks
 */
export declare function executePrompt<T = any>(type: PromptType, variables: Record<string, any>, executor: (prompt: string) => Promise<T>, options?: {
    context?: PromptContext;
    useCache?: boolean;
    maxRetries?: number;
    logger?: Logger;
}): Promise<T>;
/**
 * Utility functions for common prompt operations
 */
export declare const PromptUtils: {
    /**
     * Analyze a natural language task instruction
     */
    analyzeTaskInstruction(taskInstruction: string, currentUrl: string, capabilities: string[], executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Analyze a screenshot for UI elements and actions
     */
    analyzeScreenshot(analysisType: string, context: string, targetElements: string[], executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Plan navigation path for a specific goal
     */
    planNavigationPath(currentPage: string, currentUrl: string, userGoal: string, availableElements: string[], previousActions: string[], executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Verify if a task has been completed successfully
     */
    verifyTaskCompletion(originalTask: string, expectedOutcome: string, currentState: string, userIntent: string, executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Plan error recovery strategy
     */
    planErrorRecovery(originalTask: string, failedAction: string, errorDetails: string, currentState: string, attemptsMade: number, executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Identify specific elements in the UI
     */
    identifyElements(identificationTask: string, targetDescription: string, context: string, executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Optimize action sequencing
     */
    optimizeActionSequence(goal: string, availableActions: string[], constraints: string[], currentState: string, executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
    /**
     * Analyze patterns from successful executions
     */
    analyzePatterns(taskType: string, actionsTaken: string[], successMetrics: Record<string, any>, context: string, timing: Record<string, number>, executor: (prompt: string) => Promise<any>, logger?: Logger): Promise<any>;
};
/**
 * Context builders for common scenarios
 */
export declare const ContextBuilders: {
    /**
     * Build context for VinSolutions automation
     */
    buildVinSolutionsContext(username: string, currentUrl: string, sessionDuration: number, previousActions?: string[], errorCount?: number): PromptContext;
    /**
     * Build debugging context with extra information
     */
    buildDebugContext(baseContext: PromptContext, debugInfo: Record<string, any>): PromptContext;
};
/**
 * Validation helpers
 */
export declare const PromptValidation: {
    /**
     * Validate that a response contains required confidence score
     */
    validateConfidenceScore(response: any): boolean;
    /**
     * Validate that a response is properly structured JSON
     */
    validateJsonStructure(response: any, requiredFields: string[]): boolean;
    /**
     * Extract and validate coordinates from response
     */
    validateCoordinates(coordinates: any): boolean;
};
/**
 * Performance monitoring helpers
 */
export declare const PromptMonitoring: {
    /**
     * Get performance statistics from default manager
     */
    getStats(): import("./PromptManager").PromptManagerStats;
    /**
     * Get cache statistics from default manager
     */
    getCacheStats(): {
        totalEntries: number;
        totalHits: number;
        hitRate: number;
        oldestEntry: number;
        newestEntry: number;
    };
    /**
     * Clear cache from default manager
     */
    clearCache(): void;
};
//# sourceMappingURL=index.d.ts.map