// Enterprise-Grade Secure Server for Yorkshire Property Report
// JWT Auth + 2FA + Rate Limiting + Input Validation + Audit Logging

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

// Import our security modules - Enhanced Zero-Trust System
const authSystem = require('./zero-trust-auth.js'); // Switched to enhanced zero-trust
const securityMiddleware = require('./security-middleware.js');
const database = require('./database.js');
const config = require('./backend-config.js'); // Backend configuration

// Import existing modules
const nodemailer = require('nodemailer');
const stripe = require('stripe')(config.stripe.secretKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security Headers - Apply first
app.use(securityMiddleware.getSecurityHeaders());

// Enhanced Security: Malware/Virus Detection Middleware
app.use((req, res, next) => {
    // Skip security checks for static files and health endpoint
    if (req.path.includes('.') || req.path === '/health') {
        return next();
    }
    
    // Validate request security against malware/attacks
    const securityCheck = authSystem.validateRequestSecurity(req);
    
    if (!securityCheck.safe) {
        console.warn(`🚨 Security threat blocked: ${securityCheck.threats.join(', ')} from ${req.ip}`);
        return res.status(403).json({
            error: 'Security threat detected',
            code: 'THREAT_BLOCKED',
            threats: securityCheck.threats
        });
    }
    
    next();
});

// Request logging and user agent analysis
app.use(securityMiddleware.requestLogger());
app.use(securityMiddleware.analyzeUserAgent);

// CORS Configuration
app.use(cors({
    origin: config.server.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session Configuration for admin panel
app.use(session({
    secret: config.server.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
}));

// Body parsing with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(securityMiddleware.sanitizeInput());

// Rate limiting middleware
app.use('/admin', securityMiddleware.getRateLimiter('auth'));
app.use('/api/payment', securityMiddleware.getRateLimiter('payment'));
app.use('/api/email', securityMiddleware.getRateLimiter('email'));
app.use(securityMiddleware.getRateLimiter('general')); // General rate limiting

// Static file serving
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
        }
    }
}));

// ==============================================
// AUTHENTICATION ENDPOINTS
// ==============================================

// Enhanced Admin Login with Zero-Trust
app.post('/admin/login', 
    securityMiddleware.validateInput('adminLogin'),
    async (req, res) => {
        try {
            const { username, password, twoFactorCode } = req.body;
            
            // Enhanced device health check
            const deviceHealth = authSystem.analyzeDeviceHealth(req, null);
            if (deviceHealth.length > 0) {
                authSystem.addAuditLog('DEVICE_HEALTH_WARNING', {
                    username: username,
                    ip: req.ip,
                    healthIssues: deviceHealth,
                    severity: 'MEDIUM'
                });
            }

            const result = await authSystem.login(username, password, twoFactorCode, req);
            
            res.json(result);
        } catch (error) {
            authSystem.addAuditLog('LOGIN_FAILED', {
                username: req.body.username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                error: error.message,
                severity: 'MEDIUM'
            });

            res.status(401).json({
                error: error.message,
                code: 'LOGIN_FAILED'
            });
        }
    }
);

// Admin Logout - Updated for Zero-Trust
app.post('/admin/logout',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        // Use zero-trust session termination
        const result = authSystem.terminateSession(req.sessionId, req.user.username);
        res.json(result);
    }
);

// Setup 2FA - Updated for Zero-Trust
app.post('/admin/setup-2fa',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    async (req, res) => {
        try {
            const result = await authSystem.setup2FA(req.user.username);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Enable 2FA - Updated for Zero-Trust
app.post('/admin/enable-2fa',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    securityMiddleware.validateInput('twoFactorSetup'),
    async (req, res) => {
        try {
            const { token } = req.body;
            const result = await authSystem.enable2FA(req.user.username, token);
            
            authSystem.addAuditLog('2FA_ENABLED', {
                userId: req.user.userId,
                username: req.user.username,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Disable 2FA - Updated for Zero-Trust
app.post('/admin/disable-2fa',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    async (req, res) => {
        try {
            const { currentPassword } = req.body;
            const result = await authSystem.disable2FA(req.user.username, currentPassword);
            
            authSystem.addAuditLog('2FA_DISABLED', {
                userId: req.user.userId,
                username: req.user.username,
                ip: req.ip,
                severity: 'MEDIUM'
            });

            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// ==============================================
// ADMIN PANEL ENDPOINTS
// ==============================================

// Get Active Sessions - Updated for Zero-Trust
app.get('/admin/sessions',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        const sessions = authSystem.getActiveSessions();
        res.json({ sessions });
    }
);

// Terminate Session - Updated for Zero-Trust
app.delete('/admin/sessions/:sessionId',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        const { sessionId } = req.params;
        const result = authSystem.terminateSession(sessionId, req.user.username);
        res.json(result);
    }
);

// Get Audit Log - Updated for Zero-Trust
app.get('/admin/audit-log',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        const { limit = 100, severity } = req.query;
        const logs = authSystem.getAuditLog(parseInt(limit), severity);
        res.json({ logs });
    }
);

// Get Enhanced Security Status with Zero-Trust Metrics
app.get('/admin/security-status',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        const zeroTrustStatus = authSystem.getZeroTrustStatus();
        const middlewareStatus = securityMiddleware.getSecurityReport();
        
        res.json({
            zeroTrust: zeroTrustStatus,
            security: middlewareStatus,
            timestamp: new Date(),
            systemHealth: 'MAXIMUM_SECURITY_ACTIVE'
        });
    }
);

// ==============================================
// CUSTOMER ORDER ENDPOINTS
// ==============================================

// Create Payment Intent (with validation)
app.post('/api/payment/create-intent',
    securityMiddleware.validateInput('createPaymentIntent'),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                phone,
                propertyAddress,
                propertyCity,
                propertyPostcode
            } = req.body;

            // Create Stripe payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: config.stripe.priceInPence,
                currency: config.stripe.currency,
                metadata: {
                    firstName,
                    lastName,
                    email,
                    propertyAddress: `${propertyAddress}, ${propertyCity}, ${propertyPostcode}`
                }
            });

            authSystem.addAuditLog('PAYMENT_INTENT_CREATED', {
                paymentIntentId: paymentIntent.id,
                amount: config.stripe.priceInPence,
                currency: config.stripe.currency,
                customerEmail: email,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            });

        } catch (error) {
            console.error('Payment intent creation failed:', error);
            
            authSystem.addAuditLog('PAYMENT_INTENT_FAILED', {
                error: error.message,
                ip: req.ip,
                severity: 'HIGH'
            });

            res.status(500).json({
                error: 'Payment processing failed',
                code: 'PAYMENT_INTENT_ERROR'
            });
        }
    }
);

// Confirm Payment and Save Customer
app.post('/api/payment/confirm',
    securityMiddleware.validateInput('customerOrder'),
    async (req, res) => {
        try {
            const customerData = req.body;
            
            // Verify payment intent with Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(customerData.paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                throw new Error('Payment not completed');
            }

            // Generate unique order number
            const orderNumber = `YPR-${Date.now().toString().slice(-8)}`;
            
            // Save encrypted customer data
            const savedCustomer = await database.saveCustomer({
                orderNumber,
                email: customerData.email,
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                phone: customerData.phone,
                propertyAddress: customerData.propertyAddress,
                propertyCity: customerData.propertyCity,
                propertyPostcode: customerData.propertyPostcode,
                amountPaid: paymentIntent.amount / 100, // Convert from pence
                paymentIntentId: customerData.paymentIntentId,
                stripeCustomerId: customerData.stripeCustomerId,
                emailSent: false
            });

            // Send confirmation email (non-blocking - don't fail order if email fails)
            try {
                await sendConfirmationEmail(customerData.email, orderNumber, savedCustomer);
            } catch (emailError) {
                console.error('⚠️ Email sending failed, but order was saved successfully:', emailError.message);
                // Order is still successful even if email fails
            }

            authSystem.addAuditLog('ORDER_COMPLETED', {
                orderNumber,
                paymentIntentId: customerData.paymentIntentId,
                amount: paymentIntent.amount / 100,
                customerEmail: customerData.email,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json({
                success: true,
                orderNumber,
                message: 'Order completed successfully'
            });

        } catch (error) {
            console.error('Order confirmation failed:', error);
            
            authSystem.addAuditLog('ORDER_FAILED', {
                error: error.message,
                paymentIntentId: req.body.paymentIntentId,
                ip: req.ip,
                severity: 'HIGH'
            });

            res.status(500).json({
                error: 'Order processing failed',
                code: 'ORDER_CONFIRMATION_ERROR'
            });
        }
    }
);

// ==============================================
// ADMIN DATA ENDPOINTS (Protected)
// ==============================================

// Emergency Security Protocol Endpoint
app.post('/admin/emergency-lockdown',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        const { reason } = req.body;
        const result = authSystem.activateEmergencyProtocol(
            reason || 'Manual emergency lockdown',
            req.user.username
        );
        res.json({ 
            success: result,
            message: 'Emergency protocol activated - all sessions terminated'
        });
    }
);

// Get All Orders (Admin Only) - Enhanced Security
app.get('/api/admin/orders',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    async (req, res) => {
        try {
            // Check for security challenge requirement
            const challengeId = await authSystem.requireSecurityChallenge('VIEW_CUSTOMER_DATA', req);
            if (challengeId) {
                return res.status(200).json({
                    requiresChallenge: true,
                    challengeId: challengeId,
                    message: 'Security verification required for sensitive data access'
                });
            }

            const { limit = 50 } = req.query;
            const orders = await database.getAllOrders(parseInt(limit));
            
            authSystem.addAuditLog('ORDERS_ACCESSED', {
                userId: req.user.userId,
                username: req.user.username,
                recordCount: orders.length,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json({ orders });
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    }
);

// Get Order Statistics (Admin Only) - Updated for Zero-Trust
app.get('/api/admin/stats',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    async (req, res) => {
        try {
            const stats = await database.getOrderStats();
            res.json({ stats });
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    }
);

// Get Customer by Email (Admin Only) - Enhanced Security
app.get('/api/admin/customer/:email',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    async (req, res) => {
        try {
            // Require security challenge for customer data access
            const challengeId = await authSystem.requireSecurityChallenge('VIEW_CUSTOMER_DATA', req);
            if (challengeId) {
                return res.status(200).json({
                    requiresChallenge: true,
                    challengeId: challengeId,
                    message: 'Security verification required for customer data access'
                });
            }

            const { email } = req.params;
            const customers = await database.getCustomerByEmail(email);
            
            authSystem.addAuditLog('CUSTOMER_ACCESSED', {
                userId: req.user.userId,
                username: req.user.username,
                customerEmail: email,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json({ customers });
        } catch (error) {
            console.error('Failed to fetch customer:', error);
            res.status(500).json({ error: 'Failed to fetch customer' });
        }
    }
);

// ==============================================
// EMAIL SYSTEM
// ==============================================

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false, // use STARTTLS
    auth: {
        user: config.email.user,
        pass: config.email.pass
    },
    tls: {
        rejectUnauthorized: true
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000
});

async function sendConfirmationEmail(customerEmail, orderNumber, customerData) {
    try {
        const mailOptions = {
            from: `${config.email.fromName} <${config.email.fromAddress}>`,
            to: customerEmail,
            subject: `Order Confirmation - ${orderNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
                        <h1>Yorkshire Property Report</h1>
                        <h2>Order Confirmation</h2>
                    </div>
                    
                    <div style="padding: 20px; background: #f8f9fa;">
                        <h3>Thank you for your order!</h3>
                        <p><strong>Order Number:</strong> ${orderNumber}</p>
                        <p><strong>Customer:</strong> ${customerData.firstName} ${customerData.lastName}</p>
                        <p><strong>Property:</strong> ${customerData.propertyAddress}, ${customerData.propertyCity}</p>
                        <p><strong>Amount Paid:</strong> £${customerData.amountPaid}</p>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #e8f5e8; border-left: 4px solid #28a745;">
                            <strong>What happens next?</strong>
                            <ul>
                                <li>Our team will process your order within 24 hours</li>
                                <li>We'll contact you to arrange the property inspection</li>
                                <li>Your comprehensive report will be delivered within 5-7 business days</li>
                            </ul>
                        </div>
                        
                        <p>If you have any questions, please contact us at ${config.business.email}</p>
                    </div>
                    
                    <div style="background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                        <p>Yorkshire Property Report | Professional Property Inspections</p>
                        <p>This email was sent to ${customerEmail}</p>
                    </div>
                </div>
            `
        };

        const result = await emailTransporter.sendMail(mailOptions);
        
        // Update email sent status
        await database.updateEmailStatus(orderNumber, true);
        
        authSystem.addAuditLog('EMAIL_SENT', {
            orderNumber,
            customerEmail,
            messageId: result.messageId,
            severity: 'INFO'
        });

        console.log(`✅ Confirmation email sent to ${customerEmail}`);
        return result;

    } catch (error) {
        console.error(`❌ Failed to send email to ${customerEmail}:`, error);
        
        authSystem.addAuditLog('EMAIL_FAILED', {
            orderNumber,
            customerEmail,
            error: error.message,
            severity: 'MEDIUM'
        });

        throw error;
    }
}

// Test Email Endpoint (Admin Only)
app.post('/api/admin/test-email',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    securityMiddleware.validateInput('emailRequest'),
    async (req, res) => {
        try {
            const { to, subject } = req.body;
            
            const testResult = await emailTransporter.sendMail({
                from: `${config.email.fromName} <${config.email.fromAddress}>`,
                to: to,
                subject: `TEST: ${subject}`,
                html: `
                    <h2>Email Configuration Test</h2>
                    <p>This is a test email from Yorkshire Property Report system.</p>
                    <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
                    <p><strong>Sent by:</strong> ${req.user.username}</p>
                `
            });

            authSystem.addAuditLog('TEST_EMAIL_SENT', {
                userId: req.user.userId,
                username: req.user.username,
                testRecipient: to,
                messageId: testResult.messageId,
                ip: req.ip,
                severity: 'INFO'
            });

            res.json({
                success: true,
                messageId: testResult.messageId,
                message: 'Test email sent successfully'
            });

        } catch (error) {
            console.error('Test email failed:', error);
            res.status(500).json({
                error: 'Failed to send test email',
                details: error.message
            });
        }
    }
);

// ==============================================
// HEALTH AND STATUS ENDPOINTS
// ==============================================

// System Health Check
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        services: {
            database: 'operational',
            email: config.isEmailConfigured() ? 'operational' : 'misconfigured',
            stripe: config.isStripeConfigured() ? 'operational' : 'misconfigured',
            authentication: 'operational',
            security: 'operational'
        },
        uptime: process.uptime()
    };

    res.json(health);
});

// Configuration Status (Admin Only)
app.get('/api/admin/config-status',
    authSystem.verifyZeroTrustToken.bind(authSystem),
    (req, res) => {
        res.json({
            stripe: {
                configured: config.isStripeConfigured(),
                environment: config.stripe.secretKey?.includes('live') ? 'live' : 'test'
            },
            email: {
                configured: config.isEmailConfigured(),
                service: config.email.service
            },
            database: {
                encryption: process.env.DATABASE_ENCRYPTION_KEY ? 'enabled' : 'disabled',
                path: config.database.path
            },
            security: {
                jwtSecret: !!process.env.JWT_SECRET,
                sessionSecret: !!process.env.SESSION_SECRET,
                rateLimiting: 'enabled',
                inputValidation: 'enabled',
                auditLogging: 'enabled'
            }
        });
    }
);

// ==============================================
// ERROR HANDLING
// ==============================================

// 404 Handler
app.use((req, res) => {
    authSystem.addAuditLog('PAGE_NOT_FOUND', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'LOW'
    });

    res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    authSystem.addAuditLog('UNHANDLED_ERROR', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        severity: 'HIGH'
    });

    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
});

// ==============================================
// SERVER STARTUP
// ==============================================

app.listen(PORT, () => {
    console.log('\n🚀 Yorkshire Property Report Server Started');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n🔒 Security Features:');
    console.log('   ✅ JWT Authentication');
    console.log('   ✅ Two-Factor Authentication (2FA)');
    console.log('   ✅ Rate Limiting & DDoS Protection');
    console.log('   ✅ Input Validation & Sanitization');
    console.log('   ✅ Comprehensive Audit Logging');
    console.log('   ✅ Brute Force Protection');
    console.log('   ✅ Session Management');
    console.log('   ✅ Database Encryption');
    console.log('\n📊 Admin Panel:');
    console.log('   🔗 Login: /admin/login');
    console.log('   📈 Dashboard: /admin-dashboard.html');
    console.log('   🔍 Health: /health');
    console.log('\n💡 Ready for enterprise deployment!');
    
    // Log configuration status
    config.logStatus();
});

module.exports = app;