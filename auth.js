// Enterprise Authentication System for Yorkshire Property Report
// JWT + 2FA + Session Management + Brute Force Protection

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class AuthenticationSystem {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
        this.sessionSecret = process.env.SESSION_SECRET || this.generateSecureSecret();
        this.adminUsers = new Map(); // In production, use database
        this.activeSessions = new Map();
        this.loginAttempts = new Map(); // IP -> { attempts, lastAttempt, blockedUntil }
        this.auditLog = [];
        
        // Initialize admin user if credentials exist
        this.initializeAdminUser();
        
        console.log('🔐 Enterprise Authentication System initialized');
        if (!process.env.JWT_SECRET) {
            console.warn('⚠️  JWT_SECRET not set! Add to .env file:');
            console.warn(`JWT_SECRET=${this.jwtSecret}`);
        }
    }

    generateSecureSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    async initializeAdminUser() {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@yorkshirepropertyreport.co.uk';

        if (adminPassword && adminPassword !== 'change-this-secure-password') {
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            
            this.adminUsers.set(adminUsername, {
                id: uuidv4(),
                username: adminUsername,
                email: adminEmail,
                passwordHash: hashedPassword,
                role: 'admin',
                twoFactorEnabled: false,
                twoFactorSecret: null,
                createdAt: new Date(),
                lastLogin: null,
                loginAttempts: 0,
                isLocked: false,
                lockUntil: null
            });

            console.log(`✅ Admin user '${adminUsername}' initialized`);
        } else {
            console.error('❌ ADMIN_PASSWORD not set or using default! Set in .env file.');
        }
    }

    // Brute Force Protection
    isIPBlocked(ip) {
        const attempts = this.loginAttempts.get(ip);
        if (!attempts) return false;
        
        // Block IP for 15 minutes after 5 failed attempts
        if (attempts.attempts >= 5 && attempts.blockedUntil && new Date() < attempts.blockedUntil) {
            return true;
        }
        
        return false;
    }

    recordLoginAttempt(ip, success) {
        const now = new Date();
        const attempts = this.loginAttempts.get(ip) || { attempts: 0, lastAttempt: now, blockedUntil: null };
        
        if (success) {
            // Reset on successful login
            this.loginAttempts.delete(ip);
        } else {
            attempts.attempts += 1;
            attempts.lastAttempt = now;
            
            // Block for 15 minutes after 5 failed attempts
            if (attempts.attempts >= 5) {
                attempts.blockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
                this.auditLog.push({
                    timestamp: now,
                    event: 'IP_BLOCKED',
                    ip: ip,
                    reason: `Too many failed login attempts (${attempts.attempts})`,
                    severity: 'HIGH'
                });
            }
            
            this.loginAttempts.set(ip, attempts);
        }
    }

    // Authentication Methods
    async login(username, password, twoFactorCode, ip, userAgent) {
        const startTime = Date.now();
        
        try {
            // Check IP blocking
            if (this.isIPBlocked(ip)) {
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'LOGIN_BLOCKED',
                    username,
                    ip,
                    userAgent,
                    reason: 'IP temporarily blocked due to brute force attempts',
                    severity: 'HIGH'
                });
                throw new Error('IP temporarily blocked. Try again later.');
            }

            // Find user
            const user = this.adminUsers.get(username);
            if (!user) {
                this.recordLoginAttempt(ip, false);
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'LOGIN_FAILED',
                    username,
                    ip,
                    userAgent,
                    reason: 'Invalid username',
                    severity: 'MEDIUM'
                });
                throw new Error('Invalid credentials');
            }

            // Check account lock
            if (user.isLocked && user.lockUntil && new Date() < user.lockUntil) {
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'LOGIN_BLOCKED',
                    username,
                    ip,
                    userAgent,
                    reason: 'Account temporarily locked',
                    severity: 'HIGH'
                });
                throw new Error('Account temporarily locked. Try again later.');
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, user.passwordHash);
            if (!passwordValid) {
                user.loginAttempts += 1;
                
                // Lock account after 5 failed attempts for 30 minutes
                if (user.loginAttempts >= 5) {
                    user.isLocked = true;
                    user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                }
                
                this.recordLoginAttempt(ip, false);
                this.auditLog.push({
                    timestamp: new Date(),
                    event: 'LOGIN_FAILED',
                    username,
                    ip,
                    userAgent,
                    reason: 'Invalid password',
                    severity: 'MEDIUM'
                });
                throw new Error('Invalid credentials');
            }

            // Check 2FA if enabled
            if (user.twoFactorEnabled) {
                if (!twoFactorCode) {
                    throw new Error('Two-factor authentication code required');
                }
                
                const verified = speakeasy.totp.verify({
                    secret: user.twoFactorSecret,
                    encoding: 'base32',
                    token: twoFactorCode,
                    window: 2 // Allow 2 time steps tolerance
                });

                if (!verified) {
                    this.recordLoginAttempt(ip, false);
                    this.auditLog.push({
                        timestamp: new Date(),
                        event: 'LOGIN_FAILED',
                        username,
                        ip,
                        userAgent,
                        reason: 'Invalid 2FA code',
                        severity: 'HIGH'
                    });
                    throw new Error('Invalid two-factor authentication code');
                }
            }

            // Successful login - reset counters
            user.loginAttempts = 0;
            user.isLocked = false;
            user.lockUntil = null;
            user.lastLogin = new Date();
            this.recordLoginAttempt(ip, true);

            // Generate JWT token
            const sessionId = uuidv4();
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                role: user.role,
                sessionId: sessionId,
                iat: Math.floor(Date.now() / 1000)
            };

            const token = jwt.sign(tokenPayload, this.jwtSecret, { 
                expiresIn: '8h', // 8 hour expiry
                issuer: 'Yorkshire Property Report',
                audience: 'admin-system'
            });

            // Store session
            this.activeSessions.set(sessionId, {
                userId: user.id,
                username: user.username,
                ip: ip,
                userAgent: userAgent,
                createdAt: new Date(),
                lastActivity: new Date(),
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
            });

            // Audit log
            this.auditLog.push({
                timestamp: new Date(),
                event: 'LOGIN_SUCCESS',
                userId: user.id,
                username,
                ip,
                userAgent,
                sessionId,
                twoFactorUsed: user.twoFactorEnabled,
                duration: Date.now() - startTime,
                severity: 'INFO'
            });

            console.log(`✅ Admin login successful: ${username} from ${ip}`);

            return {
                success: true,
                token: token,
                sessionId: sessionId,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    twoFactorEnabled: user.twoFactorEnabled,
                    lastLogin: user.lastLogin
                },
                expiresIn: '8h'
            };

        } catch (error) {
            console.error(`❌ Login failed for ${username} from ${ip}: ${error.message}`);
            throw error;
        }
    }

    // JWT Token Verification Middleware
    verifyToken(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Check if session is still active
            const session = this.activeSessions.get(decoded.sessionId);
            if (!session || new Date() > session.expiresAt) {
                return res.status(401).json({ 
                    error: 'Session expired. Please login again.',
                    code: 'SESSION_EXPIRED'
                });
            }

            // Update last activity
            session.lastActivity = new Date();

            req.user = decoded;
            req.sessionId = decoded.sessionId;
            next();

        } catch (error) {
            console.error('JWT verification failed:', error.message);
            return res.status(403).json({ 
                error: 'Invalid token.',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Two-Factor Authentication Setup
    async setup2FA(username) {
        const user = this.adminUsers.get(username);
        if (!user) throw new Error('User not found');

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `Yorkshire Property Report (${username})`,
            issuer: 'Yorkshire Property Report',
            length: 32
        });

        // Store secret temporarily (not enabled yet)
        user.twoFactorTempSecret = secret.base32;

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32
        };
    }

    async enable2FA(username, token) {
        const user = this.adminUsers.get(username);
        if (!user || !user.twoFactorTempSecret) {
            throw new Error('2FA setup not initiated');
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            throw new Error('Invalid verification code');
        }

        // Enable 2FA
        user.twoFactorEnabled = true;
        user.twoFactorSecret = user.twoFactorTempSecret;
        delete user.twoFactorTempSecret;

        this.auditLog.push({
            timestamp: new Date(),
            event: '2FA_ENABLED',
            userId: user.id,
            username,
            severity: 'INFO'
        });

        return { success: true, message: '2FA enabled successfully' };
    }

    async disable2FA(username, currentPassword) {
        const user = this.adminUsers.get(username);
        if (!user) throw new Error('User not found');

        // Verify current password
        const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordValid) {
            throw new Error('Invalid password');
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;

        this.auditLog.push({
            timestamp: new Date(),
            event: '2FA_DISABLED',
            userId: user.id,
            username,
            severity: 'MEDIUM'
        });

        return { success: true, message: '2FA disabled successfully' };
    }

    // Session Management
    logout(sessionId, username, ip) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            
            this.auditLog.push({
                timestamp: new Date(),
                event: 'LOGOUT',
                userId: session.userId,
                username: session.username,
                sessionId,
                ip,
                duration: new Date() - session.createdAt,
                severity: 'INFO'
            });
        }

        return { success: true, message: 'Logged out successfully' };
    }

    getActiveSessions() {
        const sessions = [];
        for (const [sessionId, session] of this.activeSessions) {
            if (new Date() <= session.expiresAt) {
                sessions.push({
                    sessionId,
                    username: session.username,
                    ip: session.ip,
                    userAgent: session.userAgent,
                    createdAt: session.createdAt,
                    lastActivity: session.lastActivity,
                    expiresAt: session.expiresAt
                });
            } else {
                // Clean up expired sessions
                this.activeSessions.delete(sessionId);
            }
        }
        return sessions;
    }

    terminateSession(sessionId, adminUsername) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            
            this.auditLog.push({
                timestamp: new Date(),
                event: 'SESSION_TERMINATED',
                terminatedBy: adminUsername,
                targetSession: sessionId,
                targetUser: session.username,
                severity: 'MEDIUM'
            });
            
            return { success: true, message: 'Session terminated' };
        }
        
        return { success: false, message: 'Session not found' };
    }

    // Audit Logging
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

    // Security Status
    getSecurityStatus() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentLogs = this.auditLog.filter(log => log.timestamp >= last24Hours);
        const failedLogins = recentLogs.filter(log => log.event === 'LOGIN_FAILED').length;
        const blockedIPs = Array.from(this.loginAttempts.entries())
            .filter(([ip, data]) => data.blockedUntil && now < data.blockedUntil).length;
        
        return {
            systemStatus: 'OPERATIONAL',
            activeSessions: this.activeSessions.size,
            blockedIPs: blockedIPs,
            failedLoginsLast24h: failedLogins,
            totalUsers: this.adminUsers.size,
            users2FAEnabled: Array.from(this.adminUsers.values())
                .filter(user => user.twoFactorEnabled).length,
            auditLogSize: this.auditLog.length,
            securityLevel: blockedIPs > 0 ? 'ELEVATED' : 'NORMAL'
        };
    }

    // Cleanup expired sessions and login attempts periodically
    startCleanupJob() {
        setInterval(() => {
            const now = new Date();
            
            // Clean expired sessions
            for (const [sessionId, session] of this.activeSessions) {
                if (now > session.expiresAt) {
                    this.activeSessions.delete(sessionId);
                }
            }
            
            // Clean old login attempts (older than 1 hour)
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            for (const [ip, data] of this.loginAttempts) {
                if (data.lastAttempt < oneHourAgo && (!data.blockedUntil || now > data.blockedUntil)) {
                    this.loginAttempts.delete(ip);
                }
            }
            
            // Clean old audit logs (keep last 10000)
            if (this.auditLog.length > 10000) {
                this.auditLog = this.auditLog.slice(-10000);
            }
            
        }, 5 * 60 * 1000); // Run every 5 minutes
    }
}

// Export singleton instance
const authSystem = new AuthenticationSystem();
authSystem.startCleanupJob();

module.exports = authSystem;