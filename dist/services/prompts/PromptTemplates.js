"use strict";
/**
 * Comprehensive prompt templates for unified UI navigation system
 * These templates enable natural language task execution for VinSolutions automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_TEMPLATES = exports.CONTEXT_TEMPLATES = exports.PROMPT_TEMPLATES = exports.PromptType = void 0;
exports.getPromptTemplate = getPromptTemplate;
exports.getAvailablePromptTypes = getAvailablePromptTypes;
exports.getTemplateVariables = getTemplateVariables;
var PromptType;
(function (PromptType) {
    PromptType["TASK_CLASSIFICATION"] = "TASK_CLASSIFICATION";
    PromptType["SCREENSHOT_ANALYSIS"] = "SCREENSHOT_ANALYSIS";
    PromptType["NAVIGATION_PLANNING"] = "NAVIGATION_PLANNING";
    PromptType["TASK_COMPLETION_VERIFICATION"] = "TASK_COMPLETION_VERIFICATION";
    PromptType["ERROR_RECOVERY_PLANNING"] = "ERROR_RECOVERY_PLANNING";
    PromptType["ELEMENT_IDENTIFICATION"] = "ELEMENT_IDENTIFICATION";
    PromptType["ACTION_SEQUENCING"] = "ACTION_SEQUENCING";
    PromptType["PATTERN_RECOGNITION"] = "PATTERN_RECOGNITION";
})(PromptType || (exports.PromptType = PromptType = {}));
/**
 * Main prompt templates for the unified navigation system
 */
exports.PROMPT_TEMPLATES = {
    /**
     * Task Classification - Analyzes natural language instructions
     */
    [PromptType.TASK_CLASSIFICATION]: `You are an expert VinSolutions automation analyst. Analyze this natural language task instruction and classify it.

TASK INSTRUCTION: "{{taskInstruction}}"

CONTEXT:
- Current URL: {{currentUrl}}
- Platform: VinSolutions/Cox Automotive
- Available capabilities: {{capabilities}}

Analyze the instruction and determine:
1. Primary task type (report_download, lead_search, navigation, data_entry, verification)
2. Required actions sequence
3. Target elements to find
4. Success criteria
5. Potential challenges
6. Estimated complexity (1-5 clicks)

Respond in JSON format:
{
  "taskType": "primary task category",
  "subTasks": ["ordered list of specific actions"],
  "targetElements": ["UI elements to locate"],
  "parameters": {
    "reportName": "if applicable",
    "searchTerm": "if searching",
    "dataToEnter": "if data entry",
    "verificationCriteria": "if verification"
  },
  "estimatedClicks": 3,
  "complexity": "simple|moderate|complex",
  "fallbackStrategies": ["alternative approaches"],
  "successCriteria": "how to verify completion",
  "confidence": 0.95
}`,
    /**
     * Screenshot Analysis - Comprehensive visual analysis
     */
    [PromptType.SCREENSHOT_ANALYSIS]: `You are an expert UI analyst specializing in VinSolutions and business software interfaces.

ANALYSIS TASK: {{analysisType}}
CONTEXT: {{context}}
TARGET ELEMENTS: {{targetElements}}

Analyze this screenshot and provide detailed findings:

1. **Page Identification**
   - What page/section is this?
   - Platform state (logged in, loading, error, etc.)
   - Current workflow step

2. **Element Detection**
   - Locate all target elements
   - Identify interactive elements (buttons, links, inputs)
   - Note element states (enabled, disabled, selected)

3. **Action Recommendations**
   - Best next action to achieve the goal
   - Element interaction strategy (click, fill, select)
   - Alternative approaches if primary fails

4. **Visual Patterns**
   - Navigation patterns visible
   - Data structures (tables, lists, forms)
   - Error states or alerts

Respond in JSON format:
{
  "pageIdentification": {
    "pageType": "dashboard|reports|leads|settings|login",
    "pageTitle": "extracted title",
    "platformState": "ready|loading|error|authentication_required",
    "workflowStep": "description of current step"
  },
  "elementsFound": [
    {
      "type": "button|link|input|text|dropdown|table",
      "text": "visible text or label",
      "selector": "suggested CSS selector",
      "coordinates": {"x": 123, "y": 456},
      "confidence": 0.95,
      "isClickable": true,
      "state": "enabled|disabled|selected|focused"
    }
  ],
  "actionPlan": {
    "primaryAction": "click|fill|select|scroll|navigate",
    "targetElement": "best element to interact with",
    "reasoning": "why this action",
    "coordinates": {"x": 123, "y": 456},
    "alternativeActions": ["fallback options"]
  },
  "visualPatterns": {
    "navigationVisible": true,
    "dataStructures": ["table", "form"],
    "errorStates": [],
    "loadingIndicators": false
  },
  "confidence": 0.95
}`,
    /**
     * Navigation Planning - Strategic path planning
     */
    [PromptType.NAVIGATION_PLANNING]: `You are a VinSolutions navigation expert. Plan the optimal path to complete this task.

CURRENT STATE:
- Page: {{currentPage}}
- URL: {{currentUrl}}
- User Goal: {{userGoal}}
- Available Elements: {{availableElements}}
- Previous Actions: {{previousActions}}

TASK: Create a step-by-step navigation plan to achieve the user's goal with minimal clicks.

Consider:
1. VinSolutions typical navigation patterns
2. Most efficient path (3-5 clicks max)
3. Progressive enhancement (try direct, then vision, then fallback)
4. Error recovery at each step

Respond in JSON format:
{
  "navigationPlan": [
    {
      "stepNumber": 1,
      "action": "click|fill|select|navigate|verify",
      "description": "human readable description",
      "targetElement": {
        "primarySelector": "CSS selector",
        "alternativeSelectors": ["fallback selectors"],
        "coordinates": {"x": 123, "y": 456},
        "visionDescription": "what to look for visually"
      },
      "expectedOutcome": "what should happen",
      "errorHandling": "what to do if this fails",
      "verificationCriteria": "how to confirm success"
    }
  ],
  "totalEstimatedClicks": 3,
  "fallbackStrategy": "alternative approach if plan fails",
  "successIndicators": ["how to know we succeeded"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["potential issues"],
    "mitigation": ["how to handle risks"]
  },
  "confidence": 0.90
}`,
    /**
     * Task Completion Verification
     */
    [PromptType.TASK_COMPLETION_VERIFICATION]: `You are verifying if a VinSolutions task has been completed successfully.

ORIGINAL TASK: {{originalTask}}
EXPECTED OUTCOME: {{expectedOutcome}}
CURRENT STATE: {{currentState}}
USER INTENT: {{userIntent}}

Analyze the current state and determine if the task has been completed:

1. **Completion Status**
   - Is the primary goal achieved?
   - Are all sub-tasks completed?
   - Any remaining actions needed?

2. **Quality Assessment**
   - Is the result correct?
   - Does it match user expectations?
   - Any errors or issues?

3. **Next Steps**
   - Task fully complete?
   - Additional verification needed?
   - Follow-up actions required?

Respond in JSON format:
{
  "completionStatus": {
    "isComplete": true,
    "percentComplete": 100,
    "completedSubTasks": ["list of completed items"],
    "remainingTasks": ["list of remaining items"]
  },
  "qualityAssessment": {
    "resultCorrect": true,
    "meetsExpectations": true,
    "issuesFound": [],
    "confidenceScore": 0.95
  },
  "verification": {
    "evidenceOfCompletion": ["what proves it's done"],
    "visualConfirmation": "what we can see that confirms success",
    "functionalConfirmation": "what functionality confirms success"
  },
  "nextActions": {
    "taskComplete": true,
    "additionalStepsNeeded": [],
    "followUpRecommendations": []
  },
  "confidence": 0.95
}`,
    /**
     * Error Recovery Planning
     */
    [PromptType.ERROR_RECOVERY_PLANNING]: `You are a VinSolutions automation recovery specialist. Plan how to recover from this error and continue the task.

ERROR CONTEXT:
- Original Task: {{originalTask}}
- Failed Action: {{failedAction}}
- Error Details: {{errorDetails}}
- Current State: {{currentState}}
- Attempts Made: {{attemptsMade}}

RECOVERY ANALYSIS:
1. **Error Classification**
   - Type of error (UI changed, network, timing, element not found)
   - Severity (recoverable, needs different approach, fatal)
   - Root cause analysis

2. **Recovery Strategy**
   - Alternative approaches to try
   - Different selectors or methods
   - Fallback navigation paths

3. **Prevention**
   - How to avoid this error in future
   - Better detection methods
   - Improved selectors

Respond in JSON format:
{
  "errorAnalysis": {
    "errorType": "ui_change|network_error|timing_issue|element_not_found|authentication|permission",
    "severity": "low|medium|high|critical",
    "rootCause": "explanation of what went wrong",
    "isRecoverable": true,
    "recoveryComplexity": "simple|moderate|complex"
  },
  "recoveryPlan": [
    {
      "strategy": "retry|alternative_selector|different_approach|wait_and_retry|refresh_page",
      "description": "what to try",
      "implementation": {
        "selectors": ["alternative selectors to try"],
        "actions": ["sequence of actions"],
        "timing": "wait times or conditions",
        "verification": "how to check if recovery worked"
      },
      "successProbability": 0.80,
      "maxRetries": 3
    }
  ],
  "preventionMeasures": {
    "betterSelectors": ["more robust selectors"],
    "improvedTiming": "better wait conditions",
    "additionalVerification": "extra checks to add"
  },
  "escalationCriteria": "when to give up and escalate",
  "confidence": 0.85
}`,
    /**
     * Element Identification - Precise element location
     */
    [PromptType.ELEMENT_IDENTIFICATION]: `You are an expert at identifying specific UI elements in VinSolutions interfaces.

IDENTIFICATION TASK: {{identificationTask}}
TARGET DESCRIPTION: {{targetDescription}}
CONTEXT: {{context}}

Analyze this screenshot to locate the specific element(s):

1. **Element Location**
   - Exact coordinates
   - Multiple selector options
   - Visual characteristics

2. **Element Properties**
   - Type and functionality
   - Current state
   - Interaction methods

3. **Confidence Assessment**
   - How certain is the identification
   - Alternative candidates
   - Risk factors

Respond in JSON format:
{
  "elementIdentification": {
    "found": true,
    "confidence": 0.95,
    "primaryElement": {
      "coordinates": {"x": 123, "y": 456},
      "selector": "best CSS selector",
      "alternativeSelectors": ["fallback options"],
      "visualDescription": "what it looks like",
      "text": "visible text if any",
      "type": "button|link|input|dropdown|etc",
      "state": "enabled|disabled|selected|focused"
    },
    "alternatives": [
      {
        "coordinates": {"x": 200, "y": 300},
        "selector": "alternative selector",
        "confidence": 0.80,
        "reasoning": "why this might be the target"
      }
    ]
  },
  "interactionStrategy": {
    "recommendedAction": "click|fill|select|hover",
    "preconditions": ["what needs to be true first"],
    "expectedResult": "what should happen",
    "verificationMethod": "how to confirm it worked"
  },
  "riskFactors": [
    {
      "risk": "description of potential issue",
      "probability": 0.20,
      "mitigation": "how to handle if it occurs"
    }
  ]
}`,
    /**
     * Action Sequencing - Optimal action ordering
     */
    [PromptType.ACTION_SEQUENCING]: `You are optimizing the sequence of actions for maximum efficiency in VinSolutions.

GOAL: {{goal}}
AVAILABLE ACTIONS: {{availableActions}}
CONSTRAINTS: {{constraints}}
CURRENT STATE: {{currentState}}

Create the most efficient sequence of actions:

1. **Sequence Optimization**
   - Minimize total clicks
   - Reduce wait times
   - Handle dependencies

2. **Parallel Processing**
   - Actions that can be batched
   - Concurrent operations
   - Resource optimization

3. **Error Minimization**
   - Most reliable path
   - Fallback at each step
   - Recovery points

Respond in JSON format:
{
  "actionSequence": [
    {
      "sequenceNumber": 1,
      "action": "detailed action description",
      "method": "click|fill|select|navigate|verify",
      "target": "element description",
      "parameters": {"any needed parameters"},
      "dependencies": ["what must complete first"],
      "parallelWith": ["actions that can run concurrently"],
      "timeout": 5000,
      "retryLogic": {
        "maxRetries": 3,
        "backoffStrategy": "exponential",
        "fallbackAction": "what to do if all retries fail"
      },
      "verificationStep": "how to confirm this action succeeded"
    }
  ],
  "optimization": {
    "totalEstimatedTime": 15000,
    "clickCount": 3,
    "parallelizableSteps": ["which steps can be optimized"],
    "bottlenecks": ["potential slow points"],
    "optimizationOpportunities": ["ways to improve further"]
  },
  "riskMitigation": {
    "checkpoints": ["recovery points in the sequence"],
    "fallbackPaths": ["alternative sequences if main fails"],
    "rollbackStrategy": "how to undo if needed"
  }
}`,
    /**
     * Pattern Recognition - Learning from successful patterns
     */
    [PromptType.PATTERN_RECOGNITION]: `You are analyzing successful automation patterns to improve future performance.

SUCCESSFUL EXECUTION DATA:
- Task Type: {{taskType}}
- Actions Taken: {{actionsTaken}}
- Success Metrics: {{successMetrics}}
- Context: {{context}}
- Timing: {{timing}}

Identify reusable patterns:

1. **Pattern Identification**
   - Common action sequences
   - Reliable selectors
   - Timing patterns

2. **Success Factors**
   - What made this work
   - Critical decision points
   - Environmental factors

3. **Generalization**
   - How to apply to similar tasks
   - Abstraction level
   - Adaptation requirements

Respond in JSON format:
{
  "identifiedPatterns": [
    {
      "patternName": "descriptive name",
      "patternType": "navigation|authentication|data_extraction|form_filling",
      "applicableScenarios": ["when to use this pattern"],
      "actionSequence": ["abstract action sequence"],
      "keySelectors": ["most reliable selectors"],
      "timing": {
        "averageExecutionTime": 5000,
        "criticalWaitPoints": ["where timing matters most"],
        "optimizationOpportunities": ["ways to speed up"]
      },
      "successRate": 0.95,
      "confidence": 0.90
    }
  ],
  "successFactors": {
    "criticalElements": ["what elements were key to success"],
    "environmentalFactors": ["page state, timing, etc."],
    "decisionPoints": ["key choices that led to success"],
    "failureAvoidance": ["what this pattern avoids"]
  },
  "generalization": {
    "abstractionLevel": "specific|moderate|high",
    "adaptationRequired": ["what needs to change for different contexts"],
    "applicabilityScope": "scope of where this pattern works",
    "improvementSuggestions": ["how to make this pattern even better"]
  },
  "patternMetadata": {
    "createdDate": "timestamp",
    "usageCount": 1,
    "lastUpdated": "timestamp",
    "tags": ["classification tags"],
    "priority": "high|medium|low"
  }
}`
};
/**
 * Context injection templates for adding dynamic context to prompts
 */
exports.CONTEXT_TEMPLATES = {
    CURRENT_STATE: `
CURRENT STATE CONTEXT:
- Page URL: {{currentUrl}}
- Page Title: {{pageTitle}}
- Timestamp: {{timestamp}}
- Previous Actions: {{previousActions}}
- Session Duration: {{sessionDuration}}
- Error Count: {{errorCount}}`,
    USER_CONTEXT: `
USER CONTEXT:
- Username: {{username}}
- Platform: {{platform}}
- Task History: {{taskHistory}}
- Preferences: {{preferences}}
- Access Level: {{accessLevel}}`,
    TECHNICAL_CONTEXT: `
TECHNICAL CONTEXT:
- Browser: {{browser}}
- Viewport: {{viewport}}
- Connection: {{connectionType}}
- Performance: {{performanceMetrics}}
- Debug Mode: {{debugMode}}`,
    BUSINESS_CONTEXT: `
BUSINESS CONTEXT:
- Organization: {{organization}}
- Department: {{department}}
- Report Types: {{availableReports}}
- Data Access: {{dataPermissions}}
- Compliance: {{complianceRequirements}}`
};
/**
 * Response validation templates
 */
exports.VALIDATION_TEMPLATES = {
    JSON_STRUCTURE: `Ensure your response is valid JSON that can be parsed with JSON.parse(). Include all required fields with appropriate data types.`,
    CONFIDENCE_SCORING: `Include confidence scores (0.0-1.0) for all recommendations. Scores below 0.7 should include alternative approaches.`,
    ERROR_HANDLING: `For any identified risks or potential failures, include specific error handling strategies and fallback options.`,
    VERIFICATION_STEPS: `Include specific, actionable verification steps that can be programmatically executed to confirm success.`
};
/**
 * Helper function to get prompt template by type
 */
function getPromptTemplate(type) {
    const template = exports.PROMPT_TEMPLATES[type];
    if (!template) {
        throw new Error(`Unknown prompt type: ${type}`);
    }
    return template;
}
/**
 * Helper function to get all available prompt types
 */
function getAvailablePromptTypes() {
    return Object.values(PromptType);
}
/**
 * Helper function to validate prompt template variables
 */
function getTemplateVariables(template) {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches)
        return [];
    return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
}
//# sourceMappingURL=PromptTemplates.js.map