# VinSolutions Report Extractor Dashboard - Production Setup

This dashboard provides a web interface for scheduling and managing automated report extractions from VinSolutions.

## Features

- **Dual Report Selection**: Choose reports by name or position (1st, 2nd, 3rd)
- **Flexible Scheduling**: One-time or recurring (daily/weekly/monthly)
- **Persistent Storage**: SQLite database for jobs and execution history
- **Real Extraction**: Integrates with actual VinSolutions agent
- **Download Management**: Automatic file organization and serving
- **Error Handling**: Retry logic and comprehensive error tracking

## Prerequisites

1. Node.js 14+ installed
2. Chrome/Chromium for Playwright
3. VinSolutions account credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

Copy the example environment file:
```bash
cp .env.dashboard .env.dashboard
```

Edit `.env.dashboard` with your VinSolutions credentials:
```env
VINSOLUTIONS_USERNAME=your_actual_username
VINSOLUTIONS_PASSWORD=your_actual_password
VINSOLUTIONS_DEALERSHIP_ID=your_dealership_id

NODE_ENV=production  # Set to production for headless browser
PORT=3000
```

### 3. Create Required Directories

The system will automatically create these, but you can create them manually:
```bash
mkdir -p data downloads screenshots logs
```

### 4. Start the Dashboard

```bash
npm run web
```

Access the dashboard at: http://localhost:3000

## Production Architecture

### Database Schema

**Jobs Table**
- `id`: Unique job identifier
- `reportName`: Report name (or generated from index)
- `reportIndex`: Position-based selection (1, 2, or 3)
- `email`: Recipient email address
- `schedule`: JSON schedule configuration
- `format`: Output format (XLSX, CSV, PDF)
- `timeout`: Extraction timeout in ms
- `retries`: Number of retry attempts
- `status`: Current job status
- `createdAt`: Job creation timestamp
- `nextRun`: Next scheduled execution
- `lastRun`: Last execution timestamp

**History Table**
- `id`: Unique execution identifier
- `jobId`: Related job ID
- `reportName`: Extracted report name
- `email`: Recipient email
- `status`: Execution result (success/failed)
- `downloadUrl`: File download path
- `error`: Error message if failed
- `executedAt`: Execution timestamp

### File Structure

```
vinny-agent/
├── data/
│   └── report-extractor.db    # SQLite database
├── downloads/                  # Extracted report files
├── screenshots/                # Debug screenshots
├── logs/                       # Application logs
└── src/
    └── web/
        ├── server.ts           # Express server
        └── public/
            └── index.html      # React dashboard UI
```

## API Endpoints

### POST /api/extract-report
Schedule a new report extraction.

**Request Body:**
```json
{
  "reportName": "Lead Source ROI",      // Either reportName
  "reportIndex": 1,                     // OR reportIndex (1-based)
  "email": "user@example.com",
  "schedule": {
    "type": "once",
    "datetime": "2025-01-11T10:00:00"
  },
  "format": "XLSX",
  "timeout": 30000,
  "retries": 3
}
```

### GET /api/jobs
Get all scheduled jobs.

### GET /api/history
Get execution history (last 100 entries).

### POST /api/jobs/:id/run
Trigger immediate execution of a scheduled job.

### DELETE /api/jobs/:id
Delete a scheduled job.

### GET /downloads/:filename
Download an extracted report file.

## Scheduler

The built-in scheduler runs every minute to:
1. Check for jobs due to run
2. Execute due jobs
3. Update job status and schedule next run for recurring jobs

## Security Considerations

1. **Credentials**: Store credentials in environment variables, never commit them
2. **File Access**: Downloaded files are served from a dedicated directory
3. **Database**: SQLite database is stored in the `data/` directory
4. **Authentication**: Add authentication middleware for production deployment

## Monitoring

### Logs
- Application logs in console output
- Extraction logs include timestamps and status
- Error logs with full stack traces

### Health Checks
Monitor the following:
- Database connectivity
- Browser initialization
- VinSolutions login status
- Disk space for downloads

## Troubleshooting

### Common Issues

1. **Login Fails**
   - Verify credentials in `.env.dashboard`
   - Check if 2FA is enabled (requires webhook setup)
   - Ensure dealership ID is correct

2. **Extraction Timeout**
   - Increase timeout in job configuration
   - Check network connectivity
   - Verify report is accessible in VinSolutions

3. **Database Errors**
   - Ensure `data/` directory is writable
   - Check disk space
   - Verify SQLite is installed

4. **Download Issues**
   - Check `downloads/` directory permissions
   - Verify file was created successfully
   - Check available disk space

## Performance Tips

1. **Headless Mode**: Set `NODE_ENV=production` for faster execution
2. **Concurrent Jobs**: Limit concurrent extractions to avoid overwhelming the server
3. **Cleanup**: Implement periodic cleanup of old download files
4. **Database Maintenance**: Periodically vacuum the SQLite database

## Future Enhancements

- [ ] Email notifications on completion/failure
- [ ] User authentication and multi-tenancy
- [ ] Advanced scheduling (specific days/times)
- [ ] Report preview before download
- [ ] Bulk report operations
- [ ] API rate limiting
- [ ] Webhook notifications
- [ ] Cloud storage integration

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify all prerequisites are met
3. Ensure VinSolutions access is working manually
4. Review the troubleshooting section above