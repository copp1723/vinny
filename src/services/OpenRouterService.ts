import OpenAI from 'openai';
import { Logger } from '../utils/Logger';

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
    coordinates?: { x: number; y: number };
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

export class OpenRouterService {
  private client: OpenAI;
  private logger: Logger;
  private defaultModel: string;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
    });
    this.logger = new Logger('OpenRouterService');
    this.defaultModel = config.defaultModel || 'anthropic/claude-3.5-sonnet';
  }

  async analyzePageForElements(
    screenshotBase64: string,
    targetElements: string[],
    context: string = ''
  ): Promise<VisionAnalysisResult> {
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

      const result = JSON.parse(jsonMatch[0]) as VisionAnalysisResult;
      
      this.logger.info('Page analysis completed', {
        elementsFound: result.elementsFound.length,
        nextAction: result.nextAction
      });

      return result;

    } catch (error: any) {
      this.logger.error('Failed to analyze page', { error: error.message });
      throw error;
    }
  }

  async extractTwoFactorCode(emailContent: string): Promise<TwoFactorCodeAnalysis> {
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

      const result = JSON.parse(jsonMatch[0]) as TwoFactorCodeAnalysis;
      
      this.logger.info('2FA code analysis completed', {
        codeFound: result.codeFound,
        confidence: result.confidence
      });

      return result;

    } catch (error: any) {
      this.logger.error('Failed to analyze 2FA code', { error: error.message });
      throw error;
    }
  }

  async generateAutomationStrategy(
    platformName: string,
    reportName: string,
    currentStep: string,
    errorContext?: string
  ): Promise<string> {
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

    } catch (error: any) {
      this.logger.error('Failed to generate automation strategy', { error: error.message });
      throw error;
    }
  }

  async selectBestModel(task: string): Promise<string> {
    // Simple model selection logic - can be enhanced
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('vision') || taskLower.includes('screenshot') || taskLower.includes('image')) {
      return 'anthropic/claude-3.5-sonnet'; // Best for vision tasks
    } else if (taskLower.includes('code') || taskLower.includes('programming')) {
      return 'anthropic/claude-3.5-sonnet'; // Good for coding
    } else if (taskLower.includes('fast') || taskLower.includes('quick')) {
      return 'anthropic/claude-3-haiku'; // Fastest
    } else {
      return this.defaultModel; // Default choice
    }
  }

  async testConnection(): Promise<boolean> {
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

    } catch (error: any) {
      this.logger.error('OpenRouter connection test failed', { error: error.message });
      return false;
    }
  }
}

