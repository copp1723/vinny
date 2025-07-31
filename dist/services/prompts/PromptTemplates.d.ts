/**
 * Comprehensive prompt templates for unified UI navigation system
 * These templates enable natural language task execution for VinSolutions automation
 */
export declare enum PromptType {
    TASK_CLASSIFICATION = "TASK_CLASSIFICATION",
    SCREENSHOT_ANALYSIS = "SCREENSHOT_ANALYSIS",
    NAVIGATION_PLANNING = "NAVIGATION_PLANNING",
    TASK_COMPLETION_VERIFICATION = "TASK_COMPLETION_VERIFICATION",
    ERROR_RECOVERY_PLANNING = "ERROR_RECOVERY_PLANNING",
    ELEMENT_IDENTIFICATION = "ELEMENT_IDENTIFICATION",
    ACTION_SEQUENCING = "ACTION_SEQUENCING",
    PATTERN_RECOGNITION = "PATTERN_RECOGNITION"
}
/**
 * Main prompt templates for the unified navigation system
 */
export declare const PROMPT_TEMPLATES: {
    /**
     * Task Classification - Analyzes natural language instructions
     */
    TASK_CLASSIFICATION: string;
    /**
     * Screenshot Analysis - Comprehensive visual analysis
     */
    SCREENSHOT_ANALYSIS: string;
    /**
     * Navigation Planning - Strategic path planning
     */
    NAVIGATION_PLANNING: string;
    /**
     * Task Completion Verification
     */
    TASK_COMPLETION_VERIFICATION: string;
    /**
     * Error Recovery Planning
     */
    ERROR_RECOVERY_PLANNING: string;
    /**
     * Element Identification - Precise element location
     */
    ELEMENT_IDENTIFICATION: string;
    /**
     * Action Sequencing - Optimal action ordering
     */
    ACTION_SEQUENCING: string;
    /**
     * Pattern Recognition - Learning from successful patterns
     */
    PATTERN_RECOGNITION: string;
};
/**
 * Context injection templates for adding dynamic context to prompts
 */
export declare const CONTEXT_TEMPLATES: {
    CURRENT_STATE: string;
    USER_CONTEXT: string;
    TECHNICAL_CONTEXT: string;
    BUSINESS_CONTEXT: string;
};
/**
 * Response validation templates
 */
export declare const VALIDATION_TEMPLATES: {
    JSON_STRUCTURE: string;
    CONFIDENCE_SCORING: string;
    ERROR_HANDLING: string;
    VERIFICATION_STEPS: string;
};
/**
 * Helper function to get prompt template by type
 */
export declare function getPromptTemplate(type: PromptType): string;
/**
 * Helper function to get all available prompt types
 */
export declare function getAvailablePromptTypes(): PromptType[];
/**
 * Helper function to validate prompt template variables
 */
export declare function getTemplateVariables(template: string): string[];
//# sourceMappingURL=PromptTemplates.d.ts.map