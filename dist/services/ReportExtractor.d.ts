import { PlatformCredentials, ReportRequest, ExtractionResult, AgentConfig, HealthStatus } from '../types';
export declare class ReportExtractor {
    private browser;
    private agent;
    private logger;
    private notificationService;
    private config;
    private isRunning;
    private fileManager;
    constructor(config: AgentConfig);
    initialize(): Promise<void>;
    extractReport(credentials: PlatformCredentials, request: ReportRequest & {
        reportIndex?: number;
    }, maxRetries?: number): Promise<ExtractionResult>;
    extractMultipleReports(credentials: PlatformCredentials, requests: ReportRequest[]): Promise<ExtractionResult[]>;
    getHealthStatus(): Promise<HealthStatus>;
    private checkStorageHealth;
    private checkNetworkHealth;
    private sleep;
    shutdown(): Promise<void>;
    get status(): {
        isRunning: boolean;
        isInitialized: boolean;
    };
}
//# sourceMappingURL=ReportExtractor.d.ts.map