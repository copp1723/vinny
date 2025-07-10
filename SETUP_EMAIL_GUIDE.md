# Email Authentication Setup Guide

## 🎯 Why Email Authentication is Better

✅ **More Reliable**: No dependency on phone reception  
✅ **Automated**: AI can read emails programmatically  
✅ **Report Delivery**: Same email system sends reports  
✅ **Audit Trail**: All communications are logged  
✅ **Scalable**: Works across multiple platforms  

## 📧 Step 1: Create AI Agent Email Account

### Option A: Gmail (Recommended)
1. **Create new Gmail account**: `your-company-ai-agent@gmail.com`
2. **Enable 2-Factor Authentication** on the Gmail account
3. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Save this password securely

### Option B: Microsoft 365
1. **Create new Outlook account**: `ai-agent@yourcompany.com`
2. **Enable Modern Authentication**
3. **Generate App Password** in security settings

### Option C: Custom SMTP/IMAP
- Use your company's email server
- Ensure SMTP and IMAP are enabled
- Get server settings from IT department

## 🔧 Step 2: Configure VinSolutions for Email 2FA

1. **Login to VinSolutions** with your regular account
2. **Go to Account Settings** or Security Settings
3. **Find 2-Factor Authentication settings**
4. **Change from Phone to Email**:
   - Remove phone number as 2FA method
   - Add the AI agent email as 2FA destination
   - **Important**: Use the SAME email that the AI will monitor

## ⚙️ Step 3: Configure the AI Agent

1. **Copy the example config**:
   ```bash
   cp email-config.example.json email-config.json
   ```

2. **Update email-config.json**:
   ```json
   {
     "smtp": {
       "host": "smtp.gmail.com",
       "port": 587,
       "secure": false,
       "auth": {
         "user": "your-company-ai-agent@gmail.com",
         "pass": "your-app-password-here"
       }
     },
     "imap": {
       "host": "imap.gmail.com", 
       "port": 993,
       "secure": true,
       "auth": {
         "user": "your-company-ai-agent@gmail.com",
         "pass": "your-app-password-here"
       }
     },
     "agentEmail": "your-company-ai-agent@gmail.com",
     "reportRecipients": [
       "you@yourcompany.com",
       "manager@yourcompany.com"
     ]
   }
   ```

## 🧪 Step 4: Test the Setup

```bash
npm run test-email
```

This will:
1. ✅ Test email connectivity
2. ✅ Login to VinSolutions 
3. ✅ Wait for 2FA code via email
4. ✅ Extract Lead Source ROI report
5. ✅ Email the report to recipients

## 📋 Email Server Settings

### Gmail
- **SMTP**: smtp.gmail.com:587 (STARTTLS)
- **IMAP**: imap.gmail.com:993 (SSL)

### Outlook/Hotmail
- **SMTP**: smtp-mail.outlook.com:587 (STARTTLS)
- **IMAP**: outlook.office365.com:993 (SSL)

### Yahoo
- **SMTP**: smtp.mail.yahoo.com:587 (STARTTLS)
- **IMAP**: imap.mail.yahoo.com:993 (SSL)

## 🔒 Security Best Practices

### Email Account Security
- ✅ Use a dedicated email account for the AI agent
- ✅ Enable 2FA on the email account itself
- ✅ Use App Passwords, not regular passwords
- ✅ Regularly rotate App Passwords
- ✅ Monitor email account for suspicious activity

### VinSolutions Security
- ✅ Use the AI agent email ONLY for 2FA
- ✅ Don't use personal email for business automation
- ✅ Set up email forwarding if needed for monitoring
- ✅ Document which email is used for which platform

### Network Security
- ✅ Use secure SMTP/IMAP connections (SSL/TLS)
- ✅ Don't store passwords in plain text
- ✅ Use environment variables for production
- ✅ Implement proper logging and monitoring

## 🚀 Production Deployment

### Environment Variables
```bash
export AGENT_EMAIL_USER="your-agent@company.com"
export AGENT_EMAIL_PASS="your-app-password"
export REPORT_RECIPIENTS="user1@company.com,user2@company.com"
```

### Docker Configuration
```dockerfile
ENV AGENT_EMAIL_USER=${AGENT_EMAIL_USER}
ENV AGENT_EMAIL_PASS=${AGENT_EMAIL_PASS}
ENV REPORT_RECIPIENTS=${REPORT_RECIPIENTS}
```

### Monitoring
- ✅ Set up email delivery monitoring
- ✅ Monitor 2FA code retrieval success rate
- ✅ Alert on authentication failures
- ✅ Track report extraction success/failure

## 🔧 Troubleshooting

### Common Issues

**"Authentication failed"**
- ✅ Verify App Password is correct
- ✅ Check if 2FA is enabled on email account
- ✅ Ensure IMAP is enabled

**"2FA code not found"**
- ✅ Check VinSolutions sends to correct email
- ✅ Verify email arrives in inbox (not spam)
- ✅ Check 2FA code format in email

**"Download failed"**
- ✅ Verify report exists and is accessible
- ✅ Check download permissions
- ✅ Ensure sufficient disk space

**"Email delivery failed"**
- ✅ Verify SMTP settings
- ✅ Check recipient email addresses
- ✅ Verify attachment size limits

### Debug Mode
```bash
DEBUG=true npm run test-email
```

This enables:
- 📝 Detailed logging
- 📸 Extra screenshots
- 📧 Email content debugging
- ⏱️ Timing information

## 📈 Scaling to Multiple Platforms

Once VinSolutions works, you can use the same email setup for:

- **Salesforce**: Configure email 2FA
- **HubSpot**: Use email verification
- **Microsoft Dynamics**: Email-based authentication
- **Custom Platforms**: Any system with email 2FA

The AI agent will:
1. 🔐 Login to each platform
2. 📧 Receive 2FA codes via email
3. 📊 Extract reports automatically
4. 📤 Email reports to your team
5. 📝 Log all activities for audit

## 🎯 Next Steps

1. **Set up the email account** (15 minutes)
2. **Configure VinSolutions** for email 2FA (5 minutes)
3. **Test the automation** (5 minutes)
4. **Schedule regular extractions** (cron job)
5. **Add more platforms** using the same pattern

**Total setup time: ~30 minutes for a fully automated system!**

