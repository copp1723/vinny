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
    async ensureDirectory(dirPath) {
        try {
            await fs_extra_1.default.ensureDir(dirPath);
            this.logger.debug(`Ensured directory exists: ${dirPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to ensure directory: ${dirPath}`, { error: error.message });
            throw error;
        }
    }
    async saveFile(filePath, content) {
        try {
            await this.ensureDirectory(path_1.default.dirname(filePath));
            await fs_extra_1.default.writeFile(filePath, content);
            this.logger.info(`File saved: ${filePath}`);
        }
        catch (error) {
            this.logger.error(`Failed to save file: ${filePath}`, { error: error.message });
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
            this.logger.error(`Failed to move file: ${sourcePath} -> ${destinationPath}`, { error: error.message });
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
            this.logger.error(`Failed to copy file: ${sourcePath} -> ${destinationPath}`, { error: error.message });
            throw error;
        }
    }
    async deleteFile(filePath) {
        try {
            await fs_extra_1.default.remove(filePath);
            this.logger.info(`File deleted: ${filePath}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${filePath}`, { error: error.message });
            throw error;
        }
    }
    async fileExists(filePath) {
        try {
            return await fs_extra_1.default.pathExists(filePath);
        }
        catch (error) {
            this.logger.error(`Failed to check file existence: ${filePath}`, { error: error.message });
            return false;
        }
    }
    async getFileStats(filePath) {
        try {
            return await fs_extra_1.default.stat(filePath);
        }
        catch (error) {
            this.logger.error(`Failed to get file stats: ${filePath}`, { error: error.message });
            return null;
        }
    }
    async readFile(filePath) {
        try {
            return await fs_extra_1.default.readFile(filePath, 'utf-8');
        }
        catch (error) {
            this.logger.error(`Failed to read file: ${filePath}`, { error: error.message });
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
            this.logger.error(`Failed to list files in directory: ${dirPath}`, { error: error.message });
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