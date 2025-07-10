# Mailgun Setup Guide for AI Agent

## 🎯 Why Mailgun is Perfect for AI Automation

✅ **Professional Delivery** - 99%+ deliverability rates  
✅ **Built for APIs** - Designed for programmatic email sending  
✅ **No App Password Issues** - Uses API keys instead  
✅ **Advanced Features** - Tracking, analytics, webhooks  
✅ **Scalable** - Handle thousands of reports per day  
✅ **Reliable** - Enterprise-grade email infrastructure  

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Mailgun Credentials
1. **Login to Mailgun** (or sign up for free)
2. **Go to Domains** → Select your domain
3. **Copy API Key** from the domain settings
4. **Note your domain name** (e.g., `mg.yourcompany.com`)

### Step 2: Configure Environment Variables
Add to your `.env` file:
```bash
# Mailgun Configuration
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef
MAILGUN_DOMAIN=mg.yourcompany.com
MAILGUN_FROM_EMAIL=ai-agent@mg.yourcompany.com
```

### Step 3: Test the Setup
```bash
npm run test-mailgun
```

## 📧 Hybrid Email Strategy (Recommended)

### For Report Delivery: Mailgun
- ✅ Professional appearance
- ✅ Reliable delivery
- ✅ File attachments
- ✅ HTML formatting
- ✅ Tracking & analytics

### For 2FA Reception: Gmail
- ✅ Simple setup
- ✅ Works with VinSolutions
- ✅ Easy to configure
- ✅ Familiar interface

## 🔧 Mailgun Domain Setup

### Option 1: Use Mailgun Subdomain (Easiest)
Mailgun provides: `mg.yourcompany.com`
- ✅ No DNS setup required
- ✅ Works immediately
- ✅ Good for testing and development

### Option 2: Use Your Own Domain (Professional)
Use: `yourcompany.com`
- ✅ Professional appearance
- ✅ Better brand recognition
- ⚠️ Requires DNS configuration

### DNS Records for Custom Domain:
```
Type: TXT
Name: @
Value: v=spf1 include:mailgun.org ~all

Type: TXT  
Name: _dmarc
Value: v=DMARC1; p=none;

Type: CNAME
Name: email.yourcompany.com
Value: mailgun.org

Type: MX
Name: @
Value: mxa.mailgun.org (Priority: 10)
Value: mxb.mailgun.org (Priority: 10)
```

## 🧪 Testing Your Setup

### Test 1: Basic Connection
```bash
npm run test-mailgun
```

### Test 2: Report Email
The system will send a sample report email with:
- ✅ Professional HTML formatting
- ✅ File attachment simulation
- ✅ Tracking tags
- ✅ Performance metrics

### Test 3: Notification Email
Tests success/failure notification system:
- ✅ Color-coded status (green/red)
- ✅ Timestamp information
- ✅ Professional formatting

## 📊 Email Templates

### Report Delivery Email Features:
- **Professional Header** with gradient background
- **Detailed Report Table** with extraction metadata
- **Status Indicators** (success/failure)
- **Performance Metrics** (execution time, file size)
- **AI Agent Branding** 
- **File Attachments** (Excel, PDF, CSV)

### Notification Email Features:
- **Color-coded Status** (green for success, red for errors)
- **Clear Subject Lines** with emojis
- **Detailed Error Information** when applicable
- **Timestamp Tracking**
- **Professional Footer**

## 🔍 Mailgun Dashboard Features

Once set up, you can monitor:
- ✅ **Delivery Rates** - Track successful deliveries
- ✅ **Open Rates** - See if recipients read emails
- ✅ **Click Tracking** - Monitor link engagement
- ✅ **Bounce Management** - Handle invalid addresses
- ✅ **Spam Filtering** - Ensure deliverability
- ✅ **Analytics** - Detailed email performance

## 🚨 Troubleshooting

### "Domain not verified"
- Check DNS records are properly configured
- Wait up to 24 hours for DNS propagation
- Use Mailgun's domain verification tool

### "API key invalid"
- Verify you're using the correct API key
- Check the key hasn't been regenerated
- Ensure you're using the domain-specific key

### "From address not authorized"
- Verify the from email matches your domain
- Check domain authorization in Mailgun
- Use a subdomain if main domain isn't working

### "Rate limit exceeded"
- Check your Mailgun plan limits
- Implement retry logic with delays
- Consider upgrading your plan

## 💰 Mailgun Pricing

### Free Tier:
- **5,000 emails/month** free
- Perfect for testing and small deployments

### Paid Plans:
- **$35/month** for 50,000 emails
- **$80/month** for 100,000 emails
- Enterprise plans available

### Cost per Report:
- **~$0.0007 per email** (very affordable)
- **10,000 reports/month = ~$7**
- Much cheaper than SMS-based solutions

## 🔐 Security Best Practices

### API Key Management:
- ✅ Store in environment variables
- ✅ Never commit to version control
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/prod

### Email Security:
- ✅ Enable DKIM signing
- ✅ Configure SPF records
- ✅ Set up DMARC policy
- ✅ Monitor bounce rates

## 🎯 Next Steps

1. **Set up Mailgun** (5 minutes)
2. **Test email delivery** (2 minutes)
3. **Configure Gmail for 2FA** (5 minutes)
4. **Run full automation test** (5 minutes)

**Total setup time: ~15 minutes for production-ready email system!**

