"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterService = void 0;
const openai_1 = __importDefault(require("openai"));
const Logger_1 = require("../utils/Logger");
const prompts_1 = require("./prompts");
class OpenRouterService {
    client;
    logger;
    defaultModel;
    promptManager;
    constructor(config) {
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
        });
        this.logger = new Logger_1.Logger('OpenRouterService');
        this.defaultModel = config.defaultModel || 'anthropic/claude-3.5-sonnet';
        this.promptManager = new prompts_1.PromptManager(this.logger);
    }
    async analyzePageForElements(screenshotBase64, targetElements, context = '') {
        try {
            const prompt = `You are an expert at analyzing web page screenshots for automation purposes.

TASK: Analyze this screenshot and find the following elements: ${targetElements.join(', ')}

CONTEXT: ${context}

Please identify:
1. Which target elements are visible on the page
2. Their approximate locations (if visible)
3. The best next action to take
4. Your confidence level for each element

Respond in JSON format:
{
  "elementsFound": [
    {
      "type": "button|input|link|text",
      "text": "exact text or description",
      "confidence": 0.0-1.0,
      "coordinates": {"x": 123, "y": 456}
    }
  ],
  "nextAction": "click_button|fill_input|wait|scroll_down|etc",
  "reasoning": "explanation of what you see and why you recommend this action"
}`;
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${screenshotBase64}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
                temperature: 0.1,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenRouter');
            }
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const result = JSON.parse(jsonMatch[0]);
            this.logger.info('Page analysis completed', {
                elementsFound: result.elementsFound.length,
                nextAction: result.nextAction
            });
            return result;
        }
        catch (error) {
            this.logger.error('Failed to analyze page', { error: error.message });
            throw error;
        }
    }
    async extractTwoFactorCode(emailContent) {
        try {
            const prompt = `You are an expert at extracting 2FA verification codes from emails.

TASK: Analyze this email content and extract any 2FA/verification codes.

EMAIL CONTENT:
${emailContent}

Look for:
- 6-digit codes (most common)
- 4-digit codes
- 8-digit codes
- Phrases like "verification code", "security code", "access code"

Respond in JSON format:
{
  "codeFound": true/false,
  "code": "123456" (if found),
  "confidence": 0.0-1.0,
  "reasoning": "explanation of what you found"
}`;
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 300,
                temperature: 0.1,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenRouter');
            }
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const result = JSON.parse(jsonMatch[0]);
            this.logger.info('2FA code analysis completed', {
                codeFound: result.codeFound,
                confidence: result.confidence
            });
            return result;
        }
        catch (error) {
            this.logger.error('Failed to analyze 2FA code', { error: error.message });
            throw error;
        }
    }
    async generateAutomationStrategy(platformName, reportName, currentStep, errorContext) {
        try {
            const prompt = `You are an expert automation engineer specializing in business platform automation.

CONTEXT:
- Platform: ${platformName}
- Report: ${reportName}
- Current Step: ${currentStep}
${errorContext ? `- Error Context: ${errorContext}` : ''}

TASK: Provide the next best action or strategy for this automation scenario.

Consider:
1. Common patterns for business platforms
2. Typical navigation flows
3. Error recovery strategies
4. Alternative approaches if current method fails

Provide a concise, actionable recommendation (2-3 sentences max).`;
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 200,
                temperature: 0.3,
            });
            const strategy = response.choices[0]?.message?.content?.trim();
            if (!strategy) {
                throw new Error('No strategy generated');
            }
            this.logger.info('Automation strategy generated', {
                platformName,
                reportName,
                currentStep
            });
            return strategy;
        }
        catch (error) {
            this.logger.error('Failed to generate automation strategy', { error: error.message });
            throw error;
        }
    }
    async selectBestModel(task) {
        // Simple model selection logic - can be enhanced
        const taskLower = task.toLowerCase();
        if (taskLower.includes('vision') || taskLower.includes('screenshot') || taskLower.includes('image')) {
            return 'anthropic/claude-3.5-sonnet'; // Best for vision tasks
        }
        else if (taskLower.includes('code') || taskLower.includes('programming')) {
            return 'anthropic/claude-3.5-sonnet'; // Good for coding
        }
        else if (taskLower.includes('fast') || taskLower.includes('quick')) {
            return 'anthropic/claude-3-haiku'; // Fastest
        }
        else {
            return this.defaultModel; // Default choice
        }
    }
    async testConnection() {
        try {
            const response = await this.client.chat.completions.create({
                model: 'anthropic/claude-3-haiku', // Use fastest model for testing
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with just "OK" to test the connection.',
                    },
                ],
                max_tokens: 10,
            });
            const content = response.choices[0]?.message?.content?.trim();
            const isWorking = content === 'OK';
            this.logger.info('OpenRouter connection test', { success: isWorking });
            return isWorking;
        }
        catch (error) {
            this.logger.error('OpenRouter connection test failed', { error: error.message });
            return false;
        }
    }
    /**
     * Analyze login page to find authentication elements
     */
    async analyzeLoginPage(base64Screenshot) {
        try {
            const prompt = `Analyze this login page and identify the authentication elements.

Look for:
1. Username/email input field
2. Password input field  
3. Submit/Sign In button
4. Any 2FA indicators

Return the CSS selectors or unique identifiers for each element found.

Format your response as JSON:
{
  "usernameSelector": "CSS selector for username field",
  "passwordSelector": "CSS selector for password field",
  "submitSelector": "CSS selector for submit button",
  "requires2FA": true/false
}`;
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Screenshot}` } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            });
            const result = response.choices[0]?.message?.content || '';
            // Parse response
            try {
                const match = result.match(/\{[\s\S]*\}/);
                if (match) {
                    return JSON.parse(match[0]);
                }
            }
            catch { }
            // Fallback
            return {
                usernameSelector: 'input[type="email"], input[name="username"]',
                passwordSelector: 'input[type="password"]',
                submitSelector: 'button[type="submit"]'
            };
        }
        catch (error) {
            this.logger.error('Failed to analyze login page', error);
            return {};
        }
    }
    /**
     * Analyze page for specific task and return action plan
     */
    async analyzePageForTask(base64Screenshot, taskDescription, parameters) {
        try {
            const prompt = `Analyze this page to ${taskDescription}.

${parameters ? `Additional context: ${JSON.stringify(parameters)}` : ''}

Identify the BEST element to interact with and provide:
1. CSS selector or XPath
2. Pixel coordinates for clicking (if visible)
3. Recommended strategy (click, fill, etc.)
4. Confidence level (0-100)

Prioritize elements that are clearly visible and match the task.

Format response as JSON:
{
  "selector": "CSS or XPath selector",
  "coordinates": { "x": 123, "y": 456 },
  "strategy": "click",
  "confidence": 95
}`;
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Screenshot}` } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            });
            const result = response.choices[0]?.message?.content || '';
            // Parse response
            try {
                const match = result.match(/\{[\s\S]*\}/);
                if (match) {
                    return JSON.parse(match[0]);
                }
            }
            catch { }
            // Fallback
            return {
                strategy: 'click',
                confidence: 0
            };
        }
        catch (error) {
            this.logger.error('Failed to analyze page for task', error);
            return { strategy: 'click', confidence: 0 };
        }
    }
    /**
     * General screenshot analysis method
     */
    async analyzeScreenshot(base64Screenshot, prompt) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Screenshot}` } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            this.logger.error('Screenshot analysis failed', error);
            throw error;
        }
    }
    // ===== NEW PROMPT-BASED METHODS =====
    /**
     * Analyze natural language task instruction using structured prompts
     */
    async analyzeTaskInstruction(taskInstruction, currentUrl, capabilities = [], context) {
        try {
            const promptContext = context || prompts_1.ContextBuilders.buildVinSolutionsContext('user', currentUrl, 0, [], 0);
            return await prompts_1.PromptUtils.analyzeTaskInstruction(taskInstruction, currentUrl, capabilities, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Task instruction analysis failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Analyze screenshot with structured vision prompts
     */
    async analyzeScreenshotAdvanced(screenshotBase64, analysisType, targetElements = [], context = '', promptContext) {
        try {
            const fullContext = promptContext || prompts_1.ContextBuilders.buildVinSolutionsContext('user', '', 0, [], 0);
            return await prompts_1.PromptUtils.analyzeScreenshot(analysisType, context, targetElements, (prompt) => this.executeVisionPrompt(prompt, screenshotBase64), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Advanced screenshot analysis failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Plan navigation path using AI reasoning
     */
    async planNavigationPath(currentPage, currentUrl, userGoal, availableElements = [], previousActions = [], context) {
        try {
            const promptContext = context || prompts_1.ContextBuilders.buildVinSolutionsContext('user', currentUrl, 0, previousActions, 0);
            return await prompts_1.PromptUtils.planNavigationPath(currentPage, currentUrl, userGoal, availableElements, previousActions, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Navigation planning failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Verify task completion using structured analysis
     */
    async verifyTaskCompletion(originalTask, expectedOutcome, currentState, userIntent, context) {
        try {
            return await prompts_1.PromptUtils.verifyTaskCompletion(originalTask, expectedOutcome, currentState, userIntent, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Task completion verification failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Plan error recovery strategy with AI assistance
     */
    async planErrorRecovery(originalTask, failedAction, errorDetails, currentState, attemptsMade = 0, context) {
        try {
            const promptContext = context || prompts_1.ContextBuilders.buildVinSolutionsContext('user', '', 0, [], attemptsMade);
            return await prompts_1.PromptUtils.planErrorRecovery(originalTask, failedAction, errorDetails, currentState, attemptsMade, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Error recovery planning failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Identify UI elements with precise targeting
     */
    async identifyElements(screenshotBase64, identificationTask, targetDescription, context = '', promptContext) {
        try {
            return await prompts_1.PromptUtils.identifyElements(identificationTask, targetDescription, context, (prompt) => this.executeVisionPrompt(prompt, screenshotBase64), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Element identification failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Optimize action sequences for maximum efficiency
     */
    async optimizeActionSequence(goal, availableActions, constraints = [], currentState = '', context) {
        try {
            return await prompts_1.PromptUtils.optimizeActionSequence(goal, availableActions, constraints, currentState, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Action sequence optimization failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Analyze patterns from successful executions for learning
     */
    async analyzePatterns(taskType, actionsTaken, successMetrics, context = '', timing = {}, promptContext) {
        try {
            return await prompts_1.PromptUtils.analyzePatterns(taskType, actionsTaken, successMetrics, context, timing, (prompt) => this.executePromptWithModel(prompt), this.logger);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Pattern analysis failed', { error: err.message });
            throw err;
        }
    }
    /**
     * Execute a prompt with the configured model
     */
    async executePromptWithModel(prompt) {
        const response = await this.client.chat.completions.create({
            model: this.defaultModel,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 0.1,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenRouter model');
        }
        return content;
    }
    /**
     * Execute a vision prompt with screenshot
     */
    async executeVisionPrompt(prompt, screenshotBase64) {
        const response = await this.client.chat.completions.create({
            model: this.defaultModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${screenshotBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
            temperature: 0.1,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenRouter vision model');
        }
        return content;
    }
    /**
     * Get prompt manager statistics
     */
    getPromptStats() {
        return this.promptManager.getStats();
    }
    /**
     * Clear prompt manager cache
     */
    clearPromptCache() {
        this.promptManager.clearCache();
    }
    /**
     * Execute custom prompt with full control
     */
    async executeCustomPrompt(promptType, variables, context, options) {
        try {
            const result = await this.promptManager.executePrompt(promptType, variables, (prompt) => this.executePromptWithModel(prompt), context, {
                useCache: options?.useCache ?? true,
                maxRetries: options?.maxRetries ?? 3,
                timeout: options?.timeout ?? 30000,
                saveDebugInfo: options?.includeDebugInfo ?? false,
                includeValidation: true,
                responseFormat: 'json'
            });
            if (!result.success) {
                throw new Error(result.error || 'Custom prompt execution failed');
            }
            return result.data;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Custom prompt execution failed', {
                promptType,
                error: err.message
            });
            throw err;
        }
    }
}
exports.OpenRouterService = OpenRouterService;
//# sourceMappingURL=OpenRouterService.js.map