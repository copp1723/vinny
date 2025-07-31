import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Logger } from './Logger';

export class FileManager {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FileManager');
  }

  // Primary method name for consistency with UnifiedVinSolutionsAgent
  async ensureDirectoryExists(dirPath: string, maxAgeDays: number = 30): Promise<void> {
    return this.ensureDirectory(dirPath, maxAgeDays);
  }

  async ensureDirectory(dirPath: string, maxAgeDays: number = 30): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
      await this.cleanOldFiles(dirPath, maxAgeDays);
      this.logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to ensure directory: ${dirPath}`, { error: err.message });
      throw error;
    }
  }

  async saveFile(filePath: string, content: string | Buffer): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      const tempPath = path.join(path.dirname(filePath), `${path.basename(filePath)}.${Date.now()}.tmp`);
      await fs.writeFile(tempPath, content);
      await fs.move(tempPath, filePath, { overwrite: true });
      this.logger.info(`File saved: ${filePath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to save file: ${filePath}`, { error: err.message });
      throw error;
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.move(sourcePath, destinationPath);
      this.logger.info(`File moved: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to move file: ${sourcePath} -> ${destinationPath}`, { error: err.message });
      throw error;
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.copy(sourcePath, destinationPath);
      this.logger.info(`File copied: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to copy file: ${sourcePath} -> ${destinationPath}`, { error: err.message });
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.remove(filePath);
      this.logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to delete file: ${filePath}`, { error: err.message });
      throw error;
    }
  }

  /**
   * Remove files older than maxAgeDays in the given directory.
   */
  async cleanOldFiles(dirPath: string, maxAgeDays: number): Promise<void> {
    try {
      const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stats = await fs.stat(fullPath);
        if (stats.mtime.getTime() < cutoff) {
          await fs.remove(fullPath);
          this.logger.info(`Cleaned old file: ${fullPath}`);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to clean old files in: ${dirPath}`, { error: err.message });
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to check file existence: ${filePath}`, { error: err.message });
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to get file stats: ${filePath}`, { error: err.message });
      return null;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to read file: ${filePath}`, { error: err.message });
      throw error;
    }
  }

  async listFiles(dirPath: string, extension?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      if (extension) {
        return files.filter(file => path.extname(file) === extension);
      }
      return files;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to list files in directory: ${dirPath}`, { error: err.message });
      throw error;
    }
  }

  generateTimestampedFilename(baseName: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${timestamp}_${baseName}.${extension}`;
  }

  sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }
}
