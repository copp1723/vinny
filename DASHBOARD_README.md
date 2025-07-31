# VinSolutions Report Extraction Dashboard

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start the dashboard:**
```bash
npm run web
```

3. **Open browser:**
```
http://localhost:3000
```

## Features

### Report Selection
- **By Position**: Select 1st, 2nd, or 3rd report from Favorites (bulletproof)
- **By Name**: Enter exact report name (traditional method)

### Scheduling
- **One-time**: Pick specific date/time
- **Recurring**: Daily, Weekly, Monthly

### Advanced Options
- Output format: XLSX, CSV, PDF
- Timeout settings
- Retry attempts

### Dashboard Views
- **Upcoming Jobs**: Scheduled extractions with Run Now/Delete actions
- **History**: Past executions with download links
- **Real-time notifications**: Success/failure toasts

## API Endpoints

```
POST /api/extract-report
GET  /api/jobs
GET  /api/history
POST /api/jobs/:id/run
DELETE /api/jobs/:id
```

## Integration with ReportExtractor

To connect with your actual ReportExtractor service, replace the mock `executeJob` function in `src/web/server.ts`:

```typescript
async function executeJob(job: any) {
  const extractor = new ReportExtractor(config);
  await extractor.initialize();
  
  const request = job.reportIndex 
    ? { reportIndex: job.reportIndex }
    : { reportName: job.reportName };
    
  const result = await extractor.extractReport(credentials, request);
  // Handle result...
}
```

## Production Deployment

1. Build the TypeScript:
```bash
npm run build
```

2. Set environment variables:
```bash
export PORT=3000
export NODE_ENV=production
```

3. Start server:
```bash
node dist/web/server.js
```

The dashboard is now ready for end-users to schedule VinSolutions report extractions without touching code.