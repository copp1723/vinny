"use strict";
/**
 * Unified UI Navigation Prompt System - Public API
 *
 * This module provides a comprehensive natural language prompt system
 * for VinSolutions automation tasks. It enables the agent to understand
 * and execute complex UI navigation tasks through AI-powered prompts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptMonitoring = exports.PromptValidation = exports.ContextBuilders = exports.PromptUtils = exports.PromptManager = exports.PromptBuilder = exports.getTemplateVariables = exports.getAvailablePromptTypes = exports.getPromptTemplate = exports.VALIDATION_TEMPLATES = exports.CONTEXT_TEMPLATES = exports.PROMPT_TEMPLATES = exports.PromptType = void 0;
exports.getDefaultPromptManager = getDefaultPromptManager;
exports.executePrompt = executePrompt;
// Core types and templates
var PromptTemplates_1 = require("./PromptTemplates");
Object.defineProperty(exports, "PromptType", { enumerable: true, get: function () { return PromptTemplates_1.PromptType; } });
Object.defineProperty(exports, "PROMPT_TEMPLATES", { enumerable: true, get: function () { return PromptTemplates_1.PROMPT_TEMPLATES; } });
Object.defineProperty(exports, "CONTEXT_TEMPLATES", { enumerable: true, get: function () { return PromptTemplates_1.CONTEXT_TEMPLATES; } });
Object.defineProperty(exports, "VALIDATION_TEMPLATES", { enumerable: true, get: function () { return PromptTemplates_1.VALIDATION_TEMPLATES; } });
Object.defineProperty(exports, "getPromptTemplate", { enumerable: true, get: function () { return PromptTemplates_1.getPromptTemplate; } });
Object.defineProperty(exports, "getAvailablePromptTypes", { enumerable: true, get: function () { return PromptTemplates_1.getAvailablePromptTypes; } });
Object.defineProperty(exports, "getTemplateVariables", { enumerable: true, get: function () { return PromptTemplates_1.getTemplateVariables; } });
// Prompt building functionality
var PromptBuilder_1 = require("./PromptBuilder");
Object.defineProperty(exports, "PromptBuilder", { enumerable: true, get: function () { return PromptBuilder_1.PromptBuilder; } });
// Prompt management and execution
var PromptManager_1 = require("./PromptManager");
Object.defineProperty(exports, "PromptManager", { enumerable: true, get: function () { return PromptManager_1.PromptManager; } });
// Convenience factory functions
const PromptManager_2 = require("./PromptManager");
const PromptTemplates_2 = require("./PromptTemplates");
/**
 * Default prompt manager instance for simple use cases
 */
let defaultManager = null;
/**
 * Get or create the default prompt manager instance
 */
function getDefaultPromptManager(logger) {
    if (!defaultManager) {
        defaultManager = new PromptManager_2.PromptManager(logger);
    }
    return defaultManager;
}
/**
 * Quick execution function for simple prompt tasks
 */
async function executePrompt(type, variables, executor, options) {
    const manager = getDefaultPromptManager(options?.logger);
    const result = await manager.executePrompt(type, variables, executor, options?.context, {
        useCache: options?.useCache,
        maxRetries: options?.maxRetries || 3,
        includeValidation: true,
        responseFormat: 'json'
    });
    if (!result.success) {
        throw new Error(result.error || 'Prompt execution failed');
    }
    return result.data;
}
/**
 * Utility functions for common prompt operations
 */
exports.PromptUtils = {
    /**
     * Analyze a natural language task instruction
     */
    async analyzeTaskInstruction(taskInstruction, currentUrl, capabilities, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.TASK_CLASSIFICATION, {
            taskInstruction,
            currentUrl,
            capabilities: capabilities.join(', ')
        }, executor, {
            useCache: true,
            logger
        });
    },
    /**
     * Analyze a screenshot for UI elements and actions
     */
    async analyzeScreenshot(analysisType, context, targetElements, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.SCREENSHOT_ANALYSIS, {
            analysisType,
            context,
            targetElements: targetElements.join(', ')
        }, executor, {
            useCache: false, // Screenshots are unique
            logger
        });
    },
    /**
     * Plan navigation path for a specific goal
     */
    async planNavigationPath(currentPage, currentUrl, userGoal, availableElements, previousActions, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.NAVIGATION_PLANNING, {
            currentPage,
            currentUrl,
            userGoal,
            availableElements: availableElements.join(', '),
            previousActions: previousActions.join(', ')
        }, executor, {
            useCache: true,
            logger
        });
    },
    /**
     * Verify if a task has been completed successfully
     */
    async verifyTaskCompletion(originalTask, expectedOutcome, currentState, userIntent, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.TASK_COMPLETION_VERIFICATION, {
            originalTask,
            expectedOutcome,
            currentState,
            userIntent
        }, executor, {
            useCache: false,
            logger
        });
    },
    /**
     * Plan error recovery strategy
     */
    async planErrorRecovery(originalTask, failedAction, errorDetails, currentState, attemptsMade, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.ERROR_RECOVERY_PLANNING, {
            originalTask,
            failedAction,
            errorDetails,
            currentState,
            attemptsMade: attemptsMade.toString()
        }, executor, {
            useCache: true,
            maxRetries: 1, // Don't retry error recovery planning
            logger
        });
    },
    /**
     * Identify specific elements in the UI
     */
    async identifyElements(identificationTask, targetDescription, context, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.ELEMENT_IDENTIFICATION, {
            identificationTask,
            targetDescription,
            context
        }, executor, {
            useCache: false,
            logger
        });
    },
    /**
     * Optimize action sequencing
     */
    async optimizeActionSequence(goal, availableActions, constraints, currentState, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.ACTION_SEQUENCING, {
            goal,
            availableActions: availableActions.join(', '),
            constraints: constraints.join(', '),
            currentState
        }, executor, {
            useCache: true,
            logger
        });
    },
    /**
     * Analyze patterns from successful executions
     */
    async analyzePatterns(taskType, actionsTaken, successMetrics, context, timing, executor, logger) {
        return executePrompt(PromptTemplates_2.PromptType.PATTERN_RECOGNITION, {
            taskType,
            actionsTaken: actionsTaken.join(', '),
            successMetrics: JSON.stringify(successMetrics),
            context,
            timing: JSON.stringify(timing)
        }, executor, {
            useCache: true,
            logger
        });
    }
};
/**
 * Context builders for common scenarios
 */
exports.ContextBuilders = {
    /**
     * Build context for VinSolutions automation
     */
    buildVinSolutionsContext(username, currentUrl, sessionDuration, previousActions = [], errorCount = 0) {
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
    buildDebugContext(baseContext, debugInfo) {
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
exports.PromptValidation = {
    /**
     * Validate that a response contains required confidence score
     */
    validateConfidenceScore(response) {
        return (typeof response === 'object' &&
            response !== null &&
            ('confidence' in response || 'confidenceScore' in response) &&
            typeof (response.confidence || response.confidenceScore) === 'number');
    },
    /**
     * Validate that a response is properly structured JSON
     */
    validateJsonStructure(response, requiredFields) {
        if (typeof response !== 'object' || response === null) {
            return false;
        }
        return requiredFields.every(field => field in response);
    },
    /**
     * Extract and validate coordinates from response
     */
    validateCoordinates(coordinates) {
        return (typeof coordinates === 'object' &&
            coordinates !== null &&
            typeof coordinates.x === 'number' &&
            typeof coordinates.y === 'number' &&
            coordinates.x >= 0 &&
            coordinates.y >= 0);
    }
};
/**
 * Performance monitoring helpers
 */
exports.PromptMonitoring = {
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
//# sourceMappingURL=index.js.map