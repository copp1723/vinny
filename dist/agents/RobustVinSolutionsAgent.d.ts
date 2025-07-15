import { Browser, Page } from 'playwright';
export interface RobustExtractionResult {
    success: boolean;
    reportPath?: string;
    reportName: string;
    platformName: string;
    extractedAt: string;
    executionTime: number;
    error?: string;
    screenshots: string[];
    strategies: string[];
}
export declare class RobustVinSolutionsAgent {
    private logger;
    private browser;
    private page;
    private downloadDir;
    private screenshotDir;
    private screenshots;
    private usedStrategies;
    constructor(config: {
        downloadDir: string;
        screenshotDir: string;
    });
    initialize(browser: Browser, page: Page): Promise<void>;
    private setupAdvancedDownloadHandling;
    navigateToReportsWithStrategies(): Promise<boolean>;
    private accessFavoritesTab;
    private getReportFrameWithRetries;
    extractLeadSourceROIWithStrategies(): Promise<RobustExtractionResult>;
    private findAndClickReport;
    private downloadReportWithStrategies;
    private tryStrategy;
    private takeScreenshot;
}
//# sourceMappingURL=RobustVinSolutionsAgent.d.ts.map