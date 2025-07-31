interface VinSolutionsCredentials {
    username: string;
    password: string;
    url: string;
}
interface ExtractionResult {
    success: boolean;
    reportName: string;
    filePath?: string;
    error?: string;
    screenshots?: string[];
}
export declare class VinSolutionsExtractor {
    private browser;
    private page;
    private screenshots;
    private fileManager;
    initialize(): Promise<void>;
    takeScreenshot(name: string): Promise<string>;
    login(credentials: VinSolutionsCredentials): Promise<boolean>;
    navigateToReports(): Promise<boolean>;
    extractLeadSourceROI(): Promise<ExtractionResult>;
    close(): Promise<void>;
    extractReport(credentials: VinSolutionsCredentials): Promise<ExtractionResult>;
}
export {};
//# sourceMappingURL=VinSolutionsExtractor.d.ts.map