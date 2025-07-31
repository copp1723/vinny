import { PromptType } from './prompts';
import { PromptContext } from './prompts/PromptBuilder';
export interface OpenRouterConfig {
    apiKey: string;
    baseURL?: string;
    defaultModel?: string;
}
export interface VisionAnalysisResult {
    elementsFound: Array<{
        type: string;
        text: string;
        confidence: number;
        coordinates?: {
            x: number;
            y: number;
        };
    }>;
    nextAction: string;
    reasoning: string;
}
export interface TwoFactorCodeAnalysis {
    codeFound: boolean;
    code?: string;
    confidence: number;
    reasoning: string;
}
export interface LoginPageElements {
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    requires2FA?: boolean;
}
export interface PageActionPlan {
    selector?: string;
    coordinates?: {
        x: number;
        y: number;
    };
    strategy: 'click' | 'fill' | 'select' | 'navigate';
    confidence: number;
}
export declare class OpenRouterService {
    private client;
    private logger;
    private defaultModel;
    private promptManager;
    constructor(config: OpenRouterConfig);
    analyzePageForElements(screenshotBase64: string, targetElements: string[], context?: string): Promise<VisionAnalysisResult>;
    extractTwoFactorCode(emailContent: string): Promise<TwoFactorCodeAnalysis>;
    generateAutomationStrategy(platformName: string, reportName: string, currentStep: string, errorContext?: string): Promise<string>;
    selectBestModel(task: string): Promise<string>;
    testConnection(): Promise<boolean>;
    /**
     * Analyze login page to find authentication elements
     */
    analyzeLoginPage(base64Screenshot: string): Promise<LoginPageElements>;
    /**
     * Analyze page for specific task and return action plan
     */
    analyzePageForTask(base64Screenshot: string, taskDescription: string, parameters?: any): Promise<PageActionPlan>;
    /**
     * General screenshot analysis method
     */
    analyzeScreenshot(base64Screenshot: string, prompt: string): Promise<string>;
    /**
     * Analyze natural language task instruction using structured prompts
     */
    analyzeTaskInstruction(taskInstruction: string, currentUrl: string, capabilities?: string[], context?: PromptContext): Promise<any>;
    /**
     * Analyze screenshot with structured vision prompts
     */
    analyzeScreenshotAdvanced(screenshotBase64: string, analysisType: string, targetElements?: string[], context?: string, promptContext?: PromptContext): Promise<any>;
    /**
     * Plan navigation path using AI reasoning
     */
    planNavigationPath(currentPage: string, currentUrl: string, userGoal: string, availableElements?: string[], previousActions?: string[], context?: PromptContext): Promise<any>;
    /**
     * Verify task completion using structured analysis
     */
    verifyTaskCompletion(originalTask: string, expectedOutcome: string, currentState: string, userIntent: string, context?: PromptContext): Promise<any>;
    /**
     * Plan error recovery strategy with AI assistance
     */
    planErrorRecovery(originalTask: string, failedAction: string, errorDetails: string, currentState: string, attemptsMade?: number, context?: PromptContext): Promise<any>;
    /**
     * Identify UI elements with precise targeting
     */
    identifyElements(screenshotBase64: string, identificationTask: string, targetDescription: string, context?: string, promptContext?: PromptContext): Promise<any>;
    /**
     * Optimize action sequences for maximum efficiency
     */
    optimizeActionSequence(goal: string, availableActions: string[], constraints?: string[], currentState?: string, context?: PromptContext): Promise<any>;
    /**
     * Analyze patterns from successful executions for learning
     */
    analyzePatterns(taskType: string, actionsTaken: string[], successMetrics: Record<string, any>, context?: string, timing?: Record<string, number>, promptContext?: PromptContext): Promise<any>;
    /**
     * Execute a prompt with the configured model
     */
    private executePromptWithModel;
    /**
     * Execute a vision prompt with screenshot
     */
    private executeVisionPrompt;
    /**
     * Get prompt manager statistics
     */
    getPromptStats(): import("./prompts").PromptManagerStats;
    /**
     * Clear prompt manager cache
     */
    clearPromptCache(): void;
    /**
     * Execute custom prompt with full control
     */
    executeCustomPrompt(promptType: PromptType, variables: Record<string, any>, context?: PromptContext, options?: {
        useCache?: boolean;
        maxRetries?: number;
        timeout?: number;
        includeDebugInfo?: boolean;
    }): Promise<any>;
}
//# sourceMappingURL=OpenRouterService.d.ts.map