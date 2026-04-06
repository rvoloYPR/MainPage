# Security Documentation - Yorkshire Property Report

## Overview
This document outlines the comprehensive security measures implemented in the Yorkshire Property Report application to protect customer data, prevent unauthorized access, and ensure payment security.

## Critical Security Fixes Applied (2026-04-06)

### 1. **Static File Exposure - CRITICAL FIX**
**Problem**: The entire application directory was being served as static files, exposing:
- `.env` file with all secrets (Stripe keys, admin passwords, JWT secrets)
- `ypr_customers.db` - customer database
- All `.js` source files (authentication logic, security middleware)
- Configuration files and documentation

**Solution**:
- Created `public/` directory for safe static files only
- Implemented file type blocking middleware that explicitly denies access to:
  - `.env` files
  - `.db` and `.sqlite` files
  - `.js` source files
  - `.json`, `.md`, `.txt` files
  - Config, auth, database, and security files
  - Log files and node_modules
- Changed static file serving to ONLY serve from `public/` directory
- Added dotfiles denial and disabled automatic index serving

**Code Reference**: `secure-server.js` lines 88-141

### 2. **Database File Protection**
**Problem**: `ypr_customers.db` was directly downloadable via URL

**Solution**:
- Database file blocked by static file middleware
- Database stored outside public directory
- Access only through authenticated API endpoints
- Customer data encrypted at application layer using AES-256-GCM

**Code Reference**: `database.js` lines 8-111

### 3. **Source Code Exposure**
**Problem**: All `.js` files were accessible, revealing authentication logic and security mechanisms

**Solution**:
- All `.js` files blocked from static serving
- Source code only executable on server, never served to clients
- Authentication logic remains server-side only

### 4. **Environment Variables Protection**
**Problem**: `.env` file with live secrets was in static directory

**Solution**:
- Created `.gitignore` to prevent `.env` from being committed
- Created `.env.example` template without actual secrets
- `.env` file blocked from static serving
- **IMPORTANT**: All exposed secrets must be rotated (Stripe keys, JWT secrets, admin passwords, email passwords)

### 5. **Hardcoded API URLs**
**Problem**: Backend URL hardcoded in frontend (https://mainpage-5wb3.onrender.com)

**Solution**:
- Added `API_BASE_URL` to `config.js`
- Configures automatically based on environment (localhost vs production)
- All fetch calls now use `CONFIG.API_BASE_URL`
- Easy to change for different deployment environments

**Code Reference**: `config.js` and `public/index.html`

### 6. **Admin Dashboard Protection**
**Problem**: Admin dashboard accessible to anyone

**Solution**:
- Admin dashboard routes require JWT authentication
- Zero-Trust token verification required
- Served via protected endpoints only: `/admin-dashboard.html` and `/admin/dashboard`

**Code Reference**: `secure-server.js` lines 213-228

## Existing Security Features (Already Implemented)

### Authentication & Authorization
- **JWT (JSON Web Tokens)**: Short-lived access tokens with refresh tokens
- **Zero-Trust Architecture**: Continuous verification every 15 minutes
- **Two-Factor Authentication (2FA)**: Optional TOTP-based 2FA via authenticator apps
- **Session Management**: Active session tracking with device fingerprinting
- **Account Lockout**: 5 failed attempts = 30-minute lockout
- **IP-Based Brute Force Protection**: 5 failed logins = 15-minute IP ban
- **Panic Mode**: Emergency 2FA code (ending in 99) triggers full system lockdown

### Data Protection
- **Database Encryption**: AES-256-GCM encryption for sensitive customer data
- **Password Hashing**: bcrypt with cost factor 12-14
- **Encryption Key Management**: Stored in environment variables
- **Encrypted Fields**: email, first_name, last_name, phone, property_address, property_city

### Network Security
- **CORS**: Configured with allowed origins only
- **CSRF Protection**: Origin header validation for state-changing requests
- **Security Headers**: Helmet.js with strict CSP, HSTS, X-Frame-Options
- **HTTPS Enforcement**: HSTS with 1-year max-age and preload
- **Rate Limiting**: Multiple tiers (general, auth, payment, email)

### Input Validation & Sanitization
- **Joi Schema Validation**: Strict validation for all inputs
- **XSS Prevention**: HTML entity encoding via validator.escape()
- **SQL Injection Protection**: Parameterized queries, input sanitization
- **File Type Validation**: Strict file type blocking
- **Request Size Limits**: 10MB limit on request bodies

### Payment Security
- **Stripe Integration**: PCI-compliant payment processing
- **Payment Verification**: Server-side payment intent verification
- **Webhook Validation**: Stripe signature verification for webhooks
- **No Card Storage**: Card details handled entirely by Stripe
- **Environment-Based Keys**: Automatic test/live key selection

### Monitoring & Auditing
- **Comprehensive Audit Logging**: All security events logged with severity levels
- **Suspicious Activity Tracking**: IP-based risk scoring
- **User Agent Analysis**: Detection of automated tools and scrapers
- **Anomaly Detection**: Geographic changes, device changes, rapid actions
- **Security Challenges**: Additional verification for sensitive actions

### Malware & Attack Protection
- **Malicious User Agent Detection**: Blocks curl, wget, scanners, bots
- **SQL Injection Detection**: Pattern matching for SQL injection attempts
- **XSS Detection**: Pattern matching for cross-site scripting
- **Directory Traversal Prevention**: Blocks ../ patterns
- **Automated Behavior Detection**: Identifies rapid request patterns

## Security Configuration

### Environment Variables Required
See `.env.example` for full template. Critical variables:

```bash
# Secrets (MUST be rotated if exposed)
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=<64+ character random string>
SESSION_SECRET=<64+ character random string>
DATABASE_ENCRYPTION_KEY=<64-character hex string>
ADMIN_PASSWORD=<strong password>
EMAIL_PASS=<email app password>

# Security Settings
REQUIRE_2FA=false  # Set to true to enforce 2FA
ALLOWED_ORIGINS=https://yourdomain.com
ADMIN_ALLOWED_IPS=  # Optional IP whitelist
```

### Generating Secure Secrets
```javascript
// Generate 64-byte hex string
require('crypto').randomBytes(64).toString('hex')

// Generate 32-byte hex for encryption key
require('crypto').randomBytes(32).toString('hex')
```

## Security Best Practices

### For Deployment
1. ✅ **NEVER commit `.env`** - Already in `.gitignore`
2. ⚠️ **ROTATE ALL SECRETS** - Exposed secrets must be regenerated
3. ✅ Use HTTPS in production - Already configured
4. ✅ Enable 2FA for admin accounts - Already available
5. ✅ Set strong admin password - Already required
6. ✅ Configure allowed origins - Already configured
7. ⚠️ Monitor audit logs regularly - Check `/admin/audit-log`
8. ✅ Keep dependencies updated - Run `npm audit` regularly

### For Development
1. ✅ Use test Stripe keys locally - Auto-configured in `config.js`
2. ✅ Never commit secrets - `.gitignore` in place
3. ✅ Test with 2FA enabled
4. ✅ Review audit logs after testing

## Incident Response

### If Database is Compromised
1. Data is encrypted - attacker needs `DATABASE_ENCRYPTION_KEY`
2. Rotate encryption key (requires migration)
3. Notify affected customers
4. Review audit logs for access patterns

### If `.env` is Exposed (CURRENT SITUATION)
1. ⚠️ **IMMEDIATELY rotate all secrets**:
   - Stripe API keys (dashboard.stripe.com)
   - JWT secret (generate new)
   - Session secret (generate new)
   - Admin password (update in .env)
   - Email password (if using app password)
2. Revoke old Stripe keys
3. Force logout all admin sessions
4. Review audit logs for unauthorized access
5. Monitor for fraudulent payments

### If Admin Account is Compromised
1. Use emergency lockdown: `/admin/emergency-lockdown`
2. All sessions terminated immediately
3. Change admin password
4. Enable 2FA if not already enabled
5. Review audit logs
6. Check for unauthorized data access

## API Endpoints Security

### Public Endpoints (No Auth Required)
- `GET /` - Main website
- `GET /health` - Health check
- `POST /api/payment/create-intent` - Rate limited (5/minute)
- `POST /api/payment/confirm` - Rate limited, validates with Stripe
- `POST /api/webhooks/stripe` - Webhook signature verified

### Protected Endpoints (JWT Required)
- `GET /admin-dashboard.html` - Admin dashboard
- `GET /admin/*` - All admin routes
- `GET /api/admin/*` - All admin API routes
- Sensitive data endpoints require additional security challenge

## Testing Security

### Manual Testing
```bash
# Test file blocking (should return 404)
curl https://yourdomain.com/.env
curl https://yourdomain.com/database.js
curl https://yourdomain.com/ypr_customers.db

# Test rate limiting
for i in {1..10}; do curl -X POST https://yourdomain.com/admin/login; done

# Test CORS (should reject invalid origins)
curl -H "Origin: https://evil.com" -X POST https://yourdomain.com/api/payment/create-intent
```

### Automated Security Scanning
- Run `npm audit` for dependency vulnerabilities
- Use tools like OWASP ZAP for penetration testing (authorized only)
- Monitor Stripe dashboard for suspicious payment patterns

## Security Contacts

- **Security Issues**: Report to admin via secure channel
- **Stripe Fraud**: fraud@stripe.com
- **Emergency Lockdown**: Available in admin panel or via API

## Compliance

- **PCI DSS**: Compliant via Stripe (SAQ A)
- **GDPR**: Customer data encrypted, audit logs maintained
- **Data Retention**: Configure retention policies in database

## Changelog

### 2026-04-06 - Critical Security Fixes
- Fixed static file exposure vulnerability
- Protected database file access
- Blocked source code exposure
- Created .gitignore for secrets
- Added protected admin dashboard routes
- Implemented file type blocking middleware
- Added Origin header validation
- Added Stripe webhook verification
- Created security documentation

---

**Last Updated**: 2026-04-06  
**Security Level**: MAXIMUM (Zero-Trust Architecture)  
**Status**: Production Ready (after secret rotation)
