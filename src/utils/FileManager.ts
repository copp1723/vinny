import fs from 'fs-extra';
import path from 'path';
import { Logger } from './Logger';

export class FileManager {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FileManager');
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
      this.logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to ensure directory: ${dirPath}`, { error: error.message });
      throw error;
    }
  }

  async saveFile(filePath: string, content: string | Buffer): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      this.logger.info(`File saved: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save file: ${filePath}`, { error: error.message });
      throw error;
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.move(sourcePath, destinationPath);
      this.logger.info(`File moved: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Failed to move file: ${sourcePath} -> ${destinationPath}`, { error: error.message });
      throw error;
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.copy(sourcePath, destinationPath);
      this.logger.info(`File copied: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Failed to copy file: ${sourcePath} -> ${destinationPath}`, { error: error.message });
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.remove(filePath);
      this.logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, { error: error.message });
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${filePath}`, { error: error.message });
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      this.logger.error(`Failed to get file stats: ${filePath}`, { error: error.message });
      return null;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, { error: error.message });
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
      this.logger.error(`Failed to list files in directory: ${dirPath}`, { error: error.message });
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

