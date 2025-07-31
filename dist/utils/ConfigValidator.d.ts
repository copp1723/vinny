import { UnifiedTaskConfig } from '../agents/UnifiedVinSolutionsAgent';
export interface ValidationResult {
    valid: boolean;
    errors?: Array<{
        path: string;
        message: string;
    }>;
}
export declare class ConfigValidator {
    private ajv;
    private logger;
    private validator;
    constructor();
    /**
     * Validate a configuration object
     */
    validate(config: any): ValidationResult;
    /**
     * Validate and merge with defaults
     */
    validateAndMerge(config: Partial<UnifiedTaskConfig>): UnifiedTaskConfig;
    /**
     * Load and validate configuration from file
     */
    loadFromFile(filePath: string): Promise<UnifiedTaskConfig>;
    /**
     * Get human-readable error messages
     */
    getErrorMessages(errors: Array<{
        path: string;
        message: string;
    }>): string[];
    /**
     * Validate specific task parameters
     */
    validateTaskParameters(taskType: string, parameters?: any): ValidationResult;
    /**
     * Create example configuration
     */
    static createExample(taskType?: string): Partial<UnifiedTaskConfig>;
}
export declare const configValidator: ConfigValidator;
//# sourceMappingURL=ConfigValidator.d.ts.map