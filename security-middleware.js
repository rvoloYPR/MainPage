// Enterprise Security Middleware for Yorkshire Property Report
// Rate Limiting, Input Validation, Security Headers

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const Joi = require('joi');
const UAParser = require('ua-parser-js');

class SecurityMiddleware {
    constructor() {
        this.rateLimiters = new Map();
        this.suspiciousActivity = new Map(); // IP -> activity data
        this.initializeRateLimiters();
        console.log('🛡️ Enterprise Security Middleware initialized');
    }

    initializeRateLimiters() {
        // General API rate limiting
        this.rateLimiters.set('general', rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP',
                retryAfter: '15 minutes',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.path === '/health';
            }
        }));

        // Strict rate limiting for authentication endpoints
        this.rateLimiters.set('auth', rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // limit each IP to 5 login attempts per 15 minutes
            message: {
                error: 'Too many authentication attempts',
                retryAfter: '15 minutes',
                code: 'AUTH_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true, // Don't count successful requests
            handler: (req, res) => {
                this.logSuspiciousActivity(req.ip, 'AUTH_RATE_LIMIT_HIT', {
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path
                });
                res.status(429).json({
                    error: 'Too many authentication attempts',
                    retryAfter: '15 minutes',
                    code: 'AUTH_RATE_LIMIT_EXCEEDED'
                });
            }
        }));

        // Payment processing rate limiting
        this.rateLimiters.set('payment', rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 5, // limit each IP to 5 payment attempts per minute
            message: {
                error: 'Payment processing rate limit exceeded',
                retryAfter: '1 minute',
                code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logSuspiciousActivity(req.ip, 'PAYMENT_RATE_LIMIT_HIT', {
                    userAgent: req.get('User-Agent'),
                    amount: req.body?.amount
                });
                res.status(429).json({
                    error: 'Payment processing rate limit exceeded',
                    retryAfter: '1 minute',
                    code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
                });
            }
        }));

        // Email endpoint rate limiting
        this.rateLimiters.set('email', rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 3, // limit each IP to 3 email attempts per minute
            message: {
                error: 'Email sending rate limit exceeded',
                retryAfter: '1 minute',
                code: 'EMAIL_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false
        }));
    }

    // Security Headers Middleware
    getSecurityHeaders() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.stripe.com"],
                    frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
                }
            },
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            frameguard: { action: 'deny' },
            xssFilter: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
        });
    }

    // Input Validation Schemas
    getValidationSchemas() {
        return {
            // Payment intent creation (no paymentIntentId yet)
            createPaymentIntent: Joi.object({
                firstName: Joi.string()
                    .trim()
                    .min(1)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'First name contains invalid characters'
                    }),
                lastName: Joi.string()
                    .trim()
                    .min(1)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'Last name contains invalid characters'
                    }),
                email: Joi.string()
                    .email()
                    .trim()
                    .lowercase()
                    .max(254)
                    .required(),
                phone: Joi.string()
                    .trim()
                    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                    .optional()
                    .allow('')
                    .messages({
                        'string.pattern.base': 'Phone number format is invalid'
                    }),
                currentAddress: Joi.string()
                    .trim()
                    .min(5)
                    .max(200)
                    .optional()
                    .allow(''),
                currentCity: Joi.string()
                    .trim()
                    .min(2)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .optional()
                    .allow('')
                    .messages({
                        'string.pattern.base': 'City name contains invalid characters'
                    }),
                currentPostcode: Joi.string()
                    .trim()
                    .pattern(/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i)
                    .optional()
                    .allow('')
                    .messages({
                        'string.pattern.base': 'Invalid UK postcode format'
                    }),
                propertyAddress: Joi.string()
                    .trim()
                    .min(5)
                    .max(200)
                    .required(),
                propertyCity: Joi.string()
                    .trim()
                    .min(2)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'City name contains invalid characters'
                    }),
                propertyPostcode: Joi.string()
                    .trim()
                    .pattern(/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i)
                    .required()
                    .messages({
                        'string.pattern.base': 'Invalid UK postcode format'
                    })
            }),

            // Customer order validation (with paymentIntentId)
            customerOrder: Joi.object({
                firstName: Joi.string()
                    .trim()
                    .min(1)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'First name contains invalid characters'
                    }),
                lastName: Joi.string()
                    .trim()
                    .min(1)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'Last name contains invalid characters'
                    }),
                email: Joi.string()
                    .email()
                    .trim()
                    .lowercase()
                    .max(254)
                    .required(),
                phone: Joi.string()
                    .trim()
                    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                    .optional()
                    .allow('')
                    .messages({
                        'string.pattern.base': 'Phone number format is invalid'
                    }),
                propertyAddress: Joi.string()
                    .trim()
                    .min(5)
                    .max(200)
                    .required(),
                propertyCity: Joi.string()
                    .trim()
                    .min(2)
                    .max(50)
                    .pattern(/^[a-zA-Z\s'-]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'City name contains invalid characters'
                    }),
                propertyPostcode: Joi.string()
                    .trim()
                    .pattern(/^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i)
                    .required()
                    .messages({
                        'string.pattern.base': 'Invalid UK postcode format'
                    }),
                paymentIntentId: Joi.string()
                    .pattern(/^pi_[a-zA-Z0-9_]+$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'Invalid payment intent ID format'
                    }),
                stripeCustomerId: Joi.string()
                    .pattern(/^cus_[a-zA-Z0-9_]+$/)
                    .optional()
                    .allow('')
                    .messages({
                        'string.pattern.base': 'Invalid Stripe customer ID format'
                    })
            }),

            // Admin login validation
            adminLogin: Joi.object({
                username: Joi.string()
                    .trim()
                    .alphanum()
                    .min(3)
                    .max(30)
                    .required(),
                password: Joi.string()
                    .min(8)
                    .max(128)
                    .required(),
                twoFactorCode: Joi.string()
                    .pattern(/^[0-9]{6}$/)
                    .optional()
                    .messages({
                        'string.pattern.base': '2FA code must be 6 digits'
                    })
            }),

            // Email validation
            emailRequest: Joi.object({
                to: Joi.string()
                    .email()
                    .required(),
                subject: Joi.string()
                    .trim()
                    .min(1)
                    .max(200)
                    .required(),
                orderNumber: Joi.string()
                    .pattern(/^YPR-[0-9]{8}$/)
                    .optional()
                    .messages({
                        'string.pattern.base': 'Invalid order number format'
                    })
            }),

            // 2FA setup validation
            twoFactorSetup: Joi.object({
                token: Joi.string()
                    .pattern(/^[0-9]{6}$/)
                    .required()
                    .messages({
                        'string.pattern.base': '2FA token must be 6 digits'
                    })
            })
        };
    }

    // Input Validation Middleware Factory
    validateInput(schemaName) {
        const schemas = this.getValidationSchemas();
        const schema = schemas[schemaName];
        
        if (!schema) {
            throw new Error(`Validation schema '${schemaName}' not found`);
        }

        return (req, res, next) => {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false, // Show all validation errors
                stripUnknown: true, // Remove unknown fields
                convert: true // Auto-convert types where possible
            });

            if (error) {
                const validationErrors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));

                this.logSuspiciousActivity(req.ip, 'VALIDATION_FAILED', {
                    endpoint: req.path,
                    errors: validationErrors,
                    userAgent: req.get('User-Agent')
                });

                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: validationErrors
                });
            }

            // Replace req.body with validated and sanitized data
            req.body = value;
            next();
        };
    }

    // Advanced Input Sanitization
    sanitizeInput() {
        return (req, res, next) => {
            const sanitizeObject = (obj) => {
                for (const key in obj) {
                    if (typeof obj[key] === 'string') {
                        // Basic XSS prevention
                        obj[key] = validator.escape(obj[key]);
                        
                        // SQL injection prevention (basic)
                        obj[key] = obj[key].replace(/['"]/g, '');
                        
                        // Trim whitespace
                        obj[key] = obj[key].trim();
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    }
                }
            };

            if (req.body && typeof req.body === 'object') {
                sanitizeObject(req.body);
            }

            if (req.query && typeof req.query === 'object') {
                sanitizeObject(req.query);
            }

            next();
        };
    }

    // User Agent Analysis
    analyzeUserAgent(req, res, next) {
        const ua = UAParser(req.get('User-Agent'));
        
        req.clientInfo = {
            browser: ua.browser,
            os: ua.os,
            device: ua.device,
            engine: ua.engine
        };

        // Flag suspicious user agents
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scanner/i,
            /curl/i,
            /wget/i,
            /python/i,
            /php/i
        ];

        const userAgent = req.get('User-Agent') || '';
        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

        if (isSuspicious && !req.path.startsWith('/api/health')) {
            this.logSuspiciousActivity(req.ip, 'SUSPICIOUS_USER_AGENT', {
                userAgent: userAgent,
                endpoint: req.path,
                clientInfo: req.clientInfo
            });
        }

        next();
    }

    // Request Logging
    requestLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                const logData = {
                    method: req.method,
                    url: req.url,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    statusCode: res.statusCode,
                    duration: duration,
                    timestamp: new Date().toISOString()
                };

                // Log failed requests and slow requests
                if (res.statusCode >= 400 || duration > 5000) {
                    console.log(`🔍 Request: ${JSON.stringify(logData)}`);
                }

                // Track suspicious activity
                if (res.statusCode === 401 || res.statusCode === 403) {
                    this.logSuspiciousActivity(req.ip, 'UNAUTHORIZED_ACCESS', {
                        endpoint: req.url,
                        statusCode: res.statusCode,
                        userAgent: req.get('User-Agent')
                    });
                }
            });

            next();
        };
    }

    // Suspicious Activity Tracking
    logSuspiciousActivity(ip, activityType, details) {
        const now = new Date();
        const activity = this.suspiciousActivity.get(ip) || {
            firstSeen: now,
            activities: [],
            riskScore: 0
        };

        activity.activities.push({
            type: activityType,
            timestamp: now,
            details: details
        });

        // Calculate risk score
        const recentActivity = activity.activities.filter(
            a => (now - a.timestamp) < 60 * 60 * 1000 // Last hour
        );

        activity.riskScore = this.calculateRiskScore(recentActivity);
        activity.lastSeen = now;

        this.suspiciousActivity.set(ip, activity);

        // Log high-risk activity
        if (activity.riskScore > 50) {
            console.warn(`🚨 High-risk activity detected from ${ip}: Score ${activity.riskScore}`);
            console.warn(`Activities: ${JSON.stringify(recentActivity.slice(-3))}`);
        }
    }

    calculateRiskScore(activities) {
        const weights = {
            'AUTH_RATE_LIMIT_HIT': 25,
            'PAYMENT_RATE_LIMIT_HIT': 20,
            'VALIDATION_FAILED': 15,
            'SUSPICIOUS_USER_AGENT': 10,
            'UNAUTHORIZED_ACCESS': 20,
            'LOGIN_FAILED': 15
        };

        let score = 0;
        activities.forEach(activity => {
            score += weights[activity.type] || 5;
        });

        return Math.min(score, 100); // Cap at 100
    }

    // Get Rate Limiter by Name
    getRateLimiter(name) {
        return this.rateLimiters.get(name) || this.rateLimiters.get('general');
    }

    // Security Status Report
    getSecurityReport() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const highRiskIPs = [];
        const recentActivity = [];

        for (const [ip, data] of this.suspiciousActivity) {
            if (data.riskScore > 30) {
                highRiskIPs.push({
                    ip: ip,
                    riskScore: data.riskScore,
                    firstSeen: data.firstSeen,
                    lastSeen: data.lastSeen,
                    recentActivities: data.activities
                        .filter(a => a.timestamp > oneHourAgo)
                        .length
                });
            }

            // Collect recent activity
            const recent = data.activities.filter(a => a.timestamp > oneHourAgo);
            recentActivity.push(...recent);
        }

        return {
            timestamp: now,
            highRiskIPs: highRiskIPs,
            totalSuspiciousIPs: this.suspiciousActivity.size,
            recentActivityCount: recentActivity.length,
            activityBreakdown: this.groupActivitiesByType(recentActivity),
            rateLimitersActive: this.rateLimiters.size
        };
    }

    groupActivitiesByType(activities) {
        const breakdown = {};
        activities.forEach(activity => {
            breakdown[activity.type] = (breakdown[activity.type] || 0) + 1;
        });
        return breakdown;
    }

    // Cleanup old suspicious activity data
    cleanupSuspiciousActivity() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [ip, data] of this.suspiciousActivity) {
            // Remove old activities
            data.activities = data.activities.filter(
                activity => (now - activity.timestamp) < maxAge
            );

            // Remove IPs with no recent activity
            if (data.activities.length === 0) {
                this.suspiciousActivity.delete(ip);
            } else {
                // Recalculate risk score
                data.riskScore = this.calculateRiskScore(data.activities);
            }
        }
    }

    // Start cleanup job
    startCleanupJob() {
        setInterval(() => {
            this.cleanupSuspiciousActivity();
        }, 60 * 60 * 1000); // Run every hour
    }
}

// Export singleton instance
const securityMiddleware = new SecurityMiddleware();
securityMiddleware.startCleanupJob();

module.exports = securityMiddleware;