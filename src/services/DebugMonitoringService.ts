import { Logger } from '../utils/Logger';
import { FileManager } from '../utils/FileManager';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  
  // Execution flow
  executionSteps: DebugStep[];
  screenshots: DebugScreenshot[];
  networkActivity: NetworkEvent[];
  performanceMetrics: PerformanceMetric[];
  
  // AI interactions
  promptExecutions: PromptExecution[];
  visionAnalyses: VisionAnalysis[];
  patternMatches: PatternMatch[];
  
  // Results
  success: boolean;
  error?: string;
  finalResult?: any;
  
  // Learning data
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
  coordinates?: { x: number; y: number };
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
  windowSize: { width: number; height: number };
  annotations?: ScreenshotAnnotation[];
}

/**
 * Screenshot annotation for highlighting elements
 */
export interface ScreenshotAnnotation {
  type: 'click' | 'element' | 'error' | 'success';
  coordinates: { x: number; y: number };
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
export class DebugMonitoringService {
  private logger: Logger;
  private fileManager: FileManager;
  private currentSession?: DebugSession;
  private debugDirectory: string;
  private screenshotDirectory: string;
  private enabled: boolean;

  constructor(
    debugDirectory: string = './debug',
    enabled: boolean = true,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('DebugMonitoringService');
    this.fileManager = new FileManager();
    this.debugDirectory = debugDirectory;
    this.screenshotDirectory = path.join(debugDirectory, 'screenshots');
    this.enabled = enabled;
  }

  /**
   * Initialize debug monitoring
   */
  async initialize(): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.fileManager.ensureDirectoryExists(this.debugDirectory);
      await this.fileManager.ensureDirectoryExists(this.screenshotDirectory);
      
      this.logger.info('Debug monitoring initialized', {
        debugDirectory: this.debugDirectory,
        enabled: this.enabled
      });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize debug monitoring', { error: err.message });
      throw err;
    }
  }

  /**
   * Start a new debug session
   */
  async startSession(
    taskType: string,
    naturalLanguageTask: string | undefined,
    username: string,
    targetUrl: string
  ): Promise<string> {
    if (!this.enabled) return 'debug-disabled';

    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      taskType,
      naturalLanguageTask,
      username,
      targetUrl,
      executionSteps: [],
      screenshots: [],
      networkActivity: [],
      performanceMetrics: [],
      promptExecutions: [],
      visionAnalyses: [],
      patternMatches: [],
      success: false,
      strategiesAttempted: [],
      patternsUsed: [],
      patternsLearned: []
    };

    this.logger.info('Debug session started', {
      sessionId,
      taskType,
      naturalLanguageTask
    });

    return sessionId;
  }

  /**
   * Record an execution step
   */
  recordStep(
    action: string,
    description: string,
    success: boolean,
    duration: number,
    options?: {
      targetElement?: string;
      selector?: string;
      coordinates?: { x: number; y: number };
      error?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    if (!this.enabled || !this.currentSession) return;

    const step: DebugStep = {
      stepNumber: this.currentSession.executionSteps.length + 1,
      timestamp: Date.now(),
      action,
      description,
      success,
      duration,
      ...options
    };

    this.currentSession.executionSteps.push(step);
    
    this.logger.debug('Step recorded', {
      sessionId: this.currentSession.sessionId,
      stepNumber: step.stepNumber,
      action,
      success
    });
  }

  /**
   * Take and store annotated screenshot
   */
  async takeAnnotatedScreenshot(
    page: any, // Playwright Page
    context: string,
    annotations: ScreenshotAnnotation[] = []
  ): Promise<string> {
    if (!this.enabled || !this.currentSession) return '';

    try {
      const timestamp = Date.now();
      const filename = `${this.currentSession.sessionId}_${timestamp}_${context.replace(/\s+/g, '-')}.png`;
      const fullPath = path.join(this.screenshotDirectory, filename);

      // Take screenshot
      await page.screenshot({ path: fullPath, fullPage: false });

      // Record screenshot info
      const screenshot: DebugScreenshot = {
        timestamp,
        filename,
        context,
        fullPath,
        pageUrl: page.url(),
        windowSize: await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight
        })),
        annotations
      };

      this.currentSession.screenshots.push(screenshot);

      // If annotations exist, create annotated version
      if (annotations.length > 0) {
        await this.createAnnotatedScreenshot(fullPath, annotations);
      }

      this.logger.debug('Screenshot captured', {
        sessionId: this.currentSession.sessionId,
        filename,
        context,
        annotations: annotations.length
      });

      return fullPath;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to take screenshot', { error: err.message });
      return '';
    }
  }

  /**
   * Record network activity
   */
  recordNetworkEvent(event: Omit<NetworkEvent, 'timestamp'>): void {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.networkActivity.push({
      timestamp: Date.now(),
      ...event
    });
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    context?: string
  ): void {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.performanceMetrics.push({
      timestamp: Date.now(),
      metric,
      value,
      unit,
      context
    });
  }

  /**
   * Record prompt execution
   */
  recordPromptExecution(
    promptType: string,
    prompt: string,
    response: string,
    duration: number,
    success: boolean,
    options?: {
      error?: string;
      tokensUsed?: number;
      confidence?: number;
    }
  ): void {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.promptExecutions.push({
      timestamp: Date.now(),
      promptType,
      prompt: prompt.length > 1000 ? prompt.substring(0, 1000) + '...' : prompt,
      response: response.length > 2000 ? response.substring(0, 2000) + '...' : response,
      duration,
      success,
      ...options
    });
  }

  /**
   * Record vision analysis
   */
  recordVisionAnalysis(
    analysisType: string,
    screenshotPath: string,
    prompt: string,
    response: any,
    duration: number,
    options?: {
      confidence?: number;
      elementsFound?: number;
    }
  ): void {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.visionAnalyses.push({
      timestamp: Date.now(),
      analysisType,
      screenshotPath,
      prompt: prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt,
      response,
      duration,
      confidence: options?.confidence,
      elementsFound: options?.elementsFound || 0
    });
  }

  /**
   * Record pattern match
   */
  recordPatternMatch(
    patternId: string,
    patternName: string,
    confidence: number,
    matchType: 'exact' | 'similar' | 'adapted',
    adaptations?: string[]
  ): void {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.patternMatches.push({
      timestamp: Date.now(),
      patternId,
      patternName,
      confidence,
      matchType,
      adaptations
    });

    if (!this.currentSession.patternsUsed.includes(patternId)) {
      this.currentSession.patternsUsed.push(patternId);
    }
  }

  /**
   * Record strategy attempt
   */
  recordStrategyAttempt(strategy: string): void {
    if (!this.enabled || !this.currentSession) return;

    if (!this.currentSession.strategiesAttempted.includes(strategy)) {
      this.currentSession.strategiesAttempted.push(strategy);
    }
  }

  /**
   * Record learned pattern
   */
  recordLearnedPattern(patternId: string): void {
    if (!this.enabled || !this.currentSession) return;

    if (!this.currentSession.patternsLearned.includes(patternId)) {
      this.currentSession.patternsLearned.push(patternId);
    }
  }

  /**
   * End debug session
   */
  async endSession(success: boolean, error?: string, finalResult?: any): Promise<void> {
    if (!this.enabled || !this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.success = success;
    this.currentSession.error = error;
    this.currentSession.finalResult = finalResult;

    // Save session data
    await this.saveSession(this.currentSession);

    this.logger.info('Debug session ended', {
      sessionId: this.currentSession.sessionId,
      success,
      duration: this.currentSession.endTime - this.currentSession.startTime,
      steps: this.currentSession.executionSteps.length,
      screenshots: this.currentSession.screenshots.length
    });

    this.currentSession = undefined;
  }

  /**
   * Export debug session in various formats
   */
  async exportSession(
    sessionId: string,
    format: DebugExportFormat,
    outputPath?: string
  ): Promise<string> {
    try {
      const session = await this.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const exportPath = outputPath || path.join(
        this.debugDirectory,
        `export_${sessionId}_${format}_${Date.now()}.${format === 'html' ? 'html' : format === 'csv' ? 'csv' : 'json'}`
      );

      switch (format) {
        case 'json':
          await this.exportAsJson(session, exportPath);
          break;
        case 'html':
          await this.exportAsHtml(session, exportPath);
          break;
        case 'csv':
          await this.exportAsCsv(session, exportPath);
          break;
        case 'timeline':
          await this.exportAsTimeline(session, exportPath);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.logger.info('Session exported', { sessionId, format, exportPath });
      return exportPath;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to export session', { sessionId, format, error: err.message });
      throw err;
    }
  }

  /**
   * Get session summary statistics
   */
  async getSessionStats(sessionId: string): Promise<any> {
    try {
      const session = await this.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const duration = (session.endTime || Date.now()) - session.startTime;
      const successfulSteps = session.executionSteps.filter(s => s.success).length;
      const averageStepDuration = session.executionSteps.length > 0
        ? session.executionSteps.reduce((sum, s) => sum + s.duration, 0) / session.executionSteps.length
        : 0;

      return {
        sessionId,
        duration,
        success: session.success,
        totalSteps: session.executionSteps.length,
        successfulSteps,
        successRate: session.executionSteps.length > 0 ? successfulSteps / session.executionSteps.length : 0,
        averageStepDuration,
        screenshots: session.screenshots.length,
        networkEvents: session.networkActivity.length,
        promptExecutions: session.promptExecutions.length,
        visionAnalyses: session.visionAnalyses.length,
        strategiesAttempted: session.strategiesAttempted.length,
        patternsUsed: session.patternsUsed.length,
        patternsLearned: session.patternsLearned.length
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get session stats', { sessionId, error: err.message });
      throw err;
    }
  }

  /**
   * List all debug sessions
   */
  async listSessions(): Promise<Array<{ sessionId: string; startTime: number; taskType: string; success?: boolean }>> {
    try {
      const debugFiles = await fs.readdir(this.debugDirectory);
      const sessionFiles = debugFiles.filter(f => f.startsWith('session_') && f.endsWith('.json'));
      
      const sessions = [];
      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.debugDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const session = JSON.parse(content) as DebugSession;
          
          sessions.push({
            sessionId: session.sessionId,
            startTime: session.startTime,
            taskType: session.taskType,
            success: session.success
          });
        } catch {
          // Skip invalid session files
        }
      }

      return sessions.sort((a, b) => b.startTime - a.startTime);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to list sessions', { error: err.message });
      return [];
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Save debug session to file
   */
  private async saveSession(session: DebugSession): Promise<void> {
    try {
      const filePath = path.join(this.debugDirectory, `session_${session.sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to save session', { sessionId: session.sessionId, error: err.message });
    }
  }

  /**
   * Load debug session from file
   */
  private async loadSession(sessionId: string): Promise<DebugSession | null> {
    try {
      const filePath = path.join(this.debugDirectory, `session_${sessionId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as DebugSession;
    } catch {
      return null;
    }
  }

  /**
   * Create annotated screenshot with overlays
   */
  private async createAnnotatedScreenshot(
    screenshotPath: string,
    annotations: ScreenshotAnnotation[]
  ): Promise<void> {
    // This would use a graphics library like Sharp or Canvas to add annotations
    // For now, we'll just log the annotations
    this.logger.debug('Annotations for screenshot', {
      screenshotPath,
      annotations: annotations.map(a => ({ type: a.type, label: a.label }))
    });
  }

  /**
   * Export session as JSON
   */
  private async exportAsJson(session: DebugSession, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(session, null, 2));
  }

  /**
   * Export session as HTML report
   */
  private async exportAsHtml(session: DebugSession, outputPath: string): Promise<void> {
    const html = this.generateHtmlReport(session);
    await fs.writeFile(outputPath, html);
  }

  /**
   * Export session as CSV
   */
  private async exportAsCsv(session: DebugSession, outputPath: string): Promise<void> {
    const csvData = this.generateCsvData(session);
    await fs.writeFile(outputPath, csvData);
  }

  /**
   * Export session as timeline JSON
   */
  private async exportAsTimeline(session: DebugSession, outputPath: string): Promise<void> {
    const timeline = this.generateTimelineData(session);
    await fs.writeFile(outputPath, JSON.stringify(timeline, null, 2));
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(session: DebugSession): string {
    const duration = session.endTime ? session.endTime - session.startTime : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Debug Report - ${session.sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .step { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 3px; }
        .success { background: #e8f5e8; }
        .error { background: #ffe8e8; }
        .screenshot { max-width: 800px; border: 1px solid #ccc; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Debug Report</h1>
        <p><strong>Session ID:</strong> ${session.sessionId}</p>
        <p><strong>Task Type:</strong> ${session.taskType}</p>
        ${session.naturalLanguageTask ? `<p><strong>Task:</strong> ${session.naturalLanguageTask}</p>` : ''}
        <p><strong>Duration:</strong> ${duration}ms</p>
        <p><strong>Success:</strong> ${session.success ? 'Yes' : 'No'}</p>
        ${session.error ? `<p><strong>Error:</strong> ${session.error}</p>` : ''}
    </div>

    <div class="section">
        <h2>Execution Steps</h2>
        ${session.executionSteps.map(step => `
            <div class="step ${step.success ? 'success' : 'error'}">
                <strong>Step ${step.stepNumber}:</strong> ${step.description}<br>
                <strong>Action:</strong> ${step.action}<br>
                <strong>Duration:</strong> ${step.duration}ms<br>
                ${step.selector ? `<strong>Selector:</strong> ${step.selector}<br>` : ''}
                ${step.error ? `<strong>Error:</strong> ${step.error}<br>` : ''}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Screenshots</h2>
        ${session.screenshots.map(screenshot => `
            <div style="margin: 20px 0;">
                <h3>${screenshot.context}</h3>
                <p><strong>Timestamp:</strong> ${new Date(screenshot.timestamp).toISOString()}</p>
                <img src="${screenshot.filename}" class="screenshot" alt="${screenshot.context}">
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th><th>Unit</th><th>Context</th></tr>
            ${session.performanceMetrics.map(metric => `
                <tr>
                    <td>${metric.metric}</td>
                    <td>${metric.value}</td>
                    <td>${metric.unit}</td>
                    <td>${metric.context || ''}</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSV data
   */
  private generateCsvData(session: DebugSession): string {
    const header = 'Step,Timestamp,Action,Description,Success,Duration,Selector,Error\n';
    const rows = session.executionSteps.map(step => 
      `${step.stepNumber},"${new Date(step.timestamp).toISOString()}","${step.action}","${step.description}",${step.success},${step.duration},"${step.selector || ''}","${step.error || ''}"`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Generate timeline data
   */
  private generateTimelineData(session: DebugSession): any {
    return {
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      events: [
        ...session.executionSteps.map(step => ({
          type: 'step',
          timestamp: step.timestamp,
          data: step
        })),
        ...session.promptExecutions.map(prompt => ({
          type: 'prompt',
          timestamp: prompt.timestamp,
          data: prompt
        })),
        ...session.visionAnalyses.map(vision => ({
          type: 'vision',
          timestamp: vision.timestamp,
          data: vision
        }))
      ].sort((a, b) => a.timestamp - b.timestamp)
    };
  }
}