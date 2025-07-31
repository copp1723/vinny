export interface Job {
    id: string;
    reportName?: string;
    reportIndex?: number;
    email: string;
    schedule: any;
    format: string;
    timeout: number;
    retries: number;
    status: string;
    createdAt: string;
    nextRun: string;
    lastRun?: string;
}
export interface ExecutionHistory {
    id: string;
    jobId: string;
    reportName: string;
    email: string;
    status: 'success' | 'failed';
    downloadUrl?: string;
    error?: string;
    executedAt: string;
}
export declare class DatabaseService {
    private db;
    private dbPath;
    constructor();
    private initializeTables;
    createJob(job: Job): Promise<void>;
    getJobs(): Promise<Job[]>;
    getJob(id: string): Promise<Job | null>;
    updateJob(id: string, updates: Partial<Job>): Promise<void>;
    deleteJob(id: string): Promise<void>;
    createHistoryEntry(entry: ExecutionHistory): Promise<void>;
    getHistory(): Promise<ExecutionHistory[]>;
    getDueJobs(): Promise<Job[]>;
    close(): void;
}
//# sourceMappingURL=DatabaseService.d.ts.map