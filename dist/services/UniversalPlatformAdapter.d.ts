import { Browser } from 'playwright';
import { PlatformAdapter, PlatformCredentials, ReportRequest, ExtractionResult, AgentConfig } from '../types';
export declare class UniversalPlatformAdapter implements PlatformAdapter {
    readonly platformName: string;
    private page;
    private browser;
    private logger;
    private fileManager;
    private config;
    private isAuthenticated;
    private platformConfig;
    constructor(platformName: string, config: AgentConfig, platformConfig?: PlatformConfig);
    private getDefaultPlatformConfig;
    initialize(browser: Browser): Promise<void>;
    private setupDownloadHandling;
    private setupPageOptimizations;
    login(credentials: PlatformCredentials): Promise<boolean>;
    private attemptTraditionalLogin;
    private verifyLoginSuccess;
    navigateToReports(): Promise<boolean>;
    private attemptTraditionalNavigation;
    private verifyReportsPage;
    extractReport(request: ReportRequest): Promise<ExtractionResult>;
    private findReport;
    private selectReport;
    private openReport;
    private downloadReport;
    private executeDownload;
    private takeErrorScreenshot;
    logout(): Promise<void>;
    isLoggedIn(): Promise<boolean>;
    close(): Promise<void>;
}
interface PlatformConfig {
    loginSelectors: {
        username: string[];
        password: string[];
        loginButton: string[];
    };
    navigationSelectors: {
        reports: string[];
        dashboard: string[];
    };
    downloadSelectors: {
        downloadButton: string[];
        exportButton: string[];
    };
    waitConditions: {
        loginSuccess: string[];
        reportsPage: string[];
        reportLoaded: string[];
    };
}
export {};
//# sourceMappingURL=UniversalPlatformAdapter.d.ts.map