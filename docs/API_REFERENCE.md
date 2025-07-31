# API Reference

## Table of Contents
- [Core Classes](#core-classes)
  - [UnifiedVinSolutionsAgent](#unifiedvinsolutionsagent)
  - [SessionPersistenceService](#sessionpersistenceservice)
  - [OpenRouterService](#openrouterservice)
- [Configuration Interfaces](#configuration-interfaces)
- [CLI Commands](#cli-commands)
- [Environment Variables](#environment-variables)

## Core Classes

### UnifiedVinSolutionsAgent

The main agent class that handles all VinSolutions and Cox Automotive product automation.

#### Constructor
```typescript
new UnifiedVinSolutionsAgent(config: UnifiedTaskConfig, logger?: Logger)
```

#### Parameters
- `config` (UnifiedTaskConfig): Configuration object for the agent
- `logger` (Logger, optional): Custom logger instance

#### Methods

##### executeTask()
```typescript
async executeTask(): Promise<TaskResult>
```
Executes the configured task based on the taskType.

**Returns:** Promise<TaskResult> - Result of the task execution

##### authenticateAndNavigate()
```typescript
async authenticateAndNavigate(): Promise<void>
```
Handles Cox SSO authentication and navigation to target URL.

**Throws:** Error if authentication fails

##### executeReportTask()
```typescript
private async executeReportTask(): Promise<TaskResult>
```
Downloads reports from the specified position in the UI.

##### executeLeadActivityTask()
```typescript
private async executeLeadActivityTask(): Promise<TaskResult>
```
Retrieves lead activity data for a specific phone number.

##### executeDNCCheckTask()
```typescript
private async executeDNCCheckTask(): Promise<TaskResult>
```
Checks DNC status for leads with enhanced checkbox handling.

##### executeCustomTask()
```typescript
private async executeCustomTask(): Promise<TaskResult>
```
Executes custom automation based on provided selectors.

### SessionPersistenceService

Manages browser session persistence and restoration.

#### Constructor
```typescript
new SessionPersistenceService(logger: Logger, config: SessionPersistenceConfig)
```

#### Methods

##### initialize()
```typescript
async initialize(): Promise<void>
```
Initializes the session persistence service and creates necessary directories.

##### saveSession()
```typescript
async saveSession(
  context: BrowserContext,
  page: Page,
  identifier: string,
  url?: string
): Promise<boolean>
```
Saves the current browser session state.

**Parameters:**
- `context`: Playwright browser context
- `page`: Current page instance
- `identifier`: Unique identifier for the session
- `url`: Optional URL to associate with session

**Returns:** Boolean indicating success

##### loadSession()
```typescript
async loadSession(
  identifier: string
): Promise<StoredSession | null>
```
Loads a previously saved session.

##### restoreSession()
```typescript
async restoreSession(
  context: BrowserContext,
  sessionData: StoredSession
): Promise<boolean>
```
Restores session data to a browser context.

##### validateSession()
```typescript
async validateSession(page: Page): Promise<SessionValidationResult>
```
Validates if the current session is still active.

##### startKeepAlive()
```typescript
async startKeepAlive(page: Page): Promise<void>
```
Starts the keep-alive mechanism to maintain session.

##### stopKeepAlive()
```typescript
async stopKeepAlive(): Promise<void>
```
Stops the keep-alive mechanism.

### OpenRouterService

Provides AI-powered vision analysis capabilities.

#### Constructor
```typescript
new OpenRouterService(config: OpenRouterConfig)
```

#### Methods

##### analyzeCheckboxMapping()
```typescript
async analyzeCheckboxMapping(
  base64Image: string,
  factoryFeatures: Array<{
    code: string;
    description: string;
    checked: boolean;
  }>,
  interfaceContext?: string
): Promise<CheckboxMappingResult>
```
Analyzes a screenshot to map checkboxes to factory features.

##### generateVehicleDescription()
```typescript
async generateVehicleDescription(
  vehicleData: {
    year: number;
    make: string;
    model: string;
    vin: string;
    stockNumber: string;
    factoryEquipment: Array<{
      code: string;
      description: string;
    }>;
  }
): Promise<{ description: string; keywords: string[] }>
```
Generates professional vehicle descriptions using AI.

## Configuration Interfaces

### UnifiedTaskConfig
```typescript
interface UnifiedTaskConfig {
  target: {
    url: string;
    taskType: 'report' | 'lead-activity' | 'dnc-check' | 'custom';
    parameters?: {
      reportPosition?: number;
      leadPhone?: string;
      customSelectors?: string[];
      [key: string]: any;
    };
  };
  authentication: {
    username: string;
    password: string;
    otpWebhookUrl?: string;
  };
  capabilities: {
    useVision?: boolean;
    maxClicks?: number;
    screenshotDebug?: boolean;
  };
  output?: {
    directory?: string;
    emailTo?: string;
    webhookUrl?: string;
  };
}
```

### TaskResult
```typescript
interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    duration: number;
    clicksUsed: number;
    screenshotsTaken?: number;
    visionCallsMade?: number;
  };
  files?: string[];
}
```

### SessionPersistenceConfig
```typescript
interface SessionPersistenceConfig {
  enabled: boolean;
  sessionPath: string;
  keepAlive: boolean;
  keepAliveInterval: number;
  sessionTimeout: number;
  maxRetries: number;
}
```

### StoredSession
```typescript
interface StoredSession {
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  url: string;
  timestamp: number;
  version: number;
  userAgent?: string;
}
```

## CLI Commands

### Main Command
```bash
npm run unified <command> [options]
```

### Commands

#### report
Download reports from VinSolutions
```bash
npm run unified report --url <url> --username <user> --password <pass> [options]
```

**Options:**
- `--position <number>`: Report position in the list (default: 1)
- `--output <dir>`: Output directory for downloads
- `--vision`: Enable AI vision capabilities

#### lead
Get lead activity information
```bash
npm run unified lead --url <url> --phone <number> --username <user> --password <pass>
```

**Options:**
- `--phone <number>`: Lead phone number (required)

#### custom
Execute custom automation
```bash
npm run unified custom --url <url> --selectors <list> --username <user> --password <pass>
```

**Options:**
- `--selectors <list>`: Comma-separated CSS selectors

#### test
Test authentication and basic navigation
```bash
npm run unified test --url <url> --username <user> --password <pass>
```

#### session
Manage browser sessions
```bash
npm run unified session <action>
```

**Actions:**
- `list`: List all saved sessions
- `clear`: Clear all saved sessions
- `validate <id>`: Validate a specific session

### Global Options
- `--config <file>`: Path to JSON configuration file
- `--headless`: Run browser in headless mode
- `--debug`: Enable debug logging
- `--screenshot`: Take screenshots on errors

## Environment Variables

### Required
- `COX_USERNAME` or `VINSOLUTIONS_USERNAME`: Cox Bridge ID username
- `COX_PASSWORD` or `VINSOLUTIONS_PASSWORD`: Cox Bridge ID password

### Optional
- `OPENROUTER_API_KEY`: API key for AI vision features
- `OTP_WEBHOOK_URL`: Webhook URL for 2FA automation
- `SESSION_PERSISTENCE`: Enable session persistence (true/false)
- `SESSION_PATH`: Directory for session storage (default: ./sessions)
- `SESSION_TIMEOUT`: Session timeout in ms (default: 86400000)
- `SESSION_KEEP_ALIVE`: Enable keep-alive (default: true)
- `OUTPUT_DIR`: Default output directory for downloads
- `EMAIL_TO`: Email address for report delivery
- `WEBHOOK_URL`: Webhook for task notifications
- `DEBUG`: Enable debug logging (true/false)
- `HEADLESS`: Run browser in headless mode (true/false)

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_FAILED | Authentication failed |
| SESSION_EXPIRED | Session has expired |
| ELEMENT_NOT_FOUND | Target element not found |
| DOWNLOAD_FAILED | File download failed |
| VISION_ERROR | AI vision analysis failed |
| NETWORK_ERROR | Network request failed |
| TIMEOUT | Operation timed out |

## Examples

### Basic Report Download
```javascript
const agent = new UnifiedVinSolutionsAgent({
  target: {
    url: 'https://provision.vauto.com',
    taskType: 'report',
    parameters: {
      reportPosition: 1
    }
  },
  authentication: {
    username: process.env.COX_USERNAME,
    password: process.env.COX_PASSWORD
  },
  capabilities: {
    useVision: false
  }
});

const result = await agent.executeTask();
console.log('Report downloaded:', result.files[0]);
```

### Lead Activity with Vision
```javascript
const agent = new UnifiedVinSolutionsAgent({
  target: {
    url: 'https://vinsolutions.com/leads',
    taskType: 'lead-activity',
    parameters: {
      leadPhone: '555-123-4567'
    }
  },
  authentication: {
    username: process.env.COX_USERNAME,
    password: process.env.COX_PASSWORD
  },
  capabilities: {
    useVision: true,
    screenshotDebug: true
  }
});

const result = await agent.executeTask();
console.log('Lead activity:', result.data);
```

### Custom Task with Session Persistence
```javascript
const sessionService = new SessionPersistenceService(logger, {
  enabled: true,
  sessionPath: './sessions',
  keepAlive: true,
  keepAliveInterval: 300000,
  sessionTimeout: 86400000,
  maxRetries: 3
});

await sessionService.initialize();

const agent = new UnifiedVinSolutionsAgent({
  target: {
    url: 'https://dealer.com/admin',
    taskType: 'custom',
    parameters: {
      customSelectors: [
        'button:has-text("Export")',
        '.confirm-modal .btn-primary'
      ]
    }
  },
  authentication: {
    username: process.env.COX_USERNAME,
    password: process.env.COX_PASSWORD
  },
  capabilities: {
    useVision: true
  }
}, logger);

// Execute with session management
const result = await agent.executeTask();
if (result.success) {
  await sessionService.saveSession(
    agent.context,
    agent.page,
    'dealer-admin-session'
  );
}
```

## Rate Limits

### OpenRouter API
- 100 requests per minute
- 10,000 requests per day
- Automatic retry with exponential backoff

### VinSolutions Platform
- Respect platform rate limits
- Automatic throttling between actions
- Session keep-alive maintains connection

## Best Practices

1. **Session Management**
   - Enable session persistence for repeated tasks
   - Use keep-alive for long-running operations
   - Validate sessions before reuse

2. **Error Handling**
   - Always wrap executeTask() in try-catch
   - Check TaskResult.success before using data
   - Enable debug logging for troubleshooting

3. **Performance**
   - Use specific selectors over vision when possible
   - Batch operations when feasible
   - Monitor click efficiency metrics

4. **Security**
   - Store credentials in environment variables
   - Use webhook URLs for 2FA automation
   - Rotate sessions periodically

## Support

For issues and feature requests, please refer to:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for extending functionality
- GitHub Issues for bug reports