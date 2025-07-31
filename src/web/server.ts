import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { DatabaseService, Job, ExecutionHistory } from '../services/DatabaseService';
import { ReportExtractor } from '../services/ReportExtractor';
import { FileManager } from '../utils/FileManager';
import { AgentConfig, PlatformCredentials, ReportRequest } from '../types';

// Load environment variables
dotenv.config({ path: '.env.dashboard' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
const db = new DatabaseService();
const fileManager = new FileManager();

// Serve downloaded files
app.use('/downloads', express.static(path.join(process.cwd(), 'downloads')));

// API endpoints
app.post('/api/extract-report', async (req, res) => {
  try {
    const { reportName, reportIndex, email, schedule, format = 'XLSX', timeout = 30000, retries = 3 } = req.body;
    
    const job: Job = {
      id: Date.now().toString(),
      reportName: reportName || `Report #${reportIndex}`,
      reportIndex,
      email,
      schedule,
      format,
      timeout,
      retries,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      nextRun: schedule.type === 'once' ? schedule.datetime : getNextRunTime(schedule)
    };
    
    await db.createJob(job);
    
    // If it's a one-time job scheduled for now or in the past, execute immediately
    if (schedule.type === 'once' && new Date(schedule.datetime) <= new Date()) {
      executeJob(job);
    }
    
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await db.getJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await db.getHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/jobs/:id/run', async (req, res) => {
  try {
    const job = await db.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    executeJob(job);
    return res.json({ success: true, message: 'Job execution started' });
  } catch (error) {
    console.error('Error running job:', error);
    return res.status(500).json({ error: 'Failed to run job' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await db.deleteJob(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Download endpoint
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(process.cwd(), 'downloads', filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

async function executeJob(job: Job) {
  console.log(`Executing job ${job.id} for ${job.reportName || `Position ${job.reportIndex}`}`);
  
  let extractor: ReportExtractor | null = null;
  
  try {
    // Update job status
    await db.updateJob(job.id, { status: 'running' });
    
    // Load credentials from environment
    const credentials: PlatformCredentials = {
      username: process.env.VINSOLUTIONS_USERNAME || '',
      password: process.env.VINSOLUTIONS_PASSWORD || '',
      url: 'https://reports.vinsolutions.com',
      additionalFields: {
        dealershipId: process.env.VINSOLUTIONS_DEALERSHIP_ID || ''
      }
    };

    if (!credentials.username || !credentials.password) {
      throw new Error('VinSolutions credentials not configured. Please set VINSOLUTIONS_USERNAME and VINSOLUTIONS_PASSWORD environment variables.');
    }
    
    // Create agent config with extended properties
    const config: AgentConfig & { outputDir?: string; screenshotDir?: string; downloadTimeout?: number; navigationTimeout?: number } = {
      headless: process.env.NODE_ENV === 'production',
      timeout: job.timeout || 30000,
      maxRetries: job.retries || 3,
      screenshotOnError: true,
      outputDir: './downloads',
      screenshotDir: './screenshots',
      downloadTimeout: 60000,
      navigationTimeout: 30000
    };
    
    // Create extractor instance
    extractor = new ReportExtractor(config);
    await extractor.initialize();
    
    // Prepare report request
    const reportRequest: any = {
      reportName: job.reportName || `Report #${job.reportIndex}`,
      reportType: 'custom' as const,
      outputFormat: (job.format || 'xlsx').toLowerCase() as 'xlsx' | 'csv' | 'pdf',
      outputPath: './downloads',
      reportIndex: job.reportIndex
    };
    
    const result = await extractor.extractReport(credentials, reportRequest, job.retries || 3);
    
    if (result.success && result.filePath) {
      // Generate download URL
      const filename = path.basename(result.filePath);
      const downloadUrl = `/downloads/${filename}`;
      
      // Create success history entry
      const historyEntry: ExecutionHistory = {
        id: Date.now().toString(),
        jobId: job.id,
        reportName: job.reportName || `Report #${job.reportIndex}`,
        email: job.email,
        status: 'success',
        downloadUrl,
        executedAt: new Date().toISOString()
      };
      
      await db.createHistoryEntry(historyEntry);
      
      // Update job status and next run time
      const updates: Partial<Job> = {
        status: 'completed',
        lastRun: new Date().toISOString()
      };
      
      // Calculate next run for recurring jobs
      if (job.schedule.type !== 'once') {
        updates.nextRun = getNextRunTime(job.schedule);
        updates.status = 'scheduled'; // Reset status for recurring jobs
      }
      
      await db.updateJob(job.id, updates);
      
      console.log(`Job ${job.id} completed successfully`);
      
      // Shutdown extractor after successful extraction
      await extractor.shutdown();
    } else {
      await extractor.shutdown();
      throw new Error(result.error || 'Extraction failed');
    }
    
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    
    // Create failure history entry
    const historyEntry: ExecutionHistory = {
      id: Date.now().toString(),
      jobId: job.id,
      reportName: job.reportName || `Report #${job.reportIndex}`,
      email: job.email,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      executedAt: new Date().toISOString()
    };
    
    await db.createHistoryEntry(historyEntry);
    
    // Update job status
    await db.updateJob(job.id, {
      status: 'failed',
      lastRun: new Date().toISOString()
    });
  } finally {
    // Ensure extractor is shutdown even on error
    if (extractor) {
      try {
        await extractor.shutdown();
      } catch (e) {
        console.error('Error shutting down extractor:', e);
      }
    }
  }
}

function getNextRunTime(schedule: any): string {
  const now = new Date();
  switch (schedule.type) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      return nextMonth.toISOString();
    default:
      return now.toISOString();
  }
}

// Job scheduler - runs every minute to check for due jobs
async function runScheduler() {
  try {
    const dueJobs = await db.getDueJobs();
    
    for (const job of dueJobs) {
      // Check if job is already running
      if (job.status !== 'running') {
        executeJob(job);
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
}

// Start the scheduler
setInterval(runScheduler, 60000); // Run every minute

// Run scheduler immediately on startup
runScheduler();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  console.log(`Downloads available at http://localhost:${PORT}/downloads/`);
});