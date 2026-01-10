# Email Configuration Guide

This guide explains how to configure email sending for the password reset feature in production.

## Overview

The HRMS application uses **Nodemailer** to send password reset emails. You need to configure SMTP settings to enable email functionality.

## Email Service Providers

### Option 1: Gmail (Easiest for Testing)

**Setup:**
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated app password in `SMTP_PASSWORD`

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

**Limits:** 500 emails/day (free Gmail account)

---

### Option 2: SendGrid (Recommended for Production)

**Setup:**
1. Sign up at [SendGrid](https://sendgrid.com/) (free tier: 100 emails/day)
2. Create an API Key:
   - Settings → API Keys → Create API Key
   - Choose "Full Access" or "Mail Send" permissions
3. Verify your sender email/domain

**Configuration:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

**Limits:** 100 emails/day (free tier), unlimited on paid plans

---

### Option 3: Mailgun (Good for Production)

**Setup:**
1. Sign up at [Mailgun](https://www.mailgun.com/) (free tier: 5,000 emails/month)
2. Verify your domain
3. Get SMTP credentials from Settings → Sending → SMTP credentials

**Configuration:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

**Limits:** 5,000 emails/month (free tier)

---

### Option 4: AWS SES (Best for High Volume)

**Setup:**
1. Sign up for AWS account
2. Verify your email/domain in SES
3. Request production access (move out of sandbox)
4. Create SMTP credentials in SES → SMTP Settings

**Configuration:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

**Cost:** $0.10 per 1,000 emails (very cheap for high volume)

---

### Option 5: Custom SMTP Server

If you have your own mail server:

```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@your-domain.com
APP_NAME=HRMS
```

For SSL/TLS on port 465:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

---

## Environment Variables

Add these to your `.env` file or production environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) | `587` |
| `SMTP_SECURE` | Use SSL (true for port 465, false for 587) | `false` |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP password/app password | `your-password` |
| `SMTP_FROM` | Sender email address | `noreply@your-domain.com` |
| `APP_NAME` | Application name (used in email) | `HRMS` |
| `FRONTEND_URL` | Frontend URL for reset links | `https://your-domain.com` |

---

## Installation

The email service requires `nodemailer`. Install it:

```bash
cd backend
npm install nodemailer
```

---

## Testing Email Configuration

### Test in Development

1. Set up your SMTP credentials in `.env`
2. Start the backend server
3. Request a password reset from the frontend
4. Check your email inbox

### Verify Connection

The email service will log connection status on startup. Check backend logs:

```
[EmailService] Email service initialized
[EmailService] Email service connection verified
```

If you see warnings:
```
[EmailService] Email service not configured - SMTP credentials missing
```

This means email credentials are not set, and password reset emails won't be sent.

---

## Production Checklist

- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Set all SMTP environment variables
- [ ] Verify sender email/domain (if required by provider)
- [ ] Test password reset email sending
- [ ] Monitor email delivery rates
- [ ] Set up email bounce/complaint handling (if using SES/SendGrid)
- [ ] Configure SPF/DKIM records for your domain (for better deliverability)

---

## Troubleshooting

### Emails Not Sending

1. **Check logs:** Look for email service errors in backend logs
2. **Verify credentials:** Double-check SMTP_USER and SMTP_PASSWORD
3. **Test connection:** The service verifies connection on startup
4. **Check spam folder:** Reset emails might be filtered
5. **Provider limits:** Check if you've exceeded daily/monthly limits

### Common Errors

**"Invalid login":**
- Wrong SMTP_USER or SMTP_PASSWORD
- For Gmail: Make sure you're using an App Password, not your regular password

**"Connection timeout":**
- Check SMTP_HOST and SMTP_PORT
- Verify firewall/network allows outbound SMTP connections

**"Authentication failed":**
- Provider may require domain verification
- Check if account is in sandbox mode (AWS SES)

---

## Security Best Practices

1. **Never commit credentials:** Keep SMTP credentials in `.env` (gitignored)
2. **Use App Passwords:** For Gmail, use App Passwords instead of main password
3. **Rotate credentials:** Change SMTP passwords periodically
4. **Monitor usage:** Set up alerts for unusual email activity
5. **Rate limiting:** The service includes basic rate limiting

---

## Cost Comparison

| Provider | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Gmail | 500/day | N/A | Testing, small teams |
| SendGrid | 100/day | $19.95/month (40k) | Small-medium businesses |
| Mailgun | 5,000/month | $35/month (50k) | Medium businesses |
| AWS SES | 62,000/month* | $0.10/1k | High volume, enterprise |

*Free tier only in sandbox mode. Request production access for higher limits.

---

## Support

For email configuration issues:
- Check provider documentation
- Review backend logs for specific error messages
- Test SMTP connection using a tool like [Mailtrap](https://mailtrap.io/) (for testing)
