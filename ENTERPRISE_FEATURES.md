# Yorkshire Property Report - Enterprise Testing Environment

🚀 **Complete Enterprise Security System Successfully Deployed**

Your testing directory now contains the complete enterprise-grade Yorkshire Property Report system with all advanced security features from your main implementation.

## 🔐 Enterprise Features Available

### ✅ Authentication & Security
- **JWT Authentication** with secure token management
- **Two-Factor Authentication (2FA)** with Google Authenticator support
- **Session Management** with automatic cleanup
- **Brute Force Protection** with IP blocking
- **Rate Limiting** for all endpoints (auth, payment, email)
- **Input Validation** with Joi schemas
- **Geographic Access Control** and IP restrictions
- **Comprehensive Audit Logging** of all admin actions

### ✅ Database Security
- **AES-256-GCM Encryption** for sensitive customer data
- **SQLite with encryption layer** for data at rest
- **Automatic encrypt/decrypt** operations
- **Secure data storage** with field-level encryption

### ✅ Admin Dashboard
- **Secure Admin Interface** (`secure-admin-dashboard.html`)
- **Real-time Analytics** and system monitoring
- **Session Management** with active session viewing
- **Security Status** monitoring and alerts
- **Audit Log** viewing and filtering
- **2FA Setup** interface

### ✅ Payment Processing
- **Stripe Integration** with enterprise security
- **Payment Intent** creation with validation
- **Webhook Handling** for payment confirmations
- **Rate Limited** payment endpoints

### ✅ Email System
- **Automated Confirmations** with HTML templates
- **Delivery Tracking** and status monitoring
- **Rate Limited** email sending
- **Admin Email Testing** tools

## 📁 Key Files

### Core Enterprise Files
- `secure-server.js` - Main enterprise server with all security features
- `auth.js` - Authentication system (JWT, 2FA, sessions)
- `security-middleware.js` - Rate limiting, validation, headers
- `database.js` - Encrypted database layer
- `secure-admin-dashboard.html` - Enterprise admin interface

### Legacy Files (Backup)
- `send-confirmation-email.js` - Original basic server
- `admin-dashboard.html` - Basic admin interface

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd testing
npm install
```

### 2. Environment Setup
Create a `.env` file with:
```bash
# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_EMAIL=admin@yorkshirepropertyreport.co.uk

# JWT Security
JWT_SECRET=your_64_character_hex_secret
SESSION_SECRET=your_session_secret

# Database Encryption
DATABASE_ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_or_live_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_your_stripe_key

# Email Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server Settings
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. Generate Secure Keys
```bash
# Generate encryption key
node -e "console.log('DATABASE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start Enterprise Server
```bash
npm start
```

## 🔗 Enterprise Endpoints

### Authentication
- `POST /admin/login` - Admin login with 2FA support
- `POST /admin/logout` - Secure logout
- `POST /admin/setup-2fa` - Setup two-factor authentication
- `POST /admin/enable-2fa` - Enable 2FA
- `POST /admin/disable-2fa` - Disable 2FA

### Admin Management
- `GET /admin/sessions` - View active sessions
- `DELETE /admin/sessions/:id` - Terminate session
- `GET /admin/audit-log` - View audit log
- `GET /admin/security-status` - Security status report

### Customer Orders (Secured)
- `POST /api/payment/create-intent` - Create payment intent
- `POST /api/payment/confirm` - Confirm payment and save order
- `GET /api/admin/orders` - Get all orders (admin only)
- `GET /api/admin/stats` - Order statistics (admin only)

### System Health
- `GET /health` - System health check
- `GET /api/admin/config-status` - Configuration status
- `POST /api/admin/test-email` - Test email configuration

## 🛡️ Security Features Detail

### Rate Limiting
- **General API**: 100 requests / 15 minutes
- **Authentication**: 5 attempts / 15 minutes  
- **Payment**: 5 attempts / minute
- **Email**: 3 attempts / minute

### Input Validation
- **Customer Data**: Name, email, address validation
- **Admin Login**: Username/password requirements
- **Payment Data**: Stripe format validation
- **XSS Prevention**: Automatic input sanitization

### Audit Logging
All admin actions are logged with:
- Timestamp and user details
- IP address and user agent
- Action type and severity level
- Request details and outcomes

### Session Security
- **JWT Tokens**: 8-hour expiry with refresh
- **Session Tracking**: Active session monitoring
- **Auto Cleanup**: Expired session removal
- **IP Validation**: Per-session IP binding

## 📊 Admin Dashboard Features

### Dashboard Sections
1. **Overview** - System health and metrics
2. **Analytics** - Business intelligence data
3. **Sessions** - Active user management
4. **Security** - Threat monitoring and status
5. **Audit Log** - Complete activity history
6. **Settings** - 2FA setup and system tests

### Security Monitoring
- Real-time security status
- Failed login attempt tracking
- IP blocking and rate limit status
- System health indicators
- Configuration validation

## 🔧 Development vs Production

### Development Mode
- Uses test Stripe keys automatically
- Relaxed CORS settings
- Detailed error logging
- Development fallbacks for missing configs

### Production Mode
- Enforces all security settings
- Live Stripe integration
- Strict CORS and headers
- Production error handling
- Required environment variables

## 📈 Ready for Production

Your enterprise system includes:
- ✅ Enterprise-grade security
- ✅ Comprehensive audit logging
- ✅ Real-time monitoring
- ✅ Scalable architecture
- ✅ Production deployment ready
- ✅ Full documentation

## 🆘 Support

For technical support or deployment assistance:
- Check the audit logs for security events
- Use `/health` endpoint for system status
- Review the comprehensive documentation
- Test email configuration with admin tools

---

**🎯 Your enterprise Yorkshire Property Report system is now fully operational with bank-grade security!**