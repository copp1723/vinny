import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

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

export class DatabaseService {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    this.dbPath = path.join(dataDir, 'report-extractor.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
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
  createJob(job: Job): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO jobs (id, reportName, reportIndex, email, schedule, format, timeout, retries, status, createdAt, nextRun)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        job.id,
        job.reportName || null,
        job.reportIndex || null,
        job.email,
        JSON.stringify(job.schedule),
        job.format,
        job.timeout,
        job.retries,
        job.status,
        job.createdAt,
        job.nextRun,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  getJobs(): Promise<Job[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM jobs ORDER BY nextRun ASC', (err, rows: any[]) => {
        if (err) reject(err);
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

  getJob(id: string): Promise<Job | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
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

  updateJob(id: string, updates: Partial<Job>): Promise<void> {
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
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteJob(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM jobs WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // History operations
  createHistoryEntry(entry: ExecutionHistory): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO history (id, jobId, reportName, email, status, downloadUrl, error, executedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        entry.id,
        entry.jobId,
        entry.reportName,
        entry.email,
        entry.status,
        entry.downloadUrl || null,
        entry.error || null,
        entry.executedAt,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  getHistory(): Promise<ExecutionHistory[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM history ORDER BY executedAt DESC LIMIT 100', (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get jobs that need to run
  getDueJobs(): Promise<Job[]> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.all(
        'SELECT * FROM jobs WHERE nextRun <= ? AND status = ?',
        [now, 'scheduled'],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const jobs = rows.map(row => ({
              ...row,
              schedule: JSON.parse(row.schedule)
            }));
            resolve(jobs);
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}