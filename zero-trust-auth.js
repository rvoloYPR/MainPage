// Zero-Trust Authentication System - Maximum Security
// Protects against: Malware, Physical Access, Stolen Devices, Network Attacks

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');

class ZeroTrustAuthSystem {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
        this.adminUsers = new Map();
        this.activeSessions = new Map();
        this.loginAttempts = new Map();
        this.auditLog = [];
        this.trustedDevices = new Map();
        this.securityChallenges = new Map();
        
        // Zero-Trust Configuration
        this.config = {
            // Session Security
            ACCESS_TOKEN_EXPIRY: '5m',           // Very short access tokens
            REFRESH_TOKEN_EXPIRY: '1h',          // Short refresh tokens
            FALLBACK_SESSION_EXPIRY: '8h',       // Fallback to 8h like auth.js
            MAX_CONCURRENT_SESSIONS: 3,          // Limit sessions
            
            // Account Lockout (from auth.js)
            MAX_LOGIN_ATTEMPTS: 5,               // Lock account after 5 attempts
            ACCOUNT_LOCKOUT_DURATION: 30,        // 30 minutes lockout
            OPTIONAL_2FA_MODE: false,            // Set true to make 2FA optional
            
            // Continuous Verification
            VERIFY_EVERY_MINUTES: 15,           // Re-verify every 15 minutes
            DEVICE_FINGERPRINT_REQUIRED: true,   // Track device changes
            IP_LOCK_REQUIRED: false,             // Don't lock to IP (mobile users)
            
            // Security Challenges
            CHALLENGE_ON_SENSITIVE_ACTIONS: true, // Extra verification for critical actions
            REQUIRE_2FA_FOR_LOGIN: process.env.REQUIRE_2FA === 'true',         // Require 2FA based on environment
            REQUIRE_BIOMETRIC_WHERE_POSSIBLE: false, // Future: WebAuthn
            
            // Anomaly Detection
            DETECT_UNUSUAL_LOCATIONS: true,      // Flag logins from new countries
            DETECT_DEVICE_CHANGES: true,         // Flag new devices/browsers
            DETECT_TIMING_ANOMALIES: true,       // Flag rapid actions
            
            // Emergency Features
            PANIC_CODE_ENABLED: true,            // Special 2FA code that locks everything
            AUTO_LOCK_ON_SUSPICIOUS: true,       // Auto-lock on suspicious activity
            REQUIRE_EMAIL_CONFIRMATION: true,    // Email confirm sensitive actions
        };
        
        this.initializeAdminUser();
        console.log('🏦 Zero-Trust Authentication System initialized');
        console.log('🔒 Security Level: MAXIMUM');
    }

    generateSecureSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    // Device Fingerprinting
    generateDeviceFingerprint(req) {
        const ua = UAParser(req.get('User-Agent'));
        const components = [
            ua.browser.name || '',
            ua.browser.version || '',
            ua.os.name || '',
            ua.os.version || '',
            ua.device.vendor || '',
            ua.device.model || '',
            req.get('Accept-Language') || '',
            req.get('Accept-Encoding') || '',
            // Screen resolution would be sent from frontend
            req.headers['x-screen-resolution'] || '',
            // Timezone offset from frontend
            req.headers['x-timezone-offset'] || ''
        ];
        
        return crypto.createHash('sha256')
            .update(components.join('|'))
            .digest('hex')
            .substring(0, 16); // First 16 chars for brevity
    }

    // Behavioral Analysis
    detectAnomalies(user, req, sessionData) {
        const anomalies = [];
        const now = Date.now();
        
        // Geographic anomaly
        if (this.config.DETECT_UNUSUAL_LOCATIONS) {
            const geoip = require('geoip-lite');
            const geo = geoip.lookup(req.ip);
            if (geo && user.lastKnownCountry && geo.country !== user.lastKnownCountry) {
                anomalies.push({
                    type: 'LOCATION_CHANGE',
                    details: `Login from ${geo.country}, previous: ${user.lastKnownCountry}`,
                    severity: 'HIGH'
                });
            }
        }
        
        // Device fingerprint change
        if (this.config.DETECT_DEVICE_CHANGES) {
            const currentFingerprint = this.generateDeviceFingerprint(req);
            if (sessionData && sessionData.deviceFingerprint !== currentFingerprint) {
                anomalies.push({
                    type: 'DEVICE_CHANGE',
                    details: `Device fingerprint changed mid-session`,
                    severity: 'CRITICAL'
                });
            }
        }
        
        // Timing anomalies
        if (this.config.DETECT_TIMING_ANOMALIES && sessionData) {
            const timeSinceLastAction = now - (sessionData.lastActivity || now);
            if (timeSinceLastAction < 1000) { // Actions less than 1 second apart
                sessionData.rapidActions = (sessionData.rapidActions || 0) + 1;
                if (sessionData.rapidActions > 10) {
                    anomalies.push({
                        type: 'RAPID_ACTIONS',
                        details: `${sessionData.rapidActions} actions in rapid succession`,
                        severity: 'MEDIUM'
                    });
                }
            }
        }
        
        return anomalies;
    }

    // Security Challenge System
    async generateSecurityChallenge(userId, challengeType = 'SENSITIVE_ACTION') {
        const challengeId = crypto.randomUUID();
        const code = crypto.randomInt(100000, 999999).toString();
        
        const challenge = {
            id: challengeId,
            userId: userId,
            type: challengeType,
            code: code,
            createdAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
            attempts: 0,
            maxAttempts: 3
        };
        
        this.securityChallenges.set(challengeId, challenge);
        
        // In production, send SMS/email with the code
        console.log(`🔐 Security Challenge: ${code} (${challengeType})`);
        
        return challengeId;
    }

    async verifySecurityChallenge(challengeId, userCode) {
        const challenge = this.securityChallenges.get(challengeId);
        
        if (!challenge) {
            throw new Error('Challenge not found or expired');
        }
        
        if (Date.now() > challenge.expiresAt) {
            this.securityChallenges.delete(challengeId);
            throw new Error('Challenge expired');
        }
        
        challenge.attempts += 1;
        
        // Check for panic code (last 2 digits = 99)
        if (this.config.PANIC_CODE_ENABLED && userCode.endsWith('99')) {
            await this.triggerPanicMode(challenge.userId, 'PANIC_CODE_USED');
            throw new Error('System locked for security reasons');
        }
        
        if (challenge.code !== userCode) {
            if (challenge.attempts >= challenge.maxAttempts) {
                this.securityChallenges.delete(challengeId);
                await this.lockUserSessions(challenge.userId, 'FAILED_SECURITY_CHALLENGE');
                throw new Error('Too many failed attempts. Account locked.');
            }
            throw new Error('Invalid challenge code');
        }
        
        this.securityChallenges.delete(challengeId);
        return true;
    }

    // Panic Mode - Nuclear Option
    async triggerPanicMode(triggeredBy, reason) {
        console.warn('🚨 PANIC MODE TRIGGERED:', reason);
        
        // Lock ALL sessions
        this.activeSessions.clear();
        
        // Clear all challenges
        this.securityChallenges.clear();
        
        // Log critical event
        this.auditLog.push({
            timestamp: new Date(),
            event: 'PANIC_MODE_TRIGGERED',
            triggeredBy: triggeredBy,
            reason: reason,
            severity: 'CRITICAL'
        });
        
        // In production: Send alert emails, SMS, etc.
        console.warn('🚨 ALL SESSIONS TERMINATED - MANUAL INTERVENTION REQUIRED');
        
        return true;
    }

    async lockUserSessions(userId, reason) {
        let lockedCount = 0;
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (session.userId === userId) {
                this.activeSessions.delete(sessionId);
                lockedCount++;
            }
        }
        
        this.auditLog.push({
            timestamp: new Date(),
            event: 'USER_SESSIONS_LOCKED',
            userId: userId,
            reason: reason,
            lockedSessions: lockedCount,
            severity: 'HIGH'
        });
        
        return lockedCount;
    }

    // Enhanced Login with Zero-Trust + auth.js features
    async login(username, password, twoFactorCode, req) {
        const startTime = Date.now();
        const ip = req.ip;
        const userAgent = req.get('User-Agent');
        const deviceFingerprint = this.generateDeviceFingerprint(req);
        
        try {
            // Basic validation (same as before)
            const user = this.adminUsers.get(username);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Enhanced Account Lockout Check (from auth.js)
            if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
                    username,
                    ip,
                    userAgent,
                    reason: 'Account temporarily locked due to failed attempts',
                    severity: 'HIGH'
                });
                throw new Error('Account temporarily locked. Try again later.');
            }
            
            const passwordValid = await bcrypt.compare(password, user.passwordHash);
            if (!passwordValid) {
                // Enhanced Account Lockout Logic (from auth.js)
                user.accountLockoutAttempts += 1;
                
                if (user.accountLockoutAttempts >= this.config.MAX_LOGIN_ATTEMPTS) {
                    user.accountLockedUntil = new Date(Date.now() + this.config.ACCOUNT_LOCKOUT_DURATION * 60 * 1000);
                    user.isLocked = true;
                    
                    this.auditLog.push({
                        timestamp: new Date(),
                        event: 'ACCOUNT_LOCKED_TOO_MANY_ATTEMPTS',
                        username,
                        ip,
                        userAgent,
                        attempts: user.accountLockoutAttempts,
                        lockDuration: this.config.ACCOUNT_LOCKOUT_DURATION,
                        severity: 'CRITICAL'
                    });
                }
                
                throw new Error('Invalid credentials');
            }
            
            // Enhanced 2FA Check (Optional mode from auth.js)
            if (user.twoFactorEnabled || !this.config.OPTIONAL_2FA_MODE) {
                if (!twoFactorCode) {
                    throw new Error('Two-factor authentication required');
                }
            } else if (!twoFactorCode && this.config.OPTIONAL_2FA_MODE && user.twoFactorEnabled) {
                throw new Error('Two-factor authentication required');
            }
            
            // Verify 2FA if provided
            if (twoFactorCode) {
                // Check for panic code
                if (this.config.PANIC_CODE_ENABLED && twoFactorCode.endsWith('99')) {
                    await this.triggerPanicMode(user.id, 'PANIC_CODE_DURING_LOGIN');
                    throw new Error('System locked for security reasons');
                }
                
                if (user.twoFactorEnabled) {
                    const verified = speakeasy.totp.verify({
                        secret: user.twoFactorSecret,
                        encoding: 'base32',
                        token: twoFactorCode,
                        window: 2 // Expanded window like auth.js for better UX
                    });
                    
                    if (!verified) {
                        throw new Error('Invalid two-factor authentication code');
                    }
                }
            }
            
            // Device Trust Check
            const isKnownDevice = this.trustedDevices.has(`${user.id}:${deviceFingerprint}`);
            let trustLevel = isKnownDevice ? 'TRUSTED' : 'UNKNOWN';
            
            if (!isKnownDevice) {
                // New device - require additional verification
                const challengeId = await this.generateSecurityChallenge(user.id, 'NEW_DEVICE');
                
                return {
                    success: false,
                    requiresChallenge: true,
                    challengeId: challengeId,
                    message: 'New device detected. Please check your email/SMS for verification code.',
                    trustLevel: trustLevel
                };
            }
            
            // Check for concurrent session limits
            const userSessions = Array.from(this.activeSessions.values())
                .filter(s => s.userId === user.id);
            
            if (userSessions.length >= this.config.MAX_CONCURRENT_SESSIONS) {
                // Remove oldest session
                const oldestSession = userSessions
                    .sort((a, b) => a.createdAt - b.createdAt)[0];
                this.activeSessions.delete(oldestSession.sessionId);
            }
            
            // Create session tokens
            const sessionId = crypto.randomUUID();
            const refreshTokenId = crypto.randomUUID();
            
            // Short-lived access token
            const accessToken = jwt.sign({
                userId: user.id,
                username: user.username,
                role: user.role,
                sessionId: sessionId,
                tokenType: 'access',
                iat: Math.floor(Date.now() / 1000)
            }, this.jwtSecret, { 
                expiresIn: this.config.ACCESS_TOKEN_EXPIRY,
                issuer: 'Yorkshire Property Report',
                audience: 'admin-system'
            });
            
            // Refresh token with separate secret
            const refreshSecret = crypto.randomBytes(32).toString('hex');
            const refreshToken = jwt.sign({
                userId: user.id,
                sessionId: sessionId,
                refreshTokenId: refreshTokenId,
                tokenType: 'refresh',
                iat: Math.floor(Date.now() / 1000)
            }, refreshSecret, { 
                expiresIn: this.config.REFRESH_TOKEN_EXPIRY
            });
            
            // Store session with rich metadata
            const sessionData = {
                sessionId: sessionId,
                refreshTokenId: refreshTokenId,
                refreshSecret: refreshSecret,
                userId: user.id,
                username: user.username,
                ip: ip,
                userAgent: userAgent,
                deviceFingerprint: deviceFingerprint,
                trustLevel: trustLevel,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                lastVerification: Date.now(),
                expiresAt: Date.now() + (this.config.FALLBACK_SESSION_EXPIRY === '8h' ? 8 * 60 * 60 * 1000 : 60 * 60 * 1000), // Flexible expiry
                requestCount: 0,
                anomalyScore: 0,
                lastGeoLocation: null,
                rapidActions: 0
            };
            
            this.activeSessions.set(sessionId, sessionData);
            
            // Reset lockout counters on successful login (from auth.js)
            user.accountLockoutAttempts = 0;
            user.accountLockedUntil = null;
            user.isLocked = false;
            
            // Update user data
            user.lastLogin = new Date();
            user.lastKnownIP = ip;
            user.lastKnownDevice = deviceFingerprint;
            
            // Update device trust
            this.trustedDevices.set(`${user.id}:${deviceFingerprint}`, {
                firstSeen: isKnownDevice ? this.trustedDevices.get(`${user.id}:${deviceFingerprint}`).firstSeen : Date.now(),
                lastSeen: Date.now(),
                loginCount: (this.trustedDevices.get(`${user.id}:${deviceFingerprint}`)?.loginCount || 0) + 1
            });
            
            // Audit log
            this.auditLog.push({
                timestamp: new Date(),
                event: 'ZERO_TRUST_LOGIN_SUCCESS',
                userId: user.id,
                username,
                ip,
                userAgent,
                deviceFingerprint,
                trustLevel,
                sessionId,
                duration: Date.now() - startTime,
                severity: 'INFO'
            });
            
            console.log(`✅ Zero-Trust login: ${username} from ${ip} (${trustLevel} device)`);
            
            return {
                success: true,
                accessToken: accessToken,
                refreshToken: refreshToken,
                sessionId: sessionId,
                expiresIn: this.config.ACCESS_TOKEN_EXPIRY,
                trustLevel: trustLevel,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    twoFactorEnabled: user.twoFactorEnabled,
                    lastLogin: user.lastLogin
                }
            };
            
        } catch (error) {
            this.auditLog.push({
                timestamp: new Date(),
                event: 'ZERO_TRUST_LOGIN_FAILED',
                username,
                ip,
                userAgent,
                deviceFingerprint,
                reason: error.message,
                severity: 'HIGH'
            });
            
            console.error(`❌ Zero-Trust login failed: ${username} from ${ip}: ${error.message}`);
            throw error;
        }
    }

    // Zero-Trust Token Verification
    verifyZeroTrustToken(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
        }

        try {
            // Verify JWT
            const decoded = jwt.verify(token, this.jwtSecret);
            
            if (decoded.tokenType !== 'access') {
                return res.status(401).json({
                    error: 'Invalid token type',
                    code: 'INVALID_TOKEN_TYPE'
                });
            }
            
            // Get session
            const session = this.activeSessions.get(decoded.sessionId);
            if (!session) {
                return res.status(401).json({
                    error: 'Session invalid or expired',
                    code: 'SESSION_INVALID'
                });
            }
            
            const now = Date.now();
            
            // Check session expiry
            if (now > session.expiresAt) {
                this.activeSessions.delete(decoded.sessionId);
                return res.status(401).json({
                    error: 'Session expired',
                    code: 'SESSION_EXPIRED'
                });
            }
            
            // Continuous verification check
            const timeSinceVerification = now - session.lastVerification;
            const verificationInterval = this.config.VERIFY_EVERY_MINUTES * 60 * 1000;
            
            if (timeSinceVerification > verificationInterval) {
                return res.status(401).json({
                    error: 'Continuous verification required',
                    code: 'VERIFICATION_REQUIRED',
                    requiresReauth: true
                });
            }
            
            // Detect anomalies
            const anomalies = this.detectAnomalies(
                this.adminUsers.get(session.username), 
                req, 
                session
            );
            
            if (anomalies.some(a => a.severity === 'CRITICAL')) {
                // Lock session immediately
                this.activeSessions.delete(decoded.sessionId);
                
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'SESSION_LOCKED_ANOMALY',
                    sessionId: decoded.sessionId,
                    anomalies: anomalies,
                    severity: 'CRITICAL'
                });
                
                return res.status(401).json({
                    error: 'Session locked due to security anomaly',
                    code: 'SECURITY_ANOMALY',
                    details: 'Please login again for verification'
                });
            }
            
            // Update session activity
            session.lastActivity = now;
            session.requestCount += 1;
            session.anomalyScore += anomalies.length;
            
            // Add security context to request
            req.user = decoded;
            req.sessionId = decoded.sessionId;
            req.sessionData = session;
            req.securityAnomalies = anomalies;
            req.trustLevel = session.trustLevel;
            
            next();
            
        } catch (error) {
            console.error('Zero-Trust token verification failed:', error.message);
            return res.status(403).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Token Refresh with Zero-Trust
    async refreshAccessToken(refreshToken, req) {
        try {
            // First, try to decode with any session's refresh secret
            let decoded = null;
            let sessionData = null;
            
            for (const [sessionId, session] of this.activeSessions.entries()) {
                try {
                    decoded = jwt.verify(refreshToken, session.refreshSecret);
                    if (decoded.sessionId === sessionId) {
                        sessionData = session;
                        break;
                    }
                } catch (e) {
                    // Try next session
                    continue;
                }
            }
            
            if (!decoded || !sessionData) {
                throw new Error('Invalid refresh token');
            }
            
            // Verify device consistency
            const currentFingerprint = this.generateDeviceFingerprint(req);
            if (sessionData.deviceFingerprint !== currentFingerprint) {
                // Device changed - require re-authentication
                this.activeSessions.delete(decoded.sessionId);
                throw new Error('Device fingerprint changed - please login again');
            }
            
            // Generate new access token
            const accessToken = jwt.sign({
                userId: sessionData.userId,
                username: sessionData.username,
                role: this.adminUsers.get(sessionData.username).role,
                sessionId: sessionData.sessionId,
                tokenType: 'access',
                iat: Math.floor(Date.now() / 1000)
            }, this.jwtSecret, { 
                expiresIn: this.config.ACCESS_TOKEN_EXPIRY,
                issuer: 'Yorkshire Property Report',
                audience: 'admin-system'
            });
            
            // Update session
            sessionData.lastActivity = Date.now();
            sessionData.lastVerification = Date.now(); // Reset verification timer
            
            this.auditLog.push({
                timestamp: new Date(),
                event: 'ACCESS_TOKEN_REFRESHED',
                sessionId: sessionData.sessionId,
                userId: sessionData.userId,
                severity: 'INFO'
            });
            
            return {
                success: true,
                accessToken: accessToken,
                expiresIn: this.config.ACCESS_TOKEN_EXPIRY
            };
            
        } catch (error) {
            this.auditLog.push({
                timestamp: new Date(),
                event: 'TOKEN_REFRESH_FAILED',
                reason: error.message,
                ip: req.ip,
                severity: 'MEDIUM'
            });
            
            throw error;
        }
    }

    // Admin Action Security Check
    async requireSecurityChallenge(action, req) {
        if (!this.config.CHALLENGE_ON_SENSITIVE_ACTIONS) {
            return null; // Challenges disabled
        }
        
        const sensitiveActions = [
            'VIEW_CUSTOMER_DATA',
            'EXPORT_DATA', 
            'DELETE_ORDERS',
            'CHANGE_SETTINGS',
            'VIEW_AUDIT_LOG'
        ];
        
        if (sensitiveActions.includes(action)) {
            return await this.generateSecurityChallenge(req.user.userId, action);
        }
        
        return null;
    }

    // Same 2FA methods as before but with enhanced security
    async setup2FA(username) {
        const user = this.adminUsers.get(username);
        if (!user) throw new Error('User not found');

        const secret = speakeasy.generateSecret({
            name: `Yorkshire Property Report (${username})`,
            issuer: 'Yorkshire Property Report',
            length: 32
        });

        user.twoFactorTempSecret = secret.base32;
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Add panic code instructions
        const instructions = `
        Setup Instructions:
        1. Scan QR code with authenticator app
        2. PANIC CODE: Add '99' to any code to trigger emergency lockdown
        3. Example: If code is 123456, enter 12345699 to lock all sessions
        `;

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32,
            instructions: instructions
        };
    }

    async enable2FA(username, token) {
        const user = this.adminUsers.get(username);
        if (!user || !user.twoFactorTempSecret) {
            throw new Error('2FA setup not initiated');
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            throw new Error('Invalid verification code');
        }

        user.twoFactorEnabled = true;
        user.twoFactorSecret = user.twoFactorTempSecret;
        delete user.twoFactorTempSecret;

        this.auditLog.push({
            timestamp: new Date(),
            event: '2FA_ENABLED_ZERO_TRUST',
            userId: user.id,
            username,
            severity: 'INFO'
        });

        return { 
            success: true, 
            message: '2FA enabled with Zero-Trust security. Remember: add 99 to any code for emergency lockdown.' 
        };
    }

    // Initialize admin user with enhanced security
    async initializeAdminUser() {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@yorkshirepropertyreport.co.uk';

        if (adminPassword && adminPassword !== 'change-this-secure-password') {
            const hashedPassword = await bcrypt.hash(adminPassword, 14); // Higher cost
            
            this.adminUsers.set(adminUsername, {
                id: crypto.randomUUID(),
                username: adminUsername,
                email: adminEmail,
                passwordHash: hashedPassword,
                role: 'admin',
                twoFactorEnabled: false,
                twoFactorSecret: null,
                createdAt: new Date(),
                lastLogin: null,
                lastKnownIP: null,
                lastKnownDevice: null,
                lastKnownCountry: null,
                loginAttempts: 0,
                isLocked: false,
                lockUntil: null,
                securityLevel: 'MAXIMUM',
                // Enhanced from auth.js
                accountLockoutAttempts: 0,           // Per-account attempt tracking
                accountLockedUntil: null             // Account-level lockout time
            });

            console.log(`✅ Zero-Trust admin user '${adminUsername}' initialized`);
        } else {
            console.error('❌ ADMIN_PASSWORD not set! Zero-Trust requires strong authentication.');
        }
    }

    // Get security status with Zero-Trust metrics
    getZeroTrustStatus() {
        const now = Date.now();
        const sessions = Array.from(this.activeSessions.values());
        
        return {
            systemStatus: 'ZERO_TRUST_ACTIVE',
            securityLevel: 'MAXIMUM',
            activeSessions: sessions.length,
            trustedDevices: this.trustedDevices.size,
            pendingChallenges: this.securityChallenges.size,
            highAnomalyScoreSessions: sessions.filter(s => s.anomalyScore > 5).length,
            averageSessionAge: sessions.length > 0 ? 
                sessions.reduce((sum, s) => sum + (now - s.createdAt), 0) / sessions.length / 1000 / 60 : 0,
            config: this.config,
            recentPanicModes: this.auditLog.filter(log => 
                log.event === 'PANIC_MODE_TRIGGERED' && 
                now - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
            ).length
        };
    }

    // Emergency functions
    emergencyLockdown(reason = 'Manual Emergency') {
        return this.triggerPanicMode('MANUAL', reason);
    }

    getAuditLog(limit = 100, severity = null) {
        let logs = [...this.auditLog];
        
        if (severity) {
            logs = logs.filter(log => log.severity === severity);
        }
        
        return logs
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    addAuditLog(event, details) {
        this.auditLog.push({
            timestamp: new Date(),
            event,
            ...details
        });
    }

    // Enhanced Malware/Virus Protection Methods
    
    // Malicious User Agent Detection
    detectMaliciousUserAgent(userAgent) {
        const maliciousPatterns = [
            /bot/i, /crawler/i, /spider/i, /scraper/i,
            /curl/i, /wget/i, /python/i, /java/i,
            /sqlmap/i, /nmap/i, /nikto/i, /burp/i,
            /metasploit/i, /havij/i, /acunetix/i
        ];
        
        return maliciousPatterns.some(pattern => pattern.test(userAgent));
    }

    // Suspicious Request Pattern Detection
    detectSuspiciousPatterns(req) {
        const suspiciousIndicators = [];
        
        // Check for SQL injection attempts
        const sqlPatterns = ['union', 'select', 'drop', 'insert', 'update', 'delete', '--', 'or 1=1'];
        const requestString = JSON.stringify(req.body) + req.url;
        if (sqlPatterns.some(pattern => requestString.toLowerCase().includes(pattern))) {
            suspiciousIndicators.push('SQL_INJECTION_ATTEMPT');
        }
        
        // Check for XSS attempts
        const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror=', 'eval('];
        if (xssPatterns.some(pattern => requestString.toLowerCase().includes(pattern))) {
            suspiciousIndicators.push('XSS_ATTEMPT');
        }
        
        // Check for directory traversal
        if (requestString.includes('../') || requestString.includes('..\\')) {
            suspiciousIndicators.push('DIRECTORY_TRAVERSAL_ATTEMPT');
        }
        
        // Check malicious user agent
        if (this.detectMaliciousUserAgent(req.get('User-Agent'))) {
            suspiciousIndicators.push('MALICIOUS_USER_AGENT');
        }
        
        return suspiciousIndicators;
    }

    // Enhanced Security Validation (call before processing any request)
    validateRequestSecurity(req) {
        const threats = this.detectSuspiciousPatterns(req);
        
        if (threats.length > 0) {
            this.auditLog.push({
                timestamp: new Date(),
                event: 'SECURITY_THREAT_DETECTED',
                threats: threats,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url,
                body: req.body,
                severity: 'CRITICAL'
            });
            
            // Auto-ban IP for serious threats
            if (threats.includes('SQL_INJECTION_ATTEMPT') || threats.includes('MALICIOUS_USER_AGENT')) {
                this.loginAttempts.set(req.ip, {
                    attempts: 10, // Instant ban
                    blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour ban
                    reason: 'Malicious activity detected'
                });
            }
            
            return { 
                safe: false, 
                threats: threats,
                action: 'BLOCK_REQUEST'
            };
        }
        
        return { safe: true, threats: [] };
    }

    // Virus/Malware Protection against infected devices
    analyzeDeviceHealth(req, sessionData) {
        const healthIssues = [];
        
        // Detect rapid automation (possible malware)
        if (sessionData && sessionData.rapidActions > 20) {
            healthIssues.push('AUTOMATED_BEHAVIOR_DETECTED');
        }
        
        // Detect unusual browser behavior
        const ua = req.get('User-Agent');
        if (!ua || ua.length < 10 || ua.length > 500) {
            healthIssues.push('SUSPICIOUS_BROWSER_SIGNATURE');
        }
        
        // Check for headless browser indicators (possible malware automation)
        if (ua && (ua.includes('HeadlessChrome') || ua.includes('PhantomJS'))) {
            healthIssues.push('HEADLESS_BROWSER_DETECTED');
        }
        
        // Missing standard headers (possible malware)
        if (!req.get('Accept') || !req.get('Accept-Language')) {
            healthIssues.push('MISSING_STANDARD_HEADERS');
        }
        
        return healthIssues;
    }

    // Emergency lockdown for compromised systems
    activateEmergencyProtocol(reason, triggeredBy) {
        console.warn('🚨 EMERGENCY PROTOCOL ACTIVATED:', reason);
        
        // Lock all sessions immediately
        this.activeSessions.clear();
        
        // Block all IPs temporarily
        const emergencyTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        for (const [ip] of this.loginAttempts) {
            this.loginAttempts.set(ip, {
                attempts: 10,
                blockedUntil: emergencyTime,
                reason: 'Emergency protocol activated'
            });
        }
        
        // Log critical event
        this.auditLog.push({
            timestamp: new Date(),
            event: 'EMERGENCY_PROTOCOL_ACTIVATED',
            reason: reason,
            triggeredBy: triggeredBy,
            severity: 'CRITICAL',
            actionsToken: 'ALL_SESSIONS_TERMINATED_ALL_IPS_BLOCKED'
        });
        
        return true;
    }
}

// Export singleton
const zeroTrustAuth = new ZeroTrustAuthSystem();
module.exports = zeroTrustAuth;