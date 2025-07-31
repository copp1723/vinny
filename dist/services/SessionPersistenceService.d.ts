import { BrowserContext, Page } from 'playwright';
/**
 * Session persistence configuration
 */
export interface SessionPersistenceConfig {
    enabled: boolean;
    sessionPath: string;
    keepAlive: boolean;
    keepAliveInterval: number;
    sessionTimeout: number;
    maxRetries: number;
}
/**
 * Stored session data structure
 */
export interface StoredSession {
    cookies: any[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    url: string;
    timestamp: number;
    version: number;
    userAgent?: string;
}
/**
 * Session validation result
 */
export interface SessionValidationResult {
    isValid: boolean;
    requiresReauth?: boolean;
    error?: string;
}
/**
 * Session Persistence Service
 *
 * Saves and restores browser sessions to avoid repeated authentication.
 * Includes cookies, localStorage, sessionStorage, and keep-alive functionality.
 */
export declare class SessionPersistenceService {
    private logger;
    private config;
    private keepAliveInterval?;
    private currentPage?;
    constructor(config?: Partial<SessionPersistenceConfig>);
    /**
     * Initialize session persistence
     */
    initialize(): Promise<void>;
    /**
     * Save browser session
     */
    saveSession(context: BrowserContext, page: Page, identifier: string, url?: string): Promise<boolean>;
    /**
     * Restore browser session
     */
    restoreSession(context: BrowserContext, identifier: string): Promise<{
        restored: boolean;
        page?: Page;
    }>;
    /**
     * Validate current session
     */
    validateSession(page: Page): Promise<SessionValidationResult>;
    /**
     * Start keep-alive mechanism
     */
    startKeepAlive(page: Page): Promise<void>;
    /**
     * Stop keep-alive mechanism
     */
    stopKeepAlive(): void;
    /**
     * Perform keep-alive action
     */
    private performKeepAlive;
    /**
     * Clean up old expired sessions
     */
    cleanupOldSessions(): Promise<void>;
    /**
     * Check if session is expired
     */
    private isSessionExpired;
    /**
     * Get session file path
     */
    private getSessionFilePath;
    /**
     * Get session age in human-readable format
     */
    getSessionAge(identifier: string): string;
}
//# sourceMappingURL=SessionPersistenceService.d.ts.map