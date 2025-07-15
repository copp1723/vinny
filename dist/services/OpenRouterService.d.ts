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
export declare class OpenRouterService {
    private client;
    private logger;
    private defaultModel;
    constructor(config: OpenRouterConfig);
    analyzePageForElements(screenshotBase64: string, targetElements: string[], context?: string): Promise<VisionAnalysisResult>;
    extractTwoFactorCode(emailContent: string): Promise<TwoFactorCodeAnalysis>;
    generateAutomationStrategy(platformName: string, reportName: string, currentStep: string, errorContext?: string): Promise<string>;
    selectBestModel(task: string): Promise<string>;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=OpenRouterService.d.ts.map