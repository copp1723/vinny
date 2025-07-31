import { Logger } from '../utils/Logger';
/**
 * Debug session information
 */
export interface DebugSession {
    sessionId: string;
    startTime: number;
    endTime?: number;
    taskType: string;
    naturalLanguageTask?: string;
    username: string;
    targetUrl: string;
    executionSteps: DebugStep[];
    screenshots: DebugScreenshot[];
    networkActivity: NetworkEvent[];
    performanceMetrics: PerformanceMetric[];
    promptExecutions: PromptExecution[];
    visionAnalyses: VisionAnalysis[];
    patternMatches: PatternMatch[];
    success: boolean;
    error?: string;
    finalResult?: any;
    strategiesAttempted: string[];
    patternsUsed: string[];
    patternsLearned: string[];
}
/**
 * Individual execution step
 */
export interface DebugStep {
    stepNumber: number;
    timestamp: number;
    action: string;
    description: string;
    targetElement?: string;
    selector?: string;
    coordinates?: {
        x: number;
        y: number;
    };
    success: boolean;
    duration: number;
    error?: string;
    metadata?: Record<string, any>;
}
/**
 * Screenshot with context
 */
export interface DebugScreenshot {
    timestamp: number;
    filename: string;
    context: string;
    fullPath: string;
    pageUrl: string;
    windowSize: {
        width: number;
        height: number;
    };
    annotations?: ScreenshotAnnotation[];
}
/**
 * Screenshot annotation for highlighting elements
 */
export interface ScreenshotAnnotation {
    type: 'click' | 'element' | 'error' | 'success';
    coordinates: {
        x: number;
        y: number;
    };
    label: string;
    color: string;
}
/**
 * Network activity tracking
 */
export interface NetworkEvent {
    timestamp: number;
    type: 'request' | 'response' | 'websocket';
    method?: string;
    url: string;
    status?: number;
    duration?: number;
    size?: number;
    error?: string;
}
/**
 * Performance metrics
 */
export interface PerformanceMetric {
    timestamp: number;
    metric: string;
    value: number;
    unit: string;
    context?: string;
}
/**
 * Prompt execution tracking
 */
export interface PromptExecution {
    timestamp: number;
    promptType: string;
    prompt: string;
    response: string;
    duration: number;
    success: boolean;
    error?: string;
    tokensUsed?: number;
    confidence?: number;
}
/**
 * Vision analysis tracking
 */
export interface VisionAnalysis {
    timestamp: number;
    analysisType: string;
    screenshotPath: string;
    prompt: string;
    response: any;
    duration: number;
    confidence?: number;
    elementsFound: number;
}
/**
 * Pattern matching tracking
 */
export interface PatternMatch {
    timestamp: number;
    patternId: string;
    patternName: string;
    confidence: number;
    matchType: 'exact' | 'similar' | 'adapted';
    adaptations?: string[];
}
/**
 * Debug export formats
 */
export type DebugExportFormat = 'json' | 'html' | 'csv' | 'timeline';
/**
 * DebugMonitoringService - Comprehensive debugging and performance monitoring
 *
 * This service provides detailed debugging capabilities including:
 * - Step-by-step execution tracking
 * - Screenshot debugging with annotations
 * - Performance monitoring
 * - AI interaction logging
 * - Pattern learning tracking
 * - Export capabilities for analysis
 */
export declare class DebugMonitoringService {
    private logger;
    private fileManager;
    private currentSession?;
    private debugDirectory;
    private screenshotDirectory;
    private enabled;
    constructor(debugDirectory?: string, enabled?: boolean, logger?: Logger);
    /**
     * Initialize debug monitoring
     */
    initialize(): Promise<void>;
    /**
     * Start a new debug session
     */
    startSession(taskType: string, naturalLanguageTask: string | undefined, username: string, targetUrl: string): Promise<string>;
    /**
     * Record an execution step
     */
    recordStep(action: string, description: string, success: boolean, duration: number, options?: {
        targetElement?: string;
        selector?: string;
        coordinates?: {
            x: number;
            y: number;
        };
        error?: string;
        metadata?: Record<string, any>;
    }): void;
    /**
     * Take and store annotated screenshot
     */
    takeAnnotatedScreenshot(page: any, // Playwright Page
    context: string, annotations?: ScreenshotAnnotation[]): Promise<string>;
    /**
     * Record network activity
     */
    recordNetworkEvent(event: Omit<NetworkEvent, 'timestamp'>): void;
    /**
     * Record performance metric
     */
    recordPerformanceMetric(metric: string, value: number, unit: string, context?: string): void;
    /**
     * Record prompt execution
     */
    recordPromptExecution(promptType: string, prompt: string, response: string, duration: number, success: boolean, options?: {
        error?: string;
        tokensUsed?: number;
        confidence?: number;
    }): void;
    /**
     * Record vision analysis
     */
    recordVisionAnalysis(analysisType: string, screenshotPath: string, prompt: string, response: any, duration: number, options?: {
        confidence?: number;
        elementsFound?: number;
    }): void;
    /**
     * Record pattern match
     */
    recordPatternMatch(patternId: string, patternName: string, confidence: number, matchType: 'exact' | 'similar' | 'adapted', adaptations?: string[]): void;
    /**
     * Record strategy attempt
     */
    recordStrategyAttempt(strategy: string): void;
    /**
     * Record learned pattern
     */
    recordLearnedPattern(patternId: string): void;
    /**
     * End debug session
     */
    endSession(success: boolean, error?: string, finalResult?: any): Promise<void>;
    /**
     * Export debug session in various formats
     */
    exportSession(sessionId: string, format: DebugExportFormat, outputPath?: string): Promise<string>;
    /**
     * Get session summary statistics
     */
    getSessionStats(sessionId: string): Promise<any>;
    /**
     * List all debug sessions
     */
    listSessions(): Promise<Array<{
        sessionId: string;
        startTime: number;
        taskType: string;
        success?: boolean;
    }>>;
    /**
     * Save debug session to file
     */
    private saveSession;
    /**
     * Load debug session from file
     */
    private loadSession;
    /**
     * Create annotated screenshot with overlays
     */
    private createAnnotatedScreenshot;
    /**
     * Export session as JSON
     */
    private exportAsJson;
    /**
     * Export session as HTML report
     */
    private exportAsHtml;
    /**
     * Export session as CSV
     */
    private exportAsCsv;
    /**
     * Export session as timeline JSON
     */
    private exportAsTimeline;
    /**
     * Generate HTML report
     */
    private generateHtmlReport;
    /**
     * Generate CSV data
     */
    private generateCsvData;
    /**
     * Generate timeline data
     */
    private generateTimelineData;
}
//# sourceMappingURL=DebugMonitoringService.d.ts.map