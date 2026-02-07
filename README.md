# Yorkshire Property Report - Production System

A comprehensive property report ordering system with integrated payment processing, email automation, and enterprise-grade security features.

## 🏢 About Yorkshire Property Report

Yorkshire Property Report provides professional property inspection and reporting services across Yorkshire and the UK. Our system automates the entire customer journey from order placement to report delivery.

## 🚀 System Features

### 📋 Core Functionality
- **Automated Order Processing** - Seamless customer order management
- **Stripe Payment Integration** - Secure card payments with live/test mode switching  
- **Email Confirmation System** - Automated customer notifications
- **Property Report Generation** - Structured report delivery system
- **Customer Database** - Secure customer data management

### 🔒 Enterprise Security
- **JWT Authentication** with session management
- **Two-Factor Authentication (2FA)** - Google Authenticator support
- **Rate Limiting** - DDoS protection and abuse prevention
- **Input Validation** - SQL injection and XSS prevention
- **Geographic Access Control** - Country and IP-based restrictions
- **Comprehensive Audit Logging** - Full admin activity tracking
- **Brute Force Protection** - Account lockout mechanisms

### 📊 Admin Features
- **Real-time Analytics Dashboard** - Business intelligence and metrics
- **Session Management** - Active user monitoring and control
- **Security Monitoring** - Login attempts and threat detection
- **Email Testing Tools** - Configuration validation
- **System Health Monitoring** - Database and service status

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with connection pooling
- **JWT** for secure authentication
- **Bcrypt** for password hashing
- **Helmet.js** for security headers

### Payment Processing
- **Stripe** payment gateway
- **Webhook handling** for payment confirmations
- **Automatic receipt generation**

### Email System
- **Nodemailer** with Gmail SMTP
- **HTML email templates**
- **Delivery confirmation tracking**

### Security Libraries
- **Joi** for input validation
- **Speakeasy** for 2FA implementation
- **GeoIP** for location-based security
- **Rate limiting** with express-rate-limit

## 📁 Project Structure

```
├── send-confirmation-email.js    # Main backend server
├── config.js                     # Stripe configuration
├── package.json                  # Dependencies and scripts
├── ypr-websiteV24.html           # Customer-facing website
├── admin-dashboard.html          # Admin management interface
├── email-confirmation.html       # Email template
├── payment-confirmation.html     # Payment success page
├── terms.html                    # Terms and conditions
├── EMAIL_SETUP_GUIDE.md          # Email configuration guide
└── .gitignore                    # Security file exclusions
```

## 🚀 Deployment Guide

### Prerequisites
- Node.js 14.0+ 
- PostgreSQL database
- Stripe account (live keys for production)
- Gmail account with app password
- Render/Heroku account for hosting

### Environment Variables

Set these in your hosting platform:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration
EMAIL_USER=info@ypr.co.uk
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM_NAME=Yorkshire Property Report
EMAIL_FROM_ADDRESS=info@ypr.co.uk

# Admin Authentication
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@yorkshirepropertyreport.co.uk
JWT_SECRET=your_super_secure_jwt_secret_key

# Security Settings
NODE_ENV=production
ALLOWED_ORIGINS=https://yorkshirepropertyreport.co.uk
ALLOWED_COUNTRIES=GB,US
SESSION_SECRET=your_session_secret_key

# Business Information
BUSINESS_NAME=Yorkshire Property Report
BUSINESS_EMAIL=info@yorkshirepropertyreport.co.uk
```

### Quick Deploy to Render

1. **Connect Repository**
   - Fork/upload this repository to GitHub
   - Connect your Render account to GitHub
   - Create new Web Service from repository

2. **Add PostgreSQL**
   - Add PostgreSQL addon in Render dashboard
   - DATABASE_URL will be set automatically

3. **Configure Environment Variables**
   - Add all environment variables listed above
   - Ensure JWT_SECRET is a long, random string

4. **Deploy Settings**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

## 🔧 Development Setup

### Local Installation

```bash
# Clone repository
git clone <your-repo-url>
cd yorkshire-property-report

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Database Setup

```sql
-- Tables are created automatically on first run
-- send-confirmation-email.js handles all database initialization
```

## 📊 Admin System Usage

### Accessing Admin Panel

1. **Login to Admin System**
   ```bash
   POST /admin/login
   {
     "username": "your_admin_username",
     "password": "your_admin_password"
   }
   ```

2. **Enable Two-Factor Authentication**
   ```bash
   POST /admin/setup-2fa
   # Scan QR code with Google Authenticator
   
   POST /admin/enable-2fa
   {
     "twoFactorCode": "123456"
   }
   ```

### Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/login` | POST | Authenticate and get JWT token |
| `/admin/logout` | POST | Terminate session |
| `/health` | GET | System health check |
| `/analytics` | GET | Business analytics dashboard |
| `/admin/sessions` | GET | View active user sessions |
| `/admin/audit-log` | GET | Security audit trail |
| `/security-status` | GET | Security system status |

## 🔒 Security Features

### Authentication
- **JWT-based authentication** with configurable expiration
- **Two-factor authentication** using TOTP (Google Authenticator)
- **Session management** with automatic cleanup
- **Password complexity requirements**

### Protection Mechanisms
- **Rate limiting**: 5 payment attempts/minute, 100 general requests/15 minutes
- **Brute force protection**: Account lockout after 5 failed attempts
- **Geographic restrictions**: Configurable country allowlists
- **IP-based access control**: Admin IP restrictions
- **Input validation**: Comprehensive data sanitization

### Monitoring & Logging
- **Comprehensive audit logging** of all admin actions
- **Security event tracking** (failed logins, blocked requests)
- **Real-time session monitoring**
- **Suspicious activity detection**

## 📧 Email System

### Configuration
- Uses Gmail SMTP with app-specific passwords
- HTML email templates with dynamic content
- Delivery confirmation tracking
- Failed email retry mechanisms

### Email Types
- **Order confirmations** - Sent after successful payment
- **Receipt notifications** - Payment confirmations
- **Admin alerts** - Security and system notifications

## 💳 Payment Processing

### Stripe Integration
- **Secure payment processing** with SCA compliance
- **Automatic environment detection** (test/live keys)
- **Webhook handling** for payment confirmations
- **Receipt generation** and email delivery

### Supported Payment Methods
- Credit/Debit Cards (Visa, MasterCard, American Express)
- Apple Pay and Google Pay
- Bank transfers (configurable)

## 📈 Analytics & Reporting

### Business Metrics
- **Order volume tracking**
- **Revenue analytics**  
- **Customer behavior insights**
- **Conversion rate monitoring**

### Security Analytics
- **Login attempt monitoring**
- **Failed authentication tracking**
- **Geographic access patterns**
- **Session activity analysis**

## 🛡 Security Best Practices

### For Production
1. **Strong Passwords**: Use complex admin passwords (12+ characters)
2. **2FA Enabled**: Always enable two-factor authentication
3. **IP Restrictions**: Limit admin access to known IP addresses
4. **Regular Updates**: Keep dependencies updated
5. **SSL Certificates**: Ensure HTTPS is properly configured
6. **Database Security**: Use strong database passwords and restricted access

### Monitoring
- Monitor `/admin/audit-log` for suspicious activity
- Check `/admin/login-attempts` for brute force attacks
- Review `/security-status` endpoint regularly
- Set up alerts for failed authentication attempts

## 📞 Support & Maintenance

### System Monitoring
- Health check endpoint: `/health`
- Email configuration test: `/test-email`
- Security status: `/security-status`

### Troubleshooting
- Check server logs for error details
- Verify environment variables are set correctly
- Test email configuration using `/test-email` endpoint
- Monitor database connections and performance

## 📄 License

This software is proprietary to Yorkshire Property Report. All rights reserved.

## 🔗 Contact

**Yorkshire Property Report**
- Website: https://yorkshirepropertyreport.co.uk
- Email: info@yorkshirepropertyreport.co.uk
- Support: Technical support available for deployment and maintenance

---

**Built with enterprise-grade security and scalability in mind. Ready for production deployment.**