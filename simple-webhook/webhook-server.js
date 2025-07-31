const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Ajv = require('ajv');
const ajv = new Ajv();
const webhookSchema = {
  type: 'object',
  properties: {
    sender: { type: 'string' },
    recipient: { type: 'string' },
    subject: { type: 'string' },
    'body-plain': { type: 'string' },
    'stripped-text': { type: 'string' },
    body: { type: 'string' }
  },
  required: ['sender', 'subject'],
  additionalProperties: true
};

// Configuration
const PORT = process.env.PORT || 3000;
const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

// In-memory storage for 2FA codes
const codeStore = {
  codes: [],
  
  addCode(code, sender, subject, body) {
    const timestamp = Date.now();
    const id = `code_${timestamp}_${Math.random().toString(36).substring(2, 10)}`;
    
    const codeEntry = {
      id,
      code,
      sender,
      subject,
      body: body.substring(0, 100) + '...', // Store just the beginning for debugging
      timestamp,
      expiresAt: timestamp + CODE_EXPIRATION_MS,
      used: false
    };
    
    this.codes.push(codeEntry);
    this.cleanup();
    return codeEntry;
  },
  
  getLatestCode(platform = null, minAgeMs = 0) {
    this.cleanup();
    
    const validCodes = this.codes
      .filter(entry => !entry.used)
      .filter(entry => Date.now() - entry.timestamp >= minAgeMs);
    
    if (validCodes.length === 0) {
      return null;
    }
    
    // Sort by timestamp descending (newest first)
    validCodes.sort((a, b) => b.timestamp - a.timestamp);
    return validCodes[0];
  },
  
  markCodeAsUsed(id) {
    const codeEntry = this.codes.find(entry => entry.id === id);
    if (codeEntry) {
      codeEntry.used = true;
      return true;
    }
    return false;
  },
  
  cleanup() {
    const now = Date.now();
    const initialCount = this.codes.length;
    this.codes = this.codes.filter(entry => entry.expiresAt > now);
    
    const removedCount = initialCount - this.codes.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} expired code(s)`);
    }
  },
  
  getStats() {
    this.cleanup();
    return {
      total: this.codes.length,
      active: this.codes.filter(entry => !entry.used).length,
      used: this.codes.filter(entry => entry.used).length
    };
  }
};

// Create Express app
const app = express();

// Security headers
app.use(helmet());

// Basic rate limiting: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Built-in body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Extract 2FA code from email body
function extract2FACode(text, subject) {
  if (!text) return null;
  
  // Common patterns for 2FA codes
  const patterns = [
    /verification code[:\s]+(\d{4,8})/i,
    /security code[:\s]+(\d{4,8})/i,
    /confirmation code[:\s]+(\d{4,8})/i,
    /your code[:\s]+(\d{4,8})/i,
    /code[:\s]+(\d{4,8})/i,
    /\b(\d{6})\b/, // Common 6-digit code
    /\b(\d{4})\b/  // Common 4-digit code
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      console.log(`Extracted code: ${match[1]} using pattern: ${pattern}`);
      return match[1];
    }
  }
  
  // If subject contains a code (some services put it there)
  if (subject) {
    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match && match[1]) {
        console.log(`Extracted code from subject: ${match[1]} using pattern: ${pattern}`);
        return match[1];
      }
    }
  }
  
  console.log('No 2FA code found in email');
  return null;
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats: codeStore.getStats()
  });
});

// Webhook endpoint for Mailgun
app.post('/webhook/2fa', (req, res) => {
  try {
    const valid = ajv.validate(webhookSchema, req.body);
    if (!valid) {
      console.error('Invalid webhook payload', ajv.errors);
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    console.log("Raw incoming webhook body:", JSON.stringify(req.body, null, 2));
    console.log('Received webhook from Mailgun:');
    console.log(`- From: ${req.body.sender}`);
    console.log(`- To: ${req.body.recipient}`);
    console.log(`- Subject: ${req.body.subject}`);
    
    // Extract the plain text body from the email
    const emailBody = req.body['body-plain'] || 
                      req.body['stripped-text'] || 
                      req.body.body || 
                      '';
    
    // Extract the 2FA code
    const code = extract2FACode(emailBody, req.body.subject);
    
    if (code) {
      // Store the code
      const codeEntry = codeStore.addCode(
        code, 
        req.body.sender, 
        req.body.subject, 
        emailBody
      );
      
      console.log(`Stored 2FA code: ${code} (ID: ${codeEntry.id})`);
      
      return res.json({
        success: true,
        message: '2FA code extracted and stored',
        codeId: codeEntry.id
      });
    } else {
      console.log('Failed to extract 2FA code from email');
      return res.json({
        success: false,
        message: 'No 2FA code found in email'
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Get latest code endpoint
app.get('/api/code/latest', (req, res) => {
  try {
    const platform = req.query.platform || null;
    const minAgeMs = req.query.minAgeMs ? parseInt(req.query.minAgeMs) : 0;
    
    const codeEntry = codeStore.getLatestCode(platform, minAgeMs);
    
    if (codeEntry) {
      console.log(`Returning latest code: ${codeEntry.code} (ID: ${codeEntry.id})`);
      return res.json({
        success: true,
        code: codeEntry.code,
        id: codeEntry.id,
        timestamp: codeEntry.timestamp,
        sender: codeEntry.sender,
        subject: codeEntry.subject
      });
    } else {
      console.log('No valid codes found');
      return res.json({
        success: false,
        message: 'No valid codes found'
      });
    }
  } catch (error) {
    console.error('Error retrieving latest code:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving latest code',
      error: error.message
    });
  }
});

// Mark code as used endpoint
app.post('/api/code/:id/use', (req, res) => {
  try {
    const { id } = req.params;
    const success = codeStore.markCodeAsUsed(id);
    
    if (success) {
      console.log(`Marked code ${id} as used`);
      return res.json({ success: true });
    } else {
      console.log(`Code ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Code not found'
      });
    }
  } catch (error) {
    console.error('Error marking code as used:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking code as used',
      error: error.message
    });
  }
});

// List all codes (for debugging)
app.get('/api/codes', (req, res) => {
  try {
    codeStore.cleanup();
    
    // Don't return the actual codes in the response for security
    const sanitizedCodes = codeStore.codes.map(entry => ({
      id: entry.id,
      sender: entry.sender,
      subject: entry.subject,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      used: entry.used
    }));
    
    return res.json({
      success: true,
      codes: sanitizedCodes,
      stats: codeStore.getStats()
    });
  } catch (error) {
    console.error('Error listing codes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error listing codes',
      error: error.message
    });
  }
});

// Periodic cleanup of expired codes (runs every minute)
setInterval(() => {
  codeStore.cleanup();
}, 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│                                                 │');
  console.log('│   Simple 2FA Webhook Server                     │');
  console.log('│                                                 │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /webhook/2fa - Receive Mailgun webhooks');
  console.log('- GET  /api/code/latest - Get latest 2FA code');
  console.log('- POST /api/code/:id/use - Mark code as used');
  console.log('- GET  /api/codes - List all codes (for debugging)');
  console.log('- GET  /health - Health check');
  console.log('\nWaiting for incoming webhooks...');
});
