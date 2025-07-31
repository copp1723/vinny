// Core Types for Vinny Agent System

export interface PlatformCredentials {
  username: string;
  password: string;
  url: string;
  additionalFields?: Record<string, string>;
}

export interface ReportRequest {
  reportName: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  outputFormat: 'csv' | 'pdf' | 'xlsx' | 'json';
  outputPath: string;
}

export interface ExtractionResult {
  success: boolean;
  reportName: string;
  filePath?: string;
  data?: any;
  metadata: {
    extractedAt: string;
    platform: string;
    fileSize?: number;
    recordCount?: number;
    fileType?: string;
  };
  error?: string;
  attempt: number;
  executionTime: number;
}

export interface AgentConfig {
  headless: boolean;
  timeout: number;
  maxRetries: number;
  screenshotOnError: boolean;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  outputDir?: string;
  screenshotDir?: string;
}

export interface PlatformAdapter {
  platformName: string;
  login(credentials: PlatformCredentials): Promise<boolean>;
  navigateToReports(): Promise<boolean>;
  extractReport(request: ReportRequest): Promise<ExtractionResult>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
}

export interface PerceptionResult {
  markdown: string;
  elements: PerceptionElement[];
  actions: PerceptionAction[];
}

export interface PerceptionElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'select' | 'text';
  description: string;
  selector?: string;
  coordinates?: {
    x: number;
    y: number;
  };
  confidence: number;
}

export interface PerceptionAction {
  id: string;
  description: string;
  type: 'click' | 'input' | 'select' | 'navigate';
  target: string;
  confidence: number;
}

export interface VisionResult {
  success: boolean;
  element?: {
    xpath: string;
    coordinates: {
      x: number;
      y: number;
    };
    confidence: number;
  };
  error?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  cronExpression: string;
  reportRequests: ReportRequest[];
  notifications: {
    email?: string;
    webhook?: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    browser: boolean;
    platform: boolean;
    storage: boolean;
    network: boolean;
  };
  lastSuccessfulExtraction?: string;
  errors?: string[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  platform?: string;
  reportName?: string;
}

// Enums
export enum PlatformType {
  VINSOLUTIONS = 'vinsolutions',
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  GENERIC = 'generic'
}

export enum ReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export enum AgentCapability {
  PERCEPTION = 'perception',
  VISION = 'vision',
  DOWNLOAD = 'download',
  SCREENSHOT = 'screenshot',
  FORM_FILLING = 'form_filling',
  NAVIGATION = 'navigation'
}

