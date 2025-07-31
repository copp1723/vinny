"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configValidator = exports.ConfigValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const config_schema_json_1 = __importDefault(require("../schemas/config-schema.json"));
const Logger_1 = require("./Logger");
class ConfigValidator {
    ajv;
    logger;
    validator;
    constructor() {
        this.logger = new Logger_1.Logger('ConfigValidator');
        this.ajv = new ajv_1.default({ allErrors: true, verbose: true });
        (0, ajv_formats_1.default)(this.ajv);
        // Compile the schema
        this.validator = this.ajv.compile(config_schema_json_1.default);
    }
    /**
     * Validate a configuration object
     */
    validate(config) {
        const valid = this.validator(config);
        if (!valid) {
            const errors = this.validator.errors?.map((err) => ({
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
    validateAndMerge(config) {
        // Apply defaults
        const merged = {
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
    async loadFromFile(filePath) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
            const configData = await fs.readJson(filePath);
            return this.validateAndMerge(configData);
        }
        catch (error) {
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
    getErrorMessages(errors) {
        return errors.map(err => {
            const field = err.path.replace(/^\//, '').replace(/\//g, '.');
            return field ? `${field}: ${err.message}` : err.message;
        });
    }
    /**
     * Validate specific task parameters
     */
    validateTaskParameters(taskType, parameters) {
        const errors = [];
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
    static createExample(taskType = 'report') {
        const examples = {
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
exports.ConfigValidator = ConfigValidator;
// Export singleton instance
exports.configValidator = new ConfigValidator();
//# sourceMappingURL=ConfigValidator.js.map