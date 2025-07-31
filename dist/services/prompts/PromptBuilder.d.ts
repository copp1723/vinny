import { PromptType } from './PromptTemplates';
import { Logger } from '../../utils/Logger';
/**
 * Context types for different aspects of the automation state
 */
export interface CurrentStateContext {
    currentUrl?: string;
    pageTitle?: string;
    timestamp?: string;
    previousActions?: string[];
    sessionDuration?: number;
    errorCount?: number;
}
export interface UserContext {
    username?: string;
    platform?: string;
    taskHistory?: string[];
    preferences?: Record<string, any>;
    accessLevel?: string;
}
export interface TechnicalContext {
    browser?: string;
    viewport?: {
        width: number;
        height: number;
    };
    connectionType?: string;
    performanceMetrics?: Record<string, number>;
    debugMode?: boolean;
}
export interface BusinessContext {
    organization?: string;
    department?: string;
    availableReports?: string[];
    dataPermissions?: string[];
    complianceRequirements?: string[];
}
/**
 * Complete context for prompt building
 */
export interface PromptContext {
    currentState?: CurrentStateContext;
    user?: UserContext;
    technical?: TechnicalContext;
    business?: BusinessContext;
    custom?: Record<string, any>;
}
/**
 * Options for prompt building
 */
export interface PromptBuildOptions {
    includeValidation?: boolean;
    includeContext?: boolean;
    contextTypes?: ('currentState' | 'user' | 'technical' | 'business')[];
    customInstructions?: string;
    responseFormat?: 'json' | 'text' | 'structured';
    maxTokens?: number;
    temperature?: number;
}
/**
 * Result of prompt building process
 */
export interface BuiltPrompt {
    prompt: string;
    variables: Record<string, any>;
    missingVariables: string[];
    contextIncluded: string[];
    estimatedTokens: number;
    metadata: {
        type: PromptType;
        buildTime: number;
        includesValidation: boolean;
        includesContext: boolean;
    };
}
/**
 * PromptBuilder - Handles variable injection and prompt construction
 *
 * This class takes template prompts and injects variables, adds context,
 * and prepares them for AI model consumption with proper formatting
 * and validation instructions.
 */
export declare class PromptBuilder {
    private logger;
    constructor(logger?: Logger);
    /**
     * Build a complete prompt from template and context
     */
    buildPrompt(type: PromptType, variables: Record<string, any>, context?: PromptContext, options?: PromptBuildOptions): Promise<BuiltPrompt>;
    /**
     * Inject variables into template using {{variable}} syntax
     */
    injectVariables(template: string, variables: Record<string, any>): string;
    /**
     * Build context section from provided context objects
     */
    private buildContextSection;
    /**
     * Build validation instructions based on response format
     */
    private buildValidationInstructions;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Validate that all required variables are present
     */
    validateRequiredVariables(type: PromptType, variables: Record<string, any>): {
        isValid: boolean;
        missingVariables: string[];
    };
    /**
     * Create a minimal prompt for quick operations
     */
    createMinimalPrompt(type: PromptType, variables: Record<string, any>): string;
    /**
     * Create a context-aware prompt with full features
     */
    createEnhancedPrompt(type: PromptType, variables: Record<string, any>, context: PromptContext, customInstructions?: string): Promise<BuiltPrompt>;
    /**
     * Create a debugging prompt with extra information
     */
    createDebugPrompt(type: PromptType, variables: Record<string, any>, context: PromptContext, debugInfo: Record<string, any>): Promise<BuiltPrompt>;
    /**
     * Get estimated token count for a prompt
     */
    estimateTokenCount(prompt: string): number;
    /**
     * Optimize prompt for token efficiency
     */
    optimizePromptLength(prompt: string, maxTokens: number): string;
}
//# sourceMappingURL=PromptBuilder.d.ts.map