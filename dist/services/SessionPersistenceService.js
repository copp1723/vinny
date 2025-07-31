"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionPersistenceService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const Logger_1 = require("../utils/Logger");
/**
 * Session Persistence Service
 *
 * Saves and restores browser sessions to avoid repeated authentication.
 * Includes cookies, localStorage, sessionStorage, and keep-alive functionality.
 */
class SessionPersistenceService {
    logger;
    config;
    keepAliveInterval;
    currentPage;
    constructor(config) {
        this.logger = new Logger_1.Logger('SessionPersistence');
        // Default configuration with environment variable overrides
        this.config = {
            enabled: process.env.USE_SESSION_PERSISTENCE === 'true' || config?.enabled || true,
            sessionPath: process.env.SESSION_PATH || config?.sessionPath || './sessions',
            keepAlive: process.env.SESSION_KEEP_ALIVE === 'true' || config?.keepAlive || true,
            keepAliveInterval: parseInt(process.env.SESSION_KEEP_ALIVE_INTERVAL || '') || config?.keepAliveInterval || 300000, // 5 minutes
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '') || config?.sessionTimeout || 86400000, // 24 hours
            maxRetries: parseInt(process.env.SESSION_MAX_RETRIES || '') || config?.maxRetries || 3
        };
    }
    /**
     * Initialize session persistence
     */
    async initialize() {
        if (!this.config.enabled) {
            this.logger.info('Session persistence is disabled');
            return;
        }
        // Ensure session directory exists with secure permissions
        await fs.ensureDir(this.config.sessionPath, { mode: 0o700 });
        this.logger.info('Session persistence initialized', { path: this.config.sessionPath });
        // Clean up old sessions on startup
        await this.cleanupOldSessions();
    }
    /**
     * Save browser session
     */
    async saveSession(context, page, identifier, url) {
        if (!this.config.enabled)
            return false;
        try {
            this.logger.stepStart(`Saving session for ${identifier}`);
            // Get current URL if not provided
            const currentUrl = url || page.url();
            // Extract cookies
            const cookies = await context.cookies();
            // Extract localStorage
            const localStorage = await page.evaluate(() => {
                const storage = {};
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (key) {
                        storage[key] = window.localStorage.getItem(key) || '';
                    }
                }
                return storage;
            });
            // Extract sessionStorage
            const sessionStorage = await page.evaluate(() => {
                const storage = {};
                for (let i = 0; i < window.sessionStorage.length; i++) {
                    const key = window.sessionStorage.key(i);
                    if (key) {
                        storage[key] = window.sessionStorage.getItem(key) || '';
                    }
                }
                return storage;
            });
            // Get user agent
            const userAgent = await page.evaluate(() => navigator.userAgent);
            // Create session data
            const sessionData = {
                cookies,
                localStorage,
                sessionStorage,
                url: currentUrl,
                timestamp: Date.now(),
                version: 2,
                userAgent
            };
            // Save to file with secure permissions
            const sessionFile = this.getSessionFilePath(identifier);
            await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2), { mode: 0o600 });
            this.logger.stepSuccess(`Session saved to ${sessionFile}`);
            this.logger.info('Session details', {
                cookies: cookies.length,
                localStorageKeys: Object.keys(localStorage).length,
                sessionStorageKeys: Object.keys(sessionStorage).length
            });
            return true;
        }
        catch (error) {
            this.logger.stepFailed('Save session', error);
            return false;
        }
    }
    /**
     * Restore browser session
     */
    async restoreSession(context, identifier) {
        if (!this.config.enabled) {
            return { restored: false };
        }
        const sessionFile = this.getSessionFilePath(identifier);
        try {
            // Check if session file exists
            if (!await fs.pathExists(sessionFile)) {
                this.logger.info('No saved session found');
                return { restored: false };
            }
            this.logger.stepStart(`Restoring session from ${sessionFile}`);
            // Load session data
            const sessionData = await fs.readJson(sessionFile);
            // Check if session is expired
            if (this.isSessionExpired(sessionData)) {
                this.logger.info('Session expired, removing file');
                await fs.remove(sessionFile);
                return { restored: false };
            }
            // Restore cookies
            if (sessionData.cookies && sessionData.cookies.length > 0) {
                await context.addCookies(sessionData.cookies);
                this.logger.info(`Restored ${sessionData.cookies.length} cookies`);
            }
            // Create new page and navigate
            const page = await context.newPage();
            // Set user agent if available
            if (sessionData.userAgent) {
                await page.setExtraHTTPHeaders({
                    'User-Agent': sessionData.userAgent
                });
            }
            // Navigate to saved URL
            await page.goto(sessionData.url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            // Restore localStorage
            if (Object.keys(sessionData.localStorage).length > 0) {
                await page.evaluate((storage) => {
                    for (const [key, value] of Object.entries(storage)) {
                        try {
                            window.localStorage.setItem(key, value);
                        }
                        catch (e) {
                            console.warn('Failed to restore localStorage item:', key);
                        }
                    }
                }, sessionData.localStorage);
                this.logger.info(`Restored ${Object.keys(sessionData.localStorage).length} localStorage items`);
            }
            // Restore sessionStorage
            if (Object.keys(sessionData.sessionStorage).length > 0) {
                await page.evaluate((storage) => {
                    for (const [key, value] of Object.entries(storage)) {
                        try {
                            window.sessionStorage.setItem(key, value);
                        }
                        catch (e) {
                            console.warn('Failed to restore sessionStorage item:', key);
                        }
                    }
                }, sessionData.sessionStorage);
                this.logger.info(`Restored ${Object.keys(sessionData.sessionStorage).length} sessionStorage items`);
            }
            // Wait for page to stabilize
            await page.waitForTimeout(2000);
            // Validate the restored session
            const validation = await this.validateSession(page);
            if (validation.isValid) {
                this.logger.stepSuccess('Session restored successfully');
                this.currentPage = page;
                return { restored: true, page };
            }
            else {
                this.logger.warn('Restored session is invalid', validation);
                await page.close();
                // Remove invalid session file
                await fs.remove(sessionFile);
                return { restored: false };
            }
        }
        catch (error) {
            this.logger.stepFailed('Restore session', error);
            // Remove corrupted session file
            try {
                await fs.remove(sessionFile);
            }
            catch { }
            return { restored: false };
        }
    }
    /**
     * Validate current session
     */
    async validateSession(page) {
        try {
            const currentUrl = page.url();
            // Check if we're on a login page
            const loginIndicators = [
                'signin.coxautoinc.com',
                '/login',
                '/auth/',
                '/signin',
                'authenticate'
            ];
            for (const indicator of loginIndicators) {
                if (currentUrl.includes(indicator)) {
                    return {
                        isValid: false,
                        requiresReauth: true,
                        error: 'Redirected to login page'
                    };
                }
            }
            // Check for authenticated content
            const authSelectors = [
                // Navigation elements
                'nav', '.navigation', '#navigation',
                // Dashboard elements
                '#dashboard', '.dashboard', '[data-testid="dashboard"]',
                // Common authenticated elements
                '.user-menu', '.logout-button', '#user-profile',
                // VinSolutions specific
                '.inventory-grid', '#insights-menu', '.report-list',
                // Generic authenticated indicators
                'a[href*="logout"]', 'button:has-text("Sign Out")'
            ];
            // Try to find any authenticated element
            for (const selector of authSelectors) {
                try {
                    const element = page.locator(selector).first();
                    if (await element.isVisible({ timeout: 2000 })) {
                        return { isValid: true };
                    }
                }
                catch { }
            }
            // If no authenticated elements found, check if page has loaded content
            const hasContent = await page.evaluate(() => {
                return document.body && document.body.textContent && document.body.textContent.trim().length > 100;
            });
            if (hasContent) {
                // Page has content but no clear auth indicators
                return {
                    isValid: true,
                    requiresReauth: false,
                    error: 'No auth indicators found but page has content'
                };
            }
            return {
                isValid: false,
                requiresReauth: true,
                error: 'No authenticated content found'
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }
    /**
     * Start keep-alive mechanism
     */
    async startKeepAlive(page) {
        if (!this.config.enabled || !this.config.keepAlive) {
            return;
        }
        this.currentPage = page;
        // Clear any existing interval
        this.stopKeepAlive();
        this.logger.info(`Starting keep-alive with ${this.config.keepAliveInterval}ms interval`);
        this.keepAliveInterval = setInterval(async () => {
            if (this.currentPage && !this.currentPage.isClosed()) {
                try {
                    await this.performKeepAlive(this.currentPage);
                }
                catch (error) {
                    this.logger.warn('Keep-alive failed', { error });
                }
            }
        }, this.config.keepAliveInterval);
    }
    /**
     * Stop keep-alive mechanism
     */
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
            this.logger.info('Keep-alive stopped');
        }
    }
    /**
     * Perform keep-alive action
     */
    async performKeepAlive(page) {
        try {
            // Subtle mouse movement
            const x = 100 + Math.random() * 10;
            const y = 100 + Math.random() * 10;
            await page.mouse.move(x, y);
            // Small scroll
            await page.evaluate(() => {
                const scrollElement = document.documentElement || document.body;
                const currentScroll = scrollElement.scrollTop;
                scrollElement.scrollTop = currentScroll + 1;
                setTimeout(() => {
                    scrollElement.scrollTop = currentScroll;
                }, 100);
            });
            this.logger.debug('Keep-alive action performed');
        }
        catch (error) {
            this.logger.warn('Keep-alive action failed', { error });
        }
    }
    /**
     * Clean up old expired sessions
     */
    async cleanupOldSessions() {
        try {
            const files = await fs.readdir(this.config.sessionPath);
            let removedCount = 0;
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                const filePath = path.join(this.config.sessionPath, file);
                try {
                    const sessionData = await fs.readJson(filePath);
                    if (this.isSessionExpired(sessionData)) {
                        await fs.remove(filePath);
                        removedCount++;
                    }
                }
                catch {
                    // Remove corrupted files
                    await fs.remove(filePath);
                    removedCount++;
                }
            }
            if (removedCount > 0) {
                this.logger.info(`Cleaned up ${removedCount} expired sessions`);
            }
        }
        catch (error) {
            this.logger.warn('Session cleanup failed', { error });
        }
    }
    /**
     * Check if session is expired
     */
    isSessionExpired(session) {
        const age = Date.now() - session.timestamp;
        return age > this.config.sessionTimeout;
    }
    /**
     * Get session file path
     */
    getSessionFilePath(identifier) {
        // Sanitize identifier for safe filename
        const safeIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_');
        return path.join(this.config.sessionPath, `session_${safeIdentifier}.json`);
    }
    /**
     * Get session age in human-readable format
     */
    getSessionAge(identifier) {
        try {
            const sessionFile = this.getSessionFilePath(identifier);
            const sessionData = fs.readJsonSync(sessionFile);
            const ageMs = Date.now() - sessionData.timestamp;
            const hours = Math.floor(ageMs / (1000 * 60 * 60));
            const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        }
        catch {
            return 'Unknown';
        }
    }
}
exports.SessionPersistenceService = SessionPersistenceService;
//# sourceMappingURL=SessionPersistenceService.js.map