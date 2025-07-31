# Developer Guide - Unified VinSolutions Agent

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Extending the Agent](#extending-the-agent)
4. [Adding New Task Types](#adding-new-task-types)
5. [Custom Strategies](#custom-strategies)
6. [API Reference](#api-reference)
7. [Testing & Development](#testing--development)
8. [Deployment](#deployment)

## Architecture Overview

The Unified VinSolutions Agent uses a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│             CLI Interface               │
│        (unified-agent-cli.ts)           │
├─────────────────────────────────────────┤
│          Core Agent Layer               │
│     (UnifiedVinSolutionsAgent.ts)       │
├─────────────────────────────────────────┤
│            Service Layer                │
│  ┌─────────────────┬─────────────────┐  │
│  │ SessionPersist  │  OpenRouter     │  │
│  │    Service      │   Service       │  │
│  ├─────────────────┼─────────────────┤  │
│  │ MailgunService  │  FileManager    │  │
│  └─────────────────┴─────────────────┘  │
├─────────────────────────────────────────┤
│            Utility Layer                │
│           Logger, Types                 │
└─────────────────────────────────────────┘
```

### Design Principles

1. **Configuration-Driven**: All behavior controlled by declarative configuration
2. **Strategy Pattern**: Multiple approaches for each task type with fallbacks
3. **Fail-Fast**: Quick error detection with detailed feedback
4. **Session Reuse**: Persistent authentication to minimize overhead
5. **AI-Enhanced**: Vision capabilities for robust element detection

## Core Components

### UnifiedVinSolutionsAgent

**Location**: `src/agents/UnifiedVinSolutionsAgent.ts`

The main orchestrator that coordinates all other services.

```typescript
export class UnifiedVinSolutionsAgent {
  constructor(private config: UnifiedTaskConfig, logger?: Logger)
  async executeTask(): Promise<TaskResult>
}
```

**Key Methods:**
- `authenticateAndNavigate()` - Smart Cox SSO handling
- `executeTaskByType()` - Task type dispatcher
- `performCoxAuthentication()` - Universal Cox login
- `handleOutput()` - Email/webhook delivery

### SessionPersistenceService

**Location**: `src/services/SessionPersistenceService.ts`

Manages browser session persistence for faster subsequent runs.

```typescript
export class SessionPersistenceService {
  async saveSession(context: BrowserContext, page: Page, identifier: string): Promise<boolean>
  async restoreSession(context: BrowserContext, identifier: string): Promise<{restored: boolean, page?: Page}>
  async validateSession(page: Page): Promise<SessionValidationResult>
}
```

**Features:**
- Cookie/localStorage/sessionStorage persistence
- Automatic session validation
- Keep-alive mechanisms
- Automatic cleanup of expired sessions

### OpenRouterService

**Location**: `src/services/OpenRouterService.ts`

Provides AI vision capabilities for intelligent page analysis.

```typescript
export class OpenRouterService {
  async analyzeLoginPage(base64Screenshot: string): Promise<LoginPageElements>
  async analyzePageForTask(base64Screenshot: string, taskDescription: string): Promise<PageActionPlan>
  async extractTwoFactorCode(emailContent: string): Promise<TwoFactorCodeAnalysis>
}
```

**Models Supported:**
- `anthropic/claude-3.5-sonnet` (default, best for vision)
- `anthropic/claude-3-haiku` (fastest)
- Configurable via constructor

### FileManager

**Location**: `src/utils/FileManager.ts`

Handles all file operations with automatic cleanup and error handling.

```typescript
export class FileManager {
  async ensureDirectory(dirPath: string, maxAgeDays?: number): Promise<void>
  async saveFile(filePath: string, content: string | Buffer): Promise<void>
  async cleanOldFiles(dirPath: string, maxAgeDays: number): Promise<void>
}
```

## Extending the Agent

### Custom Task Types

To add a new task type, follow these steps:

1. **Update the TaskType Union**

```typescript
// In src/agents/UnifiedVinSolutionsAgent.ts
export interface UnifiedTaskConfig {
  target: {
    taskType: 'report' | 'lead-activity' | 'dnc-check' | 'custom' | 'your-new-type';
  }
}
```

2. **Add Task Execution Method**

```typescript
private async executeYourNewTask(): Promise<TaskResult> {
  this.logger.stepStart('Executing your new task');
  
  try {
    // Your task logic here
    const parameters = this.config.target.parameters;
    
    // Example: Click specific elements
    await this.page.locator('your-selector').click();
    this.clickCount++;
    
    // Example: Extract data
    const data = await this.page.evaluate(() => {
      // Extract whatever data you need
      return { extractedValue: 'example' };
    });
    
    return {
      success: true,
      taskType: 'your-new-type',
      data,
      clickCount: this.clickCount,
      duration: Date.now() - this.startTime
    };
    
  } catch (error) {
    throw new Error(`Your new task failed: ${error}`);
  }
}
```

3. **Add to Task Dispatcher**

```typescript
private async executeTaskByType(): Promise<TaskResult> {
  switch (this.config.target.taskType) {
    case 'report':
      return await this.executeReportTask();
    case 'your-new-type':
      return await this.executeYourNewTask();
    // ... other cases
  }
}
```

4. **Add CLI Command** (Optional)

```typescript
// In src/cli/unified-agent-cli.ts
program
  .command('your-command')
  .description('Execute your new task type')
  .requiredOption('-u, --url <url>', 'Target URL')
  .option('--your-param <value>', 'Your custom parameter')
  .action(async (options) => {
    const config: UnifiedTaskConfig = {
      target: {
        url: options.url,
        taskType: 'your-new-type',
        parameters: {
          yourParam: options.yourParam
        }
      },
      // ... standard config
    };
    
    await executeTask(config);
  });
```

### Custom Strategies

The agent supports multiple strategies for element detection and interaction:

```typescript
interface StrategyConfig {
  strategies?: ('direct' | 'vision' | 'position')[];
}
```

**Direct Strategy**: Uses CSS selectors directly
```typescript
await this.page.locator('button[type="submit"]').click();
```

**Vision Strategy**: Uses AI to analyze screenshots
```typescript
const screenshot = await this.page.screenshot();
const action = await this.visionService.analyzePageForTask(
  screenshot.toString('base64'),
  'download report'
);
await this.page.locator(action.selector).click();
```

**Position Strategy**: Uses element position/order
```typescript
const reportSelector = `a[href*="report"]:nth-of-type(${position})`;
await this.page.locator(reportSelector).click();
```

### Adding Custom Services

Create new services following the established pattern:

```typescript
// src/services/YourCustomService.ts
import { Logger } from '../utils/Logger';

export class YourCustomService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('YourCustomService');
  }

  async yourMethod(param: string): Promise<YourResult> {
    try {
      this.logger.info('Starting your method', { param });
      
      // Your logic here
      const result = await this.doSomething(param);
      
      this.logger.info('Method completed successfully');
      return result;
      
    } catch (error) {
      this.logger.error('Method failed', { error: error.message });
      throw error;
    }
  }
}
```

Then integrate it into the main agent:

```typescript
// In UnifiedVinSolutionsAgent constructor
if (someCondition) {
  this.yourCustomService = new YourCustomService();
}
```

## API Reference

### UnifiedTaskConfig Interface

```typescript
export interface UnifiedTaskConfig {
  target: {
    url: string;                    // Target URL
    taskType: TaskType;             // Task type to execute
    parameters?: {
      reportPosition?: number;      // For reports
      leadPhone?: string;          // For lead activity
      dateRange?: string;          // Date filtering
      customSelectors?: string[];  // For custom tasks
      [key: string]: any;          // Extensible parameters
    };
  };
  
  authentication: {
    username: string;
    password: string;
    otpWebhookUrl?: string;        // 2FA webhook
    maxAuthRetries?: number;       // Auth retry limit
  };
  
  capabilities: {
    useVision?: boolean;           // Enable AI vision
    maxClicks?: number;           // Click limit
    screenshotDebug?: boolean;    // Debug screenshots
    strategies?: StrategyType[];   // Strategy priority
  };
  
  output?: {
    downloadPath?: string;         // Download directory
    emailTo?: string[];           // Email recipients
    webhookUrl?: string;          // Notification webhook
  };
}
```

### TaskResult Interface

```typescript
export interface TaskResult {
  success: boolean;               // Task success status
  taskType: string;              // Type of task executed
  data?: any;                    // Task-specific data
  filePath?: string;             // Downloaded file path
  clickCount: number;            // Clicks used
  duration: number;              // Execution time (ms)
  screenshots?: string[];        // Debug screenshots
  error?: string;               // Error message if failed
}
```

### Service Interfaces

**SessionPersistenceConfig**:
```typescript
export interface SessionPersistenceConfig {
  enabled: boolean;
  sessionPath: string;
  keepAlive: boolean;
  keepAliveInterval: number;
  sessionTimeout: number;
  maxRetries: number;
}
```

**OpenRouterConfig**:
```typescript
export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}
```

## Testing & Development

### Local Development Setup

1. **Environment Setup**
```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
COX_USERNAME=your-test-username
COX_PASSWORD=your-test-password
OPENROUTER_API_KEY=your-api-key
```

2. **Development Mode**
```bash
# Run with live reload
npm run dev

# Run specific tests
npm run test-openrouter
npm run test-email-connection
```

### Testing New Features

```typescript
// Create test file: test-your-feature.ts
import { UnifiedVinSolutionsAgent, UnifiedTaskConfig } from './src/agents/UnifiedVinSolutionsAgent';

async function testYourFeature() {
  const config: UnifiedTaskConfig = {
    target: {
      url: 'https://test-url.com',
      taskType: 'your-new-type',
      parameters: { testParam: 'value' }
    },
    authentication: {
      username: process.env.COX_USERNAME!,
      password: process.env.COX_PASSWORD!
    },
    capabilities: {
      screenshotDebug: true  // Always enable for testing
    }
  };

  const agent = new UnifiedVinSolutionsAgent(config);
  const result = await agent.executeTask();
  
  console.log('Test result:', result);
}

testYourFeature().catch(console.error);
```

### Debugging Tips

1. **Always Enable Screenshots**
```typescript
capabilities: { screenshotDebug: true }
```

2. **Use Console Logging**
```typescript
this.logger.debug('Debug info', { data: someData });
```

3. **Test Individual Components**
```bash
# Test session persistence
npm run test-sessions

# Test OpenRouter connection
npm run test-openrouter

# Test authentication only
npm run unified test --url "your-url"
```

### Error Handling Patterns

```typescript
// Standardized error handling
try {
  this.logger.stepStart('Operation description');
  
  // Operation logic here
  const result = await this.doSomething();
  
  this.logger.stepSuccess('Operation completed');
  return result;
  
} catch (error) {
  this.logger.stepFailed('Operation failed', error as Error);
  
  // Take debug screenshot if page available
  if (this.page) {
    await this.takeDebugScreenshot('error-operation');
  }
  
  throw new Error(`Operation failed: ${error.message}`);
}
```

## Deployment

### Production Configuration

```bash
# Production environment variables
NODE_ENV=production
LOG_LEVEL=info
USE_SESSION_PERSISTENCE=true
SESSION_TIMEOUT=86400000  # 24 hours

# Security
COX_USERNAME=service-account-username
COX_PASSWORD=secure-password

# Services
OPENROUTER_API_KEY=production-key
MAILGUN_API_KEY=production-mailgun-key
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-bullseye

# Install Playwright dependencies
RUN npx playwright install-deps chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Monitoring & Logging

**Production Logging**:
```typescript
// Configure Winston for production
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

**Health Checks**:
```typescript
// Add to your service
async function healthCheck(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      browser: await this.testBrowserConnection(),
      openrouter: await this.visionService?.testConnection() || true,
      sessions: await this.sessionService.validateSetup()
    }
  };
}
```

### Scaling Considerations

1. **Session Management**: Store sessions in Redis for multi-instance deployments
2. **File Storage**: Use cloud storage (S3, GCS) for downloads in containerized environments
3. **Queue Management**: Implement job queues for high-volume automation
4. **Rate Limiting**: Respect platform rate limits with proper throttling

### Security Best Practices

1. **Credential Management**
   - Use environment variables or secret management systems
   - Rotate credentials regularly
   - Use service accounts with minimal permissions

2. **Network Security**
   - Run in private networks when possible
   - Use VPNs for accessing internal business platforms
   - Implement IP whitelisting

3. **Data Protection**
   - Encrypt session files at rest
   - Secure download directories with proper permissions
   - Implement data retention policies

4. **Audit Logging**
   - Log all authentication attempts
   - Track task executions and outcomes
   - Monitor for unusual patterns

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow established naming conventions
- Include JSDoc comments for public methods
- Write self-documenting code with clear variable names

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation as needed
4. Ensure all tests pass
5. Submit PR with clear description

### Testing Requirements

- Unit tests for new services
- Integration tests for new task types
- Manual testing with actual VinSolutions environment
- Documentation updates for new features

---

This developer guide provides the foundation for extending and maintaining the Unified VinSolutions Agent. For specific implementation questions, refer to the existing code examples and test files.