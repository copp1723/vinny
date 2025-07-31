"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
const PromptTemplates_1 = require("./PromptTemplates");
const Logger_1 = require("../../utils/Logger");
/**
 * PromptBuilder - Handles variable injection and prompt construction
 *
 * This class takes template prompts and injects variables, adds context,
 * and prepares them for AI model consumption with proper formatting
 * and validation instructions.
 */
class PromptBuilder {
    logger;
    constructor(logger) {
        this.logger = logger || new Logger_1.Logger('PromptBuilder');
    }
    /**
     * Build a complete prompt from template and context
     */
    async buildPrompt(type, variables, context, options = {}) {
        const startTime = Date.now();
        try {
            this.logger.debug('Building prompt', { type, variableCount: Object.keys(variables).length });
            // Get base template
            const template = (0, PromptTemplates_1.getPromptTemplate)(type);
            const requiredVariables = (0, PromptTemplates_1.getTemplateVariables)(template);
            // Inject variables into template
            let prompt = this.injectVariables(template, variables);
            // Track missing variables
            const missingVariables = requiredVariables.filter(varName => !(varName in variables) || variables[varName] === undefined || variables[varName] === null);
            // Add context if requested
            const contextIncluded = [];
            if (options.includeContext && context) {
                const contextAddition = this.buildContextSection(context, options.contextTypes);
                if (contextAddition) {
                    prompt = contextAddition + '\n\n' + prompt;
                    contextIncluded.push(...(options.contextTypes || ['currentState', 'user', 'technical', 'business']));
                }
            }
            // Add custom instructions
            if (options.customInstructions) {
                prompt = prompt + '\n\nADDITIONAL INSTRUCTIONS:\n' + options.customInstructions;
            }
            // Add validation instructions
            let includesValidation = false;
            if (options.includeValidation !== false) {
                prompt = prompt + '\n\n' + this.buildValidationInstructions(options.responseFormat);
                includesValidation = true;
            }
            // Estimate token count (rough approximation: 1 token ≈ 4 characters)
            const estimatedTokens = Math.ceil(prompt.length / 4);
            const buildTime = Date.now() - startTime;
            this.logger.debug('Prompt built successfully', {
                type,
                promptLength: prompt.length,
                estimatedTokens,
                missingVariables: missingVariables.length,
                buildTime
            });
            return {
                prompt,
                variables,
                missingVariables,
                contextIncluded,
                estimatedTokens,
                metadata: {
                    type,
                    buildTime,
                    includesValidation,
                    includesContext: options.includeContext === true
                }
            };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to build prompt', { type, error: err.message });
            throw new Error(`Prompt building failed: ${err.message}`);
        }
    }
    /**
     * Inject variables into template using {{variable}} syntax
     */
    injectVariables(template, variables) {
        let result = template;
        // Handle nested variable access (e.g., {{user.name}})
        const variablePattern = /\{\{([^}]+)\}\}/g;
        result = result.replace(variablePattern, (match, path) => {
            const value = this.getNestedValue(variables, path.trim());
            if (value === undefined || value === null) {
                this.logger.warn(`Variable '${path}' not found in context`);
                return `[MISSING: ${path}]`;
            }
            // Handle different value types
            if (typeof value === 'object') {
                return JSON.stringify(value, null, 2);
            }
            else if (Array.isArray(value)) {
                return value.join(', ');
            }
            else {
                return String(value);
            }
        });
        return result;
    }
    /**
     * Build context section from provided context objects
     */
    buildContextSection(context, contextTypes) {
        const sections = [];
        const typesToInclude = contextTypes || ['currentState', 'user', 'technical', 'business'];
        if (typesToInclude.includes('currentState') && context.currentState) {
            const stateContext = this.injectVariables(PromptTemplates_1.CONTEXT_TEMPLATES.CURRENT_STATE, context.currentState);
            sections.push(stateContext);
        }
        if (typesToInclude.includes('user') && context.user) {
            const userContext = this.injectVariables(PromptTemplates_1.CONTEXT_TEMPLATES.USER_CONTEXT, context.user);
            sections.push(userContext);
        }
        if (typesToInclude.includes('technical') && context.technical) {
            const techContext = this.injectVariables(PromptTemplates_1.CONTEXT_TEMPLATES.TECHNICAL_CONTEXT, context.technical);
            sections.push(techContext);
        }
        if (typesToInclude.includes('business') && context.business) {
            const bizContext = this.injectVariables(PromptTemplates_1.CONTEXT_TEMPLATES.BUSINESS_CONTEXT, context.business);
            sections.push(bizContext);
        }
        // Add custom context if provided
        if (context.custom) {
            sections.push(`CUSTOM CONTEXT:\n${JSON.stringify(context.custom, null, 2)}`);
        }
        return sections.join('\n\n');
    }
    /**
     * Build validation instructions based on response format
     */
    buildValidationInstructions(responseFormat) {
        let instructions = PromptTemplates_1.VALIDATION_TEMPLATES.JSON_STRUCTURE + '\n' +
            PromptTemplates_1.VALIDATION_TEMPLATES.CONFIDENCE_SCORING + '\n' +
            PromptTemplates_1.VALIDATION_TEMPLATES.ERROR_HANDLING + '\n' +
            PromptTemplates_1.VALIDATION_TEMPLATES.VERIFICATION_STEPS;
        if (responseFormat === 'json') {
            instructions = 'CRITICAL: ' + PromptTemplates_1.VALIDATION_TEMPLATES.JSON_STRUCTURE + '\n' + instructions;
        }
        return 'RESPONSE REQUIREMENTS:\n' + instructions;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && typeof current === 'object' ? current[key] : undefined;
        }, obj);
    }
    /**
     * Validate that all required variables are present
     */
    validateRequiredVariables(type, variables) {
        const template = (0, PromptTemplates_1.getPromptTemplate)(type);
        const requiredVariables = (0, PromptTemplates_1.getTemplateVariables)(template);
        const missingVariables = requiredVariables.filter(varName => !(varName in variables) || variables[varName] === undefined || variables[varName] === null);
        return {
            isValid: missingVariables.length === 0,
            missingVariables
        };
    }
    /**
     * Create a minimal prompt for quick operations
     */
    createMinimalPrompt(type, variables) {
        const template = (0, PromptTemplates_1.getPromptTemplate)(type);
        return this.injectVariables(template, variables);
    }
    /**
     * Create a context-aware prompt with full features
     */
    async createEnhancedPrompt(type, variables, context, customInstructions) {
        return this.buildPrompt(type, variables, context, {
            includeValidation: true,
            includeContext: true,
            customInstructions,
            responseFormat: 'json'
        });
    }
    /**
     * Create a debugging prompt with extra information
     */
    async createDebugPrompt(type, variables, context, debugInfo) {
        const debugContext = {
            ...context,
            custom: {
                ...context.custom,
                debugInfo,
                debugMode: true,
                timestamp: new Date().toISOString()
            }
        };
        return this.buildPrompt(type, variables, debugContext, {
            includeValidation: true,
            includeContext: true,
            contextTypes: ['currentState', 'user', 'technical', 'business'],
            customInstructions: 'DEBUG MODE: Include detailed reasoning, alternative approaches, and confidence explanations in your response.',
            responseFormat: 'json'
        });
    }
    /**
     * Get estimated token count for a prompt
     */
    estimateTokenCount(prompt) {
        // Rough approximation: 1 token ≈ 4 characters
        // This can be made more accurate with a proper tokenizer
        return Math.ceil(prompt.length / 4);
    }
    /**
     * Optimize prompt for token efficiency
     */
    optimizePromptLength(prompt, maxTokens) {
        const maxChars = maxTokens * 4; // Rough conversion
        if (prompt.length <= maxChars) {
            return prompt;
        }
        this.logger.warn('Prompt too long, truncating', {
            originalLength: prompt.length,
            maxChars,
            truncated: true
        });
        // Keep the core instruction and truncate context
        const lines = prompt.split('\n');
        let result = '';
        let currentLength = 0;
        for (const line of lines) {
            if (currentLength + line.length + 1 > maxChars) {
                result += '\n[CONTEXT TRUNCATED DUE TO LENGTH LIMITS]';
                break;
            }
            result += (result ? '\n' : '') + line;
            currentLength += line.length + 1;
        }
        return result;
    }
}
exports.PromptBuilder = PromptBuilder;
//# sourceMappingURL=PromptBuilder.js.map