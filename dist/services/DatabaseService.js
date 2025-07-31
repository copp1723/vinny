"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseService {
    db;
    dbPath;
    constructor() {
        // Create data directory if it doesn't exist
        const dataDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir);
        }
        this.dbPath = path_1.default.join(dataDir, 'report-extractor.db');
        this.db = new sqlite3_1.default.Database(this.dbPath);
        this.initializeTables();
    }
    initializeTables() {
        this.db.serialize(() => {
            // Jobs table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          reportName TEXT,
          reportIndex INTEGER,
          email TEXT NOT NULL,
          schedule TEXT NOT NULL,
          format TEXT DEFAULT 'XLSX',
          timeout INTEGER DEFAULT 30000,
          retries INTEGER DEFAULT 3,
          status TEXT DEFAULT 'scheduled',
          createdAt TEXT NOT NULL,
          nextRun TEXT NOT NULL,
          lastRun TEXT
        )
      `);
            // Execution history table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          jobId TEXT NOT NULL,
          reportName TEXT NOT NULL,
          email TEXT NOT NULL,
          status TEXT NOT NULL,
          downloadUrl TEXT,
          error TEXT,
          executedAt TEXT NOT NULL,
          FOREIGN KEY (jobId) REFERENCES jobs(id)
        )
      `);
        });
    }
    // Job operations
    createJob(job) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
        INSERT INTO jobs (id, reportName, reportIndex, email, schedule, format, timeout, retries, status, createdAt, nextRun)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(job.id, job.reportName || null, job.reportIndex || null, job.email, JSON.stringify(job.schedule), job.format, job.timeout, job.retries, job.status, job.createdAt, job.nextRun, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
            stmt.finalize();
        });
    }
    getJobs() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM jobs ORDER BY nextRun ASC', (err, rows) => {
                if (err)
                    reject(err);
                else {
                    const jobs = rows.map(row => ({
                        ...row,
                        schedule: JSON.parse(row.schedule)
                    }));
                    resolve(jobs);
                }
            });
        });
    }
    getJob(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, row) => {
                if (err)
                    reject(err);
                else if (!row)
                    resolve(null);
                else {
                    const job = {
                        ...row,
                        schedule: JSON.parse(row.schedule)
                    };
                    resolve(job);
                }
            });
        });
    }
    updateJob(id, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            if (updates.status !== undefined) {
                fields.push('status = ?');
                values.push(updates.status);
            }
            if (updates.lastRun !== undefined) {
                fields.push('lastRun = ?');
                values.push(updates.lastRun);
            }
            if (updates.nextRun !== undefined) {
                fields.push('nextRun = ?');
                values.push(updates.nextRun);
            }
            values.push(id);
            const query = `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`;
            this.db.run(query, values, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    deleteJob(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM jobs WHERE id = ?', [id], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    // History operations
    createHistoryEntry(entry) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
        INSERT INTO history (id, jobId, reportName, email, status, downloadUrl, error, executedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(entry.id, entry.jobId, entry.reportName, entry.email, entry.status, entry.downloadUrl || null, entry.error || null, entry.executedAt, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
            stmt.finalize();
        });
    }
    getHistory() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM history ORDER BY executedAt DESC LIMIT 100', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    // Get jobs that need to run
    getDueJobs() {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            this.db.all('SELECT * FROM jobs WHERE nextRun <= ? AND status = ?', [now, 'scheduled'], (err, rows) => {
                if (err)
                    reject(err);
                else {
                    const jobs = rows.map(row => ({
                        ...row,
                        schedule: JSON.parse(row.schedule)
                    }));
                    resolve(jobs);
                }
            });
        });
    }
    close() {
        this.db.close();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map