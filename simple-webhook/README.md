# Vinny 2FA Webhook Server

A simple webhook server for receiving and processing 2FA codes from Mailgun email forwards.

## Features

- Receives emails forwarded from Mailgun
- Extracts 2FA codes from email content
- Stores codes in memory with 10-minute expiration
- Provides REST API for retrieving codes

## Deployment to Render

1. Push this code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Use the following settings:
   - Build Command: (leave blank)
   - Start Command: `npm start`
   - Environment: Node
   - Instance Type: Free

## Environment Variables

- `PORT`: Server port (default: 3000, Render will set this automatically)

## API Endpoints

- `POST /webhook/2fa` - Mailgun webhook endpoint
- `GET /api/code/latest` - Get the latest 2FA code
- `POST /api/code/:id/use` - Mark a code as used
- `GET /api/codes` - List all codes (debugging)
- `GET /health` - Health check

## Local Development

```bash
npm install
npm start
```

For development with auto-reload:
```bash
npm run dev
```