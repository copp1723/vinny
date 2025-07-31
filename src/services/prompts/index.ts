/**
 * Unified UI Navigation Prompt System - Public API
 * 
 * This module provides a comprehensive natural language prompt system
 * for VinSolutions automation tasks. It enables the agent to understand
 * and execute complex UI navigation tasks through AI-powered prompts.
 */

// Core types and templates
export {
  PromptType,
  PROMPT_TEMPLATES,
  CONTEXT_TEMPLATES,
  VALIDATION_TEMPLATES,
  getPromptTemplate,
  getAvailablePromptTypes,
  getTemplateVariables
} from './PromptTemplates';

// Prompt building functionality
export {
  PromptBuilder,
  type PromptContext,
  type CurrentStateContext,
  type UserContext,
  type TechnicalContext,
  type BusinessContext,
  type PromptBuildOptions,
  type BuiltPrompt
} from './PromptBuilder';

// Prompt management and execution
export {
  PromptManager,
  type PromptExecutionOptions,
  type PromptExecutionResult,
  type PromptManagerStats
} from './PromptManager';

// Convenience factory functions
import { PromptManager } from './PromptManager';
import { PromptType } from './PromptTemplates';
import { PromptContext } from './PromptBuilder';
import { PromptExecutionOptions } from './PromptManager';
import { Logger } from '../../utils/Logger';

/**
 * Default prompt manager instance for simple use cases
 */
let defaultManager: PromptManager | null = null;

/**
 * Get or create the default prompt manager instance
 */
export function getDefaultPromptManager(logger?: Logger): PromptManager {
  if (!defaultManager) {
    defaultManager = new PromptManager(logger);
  }
  return defaultManager;
}

/**
 * Quick execution function for simple prompt tasks
 */
export async function executePrompt<T = any>(
  type: PromptType,
  variables: Record<string, any>,
  executor: (prompt: string) => Promise<T>,
  options?: {
    context?: PromptContext;
    useCache?: boolean;
    maxRetries?: number;
    logger?: Logger;
  }
): Promise<T> {
  const manager = getDefaultPromptManager(options?.logger);
  
  const result = await manager.executePrompt(
    type,
    variables,
    executor,
    options?.context,
    {
      useCache: options?.useCache,
      maxRetries: options?.maxRetries || 3,
      includeValidation: true,
      responseFormat: 'json'
    }
  );

  if (!result.success) {
    throw new Error(result.error || 'Prompt execution failed');
  }

  return result.data!;
}

/**
 * Utility functions for common prompt operations
 */
export const PromptUtils = {
  /**
   * Analyze a natural language task instruction
   */
  async analyzeTaskInstruction(
    taskInstruction: string,
    currentUrl: string,
    capabilities: string[],
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.TASK_CLASSIFICATION,
      {
        taskInstruction,
        currentUrl,
        capabilities: capabilities.join(', ')
      },
      executor,
      { 
        useCache: true,
        logger 
      }
    );
  },

  /**
   * Analyze a screenshot for UI elements and actions
   */
  async analyzeScreenshot(
    analysisType: string,
    context: string,
    targetElements: string[],
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.SCREENSHOT_ANALYSIS,
      {
        analysisType,
        context,
        targetElements: targetElements.join(', ')
      },
      executor,
      { 
        useCache: false, // Screenshots are unique
        logger 
      }
    );
  },

  /**
   * Plan navigation path for a specific goal
   */
  async planNavigationPath(
    currentPage: string,
    currentUrl: string,
    userGoal: string,
    availableElements: string[],
    previousActions: string[],
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.NAVIGATION_PLANNING,
      {
        currentPage,
        currentUrl,
        userGoal,
        availableElements: availableElements.join(', '),
        previousActions: previousActions.join(', ')
      },
      executor,
      { 
        useCache: true,
        logger 
      }
    );
  },

  /**
   * Verify if a task has been completed successfully
   */
  async verifyTaskCompletion(
    originalTask: string,
    expectedOutcome: string,
    currentState: string,
    userIntent: string,
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.TASK_COMPLETION_VERIFICATION,
      {
        originalTask,
        expectedOutcome,
        currentState,
        userIntent
      },
      executor,
      { 
        useCache: false,
        logger 
      }
    );
  },

  /**
   * Plan error recovery strategy
   */
  async planErrorRecovery(
    originalTask: string,
    failedAction: string,
    errorDetails: string,
    currentState: string,
    attemptsMade: number,
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.ERROR_RECOVERY_PLANNING,
      {
        originalTask,
        failedAction,
        errorDetails,
        currentState,
        attemptsMade: attemptsMade.toString()
      },
      executor,
      { 
        useCache: true,
        maxRetries: 1, // Don't retry error recovery planning
        logger 
      }
    );
  },

  /**
   * Identify specific elements in the UI
   */
  async identifyElements(
    identificationTask: string,
    targetDescription: string,
    context: string,
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.ELEMENT_IDENTIFICATION,
      {
        identificationTask,
        targetDescription,
        context
      },
      executor,
      { 
        useCache: false,
        logger 
      }
    );
  },

  /**
   * Optimize action sequencing
   */
  async optimizeActionSequence(
    goal: string,
    availableActions: string[],
    constraints: string[],
    currentState: string,
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.ACTION_SEQUENCING,
      {
        goal,
        availableActions: availableActions.join(', '),
        constraints: constraints.join(', '),
        currentState
      },
      executor,
      { 
        useCache: true,
        logger 
      }
    );
  },

  /**
   * Analyze patterns from successful executions
   */
  async analyzePatterns(
    taskType: string,
    actionsTaken: string[],
    successMetrics: Record<string, any>,
    context: string,
    timing: Record<string, number>,
    executor: (prompt: string) => Promise<any>,
    logger?: Logger
  ) {
    return executePrompt(
      PromptType.PATTERN_RECOGNITION,
      {
        taskType,
        actionsTaken: actionsTaken.join(', '),
        successMetrics: JSON.stringify(successMetrics),
        context,
        timing: JSON.stringify(timing)
      },
      executor,
      { 
        useCache: true,
        logger 
      }
    );
  }
};

/**
 * Context builders for common scenarios
 */
export const ContextBuilders = {
  /**
   * Build context for VinSolutions automation
   */
  buildVinSolutionsContext(
    username: string,
    currentUrl: string,
    sessionDuration: number,
    previousActions: string[] = [],
    errorCount: number = 0
  ): PromptContext {
    return {
      currentState: {
        currentUrl,
        pageTitle: 'VinSolutions',
        timestamp: new Date().toISOString(),
        previousActions,
        sessionDuration,
        errorCount
      },
      user: {
        username,
        platform: 'VinSolutions',
        taskHistory: [],
        accessLevel: 'standard'
      },
      technical: {
        browser: 'Chromium',
        viewport: { width: 1920, height: 1080 },
        connectionType: 'ethernet',
        debugMode: false
      },
      business: {
        organization: 'Automotive Dealership',
        department: 'Sales',
        availableReports: ['Customer Activity', 'Sales Performance', 'Lead Analytics'],
        dataPermissions: ['read', 'export']
      }
    };
  },

  /**
   * Build debugging context with extra information
   */
  buildDebugContext(
    baseContext: PromptContext,
    debugInfo: Record<string, any>
  ): PromptContext {
    return {
      ...baseContext,
      technical: {
        ...baseContext.technical,
        debugMode: true
      },
      custom: {
        ...baseContext.custom,
        debugInfo,
        debugTimestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * Validation helpers
 */
export const PromptValidation = {
  /**
   * Validate that a response contains required confidence score
   */
  validateConfidenceScore(response: any): boolean {
    return (
      typeof response === 'object' &&
      response !== null &&
      ('confidence' in response || 'confidenceScore' in response) &&
      typeof (response.confidence || response.confidenceScore) === 'number'
    );
  },

  /**
   * Validate that a response is properly structured JSON
   */
  validateJsonStructure(response: any, requiredFields: string[]): boolean {
    if (typeof response !== 'object' || response === null) {
      return false;
    }

    return requiredFields.every(field => field in response);
  },

  /**
   * Extract and validate coordinates from response
   */
  validateCoordinates(coordinates: any): boolean {
    return (
      typeof coordinates === 'object' &&
      coordinates !== null &&
      typeof coordinates.x === 'number' &&
      typeof coordinates.y === 'number' &&
      coordinates.x >= 0 &&
      coordinates.y >= 0
    );
  }
};

/**
 * Performance monitoring helpers
 */
export const PromptMonitoring = {
  /**
   * Get performance statistics from default manager
   */
  getStats() {
    return getDefaultPromptManager().getStats();
  },

  /**
   * Get cache statistics from default manager
   */
  getCacheStats() {
    return getDefaultPromptManager().getCacheStats();
  },

  /**
   * Clear cache from default manager
   */
  clearCache() {
    getDefaultPromptManager().clearCache();
  }
};