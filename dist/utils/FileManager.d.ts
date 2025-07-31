import fs from 'fs-extra';
export declare class FileManager {
    private logger;
    constructor();
    ensureDirectoryExists(dirPath: string, maxAgeDays?: number): Promise<void>;
    ensureDirectory(dirPath: string, maxAgeDays?: number): Promise<void>;
    saveFile(filePath: string, content: string | Buffer): Promise<void>;
    moveFile(sourcePath: string, destinationPath: string): Promise<void>;
    copyFile(sourcePath: string, destinationPath: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    /**
     * Remove files older than maxAgeDays in the given directory.
     */
    cleanOldFiles(dirPath: string, maxAgeDays: number): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    getFileStats(filePath: string): Promise<fs.Stats | null>;
    readFile(filePath: string): Promise<string>;
    listFiles(dirPath: string, extension?: string): Promise<string[]>;
    generateTimestampedFilename(baseName: string, extension: string): string;
    sanitizeFilename(filename: string): string;
}
//# sourceMappingURL=FileManager.d.ts.map