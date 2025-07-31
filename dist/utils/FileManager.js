"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const Logger_1 = require("./Logger");
class FileManager {
    logger;
    constructor() {
        this.logger = new Logger_1.Logger('FileManager');
    }
    // Primary method name for consistency with UnifiedVinSolutionsAgent
    async ensureDirectoryExists(dirPath, maxAgeDays = 30) {
        return this.ensureDirectory(dirPath, maxAgeDays);
    }
    async ensureDirectory(dirPath, maxAgeDays = 30) {
        try {
            await fs_extra_1.default.ensureDir(dirPath);
            await this.cleanOldFiles(dirPath, maxAgeDays);
            this.logger.debug(`Ensured directory exists: ${dirPath}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to ensure directory: ${dirPath}`, { error: err.message });
            throw error;
        }
    }
    async saveFile(filePath, content) {
        try {
            await this.ensureDirectory(path_1.default.dirname(filePath));
            const tempPath = path_1.default.join(path_1.default.dirname(filePath), `${path_1.default.basename(filePath)}.${Date.now()}.tmp`);
            await fs_extra_1.default.writeFile(tempPath, content);
            await fs_extra_1.default.move(tempPath, filePath, { overwrite: true });
            this.logger.info(`File saved: ${filePath}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to save file: ${filePath}`, { error: err.message });
            throw error;
        }
    }
    async moveFile(sourcePath, destinationPath) {
        try {
            await this.ensureDirectory(path_1.default.dirname(destinationPath));
            await fs_extra_1.default.move(sourcePath, destinationPath);
            this.logger.info(`File moved: ${sourcePath} -> ${destinationPath}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to move file: ${sourcePath} -> ${destinationPath}`, { error: err.message });
            throw error;
        }
    }
    async copyFile(sourcePath, destinationPath) {
        try {
            await this.ensureDirectory(path_1.default.dirname(destinationPath));
            await fs_extra_1.default.copy(sourcePath, destinationPath);
            this.logger.info(`File copied: ${sourcePath} -> ${destinationPath}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to copy file: ${sourcePath} -> ${destinationPath}`, { error: err.message });
            throw error;
        }
    }
    async deleteFile(filePath) {
        try {
            await fs_extra_1.default.remove(filePath);
            this.logger.info(`File deleted: ${filePath}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to delete file: ${filePath}`, { error: err.message });
            throw error;
        }
    }
    /**
     * Remove files older than maxAgeDays in the given directory.
     */
    async cleanOldFiles(dirPath, maxAgeDays) {
        try {
            const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
            const files = await fs_extra_1.default.readdir(dirPath);
            for (const file of files) {
                const fullPath = path_1.default.join(dirPath, file);
                const stats = await fs_extra_1.default.stat(fullPath);
                if (stats.mtime.getTime() < cutoff) {
                    await fs_extra_1.default.remove(fullPath);
                    this.logger.info(`Cleaned old file: ${fullPath}`);
                }
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to clean old files in: ${dirPath}`, { error: err.message });
        }
    }
    async fileExists(filePath) {
        try {
            return await fs_extra_1.default.pathExists(filePath);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to check file existence: ${filePath}`, { error: err.message });
            return false;
        }
    }
    async getFileStats(filePath) {
        try {
            return await fs_extra_1.default.stat(filePath);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to get file stats: ${filePath}`, { error: err.message });
            return null;
        }
    }
    async readFile(filePath) {
        try {
            return await fs_extra_1.default.readFile(filePath, 'utf-8');
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to read file: ${filePath}`, { error: err.message });
            throw error;
        }
    }
    async listFiles(dirPath, extension) {
        try {
            const files = await fs_extra_1.default.readdir(dirPath);
            if (extension) {
                return files.filter(file => path_1.default.extname(file) === extension);
            }
            return files;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Failed to list files in directory: ${dirPath}`, { error: err.message });
            throw error;
        }
    }
    generateTimestampedFilename(baseName, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${timestamp}_${baseName}.${extension}`;
    }
    sanitizeFilename(filename) {
        // Remove or replace invalid characters
        return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    }
}
exports.FileManager = FileManager;
//# sourceMappingURL=FileManager.js.map