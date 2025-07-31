import { Browser } from 'playwright';
import { EmailConfig } from '../services/EmailService';
export interface VinSolutionsCredentials {
    username: string;
    password: string;
    url: string;
}
export interface ExtractionResult {
    success: boolean;
    reportName: string;
    filePath?: string;
    error?: string;
    screenshots?: string[];
    executionTime: number;
    extractedAt: string;
    fileSize?: number;
}
export declare class EnhancedVinSolutionsAgent {
    private browser;
    private page;
    private emailService;
    private logger;
    private fileManager;
    private screenshots;
    constructor(emailConfig: EmailConfig);
    initialize(browser: Browser): Promise<void>;
    takeScreenshot(name: string): Promise<string>;
    loginWithEmailAuth(credentials: VinSolutionsCredentials): Promise<boolean>;
    navigateToReports(): Promise<boolean>;
    extractLeadSourceROI(): Promise<ExtractionResult>;
    runFullExtractionWorkflow(credentials: VinSolutionsCredentials): Promise<ExtractionResult>;
    close(): Promise<void>;
}
//# sourceMappingURL=EnhancedVinSolutionsAgent.d.ts.map