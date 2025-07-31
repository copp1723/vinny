import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { UnifiedTaskConfig } from '../agents/UnifiedVinSolutionsAgent';
import configSchema from '../schemas/config-schema.json';
import { Logger } from './Logger';

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

export class ConfigValidator {
  private ajv: Ajv;
  private logger: Logger;
  private validator: any;

  constructor() {
    this.logger = new Logger('ConfigValidator');
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    // Compile the schema
    this.validator = this.ajv.compile(configSchema);
  }

  /**
   * Validate a configuration object
   */
  validate(config: any): ValidationResult {
    const valid = this.validator(config);

    if (!valid) {
      const errors = this.validator.errors?.map((err: any) => ({
        path: err.instancePath || '/',
        message: err.message || 'Unknown validation error'
      })) || [];

      this.logger.error('Configuration validation failed', { errors });

      return {
        valid: false,
        errors
      };
    }

    return { valid: true };
  }

  /**
   * Validate and merge with defaults
   */
  validateAndMerge(config: Partial<UnifiedTaskConfig>): UnifiedTaskConfig {
    // Apply defaults
    const merged: UnifiedTaskConfig = {
      target: {
        url: '',
        taskType: 'report',
        ...config.target
      },
      authentication: {
        username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
        password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '',
        ...config.authentication
      },
      capabilities: {
        useVision: false,
        maxClicks: 10,
        screenshotDebug: false,
        ...config.capabilities
      },
      output: {
        downloadPath: './downloads',
        ...config.output
      }
    };

    // Validate merged config
    const result = this.validate(merged);
    if (!result.valid) {
      throw new Error(`Invalid configuration: ${JSON.stringify(result.errors)}`);
    }

    return merged;
  }

  /**
   * Load and validate configuration from file
   */
  async loadFromFile(filePath: string): Promise<UnifiedTaskConfig> {
    try {
      const fs = await import('fs-extra');
      const configData = await fs.readJson(filePath);
      
      return this.validateAndMerge(configData);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to load configuration file', { 
        path: filePath, 
        error: err.message 
      });
      throw new Error(`Failed to load config from ${filePath}: ${err.message}`);
    }
  }

  /**
   * Get human-readable error messages
   */
  getErrorMessages(errors: Array<{ path: string; message: string }>): string[] {
    return errors.map(err => {
      const field = err.path.replace(/^\//, '').replace(/\//g, '.');
      return field ? `${field}: ${err.message}` : err.message;
    });
  }

  /**
   * Validate specific task parameters
   */
  validateTaskParameters(taskType: string, parameters?: any): ValidationResult {
    const errors: Array<{ path: string; message: string }> = [];

    switch (taskType) {
      case 'report':
        if (parameters?.reportPosition && parameters.reportPosition < 1) {
          errors.push({
            path: '/parameters/reportPosition',
            message: 'Report position must be 1 or greater'
          });
        }
        break;

      case 'lead-activity':
        if (!parameters?.leadPhone) {
          errors.push({
            path: '/parameters/leadPhone',
            message: 'Lead phone number is required for lead-activity task'
          });
        }
        break;

      case 'custom':
        if (!parameters?.customSelectors || parameters.customSelectors.length === 0) {
          errors.push({
            path: '/parameters/customSelectors',
            message: 'At least one selector is required for custom task'
          });
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create example configuration
   */
  static createExample(taskType: string = 'report'): Partial<UnifiedTaskConfig> {
    const examples: Record<string, Partial<UnifiedTaskConfig>> = {
      report: {
        target: {
          url: 'https://provision.vauto.com',
          taskType: 'report',
          parameters: {
            reportPosition: 1
          }
        },
        authentication: {
          username: 'your-username',
          password: 'your-password'
        },
        capabilities: {
          useVision: false
        }
      },
      'lead-activity': {
        target: {
          url: 'https://vinsolutions.com/leads',
          taskType: 'lead-activity',
          parameters: {
            leadPhone: '555-123-4567'
          }
        },
        authentication: {
          username: 'your-username',
          password: 'your-password'
        },
        capabilities: {
          useVision: true
        }
      },
      'dnc-check': {
        target: {
          url: 'https://vinsolutions.com/dnc',
          taskType: 'dnc-check'
        },
        authentication: {
          username: 'your-username',
          password: 'your-password'
        },
        capabilities: {
          useVision: true,
          screenshotDebug: true
        }
      },
      custom: {
        target: {
          url: 'https://dealer.com/admin',
          taskType: 'custom',
          parameters: {
            customSelectors: [
              'button:has-text("Export")',
              '.modal .confirm-button'
            ]
          }
        },
        authentication: {
          username: 'your-username',
          password: 'your-password'
        }
      }
    };

    return examples[taskType] || examples.report;
  }
}

// Export singleton instance
export const configValidator = new ConfigValidator();